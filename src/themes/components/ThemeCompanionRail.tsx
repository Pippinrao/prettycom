import { useSidebar } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import { usePrettyComStore } from "@/store/prettycom-store"

import { MascotSvg } from "../assets/mascots"
import { useThemeFxValue } from "../animation/ThemeAnimationBridge"
import { getThemeDefinition } from "../registry"

/** Footer companion dock above Settings — styled themes only (pink / neon / cyber). */
export function ThemeCompanionRail() {
  const theme = usePrettyComStore((state) => state.theme)
  const definition = getThemeDefinition(theme)
  const fx = useThemeFxValue()
  const { state } = useSidebar()
  const mascotId = definition.mascot

  if (!definition.animations || !mascotId || state === "collapsed") {
    return null
  }

  return (
    <div
      className={cn(
        "theme-decor theme-companion-rail theme-mascot-container theme-mascot-interactive",
        "mx-2 mb-2 flex items-center justify-center",
        "group-data-[collapsible=icon]:hidden"
      )}
      data-testid="theme-companion-rail"
      data-fx={fx ?? undefined}
      aria-hidden
    >
      <MascotSvg id={mascotId} className="theme-companion-mascot theme-mascot-svg" />
    </div>
  )
}
