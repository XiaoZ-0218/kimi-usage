import * as vscode from 'vscode';
import net from 'net';
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
  const dashboardAutoStart = cfg.get<boolean>('dashboardAutoStart', false);

  const dashboardServer = new DashboardServer(
    () => statusBar.getSnapshot(),
    () => refresh(false),
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
    startDashboard(true).then(() => {
      statusBar.setDashboardRunning(dashboardServer.isRunning());
    });
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

function isPortInUse(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const tester = net
      .createServer()
      .once('error', (err: NodeJS.ErrnoException) => {
        resolve(err.code === 'EADDRINUSE');
      })
      .once('listening', () => {
        tester.close(() => resolve(false));
      })
      .listen(port);
  });
}

async function findAvailablePort(startPort: number): Promise<number | undefined> {
  for (let port = startPort; port <= 65535; port++) {
    if (!(await isPortInUse(port))) {
      return port;
    }
  }
  return undefined;
}

async function startDashboard(silent: boolean): Promise<void> {
  if (!state) { return; }

  if (state.dashboardServer?.isRunning()) {
    if (!silent) {
      const url = state.dashboardServer.getLanUrl();
      vscode.window.showInformationMessage(`Kimi 用量看板已经在运行：${url ?? `端口 ${state.dashboardPort}`}`);
    }
    return;
  }

  const cfg = vscode.workspace.getConfiguration('kimiUsage');
  const preferredPort = cfg.get<number>('dashboardPort', 6789);
  const port = await findAvailablePort(preferredPort);

  if (!port) {
    state.statusBar.setDashboardRunning(false);
    if (!silent) {
      vscode.window.showErrorMessage('Kimi 用量看板启动失败：找不到可用的空闲端口');
    }
    logDebug('看板服务器启动失败：找不到可用端口');
    return;
  }

  if (port !== preferredPort) {
    logDebug(`端口 ${preferredPort} 被占用，自动切换到 ${port}`);
    if (!silent) {
      vscode.window.showInformationMessage(`端口 ${preferredPort} 已被占用，看板将使用端口 ${port}`);
    }
  }

  if (port !== state.dashboardPort || !state.dashboardServer) {
    state.dashboardPort = port;
    state.dashboardServer = new DashboardServer(
      () => state?.statusBar.getSnapshot(),
      () => refresh(false),
      port
    );
  }

  try {
    await state.dashboardServer.start();
    state.statusBar.setDashboardRunning(true);
    const url = state.dashboardServer.getLanUrl();
    if (!silent) {
      if (url) {
        vscode.window.showInformationMessage(`Kimi 用量看板已启动：${url}`);
      } else {
        vscode.window.showInformationMessage(`Kimi 用量看板已启动（端口 ${port}）`);
      }
    }
    logDebug(`看板服务器已启动，端口 ${port}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    state.statusBar.setDashboardRunning(false);
    if (!silent) {
      vscode.window.showErrorMessage(`Kimi 用量看板启动失败：${message}`);
    }
    logDebug(`看板服务器启动失败：${message}`);
  }
}

async function stopDashboard(): Promise<void> {
  if (!state?.dashboardServer) { return; }

  await state.dashboardServer.stop();
  state.statusBar.setDashboardRunning(false);
  vscode.window.showInformationMessage('Kimi 用量看板已停止');
  logDebug('看板服务器已停止');
}

async function openDashboard(): Promise<void> {
  if (!state?.dashboardServer) { return; }

  if (!state.dashboardServer.isRunning()) {
    await startDashboard(false);
  }

  state.statusBar.setDashboardRunning(state.dashboardServer.isRunning());

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
  const autoStart = cfg.get<boolean>('dashboardAutoStart', false);

  // 自动启动关闭时，若看板正在运行则停止
  if (!autoStart && state.dashboardServer?.isRunning()) {
    await stopDashboard();
    return;
  }

  // 端口未变且已在运行，无需操作
  if (newPort === state.dashboardPort && state.dashboardServer?.isRunning()) {
    return;
  }

  await state.dashboardServer?.stop();

  if (autoStart) {
    await startDashboard(true);
  } else {
    state.statusBar.setDashboardRunning(false);
  }
}
