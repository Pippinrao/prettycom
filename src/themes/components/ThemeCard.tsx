import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { RadioGroupItem } from "@/components/ui/radio-group"
import { cn } from "@/lib/utils"
import { useT } from "@/hooks/use-t"
import type { Theme } from "@/types/serial"

import { MascotSvg } from "../assets/mascots"
import { getThemeDefinition } from "../registry"

const TOKEN_PREVIEW: Record<Theme, readonly [string, string, string, string]> = {
  light: ["oklch(0.98 0.005 240)", "oklch(0.72 0.17 195)", "oklch(0.94 0.006 240)", "oklch(0.922 0 0)"],
  dark: ["oklch(0.13 0.012 250)", "oklch(0.72 0.17 195)", "oklch(0.22 0.012 250)", "oklch(1 0 0 / 12%)"],
  pink: ["oklch(0.98 0.025 350)", "oklch(0.68 0.22 350)", "oklch(0.94 0.035 350)", "oklch(0.82 0.06 350)"],
  anime: ["oklch(0.13 0.045 285)", "oklch(0.74 0.26 310)", "oklch(0.24 0.06 295)", "oklch(0.62 0.2 310 / 35%)"],
  cyber: ["oklch(0.11 0.02 220)", "oklch(0.78 0.14 195)", "oklch(0.2 0.03 220)", "oklch(0.62 0.12 195 / 32%)"],
}

interface ThemeCardProps {
  themeId: Theme
  selected: boolean
}

export function ThemeCard({ themeId, selected }: ThemeCardProps) {
  const t = useT()
  const definition = getThemeDefinition(themeId)
  const inputId = `theme-card-${themeId}`
  const swatches = TOKEN_PREVIEW[themeId]

  return (
    <div className="relative" data-testid={`theme-card-${themeId}`}>
      <RadioGroupItem value={themeId} id={inputId} className="sr-only peer" />
      <Label
        htmlFor={inputId}
        className={cn(
          "theme-theme-card block cursor-pointer rounded-xl transition-shadow",
          selected && "ring-2 ring-primary ring-offset-2 ring-offset-background"
        )}
      >
        <Card
          size="sm"
          className={cn(
            "h-full border-border/80 py-3 shadow-none transition-colors hover:bg-accent/30",
            selected && "border-primary/40 bg-accent/20"
          )}
        >
          <CardContent className="flex flex-col gap-2.5 px-3">
            <div className="flex items-start gap-2.5">
              {definition.mascot ? (
                <span className="theme-decor theme-mascot-container theme-mascot-interactive inline-flex shrink-0">
                  <MascotSvg
                    id={definition.mascot}
                    className="theme-mascot-svg theme-card-mascot size-[4.5rem]"
                  />
                </span>
              ) : (
                <span
                  className="inline-flex size-[4.5rem] shrink-0 items-center justify-center rounded-lg border border-border bg-muted/40 text-xs font-medium text-muted-foreground"
                  aria-hidden
                >
                  {themeId === "light" ? "\u2600" : "\u263e"}
                </span>
              )}
              <div className="min-w-0 flex-1 space-y-0.5 pt-1">
                <div className="text-sm font-medium leading-tight">{t(definition.labelKey)}</div>
                <div className="text-xs leading-snug text-muted-foreground">
                  {t(definition.descriptionKey)}
                </div>
              </div>
            </div>
            <div
              className="theme-card-token-bar flex h-3.5 overflow-hidden rounded-md ring-1 ring-border/60"
              aria-hidden
            >
              {swatches.map((color, index) => (
                <span key={index} className="min-w-0 flex-1" style={{ background: color }} />
              ))}
            </div>
          </CardContent>
        </Card>
      </Label>
    </div>
  )
}