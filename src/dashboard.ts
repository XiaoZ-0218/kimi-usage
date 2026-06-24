/**
 * 局域网看板前端页面
 *
 * 返回一段完整、自包含的 HTML 字符串，不依赖 VSCode webview API，
 * 可在任意浏览器（包括手机）中直接打开。
 */

export function getDashboardHtml(): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Kimi 用量看板</title>
  <style>
    :root {
      --bg: #0f1115;
      --card: #1a1d23;
      --text: #e6e6e6;
      --muted: #9aa0a6;
      --accent: #7ee787;
      --warn: #facc15;
      --danger: #f87171;
      --border: #2c3038;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.5;
      padding: 24px 16px 80px;
    }
    header {
      text-align: center;
      margin-bottom: 24px;
    }
    header h1 {
      margin: 0 0 6px;
      font-size: 22px;
      font-weight: 600;
      letter-spacing: 0.5px;
    }
    header p {
      margin: 0;
      color: var(--muted);
      font-size: 13px;
    }
    .error {
      background: rgba(248, 113, 113, 0.12);
      border: 1px solid var(--danger);
      color: var(--danger);
      border-radius: 10px;
      padding: 12px 14px;
      font-size: 14px;
      margin-bottom: 16px;
      display: none;
    }
    .error.visible { display: block; }
    .grid {
      display: grid;
      gap: 14px;
    }
    .card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 18px;
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 12px;
    }
    .card-title {
      font-size: 15px;
      font-weight: 500;
      color: var(--muted);
      margin: 0;
    }
    .card-percent {
      font-size: 20px;
      font-weight: 700;
      color: var(--text);
    }
    .progress {
      height: 10px;
      background: #2c3038;
      border-radius: 999px;
      overflow: hidden;
      margin-bottom: 12px;
    }
    .progress-bar {
      height: 100%;
      border-radius: 999px;
      transition: width 0.4s ease, background 0.4s ease;
    }
    .progress-bar.high { background: var(--accent); }
    .progress-bar.mid { background: var(--warn); }
    .progress-bar.low { background: var(--danger); }
    .card-meta {
      display: flex;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 6px;
      font-size: 13px;
      color: var(--muted);
    }
    .updated {
      text-align: center;
      color: var(--muted);
      font-size: 12px;
      margin-top: 18px;
    }
    footer {
      position: fixed;
      left: 0;
      right: 0;
      bottom: 0;
      text-align: center;
      padding: 14px;
      font-size: 12px;
      color: var(--muted);
      background: rgba(15, 17, 21, 0.92);
      backdrop-filter: blur(4px);
      border-top: 1px solid var(--border);
    }
  </style>
