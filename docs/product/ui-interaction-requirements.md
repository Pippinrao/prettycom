# PrettyCOM UI 交互与行为要求

本文档记录 PrettyCOM 当前已确认的界面交互要求。后续修改 UI、状态流或串口生命周期时，应优先遵守本文档，并同步更新测试覆盖矩阵。

## 总体原则

- 界面默认使用中文，新增用户可见文案必须同步维护英文回退文案。
- 工作台应保持克制、高密度、键盘优先，不做营销式大标题、装饰性渐变或卡片堆叠。
- 生产启动默认不加载假日志、演示帧或测试数据；开发样本只能通过开发环境中的显式入口加载。
- 可操作控件必须有清晰标签或无障碍名称，图标按钮需要可理解的 `aria-label` 或 tooltip。
- 普通 Web 预览环境不能因为缺少 Tauri runtime 而白屏；Tauri API 事件监听应仅在 Tauri 环境或 E2E mock 环境中启用。

## 日志 Chrome（LogChrome）

- 原 **LogToolbar** 与 **LogTableHeader** 第一层已合并为单一 **LogChrome** 组件，减少垂直占用。
- LogChrome 分为两层：
  - **工具行（约 44px）**：连接态指示点、搜索、方向筛选、高亮规则、RX 显示模式、**日志格式**（`logDisplayMode`，ASCII/HEX）、自动滚动、**更多操作**（`log-more-menu`）。
  - **列头行（约 28px）**：时间、方向、载荷、字节、间隔。
- **更多操作**菜单（`log-more-menu`）收纳次要操作：导出日志、清空、可见/总条数、高亮规则计数。
- 工具行须 `min-w-0 overflow-x-auto`，保证右边界控件可滚动到达、不被检查器裁切。
- 不再在日志区重复展示 Live/Idle 徽章（连接态由 TopBar 承担）。
- **日志格式**（`logDisplayMode`）与命令发送区的**发送格式**（`sendDisplayMode`）为独立状态，互不影响。
- 无日志时显示空状态；开发环境下空状态提供「开发样本」按钮（`dev-sample-btn`），加载后 LogChrome 出现。
- 筛选无匹配时 LogChrome 保持可见；仅在列表区域显示「没有匹配的日志」。
- 自动滚动开启时按钮须有明显底色（`bg-primary/15` + `border-primary/25`），并保持 `aria-pressed`。
- 以下 `data-testid` 须保持稳定：`log-search`、`log-filter-direction`、`log-rx-display-mode`、`log-display-mode`、`auto-scroll-toggle`、`log-more-menu`、`clear-logs-btn`、`log-filter-count`、`highlight-rules-open`。

## 日志表头、筛选与高亮

- 日志筛选入口位于 **LogChrome** 工具行（不再使用独立 LogToolbar）。
- 表头区域分为两层（见上文 LogChrome）；列名层仍为：时间、方向、载荷、字节、间隔。
- 搜索筛选只负责过滤可见日志，不应改变原始日志数据。
- 筛选无匹配时，日志表头（含搜索框、方向筛选、高亮入口）必须保持可见；仅在日志列表区域显示「没有匹配的日志」。
- 方向筛选应支持全部、RX、TX、SYS。
- RX 显示模式（`log-rx-display-mode`）默认**终端模式**：连续文字流，遇 `\n` 换行；可切换**逐帧显示**（每个 USB 读包一行）。
- 高亮功能应使用“弹窗 + 规则列表”交互，不使用单个纯文本输入框作为主入口。
- 高亮规则弹窗宽度约为 `960px`（小屏下 `min(100vw - 2rem, 960px)`），规则行采用两行 flex 布局，避免出现横向滚动。
- 高亮规则要求：
  - 支持多条规则。
  - 每条规则可启用或停用。
  - 每条规则可选择普通关键词或正则表达式（正则使用 `gi`，不区分大小写）。
  - 每条规则可单独选择颜色。
  - 每条规则提供测试样本文本输入框，实时预览匹配效果并显示匹配计数。
  - 每条规则提供「定位到日志」按钮：在当前会话已筛选日志中查找首条命中行，关闭弹窗后滚动并选中该行。
  - 无效正则应在弹窗内提示，并在日志渲染时忽略该规则，不允许导致页面崩溃或白屏。
  - 多条规则重叠时应稳定渲染，不应产生嵌套 `mark` 或破坏日志文本。
