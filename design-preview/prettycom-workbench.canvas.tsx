import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Checkbox,
  Divider,
  Grid,
  H1,
  H3,
  Row,
  Spacer,
  Stack,
  Table,
  Text,
  Toggle,
  useCanvasState,
} from "cursor/canvas";

// PrettyCOM design tokens (mirrors src/index.css oklch semantics)
const tokens = {
  light: {
    background: "oklch(0.98 0.005 240)",
    foreground: "oklch(0.16 0.01 240)",
    card: "oklch(1 0 0)",
    muted: "oklch(0.94 0.006 240)",
    mutedFg: "oklch(0.52 0.02 240)",
    border: "oklch(0.922 0 0)",
    primary: "oklch(0.72 0.17 195)",
    primaryFg: "oklch(0.12 0.02 210)",
    success: "oklch(0.72 0.17 150)",
    successFg: "oklch(0.12 0.02 150)",
    sidebar: "oklch(0.985 0 0)",
    sidebarBorder: "oklch(0.922 0 0)",
    logRx: "oklch(0.72 0.17 210)",
    logTx: "oklch(0.72 0.17 150)",
    logSys: "oklch(0.64 0.04 75)",
    ring: "oklch(0.72 0.17 195)",
  },
  dark: {
    background: "oklch(0.13 0.012 250)",
    foreground: "oklch(0.91 0.012 245)",
    card: "oklch(0.17 0.012 250)",
    muted: "oklch(0.22 0.012 250)",
    mutedFg: "oklch(0.64 0.018 245)",
    border: "oklch(1 0 0 / 10%)",
    primary: "oklch(0.72 0.17 195)",
    primaryFg: "oklch(0.12 0.02 210)",
    success: "oklch(0.72 0.17 150)",
    successFg: "oklch(0.12 0.02 150)",
    sidebar: "oklch(0.155 0.012 250)",
    sidebarBorder: "oklch(1 0 0 / 10%)",
    logRx: "oklch(0.72 0.17 210)",
    logTx: "oklch(0.72 0.17 150)",
    logSys: "oklch(0.75 0.08 75)",
    ring: "oklch(0.72 0.17 195)",
  },
} as const;

type ThemeKind = keyof typeof tokens;
type SchemeKind = "A" | "B";

type LogEntry = {
  id: string;
  time: string;
  dir: "RX" | "TX" | "SYS";
  payload: string;
  bytes: number;
  gap: string;
};

const MOCK_LOGS: LogEntry[] = [
  { id: "1", time: "14:32:01.234", dir: "RX", payload: "OK", bytes: 4, gap: "—" },
  { id: "2", time: "14:32:01.891", dir: "TX", payload: "AT", bytes: 4, gap: "657ms" },
  { id: "3", time: "14:32:02.102", dir: "RX", payload: "OK", bytes: 4, gap: "211ms" },
  { id: "4", time: "14:32:02.445", dir: "SYS", payload: "自动滚动已开启", bytes: 0, gap: "—" },
  { id: "5", time: "14:32:03.008", dir: "RX", payload: "+CSQ: 24,99", bytes: 12, gap: "563ms" },
  { id: "6", time: "14:32:03.512", dir: "TX", payload: "AT+CSQ?", bytes: 8, gap: "504ms" },
  { id: "7", time: "14:32:04.201", dir: "RX", payload: "48 65 6C 6C 6F", bytes: 5, gap: "689ms" },
];

