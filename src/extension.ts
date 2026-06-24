import * as vscode from 'vscode';
import { KimiApiClient, generateMockSnapshot, type UsageSnapshot } from './kimiApi';
import { StatusBarManager } from './statusBar';
import { showWelcomePage } from './welcome';
import { DashboardServer } from './dashboardServer';

const API_KEY_SECRET = 'kimiUsage.apiKey';

interface AppState {
  context: vscode.ExtensionContext;
  statusBar: StatusBarManager;
  pollTimer: NodeJS.Timeout | undefined;
  isMock: boolean;
  outputChannel: vscode.OutputChannel;
  dashboardServer: DashboardServer | undefined;
  dashboardPort: number;
}

let state: AppState | undefined;

function logDebug(message: string) {
  if (!state) { return; }
  const now = new Date().toLocaleString('zh-CN');
  state.outputChannel.appendLine(`[${now}] ${message}`);
}

export function activate(context: vscode.ExtensionContext) {
  const statusBar = new StatusBarManager();

  const outputChannel = vscode.window.createOutputChannel('Kimi Usage');

  const cfg = vscode.workspace.getConfiguration('kimiUsage');
  const dashboardPort = cfg.get<number>('dashboardPort', 6789);
  const dashboardAutoStart = cfg.get<boolean>('dashboardAutoStart', true);

  const dashboardServer = new DashboardServer(
    () => statusBar.getSnapshot(),
    dashboardPort
  );

  state = {
    context,
    statusBar,
    pollTimer: undefined,
    isMock: cfg.get<boolean>('mockMode', false),
    outputChannel,
    dashboardServer,
    dashboardPort,
  };

  if (dashboardAutoStart) {
    startDashboard(true);
  }

  context.subscriptions.push(
    statusBar,
    outputChannel,
    vscode.commands.registerCommand('kimiUsage.showWelcome', () => showWelcomePage(context, true)),
    vscode.commands.registerCommand('kimiUsage.refresh', () => refresh(false)),
    vscode.commands.registerCommand('kimiUsage.setToken', setApiKey),
    vscode.commands.registerCommand('kimiUsage.openConsole', openConsole),
    vscode.commands.registerCommand('kimiUsage.openSettings', openSettings),
    vscode.commands.registerCommand('kimiUsage.toggleMock', toggleMock),
    vscode.commands.registerCommand('kimiUsage.openDebugOutput', () => outputChannel.show()),
    vscode.commands.registerCommand('kimiUsage.openDashboard', openDashboard),
    vscode.commands.registerCommand('kimiUsage.startDashboard', () => startDashboard(false)),
    vscode.commands.registerCommand('kimiUsage.stopDashboard', stopDashboard),
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('kimiUsage')) {
        schedulePoll();
        refresh(false);
        restartDashboardIfPortChanged();
      }
    })
  );

  showWelcomePage(context);
  refresh(true);
  schedulePoll();
}

export async function deactivate() {
  if (state?.pollTimer) {
    clearInterval(state.pollTimer);
  }
  if (state?.dashboardServer) {
    await state.dashboardServer.stop();
  }
}

async function refresh(silent: boolean): Promise<void> {
  if (!state) { return; }

  const cfg = vscode.workspace.getConfiguration('kimiUsage');
  const baseUrl = cfg.get<string>('apiBaseUrl', 'https://api.kimi.com');

  try {
    let snapshot: UsageSnapshot;

    if (state.isMock) {
      snapshot = generateMockSnapshot();
    } else {
      const apiKey = await state.context.secrets.get(API_KEY_SECRET);
      if (!apiKey) {
        state.statusBar.setNoToken();
        return;
      }
      const debugMode = cfg.get<boolean>('debugMode', false);
      const client = new KimiApiClient(apiKey, baseUrl, debugMode ? logDebug : undefined);
      snapshot = await client.fetchUsage();
    }

    state.statusBar.setSnapshot(snapshot);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (!silent) {
      vscode.window.showErrorMessage(`Kimi 用量刷新失败：${message}`);
    }
    state.statusBar.setError('刷新失败');
  }
}

function schedulePoll() {
  if (!state) { return; }

  if (state.pollTimer) {
    clearInterval(state.pollTimer);
  }

  const cfg = vscode.workspace.getConfiguration('kimiUsage');
  const minutes = cfg.get<number>('pollIntervalMinutes', 5);
  const ms = Math.max(1, minutes) * 60 * 1000;

  state.pollTimer = setInterval(() => refresh(true), ms);
}

async function setApiKey() {
  if (!state) { return; }

  const input = await vscode.window.showInputBox({
    prompt: '请输入 Kimi API Key（以 sk- 开头）',
    password: true,
    ignoreFocusOut: true,
    validateInput: (value) => {
      if (!value || value.trim().length === 0) {
        return 'API Key 不能为空';
      }
      return undefined;
    },
  });

  if (input === undefined) { return; }

  const apiKey = input.trim();
  await state.context.secrets.store(API_KEY_SECRET, apiKey);
  vscode.window.showInformationMessage('Kimi API Key 已保存');
  await refresh(false);
}

function openConsole() {
  vscode.env.openExternal(vscode.Uri.parse('https://www.kimi.com/code/console'));
}

async function toggleMock() {
  if (!state) { return; }
  state.isMock = !state.isMock;
  await vscode.workspace.getConfiguration('kimiUsage').update('mockMode', state.isMock, true);
  vscode.window.showInformationMessage(`Kimi Mock 模式已${state.isMock ? '开启' : '关闭'}`);
  await refresh(false);
}

function openSettings() {
  vscode.commands.executeCommand('workbench.action.openSettings', '@ext:local.kimi-usage-statusbar');
}

async function startDashboard(silent: boolean): Promise<void> {
  if (!state?.dashboardServer) { return; }

  try {
    await state.dashboardServer.start();
    const url = state.dashboardServer.getLanUrl();
    if (!silent) {
      if (url) {
        vscode.window.showInformationMessage(`Kimi 用量看板已启动：${url}`);
      } else {
        vscode.window.showInformationMessage('Kimi 用量看板已启动，但未能获取局域网地址');
      }
    }
    logDebug(`看板服务器已启动，端口 ${state.dashboardPort}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    vscode.window.showErrorMessage(`Kimi 用量看板启动失败：${message}`);
    logDebug(`看板服务器启动失败：${message}`);
  }
}

async function stopDashboard(): Promise<void> {
  if (!state?.dashboardServer) { return; }

  await state.dashboardServer.stop();
  vscode.window.showInformationMessage('Kimi 用量看板已停止');
  logDebug('看板服务器已停止');
}

async function openDashboard(): Promise<void> {
  if (!state?.dashboardServer) { return; }

  if (!state.dashboardServer.isRunning()) {
    await startDashboard(false);
  }

  const url = state.dashboardServer.getLanUrl();
  if (url) {
    vscode.env.openExternal(vscode.Uri.parse(url));
  } else {
    vscode.window.showWarningMessage('未能获取看板局域网地址，请检查网络连接');
  }
}

async function restartDashboardIfPortChanged(): Promise<void> {
  if (!state) { return; }

  const cfg = vscode.workspace.getConfiguration('kimiUsage');
  const newPort = cfg.get<number>('dashboardPort', 6789);

  if (newPort === state.dashboardPort) { return; }

  await state.dashboardServer?.stop();
  state.dashboardPort = newPort;
  state.dashboardServer = new DashboardServer(
    () => state?.statusBar.getSnapshot(),
    newPort
  );

  const autoStart = cfg.get<boolean>('dashboardAutoStart', true);
  if (autoStart) {
    await startDashboard(true);
  }
}