- 高亮匹配依据当前日志显示模式（ASCII 或 HEX）格式化的 payload，切换显示模式后匹配结果可能不同。
- 高亮只影响显示效果，不参与筛选匹配，不应修改日志内容。

## 本地持久化

- UI 状态通过 Zustand `persist` 写入浏览器 `localStorage`，键名 `prettycom-ui-state`。
- 必须持久化：会话列表（含各会话 RX/TX 日志）、高亮规则（`filter.highlightRules`）、方向筛选、日志保留上限、**主题（`theme`）**、**默认发送后缀（`suffix`）**、**日志显示模式（`logDisplayMode`）**、**发送显示模式（`sendDisplayMode`）**、**工具面板开关（`inspectorOpen`）**、最近命令、别名、**发送列表**与界面偏好。
- 每个会话日志条数受「日志保留上限」约束，默认 **3000** 条，可在设置中调整（500–100000）；超出时丢弃最旧条目。
- 重启后串口连接状态一律恢复为未连接；未读计数清零。
- 生产构建不得预置 Test Port / COM10 等开发或 E2E 占位会话；仅 dev 服务器与 E2E mock 环境可注入 `test-default` 会话。
- **完整卸载**（NSIS setup.exe 与 MSI 安装包）必须删除 `%LOCALAPPDATA%\com.prettycom.app`、`%APPDATA%\com.prettycom.app` 及 `HKCU\Software\prettycom\PrettyCOM`；覆盖升级时不删除用户数据。
- 用户手动导出的日志文件不在卸载清理范围内。
- 新安装默认可提供一组示例快捷命令（如 AT+RST），与普通快捷命令相同，用户可编辑或删除；不得单独展示「内置宏」区块。
- 用户数据（会话、日志、快捷命令、发送列表、高亮规则、主题等）保存在 WebView2 本地存储，路径约为 `%LOCALAPPDATA%\\com.prettycom.app\\EBWebView\\`。
- **NSIS 卸载**（`PrettyCOM_*_setup.exe`）：完整卸载时会自动删除上述应用数据目录（升级安装不清理）。
- **MSI 卸载**：仅移除程序文件与快捷方式，**不会**自动删除应用数据；需手动删除 `%LOCALAPPDATA%\\com.prettycom.app` 与 `%APPDATA%\\com.prettycom.app`，或使用 NSIS 安装包卸载。
- 用户自行导出的日志 CSV 保存在其选择的导出路径，卸载不会删除这些文件。
- 日志搜索框内容（`filter.search`）可随 `filter` 一并持久化，但不应在生产默认注入假数据。

## 日志列表布局

- 日志列表必须保留虚拟滚动能力，避免大量日志导致渲染卡顿。
- 行布局应稳定，列宽变化不能导致行高抖动。
- 选中行、RX/TX/SYS 方向色应保持可辨识。
- 筛选后必须显示可见条数/总条数，便于确认筛选范围。
- RX/TX/SYS 方向色使用语义 token（`log-rx` / `log-tx` / `log-sys`），深浅主题均须可辨识；禁止在行样式中硬编码 `sky-*` / `emerald-*` 等 Tailwind 色板类名。

## 状态栏（StatusBar）

- 位于日志流与底部命令发送区之间，高度约 **24px**（`h-6`）。
- **仅当当前会话存在至少一条日志时显示**；空日志或清空后隐藏。
- 展示：连接态（绿点 + 已连接端口 / 空闲 / 端口错误）、RX 累计字节、TX 累计字节、可见/总日志条数、自动滚动开/关。
- `data-testid="status-bar"` 须保持稳定。

