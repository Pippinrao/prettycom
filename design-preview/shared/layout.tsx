import type { CSSProperties, ReactNode } from "react"

export function Row({
  children,
  gap = 8,
  align = "stretch",
  style,
}: {
  children: ReactNode
  gap?: number
  align?: CSSProperties["alignItems"]
  style?: CSSProperties
}) {
  return (
    <div style={{ display: "flex", flexDirection: "row", alignItems: align, gap, ...style }}>{children}</div>
  )
}

export function Stack({
  children,
  gap = 8,
  style,
}: {
  children: ReactNode
  gap?: number
  style?: CSSProperties
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap, ...style }}>{children}</div>
  )
}

export function Spacer() {
  return <div style={{ flex: 1 }} />
}
