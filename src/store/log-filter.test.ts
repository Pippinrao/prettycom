import { describe, expect, it } from "vitest"

import { filterLogs } from "@/store/log-filter"
import type { LogEntry, LogFilter } from "@/types/serial"

const sample: LogEntry[] = [
  {
    id: "1",
    time: "t",
    direction: "RX",
    level: "normal",
    ascii: "hello world",
    hex: "48 45 4C 4C 4F",
    delta: 0,
    bytes: 5,
  },
  {
    id: "2",
    time: "t",
    direction: "TX",
    level: "success",
    ascii: "AT+RST",
    hex: "41 54 2B 52 53 54",
    delta: 1,
    bytes: 6,
  },
  {
    id: "3",
    time: "t",
    direction: "SYS",
    level: "warning",
    ascii: "disconnected",
    hex: "",
    delta: 0,
    bytes: 0,
  },
]

describe("filterLogs", () => {
  const filter = (patch: Partial<LogFilter>): LogFilter => ({
    search: "",
    highlight: "",
    highlightRules: [],
    direction: "all",
    ...patch,
  })

  it("filters by direction", () => {
    expect(filterLogs(sample, filter({ direction: "TX" }))).toHaveLength(1)
    expect(filterLogs(sample, filter({ direction: "all" }))).toHaveLength(3)
  })

  it("searches ascii and hex", () => {
    expect(filterLogs(sample, filter({ search: "hello" }))).toHaveLength(1)
    expect(filterLogs(sample, filter({ search: "41 54" }))).toHaveLength(1)
  })

  it("search is case insensitive", () => {
    expect(filterLogs(sample, filter({ search: "DISCONNECT" }))).toHaveLength(1)
  })
})
