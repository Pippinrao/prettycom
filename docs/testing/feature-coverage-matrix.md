# PrettyCOM 功能覆盖矩阵（FCM）

已实现功能的自动化覆盖映射。每项至少有一条 UT 或 E2E 用例。

| ID | 功能 | UT | Web E2E | Desktop | 备注 |
| --- | --- | --- | --- | --- | --- |
| F01 | 默认会话与侧栏 | store.test | Y | - | test-default / COM10 |
| F02 | 连接/断开 | serial.test | Y | COM10 | mock invoke open/close |
| F03 | ASCII 发送+后缀 | defaults.test | Y | 环回 | mock echo RX |
| F04 | 打开串口对话框 | - | Y | scaffold | mock list_ports + connect |
| F05 | 多会话切换 | store.test | Y | - | 侧栏切换会话 |
| F06 | 删除会话 | store.test | Y | - | 多会话时右键删除其一 |
| F07 | 发送按钮禁用态 | - | Y | - | 未连接 |
| F08 | 日志搜索过滤 | log-filter.test | Y | - | |
| F09 | 方向过滤 | log-filter.test | Y | - | RX/TX 方向筛选 |
| F10 | Auto-scroll | store.test | Y | - | |
| F11 | 清空日志 | store.test | Y | - | clear-logs 确认 |
| F12 | 导出日志 | defaults.test | Y | dialog mock | |
| F13 | 宏插入 | - | Y | - | AT+RST |
| F14 | 别名 CRUD | store.test | Y | - | 快捷命令 DSL 导入导出见 F31 |
| F15 | 最近命令历史 | store.test | Y | - | 发送后出现、可折叠 F32 |
| F16 | 语言切换 | i18n.test | Y | - | zh-CN ↔ en-US |
| F17 | 命令面板 | N/A | N/A | - | 已移除；快捷命令保留在检查器 |
| F18 | HEX 发送 | defaults.test | Y | 环回 | 发送格式与日志格式独立 |
| F19 | 高亮规则列表 | log-highlight.test | Y | - | 关键词/正则/颜色、无效正则保护、测试预览与定位到日志 |
| F20 | 日志表头筛选布局 | - | Y | - | 搜索、方向、高亮入口位于日志表头 |
| F21 | 侧栏收起不遮挡 | - | Y | - | 收起后主区左移 |
| F22 | 打开串口主按钮 | - | Y | - | open-port-btn + 连接语义 |
| F25 | RX 终端/逐帧显示 | rx-coalesce.test | Y | - | 终端合并至换行；逐帧每包一行 |
| F26 | 状态栏 StatusBar | - | Y | - | 有日志时显示 RX/TX/条数/自动滚动 |
| F27 | 日志行右键菜单 | - | Y | - | 复制载荷/HEX，无删除 |
| F28 | Ctrl+L 聚焦日志搜索 | - | Y | - | 快捷键聚焦 log-search |
| F29 | 主题切换（neon/anime） | registry.test, theme.test, useThemeFx.test | Y | - | data-theme + 连接发送冒烟 |
| F30 | 主题切换（cyber） | registry.test, theme.test | Y | - | 赛博主题卡片 + 连接发送冒烟 |
| F31 | 快捷命令 DSL 导入导出 | defaults.test | Y | - | alias-dsl-export/import |
| F32 | 最近命令折叠 | store.test | Y | - | recent-commands-toggle |
| F33 | 列表发送 DSL 导入导出 | defaults.test, text-export.test | Y | - | send-list-dsl-export/import，导出可复制与存文件 |
| F23 | 进程退出释放串口 | lib.rs unit | 手工 | - | 关闭窗口后外部进程可重新打开端口；**禁止**自动化依赖 COM5/STM32 |
| F24 | 非 Tauri Web 预览保护 | serial.test | 手工/截图 | - | 无 Tauri runtime 时不注册 event bridge，避免白屏 |
| F34 | 生产构建门禁 | production-gate.test | - | - | `npm run build` 扫描 dist，禁止 E2E mock / 测试会话；`E2E_MOCK=1` 时 vite build 必须失败 |
| - | Frame/Parse 解析 | N/A | N/A | N/A | 占位 UI，不测 |

Web E2E 用例在 `e2e/web/*.spec.ts` 中以 `/** @fc Fxx */` 标注。CI 通过 `npm run test:fc` 校验矩阵 ID 均有 Web 覆盖（Desktop 项除外）。

产品级交互要求详见 [`docs/product/ui-interaction-requirements.md`](../product/ui-interaction-requirements.md)。当 FCM 新增或调整 UI 行为时，应同步更新该文档。
