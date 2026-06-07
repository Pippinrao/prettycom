import { describe, expect, it } from "vitest"

import { applyTheme, normalizeTheme } from "@/lib/theme"

describe("theme", () => {
  it("normalizes unknown values to dark", () => {
    expect(normalizeTheme("light")).toBe("light")
    expect(normalizeTheme("dark")).toBe("dark")
    expect(normalizeTheme("invalid")).toBe("dark")
  })

  it("applyTheme toggles html dark class", () => {
    applyTheme("light")
    expect(document.documentElement.classList.contains("dark")).toBe(false)
    applyTheme("dark")
    expect(document.documentElement.classList.contains("dark")).toBe(true)
  })
})