## 日志行右键菜单

- 每条日志行支持右键上下文菜单（`ContextMenu`）。
- 菜单项：**复制载荷**（当前日志显示模式下的 payload）、**复制 HEX**（原始 hex 字段）。
- 以下 `data-testid` 须保持稳定：`log-row-copy-payload`、`log-row-copy-hex`。

## 键盘快捷键

- **Ctrl/Cmd+L**：聚焦日志搜索框（`log-search`）；无 LogChrome 时无效果。
- **Mod+Enter**：在命令输入区发送（已有）。

## 设置面板

- 设置 Sheet 采用**扁平行列表**布局（标签 + 控件两列），不使用 Card 嵌套 Card。
- 以下 `data-testid` 须保持稳定：`language-select`、`log-retention-limit`、`theme-select`、`default-suffix-select`。

## 侧栏布局

- 左侧会话栏展开时占据固定宽度，主工作区从侧栏右侧开始。
- 左侧会话栏收起时只能保留图标栏宽度，不能遮挡顶部栏、日志表头、日志内容或右侧工具面板。
- 当前实测目标：收起状态侧栏宽度约为 `48px`，主工作区左边界应与侧栏右边界对齐。
- 侧栏收起按钮必须始终可见且可点击。
- 会话删除入口位于会话行末尾 inline 删除按钮（`session-row-delete-{sessionId}`），hover 显示；右键菜单删除为次要入口。Footer 不再放置独立「移除会话」按钮。
- **icon 折叠态**：会话项仅居中显示连接状态点（`StatusDot`），隐藏会话名与删除按钮；Header Logo 居中缩小为 `size-7`；Settings 按钮 icon-only + tooltip。

## 命令发送区

- 命令发送区位于工作台底部，采用**单行并列结构**：左侧 CodeMirror 输入、`send-options-trigger` 下拉菜单、发送按钮。
- 输入区随内容自动增高：**最小约 40px**，**最大约 96px**（最多约 3 行）；超出时在输入框内滚动，长命令应启用换行（`lineWrapping`）。
- **发送选项**（`send-options-trigger`）DropdownMenu 收纳后缀（`send-suffix-*`）与发送格式（`send-format-*`）；触发器摘要展示当前 `CRLF · ASCII` 类文案。
- **Mod+Enter** 提示通过发送按钮 Tooltip 展示，不占第二行。
- **不提供循环发送**：底部命令区仅支持单次发送；带循环与间隔的批量发送统一在工具面板「列表发送」标签中配置（见下文）。
- 编辑器主题须跟随设置中的 `theme`（通过 `getCodeMirrorTheme()` 映射为 CodeMirror 浅色/深色），不得硬编码为 dark。
- 多行输入下 **Mod-Enter**（Ctrl/Cmd+Enter）发送命令；普通 Enter 仍用于换行。
- 快捷命令与最近命令历史仅在工具面板「常用命令」标签维护。
- 以下 `data-testid` 须保持稳定，供 E2E 与自动化使用：`command-input`、`send-options-trigger`、`send-suffix-*`、`send-format-*`、`send-command`。

## 主题模块与装饰动画

