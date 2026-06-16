import * as vscode from 'vscode';

const WELCOME_VIEW_TYPE = 'kimiUsage.welcome';
const HAS_SHOWN_WELCOME_KEY = 'kimiUsage.hasShownWelcome';

export function showWelcomePage(context: vscode.ExtensionContext, force = false) {
  if (!force) {
    const hasShown = context.globalState.get<boolean>(HAS_SHOWN_WELCOME_KEY, false);
    if (hasShown) { return; }
  }

  const panel = vscode.window.createWebviewPanel(
    WELCOME_VIEW_TYPE,
    '欢迎使用 Kimi Usage Statusbar',
    vscode.ViewColumn.One,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
    }
  );

  context.subscriptions.push(panel);

  panel.iconPath = vscode.Uri.joinPath(context.extensionUri, 'icon.png');
  panel.webview.html = getWelcomeHtml(panel.webview, context.extensionUri);

  panel.webview.onDidReceiveMessage(
    async (message) => {
      switch (message.command) {
        case 'setToken':
          await vscode.commands.executeCommand('kimiUsage.setToken');
          return;
        case 'openConsole':
          await vscode.commands.executeCommand('kimiUsage.openConsole');
          return;
        case 'refresh':
          await vscode.commands.executeCommand('kimiUsage.refresh');
          return;
        case 'dismiss':
          panel.dispose();
          return;
      }
    },
    undefined,
    context.subscriptions
  );

  context.globalState.update(HAS_SHOWN_WELCOME_KEY, true);
}

