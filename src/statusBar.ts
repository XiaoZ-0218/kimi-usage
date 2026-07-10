import * as vscode from 'vscode';
import type { UsageSnapshot } from './kimiApi';
import { getDisplayModeConfig, getDisplayValue } from './displayMode';

export class StatusBarManager {
  private item: vscode.StatusBarItem;
  private lastSnapshot: UsageSnapshot | undefined;

  constructor() {
    this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    this.item.command = 'kimiUsage.openSettings';
    this.item.show();
  }

  dispose() {
    this.item.dispose();
  }

  setSnapshot(snapshot: UsageSnapshot) {
    this.lastSnapshot = snapshot;
    this.render();
  }

  getSnapshot(): UsageSnapshot | undefined {
    return this.lastSnapshot;
  }

  setError(message: string) {
    const icon = this.getIconPrefix();
    this.item.text = `${icon}KIMI · ${message}`;
    this.item.tooltip = this.buildTooltip(undefined);
    this.item.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
  }

  setNoToken() {
    const icon = this.getIconPrefix();
    this.item.text = `${icon}KIMI · 点击配置`;
    this.item.tooltip = '尚未配置 Kimi API Key，点击打开设置';
    this.item.command = 'kimiUsage.openSettings';
    this.item.backgroundColor = undefined;
  }

  private getIconPrefix(): string {
    const cfg = vscode.workspace.getConfiguration('kimiUsage');
    const iconName = cfg.get<string>('statusBarIcon', 'sparkle').trim();
    return iconName ? `$(${iconName}) ` : '';
  }

  private pctText(snapshot: UsageSnapshot, type: '5h' | 'weekly' | 'monthly'): string {
    const modes = getDisplayModeConfig();
    let mode: 'remaining' | 'used';
    switch (type) {
      case '5h':
        mode = modes.window5h;
        break;
      case 'weekly':
        mode = modes.weekly;
        break;
      case 'monthly':
        mode = modes.monthly;
        break;
    }
    const { pct } = getDisplayValue(snapshot, type, mode);
    return `${pct}%`;
  }

  private concurrencyText(snapshot: UsageSnapshot): string {
    if (snapshot.concurrency === undefined) { return ''; }
    return String(snapshot.concurrency);
  }

  private render() {
    if (!this.lastSnapshot) { return; }
    const snapshot = this.lastSnapshot;
    const icon = this.getIconPrefix();
    const concurrency = (snapshot.concurrency !== undefined && snapshot.concurrency > 1) ? this.concurrencyText(snapshot) : '';
    const concurrencyText = concurrency ? ` · 并发 ${concurrency}` : '';

    this.item.text = `${icon}KIMI · 5h ${this.pctText(snapshot, '5h')} · 本周 ${this.pctText(snapshot, 'weekly')}${concurrencyText}`;
    this.item.tooltip = this.buildTooltip(snapshot);
    this.item.command = 'kimiUsage.openSettings';
    this.item.backgroundColor = undefined;
  }

  private buildTooltip(snapshot: UsageSnapshot | undefined): vscode.MarkdownString {
    const md = new vscode.MarkdownString();
    md.isTrusted = true;

    md.appendMarkdown('### Kimi Code 用量\n\n');

    if (snapshot) {
      const modes = getDisplayModeConfig();
      const window5h = getDisplayValue(snapshot, '5h', modes.window5h);
      const weekly = getDisplayValue(snapshot, 'weekly', modes.weekly);
      const monthly = getDisplayValue(snapshot, 'monthly', modes.monthly);

      md.appendMarkdown(`- **5h 滚动窗口**：${window5h.pct}% ${window5h.label}\n`);
      md.appendMarkdown(`  - 重置时间：${formatResetTime(snapshot.window5hResetTime)}，还剩 ${formatCountdown(snapshot.window5hResetTime)}\n`);
      md.appendMarkdown(`- **本周额度**：${weekly.pct}% ${weekly.label}\n`);
      md.appendMarkdown(`  - 重置时间：${formatResetTime(snapshot.weeklyResetTime)}，还剩 ${formatCountdown(snapshot.weeklyResetTime)}\n`);
      if (snapshot.monthlyLimit > 0) {
        md.appendMarkdown(`- **赠送额度**：${monthly.pct}% ${monthly.label}\n`);
      }
      const concurrency = this.concurrencyText(snapshot);
      if (concurrency) {
        md.appendMarkdown(`- **实时并发**：${concurrency}\n`);
      }
    } else {
      md.appendMarkdown('- 暂无用量数据\n');
    }

    md.appendMarkdown('\n---\n');
    md.appendMarkdown('[刷新](command:kimiUsage.refresh) · [设置 API Key](command:kimiUsage.setToken) · [打开控制台](command:kimiUsage.openConsole)');

    return md;
  }
}

function formatCountdown(targetIso: string | undefined, now: number = Date.now()): string {
  if (!targetIso) { return '-'; }
  const target = new Date(targetIso).getTime();
  if (Number.isNaN(target)) { return targetIso; }

  let diff = Math.max(0, target - now);
  if (diff <= 0) { return '已重置'; }

  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  diff %= 24 * 60 * 60 * 1000;
  const hours = Math.floor(diff / (60 * 60 * 1000));
  diff %= 60 * 60 * 1000;
  const minutes = Math.floor(diff / (60 * 1000));

  const parts: string[] = [];
  if (days > 0) { parts.push(`${days}d`); }
  if (hours > 0) { parts.push(`${hours}h`); }
  if (minutes > 0 || parts.length === 0) { parts.push(`${minutes}m`); }

  return parts.join('');
}

function formatResetTime(iso?: string): string {
  if (!iso) { return '-'; }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) { return iso; }
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
