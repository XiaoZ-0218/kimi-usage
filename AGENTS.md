# Kimi Usage Statusbar — Agent Guide

> AI coding agent 必读。本文档基于项目实际文件编写，所有信息均准确反映当前代码状态。

## 项目概述

这是一个 **VSCode 扩展**，在 VSCode 状态栏实时显示 Kimi Code 的 API 用量（5h 滚动窗口、本周额度、赠送额度）。

- **名称**: `kimi-usage-statusbar`
- **发布者**: `XiaoZ-0218`
- **商店地址**: https://marketplace.visualstudio.com/items?itemName=XiaoZ-0218.kimi-usage-statusbar
- **技术栈**: TypeScript + VSCode Extension API
- **运行时**: Node.js（VSCode 内置）
- **语言**: 项目内所有注释、文档、UI 文案均为中文

## 项目结构

```
├── .github/
│   └── workflows/
│       ├── publish.yml    # 自动发布：tag push → Release → VSCode 商店
│       └── pr_agent.yml   # PR-Agent：自动代码审查（DeepSeek）
├── src/
│   ├── extension.ts   # 扩展入口：activate/deactivate、命令注册、轮询调度
│   ├── kimiApi.ts     # API 客户端：HTTP 请求、响应解析、Mock 数据生成
│   ├── statusBar.ts   # 状态栏 UI：文本渲染、tooltip 构建、倒计时格式化
│   ├── displayMode.ts  # 显示模式工具：剩余/已使用百分比计算
│   └── welcome.ts     # 欢迎页面：首次安装展示
├── out/               # TypeScript 编译输出（CommonJS + source map）
├── package.json       # VSCode 扩展清单 + npm scripts + 依赖
│   main: ./out/extension.js
├── tsconfig.json      # TypeScript 配置（target ES2022, module commonjs, strict: true）
├── icon.png           # 扩展图标（128×128，月兔，透明底，统一 10% 留白）
├── icon-source.png    # 图标高清源（512×512，与 icon 同构图）
├── logo.png           # 品牌 Logo（512×512，月兔 + Kimi 字标，透明底，同留白）
├── scripts/
│   └── process_icons.py  # 统一生成上述资源（透明底 + 紧裁 + 正方形）
├── .gitignore         # 忽略 out/, node_modules/, .vscode-test/, *.vsix
├── .vscodeignore      # 打包时忽略源码、map、测试目录等
├── CHANGELOG.md       # 版本变更记录
└── README.md          # 用户文档（中文）
```

## 构建与运行

### 依赖安装

```bash
npm install
```

仅有两个 devDependencies：
- `typescript` (^5.4.5)
- `@types/node` (^20.14.0)
- `@types/vscode` (^1.90.0)

### 编译

```bash
npm run compile     # tsc -p ./，一次性编译到 out/
npm run watch       # tsc -watch -p ./，开发时监听
npm run lint        # tsc --noEmit，类型检查不输出
```

### 调试

按 `F5` 启动 VSCode 扩展调试（需要 VSCode 的 Extension Development Host）。

### 打包

```bash
npm install -g @vscode/vsce
vsce package        # 生成 .vsix 文件
```

## 代码组织与模块职责

### `src/extension.ts`

- 导出 `activate()` / `deactivate()` 作为 VSCode 扩展生命周期钩子。
- 维护全局 `state: AppState`，包含 `StatusBarManager`、轮询定时器、Mock 开关。
- 注册 7 个命令：
  - `kimiUsage.showWelcome` — 打开欢迎页面
  - `kimiUsage.refresh` — 手动刷新用量
  - `kimiUsage.setToken` — 输入并保存 API Key 到 VSCode secrets
  - `kimiUsage.openConsole` — 浏览器打开 Kimi Code 控制台
  - `kimiUsage.openSettings` — 打开扩展设置
  - `kimiUsage.toggleMock` — 切换 Mock 模式并持久化到配置
  - `kimiUsage.openDebugOutput` — 打开调试输出面板
- 监听配置变更，自动重新调度轮询并刷新。
- 启动时自动执行一次刷新并设置定时轮询。

### `src/kimiApi.ts`

- `UsageSnapshot` — 内部统一的数据结构，包含 5h/周/月的剩余量、上限、重置时间。
- `KimiApiClient` — 封装 `fetch()` 调用 `GET {baseUrl}/coding/v1/usages`，Bearer Token 认证。
- 解析 API 响应，提取 `window.duration === 300`（5 小时）的滚动窗口数据。
- `generateMockSnapshot()` — 生成固定模拟数据，用于 Mock 模式预览。

