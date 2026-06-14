import { RadioGroup } from "@/components/ui/radio-group"
import type { Theme } from "@/types/serial"

import { THEME_IDS } from "../registry"
import { ThemeCard } from "./ThemeCard"

interface ThemeCardGridProps {
  value: Theme
  onValueChange: (theme: Theme) => void
}

export function ThemeCardGrid({ value, onValueChange }: ThemeCardGridProps) {
  return (
    <RadioGroup
      value={value}
      onValueChange={(next) => onValueChange(next as Theme)}
      data-testid="theme-select"
      className="grid grid-cols-2 gap-3"
      aria-label="Theme"
    >
      {THEME_IDS.map((themeId) => (
        <ThemeCard key={themeId} themeId={themeId} selected={value === themeId} />
      ))}
    </RadioGroup>
  )
}