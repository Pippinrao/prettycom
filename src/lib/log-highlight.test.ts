import { createElement, Fragment } from "react"
import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { formatLogPayload } from "@/data/serial-defaults"
import {
  createHighlightRule,
  findFirstMatchingLogId,
  findRuleMatches,
  getActiveHighlightRules,
  highlightText,
  isInvalidRegex,
} from "@/lib/log-highlight"
import type { LogEntry, LogFilter } from "@/types/serial"

const baseFilter: LogFilter = {
  search: "",
  highlight: "",
  highlightRules: [],
  direction: "all",
}

const sampleLogs: LogEntry[] = [
  {
    id: "log-1",
    time: "12:00:00.000",
    direction: "TX",
    level: "success",
    ascii: "AT+GMR",
    hex: "41 54 2B 47 4D 52",
    delta: 0,
    bytes: 6,
  },
  {
    id: "log-2",
    time: "12:00:00.100",
    direction: "RX",
    level: "normal",
    ascii: "ERROR: timeout",
    hex: "45 52 52 4F 52",
    delta: 100,
    bytes: 13,
  },
]

describe("log highlight rules", () => {
  it("uses enabled highlight rules before legacy text", () => {
    const rule = { ...createHighlightRule("AT\\+GMR"), isRegex: true as const, color: "cyan" as const }
    const rules = getActiveHighlightRules({
      ...baseFilter,
      search: "fallback",
      highlightRules: [rule],
    })

    expect(rules).toEqual([rule])
  })

  it("falls back to legacy highlight or search terms", () => {
    expect(getActiveHighlightRules({ ...baseFilter, highlight: "AT+GMR, OK" }).map((rule) => rule.pattern)).toEqual([
      "AT+GMR",
      "OK",
    ])
    expect(getActiveHighlightRules({ ...baseFilter, search: "ERROR" }).map((rule) => rule.pattern)).toEqual([
      "ERROR",
    ])
  })

  it("detects invalid regular expressions with the same flags used for matching", () => {
    expect(isInvalidRegex("[unterminated")).toBe(true)
    expect(isInvalidRegex("AT\\+GMR")).toBe(false)
  })

  it("highlights escaped AT+GMR regex matches", () => {
    const rule = { ...createHighlightRule("AT\\+GMR"), isRegex: true as const }
    const { container } = render(createElement(Fragment, null, highlightText("reply AT+GMR ok", [rule])))
    expect(container.querySelector("mark")?.textContent).toBe("AT+GMR")
  })

  it("does not match literal AT+GMR with an unescaped plus regex", () => {
    const rule = { ...createHighlightRule("AT+GMR"), isRegex: true as const }
    expect(findRuleMatches("reply AT+GMR ok", rule)).toEqual([])
  })

  it("matches keyword mode case-insensitively", () => {
    const rule = createHighlightRule("error")
    expect(findRuleMatches("Soft ERROR detected", rule)).toEqual([
      { start: 5, end: 10, color: "yellow" },
    ])
  })

  it("returns multiple findRuleMatches spans", () => {
    const rule = createHighlightRule("ok")
    expect(findRuleMatches("ok and OK again", rule)).toEqual([
      { start: 0, end: 2, color: "yellow" },
      { start: 7, end: 9, color: "yellow" },
    ])
  })

  it("finds the first matching log id using the active display mode payload", () => {
    const rule = { ...createHighlightRule("AT\\+GMR"), isRegex: true as const }
    expect(findFirstMatchingLogId(sampleLogs, rule, "ascii")).toBe("log-1")
    expect(findFirstMatchingLogId(sampleLogs, rule, "hex")).toBeNull()
    const hexRule = createHighlightRule("41 54 2B")
    expect(findFirstMatchingLogId(sampleLogs, hexRule, "hex")).toBe("log-1")
    expect(findFirstMatchingLogId(sampleLogs, createHighlightRule("missing"), "ascii")).toBeNull()
  })

  it("ignores invalid regex without throwing during matching or rendering", () => {
    const rule = { ...createHighlightRule("[unterminated"), isRegex: true as const }
    expect(findRuleMatches("anything", rule)).toEqual([])
    const { container } = render(createElement(Fragment, null, highlightText("anything", [rule])))
    expect(container.querySelector("mark")).toBeNull()
    expect(container.textContent).toBe("anything")
  })

  it("formats log payloads consistently for locate matching", () => {
    const entry = sampleLogs[0]
    expect(formatLogPayload(entry, "ascii")).toBe("AT+GMR")
    expect(formatLogPayload(entry, "hex")).toBe("41 54 2B 47 4D 52")
  })
})
