# Changelog

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
