import * as vscode from 'vscode';
import type { UsageSnapshot } from './kimiApi';

const HISTORY_KEY = 'kimiUsage.history';

export class UsageStore {
  constructor(private context: vscode.ExtensionContext) {}

  async load(): Promise<UsageSnapshot[]> {
    return this.context.globalState.get<UsageSnapshot[]>(HISTORY_KEY) ?? [];
  }

  async save(snapshots: UsageSnapshot[]): Promise<void> {
    await this.context.globalState.update(HISTORY_KEY, snapshots);
  }

  async append(snapshot: UsageSnapshot): Promise<UsageSnapshot[]> {
    const maxDays = vscode.workspace.getConfiguration('kimiUsage').get<number>('maxHistoryDays', 14);
    const cutoff = Date.now() - maxDays * 24 * 60 * 60 * 1000;

    const existing = await this.load();
    const filtered = existing.filter((s) => s.timestamp >= cutoff);

    // 去重：同一分钟内只保留最新的一个
    const last = filtered[filtered.length - 1];
    if (last && Math.abs(last.timestamp - snapshot.timestamp) < 60 * 1000) {
      filtered[filtered.length - 1] = snapshot;
    } else {
      filtered.push(snapshot);
    }

    await this.save(filtered);
    return filtered;
  }

  async clear(): Promise<void> {
    await this.context.globalState.update(HISTORY_KEY, []);
  }
}
