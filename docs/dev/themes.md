# PrettyCOM 主题模块开发指南

本文档说明 src/themes/ 的架构、扩展步骤与已知踩坑。产品级交互约束见 [UI 交互与行为要求](../product/ui-interaction-requirements.md) 主题模块与装饰动画一节。

## 目标

- 主题与串口/日志/发送完全解耦
- light/dark 保持克制工具风；pink/anime/cyber 为可选风格化主题
- 颜色走语义 CSS 变量；日志 RX/TX/SYS 在各主题下可辨识

## 目录结构

- src/themes/index.ts, apply.ts, registry.ts, types.ts
- definitions/: light.css, dark.css, pink.css, anime.css, cyber.css, decor.css
- animation/: ThemeAnimationBridge, useThemeFx.ts, theme-fx.css
- assets/mascots/, components/

样式入口 src/index.css 通过 @import 引入。src/lib/theme.ts 仅 re-export @/themes/apply。

**字体**：安装包仅内置 Geist Variable（约 &lt;100 KB）；风格化主题通过系统字体栈（Segoe UI、PingFang SC、Yu Gothic UI 等）营造差异，**禁止**再引入 `@fontsource` 全量 CJK/多字重字体（曾导致 dist 字体 &gt;10 MB）。

## 架构约束

| 规则 | 正确 | 错误 |
|------|------|------|
| DOM | 仅 applyTheme() | 业务改 classList |
| 业务 | 零 if (theme) | 发送里按主题播动画 |
| 动画 | ThemeAnimationBridge 只读订阅 | appendLog 内写动画 |
| 深色 | usesDarkClass + .dark | 只改 CSS 变量 |
| CodeMirror | getCodeMirrorTheme(theme) | 硬编码二元判断 |
| 日志色 | --log-rx/tx/sys | text-sky-* 行内色 |

### 设置与装饰组件（A+B 混合）

| 组件 | 职责 |
|------|------|
| `ThemeAppearanceSection` | 设置「外观」满宽纵向区块 |
| `ThemeCardGrid` | 2×2 主题卡片单选；容器保留 `data-testid="theme-select"` |
| `ThemeCard` | 单卡：72px 吉祥物、descriptionKey、token 色条 |
| `ThemeCompanionRail` | 侧栏 Footer **设置上方** 陪伴区；pink/neon/cyber；约 80px 吉祥物；`data-testid="theme-companion-rail"` |

业务层零 `if (theme)`；`App.tsx` 仅挂载上述组件与装饰桥接。

吉祥物目标尺寸（decor 可再覆盖）：设置卡片 72px、空状态 96px、Footer 陪伴区 80px、水印 ~12rem。

## 注册表

registry.ts: usesDarkClass, codemirror, animations, mascot, watermarkMascot, labelKey, descriptionKey。
normalizeTheme 非法值回退 dark。

## 动画

detectThemeFx: 连接 port-open、断开 idle、TX 增加 send（300ms 防抖）。data-fx 驱动 CSS。
prefers-reduced-motion 禁用摆动与粒子。

## 新增主题 checklist

1. Theme 类型 + registry.ts
2. definitions/<id>.css 全覆盖语义 token
3. index.css @import
4. 可选吉祥物 + decor.css
5. i18n.ts 中英文
6. App.tsx SelectItem（无业务分支）
7. UT + E2E（FCM F29/F30）
8. 更新本文档与 ui-interaction-requirements

## 吉祥物与版权

仅 PrettyCOM 原创 Q 版 SVG。禁止可识别 IP。水印 pointer-events-none。

## 已知踩坑

### UTF-16 导致构建失败（Windows / Agent 高发）

现象: tsc/Vite Invalid character。原因: UTF-16 LE 的 ts/css。
修复: UTF-8 无 BOM 重写；生成后立刻 npm run build。
检查 PowerShell: Format-Hex -Path src\themes\apply.ts -Count 4

### 不挂 .dark

anime 等须在 registry 设 usesDarkClass: true，否则 shadcn dark: 变体失效。

### 业务里 theme 分支

装饰逻辑放 src/themes/，App 只挂桥接组件。

### 动画写进 store action

只用 Bridge 订阅 status 与 TX 计数。

### 日志硬编码 Tailwind 色

用 text-log-rx 等语义类。

### 漏 i18n

每个 labelKey 同步 src/i18n.ts 中英。

### E2E 选项文案

中文为「霓虹主题」；E2E 点击 `theme-card-anime`（主题 ID 仍为 `anime`）。

## 测试

- UT: registry.test.ts, useThemeFx.test.ts, theme.test.ts
- E2E: workbench.spec.ts @fc F29

npm run build && npm test
npm run test:e2e && npm run test:fc

## 相关

- AGENTS.md 主题与装饰一节
- .cursor/skills/prettycom-themes/SKILL.md