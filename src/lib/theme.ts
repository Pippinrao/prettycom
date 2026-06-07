import type { Theme } from "@/types/serial"

export function normalizeTheme(value: unknown): Theme {
  return value === "light" ? "light" : "dark"
}

export function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark")
}