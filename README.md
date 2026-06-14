# PrettyCOM

PrettyCOM 的目标是打造一个好看、好用、稳定、功能完整的桌面串口调试助手。它面向嵌入式、硬件调试、协议分析和日常串口排障场景，希望把传统串口工具从“能用但粗糙”推进到更接近 Raycast / Linear 气质的开发者工作台：界面克制、信息密度高、键盘优先、状态反馈清楚。

当前版本是基于 Tauri + React 的桌面串口调试工作台，默认使用中文界面，并支持在设置中切换为英文。当前已接入基础串口枚举、打开/关闭、ASCII/HEX 收发、日志导出和 com0com 虚拟串口测试；Frame/Parse 协议解析仍是占位 UI，不应描述为已完成能力。

## 当前能力

- 三栏工作台布局：左侧会话/串口导航，中间实时日志区域，右侧帧检查器、解析、宏命令和串口配置。
- 默认中文界面，可在“设置”中切换为英文。
- 默认暗色主题，适合长时间、高密度串口调试。
- 日志区默认无生产假数据，空状态清楚。
- 开发环境提供显式的开发样本入口，生产构建不默认加载测试数据。
- 串口枚举、打开、关闭、连接/断开和基础错误状态反馈。
- 命令编辑器使用 CodeMirror，支持命令输入、后缀选择和宏命令插入。
- 支持 ASCII/HEX 发送，发送命令后会记录 TX 日志和最近命令历史。
- 支持真实 RX 数据写入实时日志，Web E2E 使用 mock 串口事件验证。
- 日志表头提供搜索筛选、方向筛选、可见条数统计和高亮规则入口。
- 高亮规则使用弹窗列表，支持多条规则、正则表达式、逐条启停和逐条颜色配置；弹窗内可输入测试样本文本预览匹配，并定位到日志首条命中行。
- 快捷命令（别名）支持增删改，可在检查器「常用命令」标签中管理。
- 日志记录支持全部清空，不提供单条删除。
- 最近命令历史支持回填、单条删除和全部清空。
- 日志支持导出 CSV 文件。
- 全局命令面板支持打开串口、运行宏、切换日志视图、打开设置等操作入口。
- 右侧检查器可展示选中日志的字段、解析状态、宏命令和串口配置。
- 窗口关闭或进程正常退出时会主动释放已打开串口。

## 尚未完成

以下能力是 PrettyCOM 的后续目标，不应在当前版本中当作已实现功能描述：

- 协议解析器、CRC 校验和帧规则配置的真实实现。
- 宏命令持久化编辑。
- 多会话真实数据隔离。
- 安装包签名、自动更新和发布流程。

## 产品与交互要求

- [文档索引](docs/README.md)
- [AGENTS.md](AGENTS.md) — agent 与协作者工作说明
- [UI 交互与行为要求](docs/product/ui-interaction-requirements.md)：记录日志表头筛选、高亮规则、侧栏收起、打开串口按钮、串口退出释放等已确认要求。
- [功能覆盖矩阵](docs/testing/feature-coverage-matrix.md)：记录已实现功能与 UT / Web E2E / Desktop 验证的映射。
- [虚拟串口安装](docs/testing/virtual-serial-setup.md)：com0com 与 `COM10`/`COM11` 测试环境。

## 测试命令

```bash
npm test              # Vitest 单元测试
npm run test:coverage # 覆盖率报告
npm run test:e2e      # Playwright Web E2E（E2E_MOCK=1）
npm run test:e2e:desktop  # Desktop E2E 脚手架
npm run test:rust     # Rust 单元 + com0com 集成（需虚拟串口）
npm run test:fc       # FCM Web E2E 覆盖校验
npm run test:all      # coverage + rust + e2e
```

Tauri 开发模式（桌面窗口 + 热更新）：

```bash
npm run tauri dev
```

> **版本说明：** `package.json` 中 npm 包版本为 `0.0.0`（未发布）；安装包与应用内版本为 **0.1.0**（见 `src-tauri/tauri.conf.json`）。

## 技术栈

- 桌面壳：Tauri v2
- 前端框架：React + TypeScript + Vite
- 样式系统：Tailwind CSS v4
- UI 组件：shadcn/ui、Radix UI
- 图标：lucide-react
- 布局：react-resizable-panels
- 表格与虚拟滚动：TanStack Table、TanStack Virtual
- 命令编辑器：CodeMirror
- 状态管理：Zustand
- 自动化验证：Playwright

## 开发命令

安装依赖：

```bash
npm install
```

启动前端开发服务器：

```bash
npm run dev
```

前端类型检查和生产构建：

```bash
npm run build
```

预览生产构建：

```bash
npm run preview
```

检查 Tauri / Rust 侧编译状态：

```bash
cd src-tauri
cargo check
```

生成桌面应用安装包：

```bash
npm run tauri build
```

## 打包产物

Windows 打包成功后，产物通常位于：

```text
src-tauri/target/release/app.exe
src-tauri/target/release/bundle/msi/
src-tauri/target/release/bundle/nsis/
```

当前配置会生成 MSI 和 NSIS 安装包，例如：

```text
src-tauri/target/release/bundle/msi/PrettyCOM_0.1.0_x64_en-US.msi
src-tauri/target/release/bundle/nsis/PrettyCOM_0.1.0_x64-setup.exe
```

## 项目约束

- 生产界面默认不展示测试日志或假数据。
- 开发样本只能通过显式的开发环境入口加载。
- 基础 UI 优先使用 shadcn/ui、Radix 和已有成熟组件，不手搓按钮、弹窗、表格、侧栏等基础控件。
- 默认界面语言为中文，英文作为设置项保留。
- 新增用户可见文案时，应同步维护中英文翻译。
- 修改 UI 后至少运行 `npm run build`。
- 涉及 Tauri 配置、Rust 代码或打包流程时，应运行 `cargo check` 或 `npm run tauri build`。

## 项目愿景

PrettyCOM 不是只追求“能收发串口”的小工具，而是一个面向开发者的串口调试工作台。长期目标包括稳定的多会话串口通信、协议帧检查、宏命令自动化、日志导出、错误诊断、可配置解析器和高性能日志流，让硬件调试过程更清晰、更可靠，也更愿意被长期使用。
