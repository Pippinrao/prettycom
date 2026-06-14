import { describe, expect, it } from "vitest"

import { getThemeDefinition, isValidTheme, THEME_IDS, themeRegistry } from "./registry"

describe("themeRegistry", () => {
  it("defines all theme ids with complete metadata", () => {
    expect(THEME_IDS).toEqual(["light", "dark", "pink", "anime", "cyber"])

    for (const id of THEME_IDS) {
      const definition = themeRegistry[id]
      expect(definition.id).toBe(id)
      expect(definition.labelKey).toBeTruthy()
      expect(definition.descriptionKey).toBeTruthy()
      expect(["light", "dark"]).toContain(definition.codemirror)
      expect(typeof definition.animations).toBe("boolean")
      expect(typeof definition.usesDarkClass).toBe("boolean")
    }
  })

  it("enables animations and mascots for pink, anime, and cyber", () => {
    expect(themeRegistry.light.animations).toBe(false)
    expect(themeRegistry.dark.animations).toBe(false)
    expect(themeRegistry.pink.animations).toBe(true)
    expect(themeRegistry.pink.mascot).toBe("pink-sakura-bunny")
    expect(themeRegistry.anime.animations).toBe(true)
    expect(themeRegistry.anime.mascot).toBe("anime-neon-fox")
    expect(themeRegistry.anime.watermarkMascot).toBe("anime-star-cat")
    expect(themeRegistry.cyber.animations).toBe(true)
    expect(themeRegistry.cyber.mascot).toBe("cyber-grid-bot")
  })

  it("validates theme ids", () => {
    expect(isValidTheme("anime")).toBe(true)
    expect(isValidTheme("pink")).toBe(true)
    expect(isValidTheme("cyber")).toBe(true)
    expect(isValidTheme("invalid")).toBe(false)
    expect(getThemeDefinition("pink").id).toBe("pink")
  })
})