- 主题以可插拔模块维护于 `src/themes/`：`registry` 定义 meta，`applyTheme()` 是唯一修改 `<html data-theme>` 与 `.dark` 的入口。开发细节与踩坑见 [主题模块开发指南](../dev/themes.md)。
- 可用主题 ID：`light`、`dark`、`pink`、`anime`（霓虹）、`cyber`（赛博）；业务层（串口、日志、发送）**禁止** `if (theme)` 分支。
- 设置面板 `ThemeAppearanceSection` + `ThemeCardGrid`（2 列卡片）提供五主题；容器保留 `data-testid="theme-select"`，各卡 `data-testid="theme-card-{id}"`（如 `theme-card-anime`、`theme-card-cyber`）。
- 装饰组件：`ThemeEmptyIllustration`（日志空状态）、`ThemeCompanionRail`（pink/neon/cyber 侧栏 Footer **设置按钮上方** 陪伴区，约 80px 吉祥物）、`ThemeWatermark`（右下水印，`pointer-events-none`）。
- 动画由 `ThemeAnimationBridge` 只读订阅 store（连接态边沿、TX 日志计数），通过 `data-fx` 驱动 `theme-fx.css`；**禁止**在 `openPort` / `appendLog` 等业务 action 内触发主题动画。
- 悬停互动仅作用于可交互吉祥物（空状态、侧栏 Footer、设置主题预览）；水印不参与 hover。
- 吉祥物 SVG 为 PrettyCOM 原创 Q 版资产（樱花兔、霓虹狐、星猫、赛博机器人），禁止第三方 IP 素材。
- `@media (prefers-reduced-motion: reduce)` 下禁用 hop/粒子/悬停摆动动画。
- 以下 `data-testid` 须保持稳定：`theme-select`、`theme-card-{id}`、`theme-companion-rail`、`theme-empty-illustration`、`theme-watermark`。
- 主题切换不得影响既有 E2E `data-testid` 与日志虚拟列表行为；动画不断言像素，仅断言流程无报错（FCM **F29**、**F30**）。

## 工具面板（原检查器）

- UI 标题为 **「工具」**（英文 `Tools panel`）；`data-testid` 前缀 `inspector-*` **保持不变**。
- 标题栏高度约 **48px**（`h-12`），展示工具面板标题与当前会话端口；**不提供 Pin 固定按钮**。
- **两标签**：`inspector-tab-commands`（常用命令）、`inspector-tab-sendlist`（**列表发送**）；**已删除 Port 页签**（串口参数移至 TopBar）。
- 右栏使用嵌套 `SidebarProvider` + `<Sidebar side="right" collapsible="icon">`，宽度 `--sidebar-width: 17.5rem`（280px）；**不再**使用 `ResizablePanelGroup` 分割。
- 折叠开关：`inspector-toggle`（TopBar）与侧栏 `SidebarRail`；折叠态宽约 `48px`，展开态约 `280px`。
- icon 折叠态：纵向两枚 tab 图标（常用命令 / 列表发送）+ Tooltip。
- `data-testid="inspector-panel"` 须保持稳定。
- **常用命令**标签（`inspector-tab-commands`）采用纵向 flex 布局：快捷命令区约占可用高度 **65%**（`flex-[2]`），最近命令区约占 **35%**（`flex-1`）；去掉外层 `ScrollArea`，各区内部自行滚动。
- 快捷命令标题行提供 DSL 导入/导出按钮：`alias-dsl-export`、`alias-dsl-import`；语法与列表发送 DSL 一致，命令行使用 `@label:` 扩展映射快捷名称。
- **添加快捷命令**为 icon 按钮 `add-alias-btn`（`Plus` 图标），`title`/`aria-label` 提供完整文案，避免窄侧栏英文文字溢出。
- **DSL 对话框**（快捷命令 `alias-dsl-*`、列表发送 `send-list-dsl-*`）共用同一交互：导出时标题「导出 DSL」、文本只读、提供 **复制 DSL** 与 **保存到文件**；导入时标题「导入 DSL」、可编辑文本、主按钮「导入」。`data-testid` 后缀：`-dialog`、`-copy`、`-save-file`、`-confirm-import`、`-import-error`（无有效命令时）。
- 最近命令区标题行提供折叠按钮 `recent-commands-toggle`（`ChevronDown`/`ChevronRight`）；折叠状态持久化 `recentCommandsCollapsed`；折叠时仅保留标题行，展开时显示列表或空状态。

## 列表发送（工具面板）

