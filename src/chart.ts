import type { UsageSnapshot } from './kimiApi';

const WIDTH = 380;
const HEIGHT = 180;
const PADDING = { top: 24, right: 20, bottom: 44, left: 44 };

export function remainingPct(remaining: number, limit: number): number {
  if (!limit) { return 0; }
  return Math.max(0, Math.min(100, (remaining / limit) * 100));
}

export function formatTimeLabel(ts: number): string {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function formatDayLabel(ts: number): string {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function buildPath(points: { x: number; y: number }[]): string {
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
}

function buildAreaPath(points: { x: number; y: number }[], baselineY: number): string {
  if (points.length === 0) { return ''; }
  const first = points[0];
  const last = points[points.length - 1];
  return `${buildPath(points)} L${last.x.toFixed(1)},${baselineY.toFixed(1)} L${first.x.toFixed(1)},${baselineY.toFixed(1)} Z`;
}

/**
 * 计算距离目标时间的剩余时间，格式为 xxdxxhxxm，为 0 的部分省略。
 * 例如：5d3h、2h30m、5m、已重置
 */
export function formatCountdown(targetIso: string | undefined, now: number = Date.now()): string {
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

export function generateChartSvg(snapshots: UsageSnapshot[]): string {
  if (snapshots.length === 0) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}"><text x="50%" y="50%" text-anchor="middle" fill="#888" font-size="12">暂无历史数据</text></svg>`;
  }

  const now = Date.now();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const fiveHoursMs = 5 * 60 * 60 * 1000;
  const startTs = now - sevenDaysMs;

  const chartW = WIDTH - PADDING.left - PADDING.right;
  const chartH = HEIGHT - PADDING.top - PADDING.bottom;

  const xScale = (ts: number) => PADDING.left + ((ts - startTs) / sevenDaysMs) * chartW;
  const yScale = (pct: number) => PADDING.top + chartH - (pct / 100) * chartH;
  const baselineY = yScale(0);

  const recent5h = snapshots.filter((s) => s.timestamp >= now - fiveHoursMs);
  const series5h = recent5h.map((s) => ({
    x: xScale(s.timestamp),
    y: yScale(remainingPct(s.window5hRemaining, s.window5hLimit)),
  }));

  const recent7d = snapshots.filter((s) => s.timestamp >= startTs);
  const dailyMap = new Map<string, UsageSnapshot>();
  for (const s of recent7d) {
    const key = new Date(s.timestamp).toDateString();
    dailyMap.set(key, s);
  }
  const weeklySeries = Array.from(dailyMap.values()).sort((a, b) => a.timestamp - b.timestamp);
  const seriesWeekly = weeklySeries.map((s) => ({
    x: xScale(s.timestamp),
    y: yScale(remainingPct(s.weeklyRemaining, s.weeklyLimit)),
  }));

  const gridLines: string[] = [];
  for (let i = 0; i <= 4; i++) {
    const y = yScale(i * 25);
    gridLines.push(`<line x1="${PADDING.left}" y1="${y.toFixed(1)}" x2="${WIDTH - PADDING.right}" y2="${y.toFixed(1)}" stroke="#333" stroke-opacity="0.3" stroke-width="1"/>`);
    gridLines.push(`<text x="${PADDING.left - 8}" y="${(y + 4).toFixed(1)}" text-anchor="end" fill="#888" font-size="10">${i * 25}%</text>`);
  }

  const xLabels: string[] = [];
  for (const daysAgo of [0, 1, 3, 5, 7]) {
    const ts = now - daysAgo * 24 * 60 * 60 * 1000;
    const x = xScale(ts);
    xLabels.push(`<line x1="${x.toFixed(1)}" y1="${PADDING.top}" x2="${x.toFixed(1)}" y2="${HEIGHT - PADDING.bottom}" stroke="#333" stroke-opacity="0.2" stroke-width="1"/>`);
    xLabels.push(`<text x="${x.toFixed(1)}" y="${HEIGHT - PADDING.bottom + 16}" text-anchor="middle" fill="#888" font-size="10">${daysAgo === 0 ? '现在' : formatDayLabel(ts)}</text>`);
  }

  const weeklyPath = buildPath(seriesWeekly);
  const weeklyArea = buildAreaPath(seriesWeekly, baselineY);
  const window5hPath = buildPath(series5h);
  const window5hArea = buildAreaPath(series5h, baselineY);

  const last = snapshots[snapshots.length - 1];
  const current5hY = yScale(remainingPct(last.window5hRemaining, last.window5hLimit));
  const currentWeeklyY = yScale(remainingPct(last.weeklyRemaining, last.weeklyLimit));
  const currentX = xScale(last.timestamp);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" style="background:#1e1e1e;border-radius:4px;">
  <defs>
    <linearGradient id="gradWeekly" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#10b981" stop-opacity="0.25"/>
      <stop offset="100%" stop-color="#10b981" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="grad5h" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#38bdf8" stop-opacity="0"/>
    </linearGradient>
  </defs>

  ${gridLines.join('\n  ')}
  ${xLabels.join('\n  ')}

  <rect x="${PADDING.left}" y="${PADDING.top}" width="${chartW}" height="${chartH}" fill="none" stroke="#555" stroke-width="1"/>

  ${seriesWeekly.length > 0 ? `<path d="${weeklyArea}" fill="url(#gradWeekly)"/>` : ''}
  ${seriesWeekly.length > 0 ? `<path d="${weeklyPath}" fill="none" stroke="#10b981" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>` : ''}

  ${series5h.length > 0 ? `<path d="${window5hArea}" fill="url(#grad5h)"/>` : ''}
  ${series5h.length > 0 ? `<path d="${window5hPath}" fill="none" stroke="#38bdf8" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>` : ''}

  <circle cx="${currentX.toFixed(1)}" cy="${currentWeeklyY.toFixed(1)}" r="3.5" fill="#10b981"/>
  <circle cx="${currentX.toFixed(1)}" cy="${current5hY.toFixed(1)}" r="3.5" fill="#38bdf8"/>

  <g transform="translate(${WIDTH - PADDING.right - 140}, ${PADDING.top + 2})">
    <rect x="0" y="0" width="8" height="8" fill="#10b981" rx="2"/>
    <text x="12" y="8" fill="#ccc" font-size="10">本周</text>
    <rect x="50" y="0" width="8" height="8" fill="#38bdf8" rx="2"/>
    <text x="62" y="8" fill="#ccc" font-size="10">5h</text>
  </g>
</svg>`;
}

export function svgToMarkdownDataUri(svg: string): string {
  const base64 = Buffer.from(svg, 'utf-8').toString('base64');
  return `data:image/svg+xml;base64,${base64}`;
}

export function formatResetTime(iso?: string): string {
  if (!iso) { return '-'; }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) { return iso; }
  return formatTimeLabel(d.getTime());
}
