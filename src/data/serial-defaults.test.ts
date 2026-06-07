import { describe, expect, it } from "vitest"

import {
  applySuffix,
  bytesToAscii,
  bytesToHex,
  createRxLogEntry,
  createSysLogEntry,
  createTxLogEntry,
  formatLogsForExport,
  parseHexString,
} from "@/data/serial-defaults"

describe("serial-defaults", () => {
  it("applySuffix appends line endings", () => {
    expect(applySuffix("AT", "none")).toBe("AT")
    expect(applySuffix("AT", "cr")).toBe("AT\r")
    expect(applySuffix("AT", "lf")).toBe("AT\n")
    expect(applySuffix("AT", "crlf")).toBe("AT\r\n")
  })

  it("parseHexString handles spaced and 0x prefixes", () => {
    expect(Array.from(parseHexString("41 54 0D 0A"))).toEqual([0x41, 0x54, 0x0d, 0x0a])
    expect(Array.from(parseHexString("0x41 0x54"))).toEqual([0x41, 0x54])
    expect(parseHexString("").length).toBe(0)
  })

  it("parseHexString rejects odd digit count", () => {
    expect(() => parseHexString("ABC")).toThrow(/odd/)
  })

  it("bytesToAscii replaces non-printable with dot", () => {
    expect(bytesToAscii(new Uint8Array([0x41, 0x00, 0x7e]))).toBe("A.~")
  })

  it("bytesToHex formats uppercase pairs", () => {
    expect(bytesToHex(new Uint8Array([0x0a, 0xff]))).toBe("0A FF")
  })

  it("createRxLogEntry computes delta from lastRxAt", () => {
    const entry = createRxLogEntry(new Uint8Array([0x41]), 1100, 1000)
    expect(entry.direction).toBe("RX")
    expect(entry.delta).toBe(100)
    expect(entry.bytes).toBe(1)
  })

  it("createTxLogEntry marks success direction", () => {
    const entry = createTxLogEntry(new Uint8Array([0x41]), "A", 500)
    expect(entry.direction).toBe("TX")
    expect(entry.level).toBe("success")
  })

  it("createSysLogEntry uses SYS direction", () => {
    const entry = createSysLogEntry("port closed", "error")
    expect(entry.direction).toBe("SYS")
    expect(entry.level).toBe("error")
  })

  it("formatLogsForExport exports CSV rows", () => {
    const text = formatLogsForExport([
      {
        id: "1",
        time: "12:00:00.000",
        direction: "TX",
        level: "success",
        ascii: "hi",
        hex: "68 69",
        delta: 0,
        bytes: 2,
      },
    ])
    expect(text).toContain("time,direction,level,ascii,hex,bytes,delta_ms")
    expect(text).toContain("12:00:00.000,TX,success,hi,68 69,2,0")
  })
})
