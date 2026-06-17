# Changelog

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
