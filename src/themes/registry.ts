import type { Theme } from "@/types/serial"

import type { ThemeDefinition } from "./types"

export const THEME_IDS = ["light", "dark", "pink", "anime", "cyber"] as const satisfies readonly Theme[]

export const themeRegistry: Record<Theme, ThemeDefinition> = {
  light: {
    id: "light",
    labelKey: "Light theme",
    descriptionKey: "Clean light interface without decorations.",
    animations: false,
    codemirror: "light",
    usesDarkClass: false,
  },
  dark: {
    id: "dark",
    labelKey: "Dark theme",
    descriptionKey: "Clean dark interface without decorations.",
    animations: false,
    codemirror: "dark",
    usesDarkClass: true,
  },
  pink: {
    id: "pink",
    labelKey: "Pink theme",
    descriptionKey: "Soft sakura palette with a bunny mascot.",
    mascot: "pink-sakura-bunny",
    animations: true,
    codemirror: "light",
    usesDarkClass: false,
  },
  anime: {
    id: "anime",
    labelKey: "Neon theme",
    descriptionKey: "Neon accents with fox and star-cat mascots.",
    mascot: "anime-neon-fox",
    watermarkMascot: "anime-star-cat",
    animations: true,
    codemirror: "dark",
    usesDarkClass: true,
  },
  cyber: {
    id: "cyber",
    labelKey: "Cyber theme",
    descriptionKey: "Dark console with cyan grid accents and a grid-bot mascot.",
    mascot: "cyber-grid-bot",
    animations: true,
    codemirror: "dark",
    usesDarkClass: true,
  },
}

export function getThemeDefinition(theme: Theme): ThemeDefinition {
  return themeRegistry[theme]
}

export function isValidTheme(value: unknown): value is Theme {
  return typeof value === "string" && value in themeRegistry
}