function getWelcomeHtml(webview: vscode.Webview, extensionUri: vscode.Uri): string {
  const iconUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'icon.png'));
  const nonce = getNonce();

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} https:; script-src 'nonce-${nonce}'; style-src 'unsafe-inline';">
  <title>欢迎使用 Kimi Usage Statusbar</title>
  <style>
    body {
      font-family: var(--vscode-font-family), -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      color: var(--vscode-foreground);
      background: var(--vscode-editor-background);
      line-height: 1.6;
      max-width: 720px;
      margin: 0 auto;
      padding: 40px 24px;
    }
    .header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 32px;
    }
    .header img {
      width: 64px;
      height: 64px;
      border-radius: 12px;
    }
    .header h1 {
      font-size: 28px;
      font-weight: 600;
      margin: 0;
      color: var(--vscode-titleBar-activeForeground);
    }
    .header p {
      margin: 4px 0 0;
      color: var(--vscode-descriptionForeground);
      font-size: 14px;
    }
    .card {
      background: var(--vscode-editor-inactiveSelectionBackground);
      border-radius: 8px;
      padding: 20px 24px;
      margin-bottom: 16px;
      border: 1px solid var(--vscode-panel-border);
    }
    .card h2 {
      font-size: 16px;
      font-weight: 600;
      margin: 0 0 12px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .card p {
      margin: 0 0 12px;
      color: var(--vscode-descriptionForeground);
    }
    .card p:last-child {
      margin-bottom: 0;
    }
    .btn-row {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      margin-top: 12px;
    }
    button {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      border-radius: 4px;
      padding: 8px 16px;
      font-size: 13px;
      font-family: inherit;
      cursor: pointer;
      transition: opacity 0.2s;
    }
    button:hover {
      opacity: 0.9;
    }
    button.secondary {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
    }
    .feature-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .feature-list li {
      padding: 8px 0;
      border-bottom: 1px solid var(--vscode-panel-border);
      display: flex;
      align-items: flex-start;
      gap: 10px;
    }
    .feature-list li:last-child {
      border-bottom: none;
    }
    .feature-list .icon {
      font-size: 16px;
      line-height: 1.4;
    }
    .feature-list .text {
      flex: 1;
    }
    .feature-list .text strong {
      color: var(--vscode-foreground);
      font-weight: 500;
    }
    .feature-list .text span {
      color: var(--vscode-descriptionForeground);
      font-size: 13px;
    }
    .footer {
      margin-top: 32px;
      text-align: center;
      color: var(--vscode-descriptionForeground);
      font-size: 12px;
    }
    .footer a {
      color: var(--vscode-textLink-foreground);
      text-decoration: none;
    }
    .footer a:hover {
      text-decoration: underline;
    }
    .highlight {
      background: var(--vscode-textPreformat-background);
      padding: 2px 6px;
      border-radius: 4px;
      font-family: var(--vscode-editor-font-family), monospace;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="header">
    <img src="${iconUri}" alt="Kimi Usage Statusbar">
    <div>
      <h1>Kimi Usage Statusbar</h1>
      <p>在 VSCode 状态栏实时追踪 Kimi Code API 用量</p>
    </div>
  </div>

  <div class="card">
    <h2>🚀 快速开始</h2>
    <p>首次使用需要配置你的 Kimi API Key，扩展将自动读取用量数据并在状态栏显示。</p>
    <div class="btn-row">
      <button id="btn-set-token">设置 API Key</button>
      <button id="btn-open-console" class="secondary">打开 Kimi 控制台</button>
    </div>
  </div>

  <div class="card">
    <h2>📊 功能概览</h2>
    <ul class="feature-list">
      <li>
        <span class="icon">⏱️</span>
        <div class="text">
          <strong>5 小时滚动窗口</strong><br>
          <span>实时监控最近 5 小时的 API 调用量，避免突发超限</span>
        </div>
      </li>
      <li>
        <span class="icon">📅</span>
        <div class="text">
          <strong>本周 / 本月额度</strong><br>
          <span>清晰展示周期额度使用进度，提前规划用量</span>
        </div>
      </li>
      <li>
        <span class="icon">🔄</span>
        <div class="text">
          <strong>自动刷新</strong><br>
          <span>默认每 5 分钟自动同步，支持自定义间隔（1–120 分钟）</span>
        </div>
      </li>
      <li>
        <span class="icon">🧪</span>
        <div class="text">
          <strong>Mock 模式</strong><br>
          <span>无 API Key 时开启模拟数据，预览状态栏效果</span>
        </div>
      </li>
    </ul>
  </div>

  <div class="card">
    <h2>⚙️ 配置项</h2>
    <p>在 VSCode 设置中搜索 <span class="highlight">kimiUsage</span> 可调整以下选项：</p>
    <ul class="feature-list">
      <li>
        <span class="icon">⏲️</span>
        <div class="text">
          <strong>kimiUsage.pollIntervalMinutes</strong><br>
          <span>自动刷新间隔（分钟）</span>
        </div>
      </li>
      <li>
        <span class="icon">🎨</span>
        <div class="text">
          <strong>kimiUsage.statusBarIcon</strong><br>
          <span>状态栏图标（VSCode codicon 名称）</span>
        </div>
      </li>
      <li>
        <span class="icon">🔗</span>
        <div class="text">
          <strong>kimiUsage.apiBaseUrl</strong><br>
          <span>API 基础地址（默认 https://api.kimi.com）</span>
        </div>
      </li>
    </ul>
  </div>

  <div class="card">
    <h2>🔒 安全说明</h2>
    <p>你的 API Key 通过 VSCode 内置的 <strong>Secrets API</strong> 加密存储，不会写入任何本地明文文件或 settings.json。输入框使用密码模式，避免 UI 中明文显示。</p>
  </div>

  <div class="btn-row" style="justify-content: center; margin-top: 24px;">
    <button id="btn-refresh">立即刷新用量</button>
    <button id="btn-dismiss" class="secondary">关闭页面</button>
  </div>

  <div class="footer">
    <p>遇到问题？<a href="https://github.com/XiaoZ-0218/kimi-usage/issues">提交 Issue</a> · 命令面板输入 <span class="highlight">Kimi</span> 查看所有命令</p>
  </div>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();

    document.getElementById('btn-set-token').addEventListener('click', () => {
      vscode.postMessage({ command: 'setToken' });
    });
    document.getElementById('btn-open-console').addEventListener('click', () => {
      vscode.postMessage({ command: 'openConsole' });
    });
    document.getElementById('btn-refresh').addEventListener('click', () => {
      vscode.postMessage({ command: 'refresh' });
    });
    document.getElementById('btn-dismiss').addEventListener('click', () => {
      vscode.postMessage({ command: 'dismiss' });
    });
  </script>
</body>
</html>`;
}

function getNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
