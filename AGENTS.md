# AGENTS.md

本文件是后续 agent、协作者和自动化代码助手进入 PrettyCOM 项目时的工作说明。默认使用中文沟通，中文文档优先。

## 项目目标

PrettyCOM 的目标是打造一个好看、好用、稳定、功能完整的桌面串口调试助手。产品气质应接近精致的开发者工具：克制、清晰、高密度、键盘优先，避免传统串口助手常见的粗糙堆叠感。

当前项目是 Tauri + React 桌面应用工作台。已实现串口枚举、打开/关闭、ASCII/HEX 收发、日志导出与 com0com 虚拟口测试；Frame/Parse 协议解析仍为占位 UI。

## 工作原则

- 默认使用中文编写说明、提交说明和用户可见文案。
- 默认界面语言是中文，但必须保留英文切换能力。
- 不要把尚未实现的串口硬件能力写成已完成。
- 不要在生产默认界面遗留测试数据、假日志或自动加载的样本数据。
- 开发样本必须放在显式 dev-only 入口中，且生产构建不应默认出现。
- 历史记录、日志记录等用户数据必须支持删除和清空。
- UI 应保持克制精致；默认 `light`/`dark` 不使用装饰性大渐变或玻璃拟态堆叠。可选风格化主题（`pink`/`anime`）的吉祥物与轻动画见主题模块规范，不得影响串口核心交互密度。
- 日志表头筛选、高亮规则、侧栏收起、打开串口按钮和串口退出释放等交互要求详见 [UI 交互与行为要求](docs/product/ui-interaction-requirements.md)，修改相关功能时必须同步维护该文档。
- **主题与业务解耦**：主题、吉祥物、装饰动画一律在 `src/themes/` 维护；串口/日志/发送/store action **禁止** `if (theme)`。详见 [主题模块开发指南](docs/dev/themes.md) 与项目 skill `.cursor/skills/prettycom-themes/SKILL.md`。

## 技术约束

- 桌面框架使用 Tauri v2。
- 前端使用 React、TypeScript、Vite。
- 样式使用 Tailwind CSS v4。
- 基础组件优先使用 shadcn/ui 和 Radix UI。
- 图标优先使用 lucide-react。
- 分栏布局使用 react-resizable-panels。
- 表格和虚拟列表使用 TanStack Table / TanStack Virtual。
- 命令编辑器使用 CodeMirror。
- 全局状态使用 Zustand。

不要手搓基础 UI 组件，例如按钮、弹窗、下拉菜单、表格、侧栏、标签页、输入框和确认框。确实需要自定义时，应只封装 PrettyCOM 特有业务组件，并在内部组合成熟组件。

## 前端规范

- 新增用户可见文案时，必须同步维护中英文翻译。
- 中文文案应直接、清楚，避免营销化表达。
- 空状态、错误状态、加载状态必须清楚可见。
- 默认生产启动不应出现假日志；日志区应展示空状态。
- 可操作控件应有清晰标签或无障碍名称。
- 紧凑工具界面中不要使用过大的标题、营销式 hero 或卡片嵌套卡片。
- 保持桌面宽屏体验优先，当前不以移动端为主要目标。

## 数据规范

- 生产状态默认无日志、无样本帧。
- 发送命令可以写入 TX 日志和最近命令历史。
- 日志记录支持全部清空，不提供单条删除 UI（`deleteLogEntry` 仍供发送失败回滚使用）。
- 最近命令历史必须支持回填、单条删除和全部清空。
- 开发样本只能通过开发环境显式按钮或其他明确 dev-only 入口加载。
- 不要将测试数据、演示数据或 mock 数据接到生产默认数据流。
- 新功能须带测试，不得降低 [功能覆盖矩阵](docs/testing/feature-coverage-matrix.md) 覆盖率。

## 测试规范

### 测试分层

- **Vitest UT**：纯函数、`prettycom-store`、Tauri 桥接（mock `@tauri-apps/api`）
- **Rust UT/集成**：`serial_util` 单元测试 + com0com 环回（`COM10`↔`COM11`）
- **Web E2E**：Playwright + `E2E_MOCK=1` 替换 Tauri 插件，覆盖 FCM 中标记为 Web E2E 的用户流程（非全部 FCM 项）
- **Desktop E2E**：tauri-driver + 真实 Tauri + com0com（脚手架在 `e2e/desktop/`；未安装 tauri-driver 时 `npm run test:e2e:desktop` 以 0 退出并打印安装说明）

