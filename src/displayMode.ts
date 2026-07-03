import * as vscode from 'vscode';
import type { UsageSnapshot } from './kimiApi';

export type DisplayMode = 'remaining' | 'used';

export interface DisplayModeConfig {
  window5h: DisplayMode;
  weekly: DisplayMode;
  monthly: DisplayMode;
}

export function getDisplayModeConfig(): DisplayModeConfig {
  const cfg = vscode.workspace.getConfiguration('kimiUsage');
  return {
    window5h: cfg.get<DisplayMode>('displayModeWindow5h', 'remaining'),
    weekly: cfg.get<DisplayMode>('displayModeWeekly', 'remaining'),
    monthly: cfg.get<DisplayMode>('displayModeMonthly', 'remaining'),
  };
}

export interface DisplayValue {
  value: number;
  pct: number;
  label: string;
}

export function getDisplayValue(
  snapshot: UsageSnapshot,
  type: '5h' | 'weekly' | 'monthly',
  mode: DisplayMode
): DisplayValue {
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

  if (!limit) {
    return { value: 0, pct: 0, label: mode === 'used' ? '已使用' : '剩余' };
  }

  if (mode === 'used') {
    const used = Math.max(0, limit - remaining);
    return { value: used, pct: Math.round((used / limit) * 100), label: '已使用' };
  }

  return { value: remaining, pct: Math.round((remaining / limit) * 100), label: '剩余' };
}