const STABLE_TESTIDS: { id: string; note: string }[] = [
  { id: "session-item-*", note: "侧栏会话项，DOM 层级可能变，id 不变" },
  { id: "session-delete-*", note: "会话删除按钮" },
  { id: "sidebar-remove-session", note: "移除当前会话" },
  { id: "settings-open", note: "设置入口" },
  { id: "open-port-btn", note: "打开串口（TopBar / 侧栏双入口待选型）" },
  { id: "session-connect-toggle", note: "连接/断开切换" },
  { id: "open-port-dialog", note: "打开串口对话框" },
  { id: "port-select", note: "端口选择" },
  { id: "connect-btn", note: "确认连接" },
  { id: "log-search", note: "日志搜索（合并进 LogChrome）" },
  { id: "log-filter-direction", note: "方向筛选" },
  { id: "log-rx-display-mode", note: "RX 显示模式" },
  { id: "log-display-mode", note: "日志 ASCII/HEX" },
  { id: "auto-scroll-toggle", note: "自动滚动" },
  { id: "clear-logs-btn", note: "清空日志" },
  { id: "log-filter-count", note: "筛选计数 847/3000" },
  { id: "highlight-rules-open", note: "高亮规则" },
  { id: "log-stream", note: "日志虚拟列表容器" },
  { id: "log-row-*", note: "单行日志" },
  { id: "command-input", note: "命令编辑器" },
  { id: "suffix-select", note: "发送后缀" },
  { id: "send-command", note: "发送按钮（将用 success 色）" },
  { id: "inspector-tab-commands", note: "检查器 · 命令" },
  { id: "inspector-tab-sendlist", note: "检查器 · 发送列表" },
  { id: "inspector-tab-port", note: "检查器 · 端口" },
  { id: "command-palette", note: "命令面板 Ctrl+K" },
  { id: "settings-sheet", note: "设置抽屉" },
  { id: "language-select", note: "语言" },
  { id: "log-retention-limit", note: "日志保留上限" },
  { id: "theme-select", note: "主题" },
  { id: "default-suffix-select", note: "默认后缀" },
];

const CHANGING_DOM: { area: string; change: string; testid: string }[] = [
  { area: "LogToolbar + LogTableHeader", change: "合并为 LogChrome 单层", testid: "上述 log-* 控件 id 保留" },
  { area: "TopBar", change: "h-14 → h-12，会话信息单行", testid: "session-connect-toggle 等保留" },
  { area: "Inspector 标题栏", change: "移除 Pin 假按钮", testid: "inspector-tab-* 保留" },
  { area: "StatusBar（方案 A）", change: "新增底部状态条", testid: "暂无 testid，落地时新增" },
  { area: "SettingsSheet", change: "Card 嵌套 → 扁平行", testid: "settings-* 保留" },
];

function dirColor(t: (typeof tokens)[ThemeKind], dir: LogEntry["dir"]) {
  if (dir === "RX") return t.logRx;
  if (dir === "TX") return t.logTx;
  return t.logSys;
}

function IconMenu({ color }: { color: string }) {
  return (
    <svg width={14} height={14} viewBox="0 0 14 14" fill="none">
      <path d="M2 3.5h10M2 7h10M2 10.5h10" stroke={color} strokeWidth={1.2} strokeLinecap="round" />
    </svg>
  );
}

