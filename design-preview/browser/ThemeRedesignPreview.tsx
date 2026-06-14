import { useState, type CSSProperties, type ReactNode } from "react"
import { Row, Spacer, Stack } from "../shared/layout"
import { tokens as baseTokens, WorkbenchMock, type ThemeKind } from "../shared/workbench-mock"

export type ThemeRedesignScheme = "A" | "B" | "AB"
export type MockThemeId = "light" | "dark" | "pink" | "anime"

const styledThemeTokens = {
  pink: {
    background: "oklch(0.98 0.025 350)",
    foreground: "oklch(0.26 0.05 350)",
    card: "oklch(0.995 0.02 350)",
    muted: "oklch(0.94 0.03 350)",
    mutedFg: "oklch(0.52 0.05 350)",
    border: "oklch(0.82 0.06 350)",
    primary: "oklch(0.68 0.22 350)",
    primaryFg: "oklch(0.98 0.02 350)",
    sidebar: "oklch(0.97 0.03 350)",
    sidebarBorder: "oklch(0.85 0.06 350)",
    radius: 16,
    logStripe: "oklch(0.96 0.03 350 / 70%)",
    chromeAccent: "oklch(0.68 0.22 350)",
    swatches: ["oklch(0.68 0.22 350)", "oklch(0.94 0.03 350)", "oklch(0.52 0.14 280)", "oklch(0.48 0.14 150)"],
    decorNote: "圆角 1rem · 侧栏底花瓣纹",
    mascotLabel: "樱花兔",
  },
  anime: {
    background: "oklch(0.13 0.045 285)",
    foreground: "oklch(0.93 0.025 300)",
    card: "oklch(0.17 0.05 285)",
    muted: "oklch(0.24 0.06 295)",
    mutedFg: "oklch(0.7 0.04 300)",
    border: "oklch(0.62 0.2 310 / 35%)",
    primary: "oklch(0.74 0.26 310)",
    primaryFg: "oklch(0.12 0.04 285)",
    sidebar: "oklch(0.15 0.05 285)",
    sidebarBorder: "oklch(0.62 0.2 310 / 35%)",
    radius: 16,
    logStripe: "oklch(0.19 0.05 295 / 55%)",
    chromeAccent: "oklch(0.74 0.26 310)",
    swatches: ["oklch(0.74 0.26 310)", "oklch(0.24 0.06 295)", "oklch(0.75 0.22 250)", "oklch(0.72 0.2 150)"],
    decorNote: "2px accent bar · log stripe tint · button glow",
    mascotLabel: "霓虹狐",
  },
} as const

const THEME_META: Record<
  MockThemeId,
  { label: string; description: string; base: ThemeKind; styled?: keyof typeof styledThemeTokens }
> = {
  light: { label: "浅色", description: "干净浅色，无装饰", base: "light" },
  dark: { label: "深色", description: "干净深色，无装饰", base: "dark" },
  pink: { label: "粉色", description: "樱花配色 + 兔吉祥物", base: "light", styled: "pink" },
  anime: { label: "霓虹", description: "霓虹 accent + 狐/星猫", base: "dark", styled: "anime" },
}

function resolveTokens(theme: MockThemeId) {
  const meta = THEME_META[theme]
  const base = baseTokens[meta.base]
  if (meta.styled) {
    return { ...base, ...styledThemeTokens[meta.styled], isStyled: true as const }
  }
  return {
    ...base,
    isStyled: false as const,
    radius: 8,
    logStripe: base.muted,
    chromeAccent: base.primary,
    swatches: [base.primary, base.muted, base.logRx, base.logTx],
    decorNote: "",
    mascotLabel: "",
  }
}

function WireBtn({
  active,
  onClick,
  children,
  t,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
  t: ReturnType<typeof resolveTokens>
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "6px 12px",
        borderRadius: 6,
        border: active ? "none" : `1px solid ${t.border}`,
        background: active ? t.primary : "transparent",
        color: active ? t.primaryFg : t.foreground,
        fontSize: 13,
        fontWeight: 600,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  )
}