- 入口位于右侧工具面板 **「列表发送」** 标签（`inspector-tab-sendlist`），不在底部命令发送区。
- 支持多条发送列表的创建、选择、重命名与删除；列表数据随 `prettycom-ui-state` 持久化。
- **添加/编辑命令**通过 `send-list-cmd-dialog` 弹窗完成，列表行只读展示；字段含命令正文、发送次数（0=无限）、间隔毫秒、后缀、ASCII/HEX 格式。
- 每条命令独立配置 `suffix` 与 `mode`；列表级 `suffix`/`mode` 仅作新命令默认值，**不在列表底部展示**两个 Select。
- 列表行展示规范：主行 `font-mono` 命令正文；次行人类可读 meta（如「发送 1 次 · 间隔 50 ms · CRLF · ASCII」），**禁止**行内 `1×50ms` 网格编辑。
- 主操作为 **「全部发送」** / **「停止发送」**：按命令顺序依次发送，每条命令按自身循环次数、间隔与 suffix/mode 执行；运行中进度徽章使用「第 n/m 条 · 第 k 次发送」类文案。
- 列表底部保留：列表名称、列表循环、列表间隔、「全部发送/停止」、DSL 导入导出（icon 按钮）。
- 列表选择下拉 `send-list-select` 使用 `position="popper"`，触发器 `min-w-0 w-full` 截断长名称，避免下拉层拉伸遮挡同行工具按钮。
- 串口断开或发送失败时须停止列表发送，避免后台继续写端口。
- 列表工具栏提供 DSL 导入/导出：`send-list-dsl-export`、`send-list-dsl-import`；对话框行为与快捷命令 DSL 一致（见上）。
- 支持 DSL 导入/导出（含 `@listloop`、`@listinterval`、`@loop`、`@interval`、可选逐条 `@suffix`/`@mode` 及列表级元数据）。
- 发送列表编辑区中，列表名称下方的命令区标题应使用「命令列表」，不得复用工具面板「常用命令」标签文案。

## 串口打开与连接按钮

- **打开串口**仅保留 TopBar 一处主入口（`open-port-btn`），带插头图标；侧栏不再重复「工具 → 打开串口」或底部重复按钮。
- TopBar **不提供**刷新串口按钮；刷新串口仅在打开串口对话框内（`refresh-ports-btn`）。
- 无会话空状态仅保留 TopBar 打开串口入口，居中区域不再放置第二颗打开串口按钮。
- 当前会话的连接/断开由 TopBar `session-connect-toggle` 承担，语义明确：
  - 未连接时显示“连接串口 + 端口号”。
  - 已连接时显示“断开串口 + 端口号”。
  - 错误状态应使用错误色但仍保留可操作入口。
- 端口号应使用紧凑的等宽标签展示，便于快速识别 COM 口。
- 连接按钮之后须展示完整串口参数条（`session-port-params`）：波特率、数据位/校验/停止位、流控缩写（无 / RTS / XON）；连接态/错误态颜色与连接按钮一致。
- 会话名行不再重复展示 `· 115200 8N1` 类摘要（参数已由 `session-port-params` 承担）。
- 工具面板折叠开关位于 TopBar（`inspector-toggle`）。
- 打开串口对话框中的确认按钮仍使用“打开并连接”，用于创建新会话并立即连接。

## 串口生命周期

- 用户关闭窗口或进程正常退出时，必须主动关闭所有已打开串口。
- 串口状态容器释放时应有兜底关闭逻辑，避免读线程和串口句柄泄漏。
- 真实硬件端口验证时，应先证明 PrettyCOM 连接中外部进程无法打开该端口，再证明 PrettyCOM 正常退出后外部进程可以重新打开该端口。
- 自动化测试禁止依赖 COM5、STM32 等物理硬件；物理端口只用于人工或显式真实设备调试。

## 验证要求

- 修改 UI、状态或用户可见文案后，至少运行：

```bash
npm run build
npm test
```

- 修改用户可见流程时，还应运行：

```bash
npm run test:e2e
npm run test:fc
```

- 修改 Tauri/Rust 侧串口生命周期时，还应运行：

```bash
cd src-tauri
cargo check
cargo test --lib
```

- 若运行完整 Rust 串口集成测试失败，必须说明是否因为本机缺少 com0com `COM10`/`COM11` 虚拟串口，而不能把该失败说成已通过。
