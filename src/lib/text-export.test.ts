import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@tauri-apps/plugin-dialog", () => ({
  save: vi.fn().mockRejectedValue(new Error("no tauri")),
}))

import { copyTextToClipboard, saveTextToFile } from "@/lib/text-export"

describe("text-export", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it("copyTextToClipboard writes via navigator.clipboard", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal("navigator", { clipboard: { writeText } })

    await expect(copyTextToClipboard("hello")).resolves.toBe(true)
    expect(writeText).toHaveBeenCalledWith("hello")
  })

  it("saveTextToFile triggers browser download when Tauri save fails", async () => {
    const click = vi.fn()
    const anchor = { click, download: "", href: "" } as unknown as HTMLAnchorElement
    const createElement = vi.spyOn(document, "createElement").mockReturnValue(anchor)
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:test")
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {})

    await expect(saveTextToFile("@name:test\n---\nAT", "test.dsl")).resolves.toBe(true)
    expect(createElement).toHaveBeenCalledWith("a")
    expect(anchor.download).toBe("test.dsl")
    expect(click).toHaveBeenCalled()
  })
})