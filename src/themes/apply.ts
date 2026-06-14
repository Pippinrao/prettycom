import type { Theme } from "@/types/serial"

import { getThemeDefinition, isValidTheme } from "./registry"

export function normalizeTheme(value: unknown): Theme {
  return isValidTheme(value) ? value : "dark"
}

export function applyTheme(theme: Theme) {
  const definition = getThemeDefinition(theme)
  const root = document.documentElement
  root.dataset.theme = theme
  root.classList.toggle("dark", definition.usesDarkClass)
}

export function getCodeMirrorTheme(theme: Theme): "light" | "dark" {
  return getThemeDefinition(theme).codemirror
}
