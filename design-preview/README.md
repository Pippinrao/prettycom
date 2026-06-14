# PrettyCOM UI 设计预览

## 浏览器预览（推荐）

```bash
npm run dev:design
```

浏览器打开 **http://127.0.0.1:5198/** ，可切换方案 A/B、深/浅色，并勾选底部选型清单。

## Cursor Canvas（IDE 内）

在 Cursor 中打开 `design-preview/prettycom-workbench.canvas.tsx`，使用 **Canvas / Glass** 侧栏查看（仅 Cursor IDE 可用，不能在普通浏览器运行）。

## 文件损坏时重新生成

若中文乱码或 Vite 报 `Invalid Character`，在项目根目录 PowerShell 执行：

```powershell
node scripts/gen-workbench-mock.mjs   # 需先有完好的 canvas 源
```

或从 Cursor 缓存 canvas 重新导出 UTF-8（见 `scripts/setup-design-preview.mjs` 注释）。