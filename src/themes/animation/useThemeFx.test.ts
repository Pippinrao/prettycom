import { describe, expect, it } from "vitest"

import { countTxLogs, detectThemeFx } from "./useThemeFx"

describe("detectThemeFx", () => {
  it("returns port-open when status becomes connected", () => {
    const result = detectThemeFx({
      prevStatus: "disconnected",
      status: "connected",
      prevTxCount: 0,
      txCount: 0,
      animationsEnabled: true,
      lastSendAt: 0,
      now: 1000,
    })

    expect(result.fx).toBe("port-open")
  })

  it("returns idle when status disconnects from connected", () => {
    const result = detectThemeFx({
      prevStatus: "connected",
      status: "disconnected",
      prevTxCount: 2,
      txCount: 2,
      animationsEnabled: true,
      lastSendAt: 0,
      now: 1000,
    })

    expect(result.fx).toBe("idle")
  })

  it("returns send when tx count increases after debounce window", () => {
    const result = detectThemeFx({
      prevStatus: "connected",
      status: "connected",
      prevTxCount: 1,
      txCount: 2,
      animationsEnabled: true,
      lastSendAt: 100,
      now: 500,
    })

    expect(result.fx).toBe("send")
    expect(result.nextLastSendAt).toBe(500)
  })

  it("debounces rapid send events within 300ms", () => {
    const result = detectThemeFx({
      prevStatus: "connected",
      status: "connected",
      prevTxCount: 1,
      txCount: 2,
      animationsEnabled: true,
      lastSendAt: 900,
      now: 1000,
    })

    expect(result.fx).toBeNull()
  })

  it("returns null when animations are disabled", () => {
    const result = detectThemeFx({
      prevStatus: "disconnected",
      status: "connected",
      prevTxCount: 0,
      txCount: 1,
      animationsEnabled: false,
      lastSendAt: 0,
      now: 1000,
    })

    expect(result.fx).toBeNull()
  })
})

describe("countTxLogs", () => {
  it("counts only TX log entries", () => {
    expect(
      countTxLogs([
        { direction: "TX" },
        { direction: "RX" },
        { direction: "TX" },
        { direction: "SYS" },
      ])
    ).toBe(2)
  })
})
