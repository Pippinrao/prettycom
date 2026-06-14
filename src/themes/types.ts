import type { Theme } from "@/types/serial"

export type ThemeFx = "port-open" | "send" | "idle" | null

export type MascotId =
  | "pink-sakura-bunny"
  | "anime-neon-fox"
  | "anime-star-cat"
  | "cyber-grid-bot"

export interface ThemeDefinition {
  id: Theme
  labelKey: string
  descriptionKey: string
  mascot?: MascotId
  watermarkMascot?: MascotId
  animations: boolean
  codemirror: "light" | "dark"
  usesDarkClass: boolean
}
