import { RadioTower } from "lucide-react"

import { cn } from "@/lib/utils"
import { usePrettyComStore } from "@/store/prettycom-store"

import { MascotSvg } from "../assets/mascots"
import { useThemeFxValue } from "../animation/ThemeAnimationBridge"
import { getThemeDefinition } from "../registry"

export function ThemeEmptyIllustration({ className }: { className?: string }) {
  const theme = usePrettyComStore((state) => state.theme)
  const definition = getThemeDefinition(theme)
  const fx = useThemeFxValue()
  const mascotId = definition.mascot

  if (!mascotId) {
    return (
      <div
        className={cn(
          "mx-auto flex size-10 items-center justify-center rounded-lg border border-border bg-card",
          className
        )}
      >
        <RadioTower className="size-5 text-muted-foreground" />
      </div>
    )
  }

  return (
    <div
      className={cn(
        "theme-decor theme-mascot-container theme-mascot-interactive theme-empty-mascot mx-auto flex size-32 items-center justify-center rounded-2xl border-2 border-primary/30 bg-card/90 text-primary",
        className
      )}
      data-fx={fx ?? undefined}
      data-testid="theme-empty-illustration"
    >
      <MascotSvg id={mascotId} className="theme-mascot-svg size-24" />
    </div>
  )
}
