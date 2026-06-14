import { cn } from "@/lib/utils"
import { usePrettyComStore } from "@/store/prettycom-store"

import { MascotSvg } from "../assets/mascots"
import { useThemeFxValue } from "../animation/ThemeAnimationBridge"
import { getThemeDefinition } from "../registry"

export function ThemeWatermark() {
  const theme = usePrettyComStore((state) => state.theme)
  const definition = getThemeDefinition(theme)
  const fx = useThemeFxValue()
  const mascotId = definition.watermarkMascot ?? definition.mascot

  if (!mascotId) {
    return null
  }

  return (
    <div
      className={cn(
        "theme-decor theme-watermark pointer-events-none fixed bottom-6 right-6 z-0 text-primary",
        "hidden md:block"
      )}
      data-fx={fx ?? undefined}
      data-testid="theme-watermark"
      aria-hidden
    >
      <MascotSvg id={mascotId} className="theme-watermark-svg size-48" />
    </div>
  )
}