</head>
<body>
  <header>
    <h1>Kimi 用量看板</h1>
    <p>5h 滚动窗口 · 本周额度 · 月额度</p>
  </header>

  <div id="error" class="error">无法连接到看板服务，请检查网络或稍后再试。</div>

  <div class="grid">
    <div class="card" id="card-5h">
      <div class="card-header">
        <h2 class="card-title">5h 滚动窗口</h2>
        <span class="card-percent" id="pct-5h">--</span>
      </div>
      <div class="progress"><div class="progress-bar high" id="bar-5h" style="width: 0%"></div></div>
      <div class="card-meta">
        <span id="remain-5h">-- / --</span>
        <span id="reset-5h">--</span>
      </div>
    </div>

    <div class="card" id="card-weekly">
      <div class="card-header">
        <h2 class="card-title">本周额度</h2>
        <span class="card-percent" id="pct-weekly">--</span>
      </div>
      <div class="progress"><div class="progress-bar high" id="bar-weekly" style="width: 0%"></div></div>
      <div class="card-meta">
        <span id="remain-weekly">-- / --</span>
        <span id="reset-weekly">--</span>
      </div>
    </div>

    <div class="card" id="card-monthly">
      <div class="card-header">
        <h2 class="card-title">月额度</h2>
        <span class="card-percent" id="pct-monthly">--</span>
      </div>
      <div class="progress"><div class="progress-bar high" id="bar-monthly" style="width: 0%"></div></div>
      <div class="card-meta">
        <span id="remain-monthly">-- / --</span>
        <span id="reset-monthly">--</span>
      </div>
    </div>
  </div>

  <div class="updated" id="updated">正在加载…</div>

  <footer>在 VSCode 中由 kimi-usage-statusbar 提供</footer>

  <script>
    const ids = ['5h', 'weekly', 'monthly'];
    const fields = {
      '5h': { remaining: 'window5hRemaining', limit: 'window5hLimit', reset: 'window5hResetTime' },
      weekly: { remaining: 'weeklyRemaining', limit: 'weeklyLimit', reset: 'weeklyResetTime' },
      monthly: { remaining: 'monthlyRemaining', limit: 'monthlyLimit', reset: null }
    };

    function pct(remaining, limit) {
      if (!limit) return 0;
      return Math.max(0, Math.min(100, Math.round((remaining / limit) * 100)));
    }

    function formatResetTime(iso) {
      if (!iso) return '无重置时间';
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return iso;
      return (d.getMonth() + 1) + '/' + d.getDate() + ' ' +
        String(d.getHours()).padStart(2, '0') + ':' +
        String(d.getMinutes()).padStart(2, '0');
    }

    function formatCountdown(iso) {
      if (!iso) return '';
      const target = new Date(iso).getTime();
      if (Number.isNaN(target)) return '';
      let diff = target - Date.now();
      if (diff <= 0) return '已重置';
      const days = Math.floor(diff / (24 * 60 * 60 * 1000));
      diff %= 24 * 60 * 60 * 1000;
      const hours = Math.floor(diff / (60 * 60 * 1000));
      diff %= 60 * 60 * 1000;
      const minutes = Math.floor(diff / (60 * 1000));
      const parts = [];
      if (days > 0) parts.push(days + 'd');
      if (hours > 0) parts.push(hours + 'h');
      if (minutes > 0 || parts.length === 0) parts.push(minutes + 'm');
      return '还剩 ' + parts.join('');
    }

    function setBarColor(bar, value) {
      bar.classList.remove('high', 'mid', 'low');
      if (value <= 20) bar.classList.add('low');
      else if (value <= 50) bar.classList.add('mid');
      else bar.classList.add('high');
    }

    function render(data) {
      const errorEl = document.getElementById('error');
      errorEl.classList.remove('visible');

      for (const key of ids) {
        const cfg = fields[key];
        const remaining = data[cfg.remaining] ?? 0;
        const limit = data[cfg.limit] ?? 0;
        const value = pct(remaining, limit);

        document.getElementById('pct-' + key).textContent = value + '%';
        document.getElementById('remain-' + key).textContent = remaining + ' / ' + limit;

        const bar = document.getElementById('bar-' + key);
        bar.style.width = value + '%';
        setBarColor(bar, value);

        const resetEl = document.getElementById('reset-' + key);
        if (cfg.reset) {
          resetEl.textContent = formatResetTime(data[cfg.reset]) + ' · ' + formatCountdown(data[cfg.reset]);
        } else {
          resetEl.textContent = '';
        }
      }

      const d = new Date(data.timestamp || Date.now());
      document.getElementById('updated').textContent = '上次更新：' + d.toLocaleString('zh-CN');
    }

    function showError(msg) {
      const errorEl = document.getElementById('error');
      errorEl.textContent = msg || '连接失败';
      errorEl.classList.add('visible');
      document.getElementById('updated').textContent = '更新失败';
    }

    async function fetchUsage() {
      try {
        const res = await fetch('/api/usage');
        if (!res.ok) {
          const text = await res.text().catch(() => '');
          throw new Error('HTTP ' + res.status + (text ? ': ' + text : ''));
        }
        const data = await res.json();
        if (data.error) {
          throw new Error(data.error);
        }
        render(data);
      } catch (err) {
        showError('获取用量失败：' + (err.message || String(err)));
      }
    }

    fetchUsage();
    setInterval(fetchUsage, 3000);
  </script>
</body>
</html>`;
}
