import { describe, expect, it } from "vitest"

import {
  applySuffix,
  bytesToAscii,
  bytesToHex,
  createDefaultAliases,
  createRxLogEntry,
  createSysLogEntry,
  createTxLogEntry,
  formatLogsForExport,
  parseAliasesDsl,
  parseHexString,
  parseSendListDsl,
  serializeAliases,
  serializeSendList,
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

  it("serializeAliases and parseAliasesDsl round-trip default aliases", () => {
    const aliases = createDefaultAliases()
    const dsl = serializeAliases(aliases)
    expect(dsl).toContain("@label:Reset AT+RST")
    expect(dsl).toContain("@listloop:1")
    const parsed = parseAliasesDsl(dsl)
    expect(parsed.name).toBe("Quick Commands")
    expect(parsed.aliases).toHaveLength(4)
    expect(parsed.aliases[0].name).toBe("Reset")
    expect(parsed.aliases[0].command).toBe("AT+RST")
    expect(parsed.aliases[3].command).toBe("BOOT 0x1000")
  })

  it("parseAliasesDsl works without @name header", () => {
    const dsl = [
      "@suffix:crlf",
      "@mode:ascii",
      "---",
      "@label:Ping AT @loop:1 @interval:500",
    ].join("\n")
    const parsed = parseAliasesDsl(dsl)
    expect(parsed.name).toBe("")
    expect(parsed.aliases).toHaveLength(1)
    expect(parsed.aliases[0].name).toBe("Ping")
    expect(parsed.aliases[0].command).toBe("AT")
  })

  it("parseAliasesDsl handles @label with spaced command and per-item suffix", () => {
    const dsl = [
      "@name:Team Shortcuts",
      "@suffix:crlf",
      "@mode:ascii",
      "---",
      "@label:Bootloader BOOT 0x1000 @suffix:lf",
    ].join("\n")
    const parsed = parseAliasesDsl(dsl)
    expect(parsed.aliases).toHaveLength(1)
    expect(parsed.aliases[0].name).toBe("Bootloader")
    expect(parsed.aliases[0].command).toBe("BOOT 0x1000")
    expect(parsed.aliases[0].suffix).toBe("lf")
  })

  it("parseSendListDsl strips @label from command lines", () => {
    const dsl = [
      "@name:Test",
      "@listloop:1",
      "@listinterval:500",
      "@suffix:crlf",
      "@mode:ascii",
      "---",
      "@label:Reset AT+RST @loop:1 @interval:500",
    ].join("\n")
    const parsed = parseSendListDsl(dsl)
    expect(parsed.commands).toHaveLength(1)
    expect(parsed.commands[0].command).toBe("AT+RST")
  })

  it("serializeSendList and parseSendListDsl round-trip", () => {
    const list = {
      id: "l1",
      name: "My List",
      commands: [
        {
          id: "c1",
          command: "AT+GMR",
          loopCount: 2,
          intervalMs: 100,
          suffix: "crlf" as const,
          mode: "ascii" as const,
        },
      ],
      listLoop: 3,
      listIntervalMs: 250,
      suffix: "crlf" as const,
      mode: "ascii" as const,
      createdAt: 0,
      updatedAt: 0,
    }
    const parsed = parseSendListDsl(serializeSendList(list))
    expect(parsed.name).toBe("My List")
    expect(parsed.listLoop).toBe(3)
    expect(parsed.listIntervalMs).toBe(250)
    expect(parsed.commands[0].command).toBe("AT+GMR")
    expect(parsed.commands[0].loopCount).toBe(2)
  })
})
