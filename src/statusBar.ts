import * as vscode from 'vscode';
import type { UsageSnapshot } from './kimiApi';
import { generateChartSvg, svgToMarkdownDataUri, formatResetTime, formatCountdown, remainingPct } from './chart';

export class StatusBarManager {
  private item: vscode.StatusBarItem;
  private lastSnapshot: UsageSnapshot | undefined;

  constructor() {
    this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    this.item.command = 'kimiUsage.refresh';
    this.item.show();
  }

  dispose() {
    this.item.dispose();
  }

  setSnapshot(snapshot: UsageSnapshot, history: UsageSnapshot[]) {
    this.lastSnapshot = snapshot;
    this.render(history);
  }

  setError(message: string, history: UsageSnapshot[] = []) {
    const icon = this.getIconPrefix();
    this.item.text = `${icon}KIMI · ${message}`;
    this.item.tooltip = this.buildTooltip(undefined, history);
    this.item.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
  }

  setNoToken() {
    const icon = this.getIconPrefix();
    this.item.text = `${icon}KIMI · 点击配置`;
    this.item.tooltip = '尚未配置 Kimi API Key，点击设置';
    this.item.command = 'kimiUsage.setToken';
    this.item.backgroundColor = undefined;
  }

  private getIconPrefix(): string {
    const cfg = vscode.workspace.getConfiguration('kimiUsage');
    const iconName = cfg.get<string>('statusBarIcon', 'sparkle').trim();
    return iconName ? `$(${iconName}) ` : '';
  }

  private pctText(snapshot: UsageSnapshot, type: '5h' | 'weekly' | 'monthly'): string {
    let remaining: number;
    let limit: number;
    switch (type) {
      case '5h':
        remaining = snapshot.window5hRemaining;
        limit = snapshot.window5hLimit;
        break;
      case 'weekly':
        remaining = snapshot.weeklyRemaining;
        limit = snapshot.weeklyLimit;
        break;
      case 'monthly':
        remaining = snapshot.monthlyRemaining;
        limit = snapshot.monthlyLimit;
        break;
    }
    if (!limit) { return '0%'; }
    return `${Math.round((remaining / limit) * 100)}%`;
  }

  private render(history: UsageSnapshot[]) {
    if (!this.lastSnapshot) { return; }
    const snapshot = this.lastSnapshot;
    const icon = this.getIconPrefix();

    this.item.text = `${icon}KIMI · 5h ${this.pctText(snapshot, '5h')} · 本周 ${this.pctText(snapshot, 'weekly')}`;
    this.item.tooltip = this.buildTooltip(snapshot, history);
    this.item.command = 'kimiUsage.refresh';
    this.item.backgroundColor = undefined;
  }

  private buildTooltip(snapshot: UsageSnapshot | undefined, history: UsageSnapshot[]): vscode.MarkdownString {
    const md = new vscode.MarkdownString();
    md.isTrusted = true;
    md.supportHtml = true;

    md.appendMarkdown('### Kimi Code 用量趋势\n\n');

    if (history.length > 0) {
      const svg = generateChartSvg(history);
      md.appendMarkdown(`![Kimi 用量趋势](${svgToMarkdownDataUri(svg)})\n\n`);
    }

    if (snapshot) {
      md.appendMarkdown(`- **5h 滚动窗口**：${this.pctText(snapshot, '5h')} 剩余（${snapshot.window5hRemaining}/${snapshot.window5hLimit}）\n`);
      md.appendMarkdown(`  - 重置：${formatResetTime(snapshot.window5hResetTime)}，还剩 ${formatCountdown(snapshot.window5hResetTime)}\n`);
      md.appendMarkdown(`- **本周额度**：${this.pctText(snapshot, 'weekly')} 剩余（${snapshot.weeklyRemaining}/${snapshot.weeklyLimit}）\n`);
      md.appendMarkdown(`  - 重置：${formatResetTime(snapshot.weeklyResetTime)}，还剩 ${formatCountdown(snapshot.weeklyResetTime)}\n`);
      if (snapshot.monthlyLimit > 0) {
        md.appendMarkdown(`- **月额度**：${this.pctText(snapshot, 'monthly')} 剩余（${snapshot.monthlyRemaining}/${snapshot.monthlyLimit}）\n`);
      }
    } else {
      md.appendMarkdown('- 暂无用量数据\n');
    }

    md.appendMarkdown('\n---\n');
    md.appendMarkdown(`[刷新](command:kimiUsage.refresh) · [设置 API Key](command:kimiUsage.setToken) · [打开控制台](command:kimiUsage.openConsole)`);

    return md;
  }
}
