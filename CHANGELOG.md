# Changelog

## [0.7.0] - 2026-07-10

### Removed
- 删除局域网用量看板功能。
  - 移除 `src/dashboard.ts` 与 `src/dashboardServer.ts`。
  - 移除命令 `kimiUsage.openDashboard`、`kimiUsage.startDashboard`、`kimiUsage.stopDashboard`。
  - 移除配置项 `kimiUsage.dashboardPort` 与 `kimiUsage.dashboardAutoStart`。
  - 状态栏 tooltip 不再显示看板相关快捷入口。

## [0.6.0] - 2026-07-03

### Added
- 支持分别设置每个额度显示剩余量或已使用量百分比。
  - 新增配置项 `kimiUsage.displayModeWindow5h`、`kimiUsage.displayModeWeekly`、`kimiUsage.displayModeMonthly`。
  - 状态栏百分比、tooltip 文字、局域网看板进度条与颜色均会同步切换。
- 局域网看板现在会根据显示模式动态渲染进度条颜色：已使用百分比越高越红，剩余百分比越低越红。

### Changed
- 局域网用量看板默认关闭（`kimiUsage.dashboardAutoStart` 默认值改为 `false`）。
- 统一显示模式配置项前缀，使 VSCode 设置界面按字母排序时三个模式选项聚合在一起。
- 优化赠送额度相关文案。

### Fixed
- 修复多窗口或多进程同时启动看板时的 `EADDRINUSE` 端口冲突问题：启动前自动探测空闲端口并切换。
- 避免当前实例看板已在运行时重复启动。

## [0.5.0] - 2026-06-24

### Added
- 新增局域网用量看板，同一局域网内的手机/浏览器可通过 HTTP 访问实时用量。
- 新增 `kimiUsage.openDashboard`、`kimiUsage.startDashboard`、`kimiUsage.stopDashboard` 命令。
- 新增配置项 `kimiUsage.dashboardPort`（默认 6789）与 `kimiUsage.dashboardAutoStart`（默认 true）。
- 状态栏 tooltip 增加「打开局域网看板」快捷入口。

## [0.4.1] - 2026-06-18

### Changed
- 状态栏并发显示简化为纯数值，并发数 ≤ 1 时状态栏隐藏该信息。

### Fixed
- tooltip 中仍保留并发数显示，避免悬停时信息缺失。

## [0.4.0] - 2026-06-17

### Added
- 状态栏点击现在打开 Kimi 用量设置页面，行为与其他扩展一致。
- 新增 `kimiUsage.openSettings` 命令，可在命令面板快速打开设置。
- 在状态栏文本和 tooltip 中显示 API 返回的实时并发数量（`parallel.details` 长度 / `parallel.limit` 上限）。

## [0.3.0] - 2026-06-16

### Added
- 新增安装欢迎页面，首次安装自动弹出，包含快速开始、功能概览、配置说明和安全提示。
- 注册 `kimiUsage.showWelcome` 命令，支持命令面板手动打开欢迎页。

## [0.2.0] - 2026-06-15

### Added
- 添加扩展图标。
- 补充 `repository` 字段与 `CHANGELOG.md`。

### Fixed
- 修正默认状态栏图标：`sparkle` → `sparkles`。