### `src/statusBar.ts`

- `StatusBarManager` — 封装 `vscode.StatusBarItem`。
- `setSnapshot()` / `setError()` / `setNoToken()` — 三种状态渲染。
- 主文本格式：`$(sparkles)KIMI · 5h 80% · 本周 60%`
- Tooltip 为 Markdown，包含各额度详情、重置时间、倒计时、快捷命令链接。
- 工具函数：`formatCountdown()`（`xxdxxhxxm`，为 0 的部分省略）、`formatResetTime()`（`M/D HH:mm`）。

## 配置项（`contributes.configuration`）

| 键 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `kimiUsage.pollIntervalMinutes` | number | 5 | 自动刷新间隔（分钟，范围 1–120） |
| `kimiUsage.statusBarIcon` | string | `sparkles` | 状态栏图标（VSCode codicon 名称） |
| `kimiUsage.apiBaseUrl` | string | `https://api.kimi.com` | API 基础地址 |
| `kimiUsage.mockMode` | boolean | false | 是否使用模拟数据 |
| `kimiUsage.debugMode` | boolean | false | 调试模式：输出面板记录 API 请求与响应 |
| `kimiUsage.displayModeWindow5h` | string | `remaining` | 5h 窗口显示模式：remaining / used |
| `kimiUsage.displayModeWeekly` | string | `remaining` | 本周额度显示模式：remaining / used |
| `kimiUsage.displayModeMonthly` | string | `remaining` | 赠送额度显示模式：remaining / used |

## 发布流程

> ⚠️ **重要**：发布必须走自动化流程，不要手动执行 `vsce publish`。

### 自动化发布（推荐）

推送 `v*` 格式的 tag 即可触发 `.github/workflows/publish.yml`：

```bash
# 1. 更新 package.json 版本号 + CHANGELOG.md
git add -A
git commit -m "🏷️ release: bump version to X.Y.Z"

# 2. 打 tag 并推送（必须先 push commit，再 push tag）
git push
git tag vX.Y.Z
git push origin vX.Y.Z
```

推送后 GitHub Actions 自动执行：
1. 编译 TypeScript
2. 从 CHANGELOG.md 提取当前版本变更说明
3. 打包 .vsix
4. 创建 GitHub Release（含 CHANGELOG + .vsix 附件）
5. 发布到 VSCode 扩展商店

### CHANGELOG 格式要求

版本标题必须严格使用 `## [版本号] - 日期` 格式，否则 Release 描述为空：

```markdown
## [0.9.0] - 2026-07-23

### Added
- 新功能描述

### Fixed
- 修复描述
```

### 手动发布（仅紧急情况）

```bash
npm run compile
npx vsce publish
```

## 安全与隐私

- **API Key 存储**: 通过 `vscode.ExtensionContext.secrets` 保存，**不会写入 `settings.json` 或任何本地明文文件**。
- 输入框使用 `password: true`，避免在 UI 中明文显示。
- 网络请求仅通过标准 `fetch()` 发送，无额外代理或证书处理。

## 开发约定

- **语言**: 代码中所有字符串、注释、文档、UI 提示均为中文。
- **TypeScript**: `strict: true`，启用所有严格类型检查。
- **模块**: CommonJS 输出，`esModuleInterop: true`。
- **Source Map**: 编译生成 `.js.map`，调试时可用。
- **无测试框架**: 当前项目无单元测试、无测试目录、无测试依赖。验证功能请通过 `F5` 调试或手动安装 `.vsix`。
- **版本号**: 手动维护于 `package.json` 和 `CHANGELOG.md`，无自动化版本工具。
- **代码风格**: 简洁直接，无 linter（eslint/prettier）配置，以 TypeScript 编译通过为准。

## 修改建议

- 新增命令需在 `package.json` 的 `contributes.commands` 和 `menus.commandPalette` 中注册，再在 `extension.ts` 中实现并 `registerCommand`。
- 修改 API 数据结构时，同步更新 `UsageSnapshot` 接口以及 `KimiApiClient.fetchUsage()` 的解析逻辑。
- 状态栏文本和 tooltip 的修改集中在 `StatusBarManager`。
- 如需添加测试，建议引入 `vscode-test` + `mocha` 或 `vitest`，并配置 `.vscode-test/` 的忽略规则。
