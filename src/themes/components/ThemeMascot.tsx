import { cn } from "@/lib/utils"
import { usePrettyComStore } from "@/store/prettycom-store"

import { MascotSvg } from "../assets/mascots"
import { useThemeFxValue } from "../animation/ThemeAnimationBridge"
import { getThemeDefinition } from "../registry"
import type { MascotId } from "../types"

interface ThemeMascotProps {
  size?: "sm" | "md" | "lg"
  interactive?: boolean
  mascotId?: MascotId
  className?: string
}

const sizeClasses = {
  sm: "size-16",
  md: "size-20",
  lg: "size-28",
}

export function ThemeMascot({
  size = "sm",
  interactive = true,
  mascotId,
  className,
}: ThemeMascotProps) {
  const theme = usePrettyComStore((state) => state.theme)
  const definition = getThemeDefinition(theme)
  const fx = useThemeFxValue()
  const id = mascotId ?? definition.mascot

  if (!id) {
    return null
  }

  return (
    <div
      className={cn(
        "theme-decor theme-mascot-container shrink-0 text-primary",
        interactive && "theme-mascot-interactive",
        className
      )}
      data-fx={fx ?? undefined}
      data-testid="theme-mascot"
    >
      <MascotSvg id={id} className={cn("theme-mascot-svg", sizeClasses[size])} />
    </div>
  )
}
