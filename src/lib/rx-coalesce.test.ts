import { afterEach, beforeEach, describe, expect, it } from "vitest"

import {
  clearRxCoalesce,
  flushRxCoalesce,
  ingestRxChunk,
  registerRxEmitHandler,
  resetRxCoalesce,
  type RxEmit,
} from "@/lib/rx-coalesce"

describe("rx-coalesce", () => {
  const emits: Array<{ sessionId: string; emit: RxEmit }> = []

  beforeEach(() => {
    resetRxCoalesce()
    emits.length = 0
    registerRxEmitHandler((sessionId, emit) => {
      emits.push({ sessionId, emit })
    })
  })

  afterEach(() => {
    resetRxCoalesce()
  })

  it("terminal mode merges chunks until newline", () => {
    ingestRxChunk("s1", new TextEncoder().encode("=== Pandor"), 1000, "terminal")
    ingestRxChunk("s1", new TextEncoder().encode("a Bootloader"), 1001, "terminal")
    expect(emits).toHaveLength(2)
    expect(emits.every((item) => item.emit.kind === "partial")).toBe(true)
    expect(new TextDecoder().decode(emits[1].emit.bytes)).toBe("=== Pandora Bootloader")

    ingestRxChunk("s1", new TextEncoder().encode(" ===\n"), 1002, "terminal")
    expect(emits.at(-1)?.emit.kind).toBe("complete")
    expect(new TextDecoder().decode(emits.at(-1)!.emit.bytes)).toBe("=== Pandora Bootloader ===\n")
  })

  it("terminal mode splits multiple lines in one chunk", () => {
    ingestRxChunk("s1", new TextEncoder().encode("line1\nline2\n"), 2000, "terminal")
    const complete = emits.filter((item) => item.emit.kind === "complete")
    expect(complete).toHaveLength(2)
    expect(new TextDecoder().decode(complete[0].emit.bytes)).toBe("line1\n")
    expect(new TextDecoder().decode(complete[1].emit.bytes)).toBe("line2\n")
  })

  it("frame mode emits each chunk immediately", () => {
    ingestRxChunk("s1", new Uint8Array([0x3d, 0x3d]), 1000, "frame", 900)
    ingestRxChunk("s1", new Uint8Array([0x50]), 1001, "frame", 1000)

    expect(emits).toHaveLength(2)
    expect(emits[0].emit.kind).toBe("complete")
    expect(emits[0].emit.priorRxAt).toBe(900)
    expect(emits[1].emit.priorRxAt).toBe(1000)
    expect(Array.from(emits[0].emit.bytes)).toEqual([0x3d, 0x3d])
    expect(Array.from(emits[1].emit.bytes)).toEqual([0x50])
  })

  it("flushRxCoalesce completes a partial terminal line", () => {
    ingestRxChunk("s1", new TextEncoder().encode("tail"), 3000, "terminal")
    flushRxCoalesce("s1")

    expect(emits.at(-1)?.emit.kind).toBe("complete")
    expect(new TextDecoder().decode(emits.at(-1)!.emit.bytes)).toBe("tail")
  })

  it("clearRxCoalesce drops buffered bytes", () => {
    ingestRxChunk("s1", new Uint8Array([0x31]), 3000, "terminal")
    clearRxCoalesce("s1")
    flushRxCoalesce("s1")
    expect(emits).toHaveLength(1)
    expect(emits[0].emit.kind).toBe("partial")
  })
})