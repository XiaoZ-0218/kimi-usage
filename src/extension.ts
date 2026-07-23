import * as vscode from 'vscode';
import { KimiApiClient, generateMockSnapshot, type UsageSnapshot } from './kimiApi';
import { StatusBarManager } from './statusBar';
import { showWelcomePage } from './welcome';

const API_KEY_SECRET = 'kimiUsage.apiKey';

interface AppState {
  context: vscode.ExtensionContext;
  statusBar: StatusBarManager;
  pollTimer: NodeJS.Timeout | undefined;
  isMock: boolean;
  outputChannel: vscode.OutputChannel;
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

  state = {
    context,
    statusBar,
    pollTimer: undefined,
    isMock: cfg.get<boolean>('mockMode', false),
    outputChannel,
  };

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
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('kimiUsage')) {
        schedulePoll();
        refresh(false);
      }
    })
  );

  showWelcomePage(context);
  refresh(true);
  schedulePoll();
}

export function deactivate() {
  if (state?.pollTimer) {
    clearInterval(state.pollTimer);
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
  vscode.commands.executeCommand('workbench.action.openSettings', '@ext:XiaoZ-0218.kimi-usage-statusbar');
}
