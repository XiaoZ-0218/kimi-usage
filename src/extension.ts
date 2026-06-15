import * as vscode from 'vscode';
import { KimiApiClient, generateMockSnapshot, type UsageSnapshot } from './kimiApi';
import { UsageStore } from './usageStore';
import { StatusBarManager } from './statusBar';

const API_KEY_SECRET = 'kimiUsage.apiKey';

interface AppState {
  context: vscode.ExtensionContext;
  store: UsageStore;
  statusBar: StatusBarManager;
  pollTimer: NodeJS.Timeout | undefined;
  isMock: boolean;
}

let state: AppState | undefined;

export function activate(context: vscode.ExtensionContext) {
  const store = new UsageStore(context);
  const statusBar = new StatusBarManager();
  const cfg = vscode.workspace.getConfiguration('kimiUsage');

  state = {
    context,
    store,
    statusBar,
    pollTimer: undefined,
    isMock: cfg.get<boolean>('mockMode', false),
  };

  context.subscriptions.push(
    statusBar,
    vscode.commands.registerCommand('kimiUsage.refresh', () => refresh(false)),
    vscode.commands.registerCommand('kimiUsage.setToken', setApiKey),
    vscode.commands.registerCommand('kimiUsage.openConsole', openConsole),
    vscode.commands.registerCommand('kimiUsage.clearHistory', clearHistory),
    vscode.commands.registerCommand('kimiUsage.toggleMock', toggleMock),
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('kimiUsage')) {
        schedulePoll();
        refresh(false);
      }
    })
  );

  loadAndShowHistory();
  refresh(true);
  schedulePoll();
}

export function deactivate() {
  if (state?.pollTimer) {
    clearInterval(state.pollTimer);
  }
}

async function loadAndShowHistory() {
  if (!state) { return; }
  const history = await state.store.load();
  if (history.length > 0) {
    state.statusBar.setSnapshot(history[history.length - 1], history);
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
      const client = new KimiApiClient(apiKey, baseUrl);
      snapshot = await client.fetchUsage();
    }

    const history = await state.store.append(snapshot);
    state.statusBar.setSnapshot(snapshot, history);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (!silent) {
      vscode.window.showErrorMessage(`Kimi 用量刷新失败：${message}`);
    }
    const history = await state.store.load();
    state.statusBar.setError('刷新失败', history);
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

async function clearHistory() {
  if (!state) { return; }
  const answer = await vscode.window.showWarningMessage(
    '确定要清除本地保存的 Kimi 用量历史吗？',
    { modal: true },
    '确定'
  );
  if (answer === '确定') {
    await state.store.clear();
    vscode.window.showInformationMessage('用量历史已清除');
    await refresh(false);
  }
}

async function toggleMock() {
  if (!state) { return; }
  state.isMock = !state.isMock;
  await vscode.workspace.getConfiguration('kimiUsage').update('mockMode', state.isMock, true);
  vscode.window.showInformationMessage(`Kimi Mock 模式已${state.isMock ? '开启' : '关闭'}`);
  await refresh(false);
}
