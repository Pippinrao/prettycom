import { useState, type ReactNode } from "react"
import { Row, Spacer, Stack } from "../shared/layout"
import {
  CHANGING_DOM,
  SettingsSnippet,
  STABLE_TESTIDS,
  WorkbenchMock,
  tokens,
  type SchemeKind,
  type ThemeKind,
} from "../shared/workbench-mock"

function Card({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div
      style={{
        border: "1px solid oklch(0.922 0 0)",
        borderRadius: 8,
        background: "oklch(1 0 0)",
        overflow: "hidden",
      }}
    >
      {title ? (
        <div style={{ padding: "12px 16px", borderBottom: "1px solid oklch(0.922 0 0)", fontWeight: 600, fontSize: 14 }}>
          {title}
        </div>
      ) : null}
      <div style={{ padding: 16 }}>{children}</div>
    </div>
  )
}

function PickRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  )
}

function DataTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr>
            {headers.map((h) => (
              <th
                key={h}
                style={{
                  textAlign: "left",
                  padding: "8px 10px",
                  borderBottom: "1px solid oklch(0.922 0 0)",
                  fontWeight: 600,
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j} style={{ padding: "8px 10px", borderBottom: "1px solid oklch(0.94 0 0)", verticalAlign: "top" }}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function PreviewApp() {
  const [scheme, setScheme] = useState<SchemeKind>("A")
  const [previewTheme, setPreviewTheme] = useState<ThemeKind>("dark")
  const t = tokens[previewTheme]

  const [pickSchemeA, setPickSchemeA] = useState(true)
  const [pickSchemeB, setPickSchemeB] = useState(false)
  const [pickMix, setPickMix] = useState(false)
  const [pickStatusBar, setPickStatusBar] = useState(true)
  const [pickNoStatusBar, setPickNoStatusBar] = useState(false)
  const [pickDualOpenPort, setPickDualOpenPort] = useState(true)
  const [pickSidebarOnlyPort, setPickSidebarOnlyPort] = useState(false)
  const [pickRemovePin, setPickRemovePin] = useState(true)
  const [pickCollapseInspector, setPickCollapseInspector] = useState(false)
  const [pickDarkTheme, setPickDarkTheme] = useState(true)
  const [pickLightTheme, setPickLightTheme] = useState(true)

  const btn = (active: boolean) => ({
    padding: "6px 12px",
    borderRadius: 6,
    border: active ? "none" : `1px solid ${t.border}`,
    background: active ? t.primary : "transparent",
    color: active ? t.primaryFg : t.foreground,
    fontSize: 13,
    fontWeight: 600 as const,
  })

  return (
    <div style={{ padding: 20, maxWidth: 1320, margin: "0 auto", background: t.background, color: t.foreground, minHeight: "100vh" }}>
      <Stack gap={20}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 650, letterSpacing: "-0.02em" }}>PrettyCOM 工作台高保真选型</h1>
          <p style={{ margin: "6px 0 0", fontSize: 14, color: t.mutedFg }}>
            浏览器预览 · 1280px 宽 · 不改生产代码。切换方案与主题后，勾选底部决策并回复 agent。
          </p>
        </div>

        <Card title="预览控制">
          <Row gap={16} align="center" style={{ flexWrap: "wrap" }}>
            <Row gap={8} align="center">
              <span style={{ fontSize: 13, fontWeight: 600 }}>方案</span>
              <button type="button" style={btn(scheme === "A")} onClick={() => setScheme("A")}>
                A · Workbench Pro
              </button>
              <button type="button" style={btn(scheme === "B")} onClick={() => setScheme("B")}>
                B · Workbench Lite
              </button>
            </Row>
            <Spacer />
            <Row gap={8} align="center">
              <span style={{ fontSize: 13, fontWeight: 600 }}>预览主题</span>
              <span style={{ fontSize: 12, color: t.mutedFg }}>{previewTheme === "dark" ? "深色" : "浅色"}</span>
              <button
                type="button"
                style={btn(previewTheme === "light")}
                onClick={() => setPreviewTheme(previewTheme === "dark" ? "light" : "dark")}
              >
                切换
              </button>
            </Row>
          </Row>
        </Card>

        <div style={{ overflowX: "auto" }}>
          <WorkbenchMock scheme={scheme} theme={previewTheme} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <SettingsSnippet theme={previewTheme} />
          <Card title="方案差异速览">
            <Stack gap={8}>
              <p style={{ margin: 0, fontSize: 13 }}>
                <strong>方案 A</strong>：LogChrome 44px · StatusBar 24px · TopBar 打开串口 primary · 文字按钮
              </p>
              <p style={{ margin: 0, fontSize: 13 }}>
                <strong>方案 B</strong>：LogChrome 40px · 统计并入 TopBar · Segmented 筛选 · icon-only · 弱边框
              </p>
              <p style={{ margin: 0, fontSize: 12, color: t.mutedFg }}>
                共有：合并 LogChrome、success 发送按钮、扁平设置、移除 Inspector Pin
              </p>
            </Stack>
          </Card>
        </div>

        <Card title="选型清单（勾选后回复 agent 确认）">
          <Stack gap={14}>
            <div>
              <h3 style={{ margin: 0, fontSize: 14 }}>1. 主方案</h3>
              <Stack gap={6} style={{ marginTop: 8 }}>
                <PickRow label="方案 A · Workbench Pro（信息完整）" checked={pickSchemeA} onChange={setPickSchemeA} />
                <PickRow label="方案 B · Workbench Lite（极简高密度）" checked={pickSchemeB} onChange={setPickSchemeB} />
                <PickRow label="混搭（在聊天中列出具体项）" checked={pickMix} onChange={setPickMix} />
              </Stack>
            </div>
            <hr style={{ border: "none", borderTop: `1px solid ${t.border}` }} />
            <div>
              <h3 style={{ margin: 0, fontSize: 14 }}>2. StatusBar</h3>
              <Stack gap={6} style={{ marginTop: 8 }}>
                <PickRow label="要 StatusBar（方案 A 风格）" checked={pickStatusBar} onChange={setPickStatusBar} />
                <PickRow label="不要 StatusBar（统计放 TopBar）" checked={pickNoStatusBar} onChange={setPickNoStatusBar} />
              </Stack>
            </div>
            <hr style={{ border: "none", borderTop: `1px solid ${t.border}` }} />
            <div>
              <h3 style={{ margin: 0, fontSize: 14 }}>3. TopBar「打开串口」</h3>
              <Stack gap={6} style={{ marginTop: 8 }}>
                <PickRow label="保留双入口（TopBar + 侧栏）" checked={pickDualOpenPort} onChange={setPickDualOpenPort} />
                <PickRow label="仅侧栏 + 命令面板（TopBar 去掉）" checked={pickSidebarOnlyPort} onChange={setPickSidebarOnlyPort} />
              </Stack>
            </div>
            <hr style={{ border: "none", borderTop: `1px solid ${t.border}` }} />
            <div>
              <h3 style={{ margin: 0, fontSize: 14 }}>4. Pin 检查器</h3>
              <Stack gap={6} style={{ marginTop: 8 }}>
                <PickRow label="移除 Pin（推荐）" checked={pickRemovePin} onChange={setPickRemovePin} />
                <PickRow label="实现折叠检查器" checked={pickCollapseInspector} onChange={setPickCollapseInspector} />
              </Stack>
            </div>
            <hr style={{ border: "none", borderTop: `1px solid ${t.border}` }} />
            <div>
              <h3 style={{ margin: 0, fontSize: 14 }}>5. 主题确认</h3>
              <Stack gap={6} style={{ marginTop: 8 }}>
                <PickRow label="深色已确认" checked={pickDarkTheme} onChange={setPickDarkTheme} />
                <PickRow label="浅色已确认" checked={pickLightTheme} onChange={setPickLightTheme} />
              </Stack>
            </div>
          </Stack>
        </Card>

        <Card title="变更影响表">
          <h3 style={{ margin: "0 0 8px", fontSize: 14 }}>稳定 data-testid（字符串不变）</h3>
          <DataTable headers={["data-testid", "说明"]} rows={STABLE_TESTIDS.map((row) => [row.id, row.note])} />
          <div style={{ marginTop: 20 }}>
            <h3 style={{ margin: "0 0 8px", fontSize: 14 }}>DOM 层级会变、testid 保留</h3>
            <DataTable
              headers={["区域", "变更", "testid 策略"]}
              rows={CHANGING_DOM.map((row) => [row.area, row.change, row.testid])}
            />
          </div>
        </Card>
      </Stack>
    </div>
  )
}