function IconRefresh({ color }: { color: string }) {
  return (
    <svg width={14} height={14} viewBox="0 0 14 14" fill="none">
      <path
        d="M11.5 2.5A5 5 0 1 0 12.5 7"
        stroke={color}
        strokeWidth={1.2}
        strokeLinecap="round"
      />
      <path d="M12.5 2.5V5.5H9.5" stroke={color} strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconExport({ color }: { color: string }) {
  return (
    <svg width={14} height={14} viewBox="0 0 14 14" fill="none">
      <path d="M7 2v7M4.5 6.5L7 9l2.5-2.5" stroke={color} strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2.5 11.5h9" stroke={color} strokeWidth={1.2} strokeLinecap="round" />
    </svg>
  );
}

function IconTrash({ color }: { color: string }) {
  return (
    <svg width={14} height={14} viewBox="0 0 14 14" fill="none">
      <path d="M3 4.5h8M5.5 4.5V3.5h3v1" stroke={color} strokeWidth={1.2} strokeLinecap="round" />
      <path d="M4.5 4.5l.5 7h4l.5-7" stroke={color} strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Segmented({
  t,
  items,
  active,
}: {
  t: (typeof tokens)[ThemeKind];
  items: string[];
  active: number;
}) {
  return (
    <Row
      gap={0}
      style={{
        border: `1px solid ${t.border}`,
        borderRadius: 6,
        overflow: "hidden",
        height: 28,
      }}
    >
      {items.map((label, i) => (
        <div
          key={label}
          style={{
            padding: "0 10px",
            fontSize: 11,
            fontWeight: i === active ? 600 : 400,
            display: "flex",
            alignItems: "center",
            background: i === active ? t.muted : "transparent",
            color: i === active ? t.foreground : t.mutedFg,
            borderRight: i < items.length - 1 ? `1px solid ${t.border}` : undefined,
          }}
        >
          {label}
        </div>
      ))}
    </Row>
  );
}

function DirBadge({ t, dir }: { t: (typeof tokens)[ThemeKind]; dir: LogEntry["dir"] }) {
  const bg = dirColor(t, dir);
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 600,
        padding: "2px 6px",
        borderRadius: 4,
        background: `color-mix(in oklch, ${bg} 18%, transparent)`,
        color: bg,
        fontFamily: "ui-monospace, monospace",
      }}
    >
      {dir}
    </span>
  );
}

function WorkbenchMock({ scheme, theme }: { scheme: SchemeKind; theme: ThemeKind }) {
  const t = tokens[theme];
  const isA = scheme === "A";
  const logChromeH = isA ? 44 : 40;
  const topBarH = isA ? 48 : 48;
  const borderWeak = isA ? t.border : `color-mix(in oklch, ${t.border} 50%, transparent)`;

  return (
    <div
      style={{
        width: 1280,
        height: 720,
        fontFamily: "'Geist Variable', system-ui, sans-serif",
        background: t.background,
        color: t.foreground,
        display: "flex",
        overflow: "hidden",
        border: `1px solid ${t.border}`,
        borderRadius: 8,
      }}
    >
      {/* Sidebar */}
      <aside
        style={{
          width: 220,
          flexShrink: 0,
          background: t.sidebar,
          borderRight: `1px solid ${t.sidebarBorder}`,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ padding: "14px 16px 10px", borderBottom: `1px solid ${t.sidebarBorder}` }}>
          <div style={{ fontSize: 15, fontWeight: 650, letterSpacing: "-0.02em" }}>PrettyCOM</div>
          <div style={{ fontSize: 11, color: t.mutedFg, marginTop: 2 }}>串口调试助手</div>
        </div>
        <div style={{ padding: "8px 10px", flex: 1 }}>
          <div style={{ fontSize: 10, color: t.mutedFg, padding: "4px 6px", fontWeight: 600 }}>会话</div>
          <div
            data-testid="session-item-com11"
            style={{
              padding: "8px 10px",
              borderRadius: 6,
              background: `color-mix(in oklch, ${t.primary} 12%, transparent)`,
              border: `1px solid color-mix(in oklch, ${t.primary} 25%, transparent)`,
              marginTop: 4,
            }}
          >
            <Row gap={8} align="center">
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: t.success,
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>COM11 环回</div>
                <div style={{ fontSize: 11, color: t.mutedFg }}>115200 8N1</div>
              </div>
            </Row>
          </div>
          <div
            style={{
              padding: "8px 10px",
              borderRadius: 6,
              marginTop: 4,
              color: t.mutedFg,
              fontSize: 13,
            }}
          >
            COM3 USB-SERIAL
          </div>
        </div>
        <div style={{ padding: "10px 12px", borderTop: `1px solid ${t.sidebarBorder}` }}>
          <div
            data-testid="open-port-btn"
            style={{
              fontSize: 12,
              fontWeight: 600,
              padding: "8px 12px",
              borderRadius: 6,
              background: t.primary,
              color: t.primaryFg,
              textAlign: "center",
            }}
          >
            打开串口
          </div>
          <div
            data-testid="settings-open"
            style={{
              fontSize: 11,
              color: t.mutedFg,
              textAlign: "center",
              marginTop: 8,
              cursor: "default",
            }}
          >
            设置
          </div>
        </div>
      </aside>

      {/* Main + Inspector */}
      <div style={{ flex: 1, display: "flex", minWidth: 0 }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          {/* TopBar */}
          <header
            style={{
              height: topBarH,
              borderBottom: `1px solid ${borderWeak}`,
              padding: isA ? "0 12px" : "4px 12px 0",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              flexShrink: 0,
              background: t.card,
            }}
          >
            <Row gap={10} align="center" style={{ height: isA ? topBarH : 28 }}>
              <IconMenu color={t.mutedFg} />
              <div
                data-testid="session-connect-toggle"
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  padding: "6px 12px",
                  borderRadius: 6,
                  backgroundColor: t.primary,
                  color: t.primaryFg,
                }}
              >
                断开 COM11
              </div>
              <span
                style={{
                  fontSize: 11,
                  padding: "3px 8px",
                  borderRadius: 4,
                  background: t.muted,
                  color: t.mutedFg,
                  fontFamily: "ui-monospace, monospace",
                }}
              >
                COM11
              </span>
              <Text style={{ fontSize: 13, color: t.foreground, flex: 1 }} weight="medium">
                COM11 环回 · 115200 8N1
              </Text>
              <Row gap={6} align="center">
                <div style={{ padding: 6, borderRadius: 4, background: t.muted }}>
                  <IconRefresh color={t.mutedFg} />
                </div>
                <div
                  data-testid="open-port-btn"
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    padding: "6px 12px",
                    borderRadius: 6,
                    background: isA ? t.primary : "transparent",
                    color: isA ? t.primaryFg : t.foreground,
                    border: isA ? "none" : `1px solid ${t.border}`,
                  }}
                >
                  打开串口
                </div>
                <span style={{ fontSize: 11, color: t.mutedFg, fontFamily: "ui-monospace, monospace" }}>Ctrl K</span>
              </Row>
            </Row>
            {!isA && (
              <div style={{ fontSize: 11, color: t.mutedFg, paddingBottom: 6, paddingLeft: 34 }}>
                RX 12.4KB · TX 892B · 847/3000 · 自动滚动 ON
              </div>
            )}
          </header>

          {/* LogChrome */}
          <div
            style={{
              height: logChromeH,
              borderBottom: `1px solid ${borderWeak}`,
              padding: "0 12px",
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexShrink: 0,
              background: isA ? t.muted : t.background,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: t.success,
                flexShrink: 0,
              }}
            />
            <div
              data-testid="log-search"
              style={{
                width: 140,
                height: 28,
                borderRadius: 6,
                border: `1px solid ${t.border}`,
                background: t.card,
                fontSize: 12,
                padding: "0 10px",
                display: "flex",
                alignItems: "center",
                color: t.mutedFg,
              }}
            >
              搜索日志…
            </div>
            {isA ? (
              <>
                <div
                  data-testid="log-filter-direction"
                  style={{
                    fontSize: 11,
                    padding: "5px 10px",
                    borderRadius: 6,
                    border: `1px solid ${t.border}`,
                    background: t.card,
                  }}
                >
                  方向: 全部
                </div>
                <div
                  data-testid="highlight-rules-open"
                  style={{
                    fontSize: 11,
                    padding: "5px 10px",
                    borderRadius: 6,
                    border: `1px solid ${t.border}`,
                    background: t.card,
                  }}
                >
                  高亮
                </div>
                <div
                  data-testid="log-rx-display-mode"
                  style={{
                    fontSize: 11,
                    padding: "5px 10px",
                    borderRadius: 6,
                    border: `1px solid ${t.border}`,
                    background: t.card,
                  }}
                >
                  RX: ASCII
                </div>
              </>
            ) : (
              <>
                <Segmented t={t} items={["全部", "RX", "TX", "SYS"]} active={0} />
                <Segmented t={t} items={["ASCII", "HEX"]} active={0} />
              </>
            )}
            <Spacer />
            <div
              data-testid="log-display-mode"
              style={{
                fontSize: 11,
                padding: "5px 10px",
                borderRadius: 6,
                border: `1px solid ${t.border}`,
                background: t.card,
              }}
            >
              日志: ASCII
            </div>
            {isA ? (
              <div
                data-testid="auto-scroll-toggle"
                style={{
                  fontSize: 11,
                  padding: "5px 10px",
                  borderRadius: 6,
                  border: `1px solid ${t.border}`,
                  background: `color-mix(in oklch, ${t.primary} 15%, ${t.card})`,
                  color: t.primary,
                }}
              >
                自动滚动
              </div>
            ) : (
              <div
                data-testid="auto-scroll-toggle"
                title="自动滚动"
                style={{ padding: 6, borderRadius: 4, background: `color-mix(in oklch, ${t.primary} 15%, transparent)` }}
              >
                <svg width={14} height={14} viewBox="0 0 14 14" fill="none">
                  <path d="M7 3v8M4 8l3 3 3-3" stroke={t.primary} strokeWidth={1.2} strokeLinecap="round" />
                </svg>
              </div>
            )}
            {isA ? (
              <>
                <div style={{ fontSize: 11, padding: "5px 10px", borderRadius: 6, border: `1px solid ${t.border}` }}>
                  导出
                </div>
                <div
                  data-testid="clear-logs-btn"
                  style={{ fontSize: 11, padding: "5px 10px", borderRadius: 6, border: `1px solid ${t.border}` }}
                >
                  清空
                </div>
              </>
            ) : (
              <>
                <div title="导出" style={{ padding: 6 }}>
                  <IconExport color={t.mutedFg} />
                </div>
                <div data-testid="clear-logs-btn" title="清空" style={{ padding: 6 }}>
                  <IconTrash color={t.mutedFg} />
                </div>
              </>
            )}
            <span
              data-testid="log-filter-count"
              style={{
                fontSize: 11,
                padding: "3px 8px",
                borderRadius: 4,
                background: t.muted,
                color: t.mutedFg,
                fontFamily: "ui-monospace, monospace",
              }}
            >
              847/3000
            </span>
          </div>

          {/* Column headers */}
          <div
            style={{
              height: 28,
              borderBottom: `1px solid ${borderWeak}`,
              display: "grid",
              gridTemplateColumns: "108px 52px 1fr 56px 64px",
              padding: "0 12px",
              alignItems: "center",
              fontSize: 10,
              fontWeight: 600,
              color: t.mutedFg,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              flexShrink: 0,
              background: isA ? t.muted : t.background,
            }}
          >
            <span>TIME</span>
            <span>DIR</span>
            <span>PAYLOAD</span>
            <span style={{ textAlign: "right" }}>BYTES</span>
            <span style={{ textAlign: "right" }}>GAP</span>
          </div>

          {/* Log stream */}
          <div data-testid="log-stream" style={{ flex: 1, overflow: "hidden", background: t.background }}>
            {MOCK_LOGS.map((entry) => (
              <div
                key={entry.id}
                data-testid={`log-row-${entry.id}`}
                style={{
                  height: 34,
                  display: "grid",
                  gridTemplateColumns: "108px 52px 1fr 56px 64px",
                  padding: "0 12px",
                  alignItems: "center",
                  fontSize: 12,
                  borderBottom: `1px solid ${borderWeak}`,
                  borderLeft: `3px solid ${dirColor(t, entry.dir)}`,
                  fontFamily: entry.dir !== "SYS" ? "ui-monospace, monospace" : undefined,
                }}
              >
                <span style={{ color: t.mutedFg, fontSize: 11 }}>{entry.time}</span>
                <DirBadge t={t} dir={entry.dir} />
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {entry.payload}
                </span>
                <span style={{ textAlign: "right", color: t.mutedFg, fontSize: 11 }}>{entry.bytes || "—"}</span>
                <span style={{ textAlign: "right", color: t.mutedFg, fontSize: 11 }}>{entry.gap}</span>
              </div>
            ))}
          </div>

          {/* StatusBar — Scheme A only */}
          {isA && (
            <div
              style={{
                height: 24,
                borderTop: `1px solid ${borderWeak}`,
                padding: "0 12px",
                display: "flex",
                alignItems: "center",
                gap: 16,
                fontSize: 11,
                color: t.mutedFg,
                flexShrink: 0,
                background: t.card,
              }}
            >
              <Row gap={6} align="center">
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: t.success }} />
                <span>已连接 COM11</span>
              </Row>
              <span>RX 12.4KB</span>
              <span>TX 892B</span>
              <span>847 条日志</span>
              <span>自动滚动 ON</span>
            </div>
          )}

          {/* Command composer */}
          <div
            style={{
              borderTop: `1px solid ${t.border}`,
              background: t.card,
              padding: "10px 12px",
              flexShrink: 0,
            }}
          >
            <Row gap={10} align="stretch">
              <div
                data-testid="command-input"
                style={{
                  flex: 1,
                  minHeight: 72,
                  borderRadius: 8,
                  border: `1px solid ${t.border}`,
                  background: t.background,
                  padding: "8px 12px",
                  fontFamily: "ui-monospace, monospace",
                  fontSize: 13,
                }}
              >
                AT+CSQ?
              </div>
              <Stack gap={8} style={{ width: 148, justifyContent: "space-between" }}>
                <Row gap={6}>
                  <div
                    data-testid="suffix-select"
                    style={{
                      fontSize: 11,
                      padding: "5px 8px",
                      borderRadius: 6,
                      border: `1px solid ${t.border}`,
                      flex: 1,
                    }}
                  >
                    后缀 CRLF
                  </div>
                  <div style={{ fontSize: 11, padding: "5px 8px", borderRadius: 6, border: `1px solid ${t.border}` }}>
                    ASCII
                  </div>
                </Row>
                <div
                  data-testid="send-command"
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    padding: "10px 14px",
                    borderRadius: 6,
                    background: t.success,
                    color: t.successFg,
                    textAlign: "center",
                  }}
                >
                  发送 ⌘↵
                </div>
                <div style={{ fontSize: 10, color: t.mutedFg, textAlign: "center" }}>Mod+Enter 发送</div>
              </Stack>
            </Row>
          </div>
        </div>

        {/* Inspector */}
        <aside
          style={{
            width: 280,
            borderLeft: `1px solid ${t.border}`,
            display: "flex",
            flexDirection: "column",
            background: t.card,
            flexShrink: 0,
          }}
        >
          <div style={{ padding: "10px 12px", borderBottom: `1px solid ${t.border}` }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>检查器</div>
            <div style={{ fontSize: 11, color: t.mutedFg, marginTop: 2 }}>无 Pin 按钮（已移除假控件）</div>
          </div>
          <Row gap={0} style={{ borderBottom: `1px solid ${t.border}`, padding: "0 8px" }}>
            {(
              [
                ["commands", "命令"],
                ["sendlist", "发送列表"],
                ["port", "端口"],
              ] as const
            ).map(([id, label], i) => (
              <div
                key={id}
                data-testid={`inspector-tab-${id}`}
                style={{
                  fontSize: 12,
                  fontWeight: i === 0 ? 600 : 400,
                  padding: "10px 12px",
                  color: i === 0 ? t.foreground : t.mutedFg,
                  borderBottom: i === 0 ? `2px solid ${t.primary}` : "2px solid transparent",
                }}
              >
                {label}
              </div>
            ))}
          </Row>
          <div style={{ flex: 1, padding: 12, overflow: "hidden" }}>
            <div style={{ fontSize: 11, color: t.mutedFg, marginBottom: 8 }}>最近命令</div>
            {["AT", "AT+CSQ?", "AT+CGMI"].map((cmd, i) => (
              <div
                key={cmd}
                data-testid={`history-item-${i}`}
                style={{
                  fontSize: 12,
                  fontFamily: "ui-monospace, monospace",
                  padding: "8px 10px",
                  borderRadius: 6,
                  background: i === 0 ? t.muted : "transparent",
                  marginBottom: 4,
                }}
              >
                {cmd}
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

function SettingsSnippet({ theme }: { theme: ThemeKind }) {
  const t = tokens[theme];
  const rows = [
    { label: "语言", control: "简体中文", testid: "language-select" },
    { label: "日志保留", control: "3000 条", testid: "log-retention-limit" },
    { label: "主题", control: "跟随系统", testid: "theme-select" },
    { label: "默认后缀", control: "CRLF", testid: "default-suffix-select" },
  ];
  return (
    <div
      data-testid="settings-sheet"
      style={{
        border: `1px solid ${t.border}`,
        borderRadius: 8,
        background: t.card,
        overflow: "hidden",
      }}
    >
      <div style={{ padding: "12px 14px", borderBottom: `1px solid ${t.border}`, fontSize: 13, fontWeight: 600 }}>
        设置预览（扁平列表）
      </div>
      {rows.map((row, i) => (
        <div
          key={row.label}
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            padding: "10px 14px",
            borderBottom: i < rows.length - 1 ? `1px solid ${t.border}` : undefined,
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: 13 }}>{row.label}</span>
          <span
            data-testid={row.testid}
            style={{
              fontSize: 12,
              padding: "6px 10px",
              borderRadius: 6,
              border: `1px solid ${t.border}`,
              textAlign: "right",
              color: t.mutedFg,
            }}
          >
            {row.control}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function PrettycomWorkbenchPreview() {
  const [scheme, setScheme] = useCanvasState<SchemeKind>("scheme", "A");
  const [previewTheme, setPreviewTheme] = useCanvasState<ThemeKind>("previewTheme", "dark");

  const [pickSchemeA, setPickSchemeA] = useCanvasState("pickSchemeA", true);
  const [pickSchemeB, setPickSchemeB] = useCanvasState("pickSchemeB", false);
  const [pickMix, setPickMix] = useCanvasState("pickMix", false);
  const [pickStatusBar, setPickStatusBar] = useCanvasState("pickStatusBar", true);
  const [pickNoStatusBar, setPickNoStatusBar] = useCanvasState("pickNoStatusBar", false);
  const [pickDualOpenPort, setPickDualOpenPort] = useCanvasState("pickDualOpenPort", true);
  const [pickSidebarOnlyPort, setPickSidebarOnlyPort] = useCanvasState("pickSidebarOnlyPort", false);
  const [pickRemovePin, setPickRemovePin] = useCanvasState("pickRemovePin", true);
  const [pickCollapseInspector, setPickCollapseInspector] = useCanvasState("pickCollapseInspector", false);
  const [pickDarkTheme, setPickDarkTheme] = useCanvasState("pickDarkTheme", true);
  const [pickLightTheme, setPickLightTheme] = useCanvasState("pickLightTheme", true);

  const t = tokens[previewTheme];

  return (
    <Stack gap={20} style={{ padding: 20, maxWidth: 1320 }}>
      <div>
        <H1>PrettyCOM 工作台高保真选型</H1>
        <Text style={{ marginTop: 4 }}>
          阶段 0 预览 · 1280px 宽 · 不改生产代码。切换方案与主题后，在底部勾选你的决策并回复 agent。
        </Text>
      </div>

      <Card>
        <CardHeader title="预览控制" />
        <CardBody>
          <Row gap={16} align="center" wrap>
            <Row gap={8} align="center">
              <Text weight="medium">方案</Text>
              <Button variant={scheme === "A" ? "primary" : "ghost"} onClick={() => setScheme("A")}>
                A · Workbench Pro
              </Button>
              <Button variant={scheme === "B" ? "primary" : "ghost"} onClick={() => setScheme("B")}>
                B · Workbench Lite
              </Button>
            </Row>
            <Spacer />
            <Row gap={8} align="center">
              <Text weight="medium">预览主题</Text>
              <Text style={{ fontSize: 12 }}>{previewTheme === "dark" ? "深色" : "浅色"}</Text>
              <Toggle
                checked={previewTheme === "light"}
                onChange={(on) => setPreviewTheme(on ? "light" : "dark")}
              />
            </Row>
          </Row>
        </CardBody>
      </Card>

      <div style={{ overflowX: "auto" }}>
        <WorkbenchMock scheme={scheme} theme={previewTheme} />
      </div>

      <Grid columns={2} gap={16}>
        <SettingsSnippet theme={previewTheme} />
        <Card>
          <CardHeader title="方案差异速览" />
          <CardBody>
            <Stack gap={8}>
              <Text style={{ fontSize: 13 }}>
                <strong>方案 A</strong>：LogChrome 44px · StatusBar 24px · TopBar 打开串口 primary · 文字按钮
              </Text>
              <Text style={{ fontSize: 13 }}>
                <strong>方案 B</strong>：LogChrome 40px · 统计并入 TopBar 第二行 · Segmented 筛选 · icon-only 操作 · 弱边框
              </Text>
              <Text style={{ fontSize: 12, color: t.mutedFg }}>
                两方案共有：合并 LogChrome、success 发送按钮、扁平设置、移除 Inspector Pin
              </Text>
            </Stack>
          </CardBody>
        </Card>
      </Grid>

      <Card>
        <CardHeader title="选型清单（勾选后回复 agent 确认）" />
        <CardBody>
          <Stack gap={14}>
            <div>
              <H3>1. 主方案</H3>
              <Stack gap={6} style={{ marginTop: 8 }}>
                <Checkbox checked={pickSchemeA} onChange={setPickSchemeA} label="方案 A · Workbench Pro（信息完整）" />
                <Checkbox checked={pickSchemeB} onChange={setPickSchemeB} label="方案 B · Workbench Lite（极简高密度）" />
                <Checkbox checked={pickMix} onChange={setPickMix} label="混搭（在聊天中列出具体项）" />
              </Stack>
            </div>
            <Divider />
            <div>
              <H3>2. StatusBar</H3>
              <Stack gap={6} style={{ marginTop: 8 }}>
                <Checkbox checked={pickStatusBar} onChange={setPickStatusBar} label="要 StatusBar（方案 A 风格）" />
                <Checkbox checked={pickNoStatusBar} onChange={setPickNoStatusBar} label="不要 StatusBar（统计放 TopBar）" />
              </Stack>
            </div>
            <Divider />
            <div>
              <H3>3. TopBar「打开串口」</H3>
              <Stack gap={6} style={{ marginTop: 8 }}>
                <Checkbox checked={pickDualOpenPort} onChange={setPickDualOpenPort} label="保留双入口（TopBar + 侧栏）" />
                <Checkbox
                  checked={pickSidebarOnlyPort}
                  onChange={setPickSidebarOnlyPort}
                  label="仅侧栏 + 命令面板（TopBar 去掉）"
                />
              </Stack>
            </div>
            <Divider />
            <div>
              <H3>4. Pin 检查器</H3>
              <Stack gap={6} style={{ marginTop: 8 }}>
                <Checkbox checked={pickRemovePin} onChange={setPickRemovePin} label="移除 Pin（推荐）" />
                <Checkbox checked={pickCollapseInspector} onChange={setPickCollapseInspector} label="实现折叠检查器" />
              </Stack>
            </div>
            <Divider />
            <div>
              <H3>5. 主题确认</H3>
              <Stack gap={6} style={{ marginTop: 8 }}>
                <Checkbox checked={pickDarkTheme} onChange={setPickDarkTheme} label="深色已确认" />
                <Checkbox checked={pickLightTheme} onChange={setPickLightTheme} label="浅色已确认" />
              </Stack>
            </div>
          </Stack>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="变更影响表" />
        <CardBody>
          <H3 style={{ marginBottom: 8 }}>稳定 data-testid（字符串不变）</H3>
          <Table
            headers={["data-testid", "说明"]}
            rows={STABLE_TESTIDS.map((row) => [row.id, row.note])}
          />
          <div style={{ marginTop: 20 }}>
            <H3 style={{ marginBottom: 8 }}>DOM 层级会变、testid 保留</H3>
            <Table
              headers={["区域", "变更", "testid 策略"]}
              rows={CHANGING_DOM.map((row) => [row.area, row.change, row.testid])}
            />
          </div>
        </CardBody>
      </Card>
    </Stack>
  );
}
