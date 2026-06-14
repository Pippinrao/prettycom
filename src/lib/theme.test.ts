import { describe, expect, it } from "vitest"

import { applyTheme, getCodeMirrorTheme, normalizeTheme } from "@/lib/theme"

describe("theme", () => {
  it("normalizes unknown values to dark", () => {
    expect(normalizeTheme("light")).toBe("light")
    expect(normalizeTheme("dark")).toBe("dark")
    expect(normalizeTheme("pink")).toBe("pink")
    expect(normalizeTheme("anime")).toBe("anime")
    expect(normalizeTheme("cyber")).toBe("cyber")
    expect(normalizeTheme("invalid")).toBe("dark")
  })

  it("applyTheme sets data-theme and dark class per registry", () => {
    applyTheme("light")
    expect(document.documentElement.dataset.theme).toBe("light")
    expect(document.documentElement.classList.contains("dark")).toBe(false)

    applyTheme("dark")
    expect(document.documentElement.dataset.theme).toBe("dark")
    expect(document.documentElement.classList.contains("dark")).toBe(true)

    applyTheme("pink")
    expect(document.documentElement.dataset.theme).toBe("pink")
    expect(document.documentElement.classList.contains("dark")).toBe(false)

    applyTheme("anime")
    expect(document.documentElement.dataset.theme).toBe("anime")
    expect(document.documentElement.classList.contains("dark")).toBe(true)

    applyTheme("cyber")
    expect(document.documentElement.dataset.theme).toBe("cyber")
    expect(document.documentElement.classList.contains("dark")).toBe(true)
  })

  it("maps codemirror theme from registry", () => {
    expect(getCodeMirrorTheme("light")).toBe("light")
    expect(getCodeMirrorTheme("dark")).toBe("dark")
    expect(getCodeMirrorTheme("pink")).toBe("light")
    expect(getCodeMirrorTheme("anime")).toBe("dark")
    expect(getCodeMirrorTheme("cyber")).toBe("dark")
  })
})
