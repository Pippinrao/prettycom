import { describe, expect, it } from "vitest"

import { translate } from "@/i18n"

describe("translate", () => {
  it("returns Chinese for zh-CN", () => {
    expect(translate("Settings", "zh-CN")).toBe("设置")
  })

  it("returns key for en-US", () => {
    expect(translate("Settings", "en-US")).toBe("Settings")
  })

  it("falls back to key when missing", () => {
    expect(translate("UnknownKey", "zh-CN")).toBe("UnknownKey")
  })
})