function MiniMascot({ theme, size }: { theme: MockThemeId; size: number }) {
  if (theme === "pink") {
    return (
      <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
        <ellipse cx="18" cy="22" rx="6" ry="12" fill="#fce7f3" stroke="#f472b6" strokeWidth="1.2" />
        <ellipse cx="46" cy="22" rx="6" ry="12" fill="#fce7f3" stroke="#f472b6" strokeWidth="1.2" />
        <ellipse cx="32" cy="38" rx="16" ry="14" fill="#fce7f3" stroke="#f472b6" strokeWidth="1.5" />
      </svg>
    )
  }
  if (theme === "anime") {
    return (
      <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
        <path d="M14 28 L6 8 L20 24 Z" fill="#312e81" stroke="#a78bfa" strokeWidth="1.2" />
        <path d="M50 28 L58 8 L44 24 Z" fill="#312e81" stroke="#a78bfa" strokeWidth="1.2" />
        <ellipse cx="32" cy="36" rx="15" ry="13" fill="#0f0a2e" stroke="#a78bfa" strokeWidth="1.5" />
      </svg>
    )
  }
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <circle
        cx="32"
        cy="32"
        r="18"
        fill={theme === "dark" ? "oklch(0.22 0.012 250)" : "oklch(0.94 0.006 240)"}
        stroke="oklch(0.72 0.17 195)"
        strokeWidth="1.5"
      />
    </svg>
  )
}

function ThemeCardGridWireframe({
  t,
  selected,
  onSelect,
}: {
  t: ReturnType<typeof resolveTokens>
  selected: MockThemeId
  onSelect: (id: MockThemeId) => void
}) {
  const ids: MockThemeId[] = ["light", "dark", "pink", "anime"]
  return (
    <div data-testid="theme-select" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
      {ids.map((id) => {
        const meta = THEME_META[id]
        const active = selected === id
        return (
          <button
            key={id}
            type="button"
            data-testid={`theme-card-${id}`}
            onClick={() => onSelect(id)}
            style={{
              textAlign: "left",
              padding: 12,
              borderRadius: t.radius,
              border: active ? `2px solid ${t.primary}` : `1px solid ${t.border}`,
              background: t.card,
              cursor: "pointer",
            }}
          >
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
              <MiniMascot theme={id} size={72} />
            </div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{meta.label}</div>
            <div style={{ fontSize: 11, color: t.mutedFg, marginTop: 2 }}>{meta.description}</div>
          </button>
        )
      })}
    </div>
  )
}

function LegacyThemeSelectWireframe({ t, selected }: { t: ReturnType<typeof resolveTokens>; selected: MockThemeId }) {
  return (
    <div
      data-testid="theme-select"
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        alignItems: "center",
        padding: "10px 0",
        borderBottom: `1px dashed ${t.border}`,
      }}
    >
      <span style={{ fontSize: 13 }}>主题</span>
      <div
        style={{
          fontSize: 12,
          padding: "6px 10px",
          borderRadius: 6,
          border: `1px solid ${t.border}`,
          textAlign: "right",
          color: t.mutedFg,
          background: t.muted,
        }}
      >
        {THEME_META[selected].label}
      </div>
    </div>
  )
}

function CompanionRailWireframe({ t, theme }: { t: ReturnType<typeof resolveTokens>; theme: MockThemeId }) {
  const label = theme === "pink" ? styledThemeTokens.pink.mascotLabel : styledThemeTokens.anime.mascotLabel
  return (
    <div
      data-testid="theme-companion-rail"
      style={{
        width: 56,
        flexShrink: 0,
        background: t.sidebar,
        borderRight: `1px solid ${t.sidebarBorder}`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-end",
        paddingBottom: 12,
      }}
    >
      <MiniMascot theme={theme} size={48} />
      <span style={{ fontSize: 9, color: t.mutedFg, marginTop: 4, writingMode: "vertical-rl" }}>{label}</span>
    </div>
  )
}

function SettingsAppearanceWireframe({
  t,
  scheme,
  mockTheme,
  onThemeSelect,
}: {
  t: ReturnType<typeof resolveTokens>
  scheme: ThemeRedesignScheme
  mockTheme: MockThemeId
  onThemeSelect: (id: MockThemeId) => void
}) {
  const showCardGrid = scheme === "A" || scheme === "AB"
  return (
    <div
      data-testid="settings-sheet"
      style={{
        width: 360,
        border: `1px solid ${t.border}`,
        borderRadius: t.radius,
        background: t.card,
        overflow: "hidden",
      }}
    >
      <div style={{ padding: "12px 14px", borderBottom: `1px solid ${t.border}`, fontSize: 13, fontWeight: 600 }}>
        设置 · 外观
      </div>
      <div style={{ padding: 14 }}>
        <Stack gap={10}>
          <div style={{ fontSize: 11, color: t.mutedFg }}>
            {showCardGrid ? "2×2 ThemeCardGrid (方案 A)" : "Legacy Select (方案 B)"}
          </div>
          {showCardGrid ? (
            <ThemeCardGridWireframe t={t} selected={mockTheme} onSelect={onThemeSelect} />
          ) : (
            <LegacyThemeSelectWireframe t={t} selected={mockTheme} />
          )}
        </Stack>
      </div>
    </div>
  )
}

