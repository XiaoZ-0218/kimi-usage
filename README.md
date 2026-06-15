# Kimi Usage Statusbar

在 VSCode 状态栏实时显示 Kimi Code 用量：

```
$(sparkles)KIMI · 5h 80% · 本周 60%
```

鼠标悬停可查看 5h、本周、月额度的剩余情况与重置倒计时。

## 功能

- 状态栏显示 5h 滚动窗口与本周额度的剩余百分比
- 显示月额度剩余
- 显示各额度重置倒计时，格式为 `xxdxxhxxm`，为 0 的部分自动省略
- 支持自动刷新，默认 5 分钟
- 状态栏右侧提供手动刷新按钮 `$(refresh)`
- Mock 模式，无需 API Key 即可预览效果

## 配置 API Key

1. 登录 [Kimi Code Console](https://www.kimi.com/code/console)
2. 创建或复制你的 API Key
3. 在 VSCode 命令面板运行 `Kimi Usage: 设置 Kimi API Key`，粘贴 API Key

API Key 会保存在 VSCode 的机密存储中，不会写入 settings.json。

## 命令

| 命令 | 作用 |
| --- | --- |
| `Kimi Usage: 刷新 Kimi 用量` | 立即刷新一次 |
| `Kimi Usage: 设置 Kimi API Key` | 配置 API Key |
| `Kimi Usage: 打开 Kimi Code 控制台` | 在浏览器打开控制台 |
| `Kimi Usage: 切换 Kimi Mock 模式` | 开启/关闭模拟数据 |

## 设置项

| 设置 | 说明 |
| --- | --- |
| `kimiUsage.pollIntervalMinutes` | 自动刷新间隔（分钟，默认 5） |
| `kimiUsage.statusBarIcon` | 状态栏图标（VSCode codicon，默认 `sparkles`） |
| `kimiUsage.apiBaseUrl` | API 基础地址（默认 `https://api.kimi.com`） |
| `kimiUsage.mockMode` | Mock 模式（默认 `false`） |

## 开发与打包

```bash
npm install
npm run compile
# 按 F5 启动扩展调试

# 打包
npm install -g @vscode/vsce
vsce package
```

## API 说明

扩展调用 `GET {apiBaseUrl}/coding/v1/usages`，通过 `Authorization: Bearer <API Key>` 获取当前用量。
