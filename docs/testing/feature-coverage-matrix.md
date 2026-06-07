# PrettyCOM 功能覆盖矩阵（FCM）

已实现功能的自动化覆盖映射。每项至少有一条 UT 或 E2E 用例。

| ID | 功能 | UT | Web E2E | Desktop | 备注 |
| --- | --- | --- | --- | --- | --- |
| F01 | 默认会话与侧栏 | store.test | Y | - | test-default / COM10 |
| F02 | 连接/断开 | serial.test | Y | COM10 | mock invoke open/close |
| F03 | ASCII 发送+后缀 | defaults.test | Y | 环回 | mock echo RX |
| F04 | 打开串口对话框 | - | - | scaffold | Desktop 脚手架占位，非完整 E2E |
| F05 | 多会话切换 | store.test | - | - | |
| F06 | 删除会话 | store.test | - | - | |
| F07 | 发送按钮禁用态 | - | Y | - | 未连接 |
| F08 | 日志搜索过滤 | log-filter.test | Y | - | |
| F09 | 方向过滤 | log-filter.test | - | - | |
| F10 | Auto-scroll | store.test | Y | - | |
| F11 | 清空日志 | store.test | - | - | |
| F12 | 导出日志 | defaults.test | Y | dialog mock | |
| F13 | 宏插入 | - | Y | - | AT+RST |
| F14 | 别名 CRUD | store.test | - | - | |
| F15 | 最近命令历史 | store.test | - | - | |
| F16 | 语言切换 | i18n.test | Y | - | zh-CN ↔ en-US |
| F17 | 命令面板 | - | - | - | 后续补 E2E |
| F18 | HEX 发送 | defaults.test | scaffold | 环回 | Desktop 脚手架占位 |
| F19 | 高亮规则列表 | log-highlight.test | Y | - | 关键词/正则/颜色、无效正则保护、测试预览与定位到日志 |
| F20 | 日志表头筛选布局 | - | 手工/截图 | - | 搜索、方向、高亮入口位于日志表头 |
| F21 | 侧栏收起不遮挡 | - | 手工/截图 | - | 收起宽度约 48px，主区左边界对齐 |
| F22 | 打开串口主按钮 | - | 手工/截图 | - | 顶部主按钮 + 插头图标；当前会话按钮显示连接/断开语义 |
| F23 | 进程退出释放串口 | lib.rs unit | 手工 | - | 关闭窗口后外部进程可重新打开端口；**禁止**自动化依赖 COM5/STM32 |
| F24 | 非 Tauri Web 预览保护 | serial.test | 手工/截图 | - | 无 Tauri runtime 时不注册 event bridge，避免白屏 |
| - | Frame/Parse 解析 | N/A | N/A | N/A | 占位 UI，不测 |

Web E2E 用例在 `e2e/web/*.spec.ts` 中以 `/** @fc Fxx */` 标注。CI 通过 `npm run test:fc` 校验矩阵 ID 均有 Web 覆盖（Desktop 项除外）。

产品级交互要求详见 [`docs/product/ui-interaction-requirements.md`](../product/ui-interaction-requirements.md)。当 FCM 新增或调整 UI 行为时，应同步更新该文档。