function AnnotatedWorkbench({
  t,
  scheme,
  mockTheme,
}: {
  t: ReturnType<typeof resolveTokens>
  scheme: ThemeRedesignScheme
  mockTheme: MockThemeId
}) {
  const showRail = (scheme === "B" || scheme === "AB") && (mockTheme === "pink" || mockTheme === "anime")
  const baseTheme = THEME_META[mockTheme].base
  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      {mockTheme === "anime" && (
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: t.chromeAccent, zIndex: 2 }} />
      )}
      <div
        style={{
          display: "flex",
          width: 1280,
          height: 720,
          borderRadius: 8,
          overflow: "hidden",
          border: `1px solid ${t.border}`,
        }}
      >
        {showRail && <CompanionRailWireframe t={t} theme={mockTheme} />}
        <div style={{ flex: 1, minWidth: 0, position: "relative" }}>
          <WorkbenchMock scheme="A" theme={baseTheme} />
          {mockTheme === "anime" && (
            <div
              style={{
                position: "absolute",
                top: 132,
                left: 232,
                right: 280,
                bottom: 130,
                pointerEvents: "none",
                background: `repeating-linear-gradient(180deg, transparent 0 33px, ${t.logStripe} 33px 66px)`,
                opacity: 0.35,
              }}
            />
          )}
        </div>
      </div>
    </div>
  )
}

export function ThemeRedesignPreview() {
  const [scheme, setScheme] = useState<ThemeRedesignScheme>("AB")
  const [mockTheme, setMockTheme] = useState<MockThemeId>("pink")
  const t = resolveTokens(mockTheme)
  const panel: CSSProperties = {
    border: `1px solid ${t.border}`,
    borderRadius: 8,
    background: t.card,
    overflow: "hidden",
  }

  return (
    <div
      style={{
        padding: 20,
        maxWidth: 1400,
        margin: "0 auto",
        background: t.background,
        color: t.foreground,
        minHeight: "100vh",
      }}
    >
      <Stack gap={20}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 650 }}>
            主题 A+B 重设计 · 保真预览
          </h1>
          <p style={{ margin: "6px 0 0", fontSize: 14, color: t.mutedFg }}>
            切换方案 A / B / AB 与 mock 主题 · 不改生产代码
          </p>
        </div>

        <div style={panel}>
          <div style={{ padding: "12px 16px", borderBottom: `1px solid ${t.border}`, fontWeight: 600, fontSize: 14 }}>
            预览控制
          </div>
          <div style={{ padding: 16 }}>
            <Stack gap={14}>
              <Row gap={8} align="center" style={{ flexWrap: "wrap" }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>方案</span>
                {(["A", "B", "AB"] as const).map((s) => (
                  <WireBtn key={s} active={scheme === s} onClick={() => setScheme(s)} t={t}>
                    {s === "A" ? "A · 卡片" : s === "B" ? "B · 陪伴轨" : "AB · 混合"}
                  </WireBtn>
                ))}
              </Row>
              <Row gap={8} align="center" style={{ flexWrap: "wrap" }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>主题</span>
                {(Object.keys(THEME_META) as MockThemeId[]).map((id) => (
                  <WireBtn key={id} active={mockTheme === id} onClick={() => setMockTheme(id)} t={t}>
                    {THEME_META[id].label}
                  </WireBtn>
                ))}
              </Row>
              {t.isStyled && (
                <div style={{ fontSize: 12, color: t.mutedFg, padding: 8, borderRadius: 6, background: t.muted }}>
                  Token: {mockTheme === "pink" ? styledThemeTokens.pink.decorNote : styledThemeTokens.anime.decorNote}
                </div>
              )}
            </Stack>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 16, alignItems: "start" }}>
          <div style={{ overflowX: "auto" }}>
            <AnnotatedWorkbench t={t} scheme={scheme} mockTheme={mockTheme} />
          </div>
          <SettingsAppearanceWireframe t={t} scheme={scheme} mockTheme={mockTheme} onThemeSelect={setMockTheme} />
        </div>

        <div style={{ ...panel, padding: 16 }}>
          <span style={{ fontSize: 13, color: t.mutedFg }}>
            目视确认后回复 agent：方案 {scheme} · 主题 {THEME_META[mockTheme].label}
          </span>
        </div>
      </Stack>
    </div>
  )
}
