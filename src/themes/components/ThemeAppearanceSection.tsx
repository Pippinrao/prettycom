import { useT } from "@/hooks/use-t"
import { usePrettyComStore } from "@/store/prettycom-store"
import type { Theme } from "@/types/serial"

import { ThemeCardGrid } from "./ThemeCardGrid"

export function ThemeAppearanceSection() {
  const t = useT()
  const theme = usePrettyComStore((state) => state.theme)
  const setTheme = usePrettyComStore((state) => state.setTheme)

  return (
    <div className="theme-settings-appearance space-y-3 border-b border-border px-4 py-3">
      <div className="space-y-1">
        <div className="text-sm font-medium">{t("Appearance")}</div>
        <div className="text-xs text-muted-foreground">{t("Choose interface theme and appearance.")}</div>
      </div>
      <ThemeCardGrid value={theme} onValueChange={(value) => setTheme(value as Theme)} />
    </div>
  )
}