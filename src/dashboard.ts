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
      --bg: #f6f7f9;
      --surface: #ffffff;
      --text: #1f2328;
      --muted: #656d76;
      --border: #d1d9e0;
      --accent: #2da44e;
      --accent-soft: rgba(45, 164, 78, 0.12);
      --warn: #d4a017;
      --warn-soft: rgba(212, 160, 23, 0.12);
      --danger: #cf222e;
      --danger-soft: rgba(207, 34, 46, 0.10);
      --shadow: 0 1px 2px rgba(31, 35, 40, 0.04), 0 2px 8px rgba(31, 35, 40, 0.06);
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #0d1117;
        --surface: #161b22;
        --text: #c9d1d9;
        --muted: #8b949e;
        --border: #30363d;
        --accent: #3fb950;
        --accent-soft: rgba(63, 185, 80, 0.15);
        --warn: #d29922;
        --warn-soft: rgba(210, 153, 34, 0.15);
        --danger: #f85149;
        --danger-soft: rgba(248, 81, 73, 0.15);
        --shadow: 0 1px 2px rgba(0, 0, 0, 0.2), 0 2px 8px rgba(0, 0, 0, 0.25);
      }
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.5;
      padding: 20px 16px 88px;
    }
    .container {
      max-width: 480px;
      margin: 0 auto;
    }
    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 20px;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .brand-icon {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: linear-gradient(135deg, #7c3aed, #2563eb);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      color: #fff;
      box-shadow: var(--shadow);
    }
    .brand-text h1 {
      margin: 0;
      font-size: 20px;
      font-weight: 700;
      letter-spacing: -0.3px;
    }
    .brand-text p {
      margin: 2px 0 0;
      color: var(--muted);
      font-size: 13px;
    }
    .refresh-btn {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      border: 1px solid var(--border);
      background: var(--surface);
      color: var(--muted);
      font-size: 18px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: var(--shadow);
      transition: transform 0.2s, color 0.2s;
    }
    .refresh-btn:hover { color: var(--text); }
    .refresh-btn.spin { animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    .top-loader {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: transparent;
      z-index: 100;
      overflow: hidden;
      opacity: 0;
      transition: opacity 0.2s ease;
    }
    .top-loader.active { opacity: 1; }
    .top-loader::after {
      content: '';
      display: block;
      height: 100%;
      width: 40%;
      background: linear-gradient(90deg, transparent, var(--accent), transparent);
      animation: loaderSlide 0.9s ease-in-out infinite;
    }
    @keyframes loaderSlide {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(250%); }
    }

    .card.updating {
      animation: cardPulse 0.5s ease;
    }
    @keyframes cardPulse {
      0% { transform: scale(1); }
      50% { transform: scale(1.015); }
      100% { transform: scale(1); }
    }

    .progress-bar {
      position: relative;
      overflow: hidden;
    }
    .progress-bar::after {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent);
      animation: barShine 2s ease-in-out infinite;
    }
    @media (prefers-color-scheme: dark) {
      .progress-bar::after {
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent);
      }
    }
    @keyframes barShine {
      0% { left: -100%; }
      100% { left: 100%; }
    }

    .updated.flash {
      animation: textFlash 0.6s ease;
    }
    @keyframes textFlash {
      0%, 100% { color: var(--muted); }
      50% { color: var(--accent); }
    }

    .error {
      background: var(--danger-soft);
      border: 1px solid var(--danger);
      color: var(--danger);
      border-radius: 12px;
      padding: 12px 14px;
      font-size: 14px;
      margin-bottom: 16px;
      display: none;
    }
    .error.visible { display: block; }

    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 18px;
      margin-bottom: 14px;
      box-shadow: var(--shadow);
    }
    .card-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 14px;
    }
    .card-icon {
      width: 32px;
      height: 32px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
    }
    .card-icon.window { background: var(--accent-soft); }
    .card-icon.weekly { background: var(--warn-soft); }
    .card-icon.monthly { background: rgba(47, 129, 247, 0.12); }
    .card-icon.concurrency { background: rgba(130, 80, 223, 0.12); }
    .card-title-wrap {
      flex: 1;
    }
    .card-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--text);
      margin: 0;
    }
    .card-subtitle {
      font-size: 12px;
      color: var(--muted);
      margin: 2px 0 0;
    }
    .card-percent {
      font-size: 24px;
      font-weight: 800;
      color: var(--text);
    }
    .progress {
      height: 10px;
      background: var(--bg);
      border-radius: 999px;
      overflow: hidden;
      margin-bottom: 12px;
    }
    .progress-bar {
      height: 100%;
      border-radius: 999px;
      transition: width 0.5s ease;
    }
    .progress-bar.high { background: linear-gradient(90deg, var(--accent), #4ade80); }
    .progress-bar.mid { background: linear-gradient(90deg, var(--warn), #facc15); }
    .progress-bar.low { background: linear-gradient(90deg, var(--danger), #f87171); }
    .card-meta {
      display: flex;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 6px;
      font-size: 13px;
      color: var(--muted);
    }
    .concurrency-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .concurrency-value {
      font-size: 20px;
      font-weight: 700;
      color: var(--text);
    }
    .concurrency-value span {
      font-size: 14px;
      font-weight: 500;
      color: var(--muted);
    }

    .updated {
      text-align: center;
      color: var(--muted);
      font-size: 12px;
      margin-top: 14px;
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
      background: var(--surface);
      opacity: 0.98;
      border-top: 1px solid var(--border);
    }
  </style>
</head>
<body>
  <div class="top-loader" id="topLoader"></div>
  <div class="container">
    <header>
      <div class="brand">
        <div class="brand-icon">✨</div>
        <div class="brand-text">
          <h1>Kimi 用量看板</h1>
          <p>实时额度与并发监控</p>
        </div>
      </div>
      <button class="refresh-btn" id="refreshBtn" title="立即刷新">↻</button>
    </header>

    <div id="error" class="error">无法连接到看板服务，请检查网络或稍后再试。</div>

    <div class="card">
      <div class="card-header">
        <div class="card-icon window">⏱️</div>
        <div class="card-title-wrap">
          <h2 class="card-title">5h 滚动窗口</h2>
          <p class="card-subtitle">最近 5 小时 API 调用余量</p>
        </div>
        <span class="card-percent" id="pct-5h">--</span>
      </div>
      <div class="progress"><div class="progress-bar high" id="bar-5h" style="width: 0%"></div></div>
      <div class="card-meta">
        <span id="remain-5h">-- / --</span>
        <span id="reset-5h">--</span>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <div class="card-icon weekly">📅</div>
        <div class="card-title-wrap">
          <h2 class="card-title">本周额度</h2>
          <p class="card-subtitle">本周剩余可用额度</p>
        </div>
        <span class="card-percent" id="pct-weekly">--</span>
      </div>
      <div class="progress"><div class="progress-bar high" id="bar-weekly" style="width: 0%"></div></div>
      <div class="card-meta">
        <span id="remain-weekly">-- / --</span>
        <span id="reset-weekly">--</span>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <div class="card-icon monthly">🗓️</div>
        <div class="card-title-wrap">
          <h2 class="card-title">月额度</h2>
          <p class="card-subtitle">本月总配额剩余</p>
        </div>
        <span class="card-percent" id="pct-monthly">--</span>
      </div>
      <div class="progress"><div class="progress-bar high" id="bar-monthly" style="width: 0%"></div></div>
      <div class="card-meta">
        <span id="remain-monthly">-- / --</span>
        <span id="reset-monthly">--</span>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <div class="card-icon concurrency">⚡</div>
        <div class="card-title-wrap">
          <h2 class="card-title">实时并发</h2>
          <p class="card-subtitle">当前活跃请求数</p>
        </div>
        <div class="concurrency-value" id="concurrency">--</div>
      </div>
    </div>

    <div class="updated" id="updated">正在加载…</div>
  </div>

  <footer>在 VSCode 中由 kimi-usage-statusbar 提供</footer>

  <script>
    const ids = ['5h', 'weekly', 'monthly'];
    const fields = {
      '5h': { remaining: 'window5hRemaining', limit: 'window5hLimit', reset: 'window5hResetTime' },
      weekly: { remaining: 'weeklyRemaining', limit: 'weeklyLimit', reset: 'weeklyResetTime' },
      monthly: { remaining: 'monthlyRemaining', limit: 'monthlyLimit', reset: null }
    };
    let lastUpdateTime = 0;

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

    function formatRelativeTime(ms) {
      if (!ms) return '尚未更新';
      const diff = Math.max(0, Date.now() - ms);
      const seconds = Math.floor(diff / 1000);
      const minutes = Math.floor(diff / (60 * 1000));
      const hours = Math.floor(diff / (60 * 60 * 1000));
      const days = Math.floor(diff / (24 * 60 * 60 * 1000));
      if (seconds < 5) return '刚刚';
      if (seconds < 60) return seconds + ' 秒前';
      if (minutes < 60) return minutes + ' 分钟前';
      if (hours < 24) return hours + ' 小时前';
      return days + ' 天前';
    }

    function updateRelativeTime() {
      document.getElementById('updated').textContent = '上次更新：' + formatRelativeTime(lastUpdateTime);
    }

    function setBarColor(bar, value) {
      bar.classList.remove('high', 'mid', 'low');
      if (value <= 20) bar.classList.add('low');
      else if (value <= 50) bar.classList.add('mid');
      else bar.classList.add('high');
    }

    function triggerUpdateAnimation() {
      document.querySelectorAll('.card').forEach((card) => {
        card.classList.remove('updating');
        void card.offsetWidth;
        card.classList.add('updating');
      });
      const updatedEl = document.getElementById('updated');
      updatedEl.classList.remove('flash');
      void updatedEl.offsetWidth;
      updatedEl.classList.add('flash');
    }

    function render(data) {
      const errorEl = document.getElementById('error');
      errorEl.classList.remove('visible');
      triggerUpdateAnimation();

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

      const con = data.concurrency;
      const conLimit = data.concurrencyLimit;
      const conEl = document.getElementById('concurrency');
      if (con !== undefined && con !== null) {
        conEl.innerHTML = con + (conLimit ? '<span> / ' + conLimit + '</span>' : '');
      } else {
        conEl.textContent = '--';
      }

      lastUpdateTime = data.timestamp || Date.now();
      updateRelativeTime();
    }

    function showError(msg) {
      const errorEl = document.getElementById('error');
      errorEl.textContent = msg || '连接失败';
      errorEl.classList.add('visible');
      const suffix = lastUpdateTime ? ' · 上次更新：' + formatRelativeTime(lastUpdateTime) : '';
      document.getElementById('updated').textContent = '更新失败' + suffix;
    }

    async function fetchUsage() {
      const btn = document.getElementById('refreshBtn');
      const loader = document.getElementById('topLoader');
      btn.classList.add('spin');
      loader.classList.add('active');
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
      } finally {
        btn.classList.remove('spin');
        loader.classList.remove('active');
      }
    }

    document.getElementById('refreshBtn').addEventListener('click', fetchUsage);
    fetchUsage();
    setInterval(fetchUsage, 3000);
    setInterval(updateRelativeTime, 1000);
  </script>
</body>
</html>`;
}