### 串口相关测试前置

1. 管理员 PowerShell 执行一次：`npm run test:ports:install`
2. 跑 Rust 集成 / Desktop E2E 前：`npm run test:ports:check`
3. 虚拟口异常时：`npm run test:ports:repair`（修复 com0com 配置）或 `npm run test:ports:diagnose`（诊断端口状态）
4. 可选环境变量：`PRETTYCOM_TEST_PORT_A=COM10`，`PRETTYCOM_TEST_PORT_B=COM11`
5. **禁止**在自动化中依赖 COM5/STM32 等物理硬件

详见 [虚拟串口安装](docs/testing/virtual-serial-setup.md) 与 [FCM](docs/testing/feature-coverage-matrix.md)。

### Agent 完成定义（DoD）

- 改动 `serial-defaults` / `store` / `serial.ts` / `lib.rs` → 补/改对应 UT
- 改动用户可见流程（`App.tsx`）→ 补 Web E2E 或更新 FCM
- 改动 `src/themes/` 或主题相关 UI → 读 `.cursor/skills/prettycom-themes/SKILL.md`；补/改 `registry.test.ts`、`useThemeFx.test.ts`；更新 [主题开发指南](docs/dev/themes.md)；生成后 **必须** `npm run build`（防范 UTF-16 编码踩坑）
- 改动真实串口收发 → 跑 `npm run test:rust`
- 声称完成前必须运行相关命令并报告实际输出
- 发布安装包前必须 `npm run test:production-gate`（或 `npm run build`）；**禁止**在 `E2E_MOCK=1` 环境下执行 `vite build` / `tauri build`

## 主题与装饰（速查）

| 项 | 约定 |
| --- | --- |
| 模块路径 | `src/themes/`（`applyTheme` 唯一改 `data-theme` / `.dark`） |
| 可用 ID | `light`、`dark`、`pink`、`anime`（霓虹）、`cyber`（赛博） |
| 动画 | `ThemeAnimationBridge` 只读订阅 store，禁止在业务 action 内触发 |
| 吉祥物 | PrettyCOM 原创 SVG，禁止第三方 IP |
| 详细文档 | [docs/dev/themes.md](docs/dev/themes.md) |
| Agent skill | [.cursor/skills/prettycom-themes/SKILL.md](.cursor/skills/prettycom-themes/SKILL.md) |

### 主题相关踩坑（Windows 协作）

1. **UTF-16 文件**：Agent 批量写出 `src/themes/**` 可能为 UTF-16 LE，导致 `tsc`/Vite 失败 → 用 UTF-8 无 BOM 重写并跑 `npm run build`。
2. **漏挂 `.dark`**：`anime` 等深色风格须在 registry 设 `usesDarkClass: true`，否则 shadcn `dark:` 变体失效。
3. **业务耦合主题**：任何发送/连接成功回调里不得按主题播动画；只用装饰层订阅。
4. **E2E 文案**：中文界面主题名为「霓虹主题」，卡片 testid 仍为 `theme-card-anime`（主题 ID 未改）。

## 验证规范

修改前端 UI、状态或文案后，至少运行：

```bash
npm run build
npm test
```

发布安装包前 additionally：

```bash
npm run test:production-gate
npm run build:release
```

涉及 Tauri/Rust 时 additionally：

```bash
cd src-tauri && cargo check
```

UI 流程变更时：

```bash
npm run test:e2e
npm run test:fc
npm run test:production-gate
```

## 常用命令

```bash
npm install
npm run dev
npm run build
npm run preview
npm run tauri build
npm test
npm run test:coverage
npm run test:rust
npm run test:e2e
npm run test:e2e:desktop
npm run test:all
npm run test:fc
npm run test:ports:install
npm run test:ports:check
npm run test:ports:repair
npm run test:ports:diagnose
```

Windows 打包产物通常位于：

```text
src-tauri/target/release/app.exe
src-tauri/target/release/bundle/msi/
src-tauri/target/release/bundle/nsis/
```

## 协作注意事项

- 如果工作树中已有他人修改，不要回滚无关改动。
- 修改 shadcn/ui 生成组件时要谨慎，只做必要的小扩展，并保持 API 简洁。
- 文档、代码和界面描述必须如实反映当前能力。
- 每次完成工作前，应说明实际验证过的命令和结果。
