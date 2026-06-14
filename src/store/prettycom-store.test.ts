import { beforeEach, describe, expect, it, vi } from "vitest"

import * as runtimeEnv from "@/lib/runtime-env"

import {
  createSessionProfile,
  DEV_TEST_SESSION_ID,
  mergePersistedPrettyComState,
  migrateSendListCommands,
  normalizeRxDisplayMode,
  sanitizeProductionSessions,
  usePrettyComStore,
} from "@/store/prettycom-store"
import { createRxLogEntry, createTxLogEntry, createDefaultAliases } from "@/data/serial-defaults"
import {
  DEFAULT_MAX_LOG_ENTRIES_PER_SESSION,
  MAX_SESSIONS,
} from "@/store/storage-limits"

function resetStore() {
  const session = createSessionProfile("COM10", "Test", {
    baudRate: 115200,
    dataBits: 8,
    parity: "none",
    stopBits: 1,
    flowControl: "none",
  })
  session.id = "s1"
  usePrettyComStore.setState({
    currentSessionId: "s1",
    sessions: [session],
    selectedLogId: "",
    commandText: "",
    commandHistory: [],
    aliases: [],
    filter: { search: "", highlight: "", highlightRules: [], direction: "all" },
    autoScroll: true,
    maxLogEntriesPerSession: DEFAULT_MAX_LOG_ENTRIES_PER_SESSION,
    theme: "dark",
  })
}

describe("prettycom-store", () => {
  beforeEach(() => {
    resetStore()
  })

  it("appendLog adds to session and selects when current", () => {
    const entry = createTxLogEntry(new Uint8Array([0x41]), "A", 100)
    usePrettyComStore.getState().appendLog("s1", entry)
    const session = usePrettyComStore.getState().sessions[0]
    expect(session.logs).toHaveLength(1)
    expect(usePrettyComStore.getState().selectedLogId).toBe(entry.id)
  })

  it("appendLog increments unread for background session RX", () => {
    const other = createSessionProfile("COM11", "Other")
    other.id = "s2"
    usePrettyComStore.getState().addSession(other)
    usePrettyComStore.getState().setCurrentSession("s1")
    const rx = createRxLogEntry(new Uint8Array([0x52]), 200)
    usePrettyComStore.getState().appendLog("s2", rx)
    const bg = usePrettyComStore.getState().sessions.find((s) => s.id === "s2")
    expect(bg?.unread).toBe(1)
  })

  it("addCommandHistory dedupes and caps at 50", () => {
    for (let i = 0; i < 55; i++) {
      usePrettyComStore.getState().addCommandHistory({
        id: `h-${i}`,
        command: i % 2 === 0 ? "AT" : `CMD${i}`,
        suffix: "crlf",
        mode: "ascii",
        sentAt: "12:00:00",
      })
    }
    expect(usePrettyComStore.getState().commandHistory.length).toBeLessThanOrEqual(50)
    const atCount = usePrettyComStore.getState().commandHistory.filter((h) => h.command === "AT").length
    expect(atCount).toBe(1)
  })

  it("removeSession clears state when last session removed", () => {
    usePrettyComStore.getState().removeSession("s1")
    expect(usePrettyComStore.getState().sessions).toHaveLength(0)
    expect(usePrettyComStore.getState().currentSessionId).toBe("")
  })

  it("initializes default quick command aliases", () => {
    usePrettyComStore.setState({ aliases: createDefaultAliases() })
    expect(usePrettyComStore.getState().aliases).toHaveLength(4)
    expect(usePrettyComStore.getState().aliases[0].command).toBe("AT+RST")
  })

  it("aliases CRUD", () => {
    usePrettyComStore.getState().addAlias({
      id: "a1",
      name: "Reset",
      command: "AT+RST",
      mode: "ascii",
      suffix: "crlf",
    })
    usePrettyComStore.getState().updateAlias("a1", { name: "Reboot" })
    expect(usePrettyComStore.getState().aliases[0].name).toBe("Reboot")
    usePrettyComStore.getState().deleteAlias("a1")
    expect(usePrettyComStore.getState().aliases).toHaveLength(0)
  })

  it("getFilteredLogs respects filter", () => {
    const tx = createTxLogEntry(new Uint8Array([0x41]), "ping", 1)
    usePrettyComStore.getState().appendLog("s1", tx)
    usePrettyComStore.getState().setFilter({ search: "ping" })
    expect(usePrettyComStore.getState().getFilteredLogs("s1")).toHaveLength(1)
    usePrettyComStore.getState().setFilter({ search: "nomatch" })
    expect(usePrettyComStore.getState().getFilteredLogs("s1")).toHaveLength(0)
  })

  it("appendLog trims oldest entries at session log limit", () => {
    usePrettyComStore.getState().setMaxLogEntriesPerSession(500)
    for (let i = 0; i < 505; i++) {
      usePrettyComStore.getState().appendLog("s1", createRxLogEntry(new Uint8Array([i % 256]), i))
    }
    expect(usePrettyComStore.getState().sessions[0].logs).toHaveLength(500)
  })

  it("setMaxLogEntriesPerSession trims existing logs", () => {
    for (let i = 0; i < 520; i++) {
      usePrettyComStore.getState().appendLog("s1", createRxLogEntry(new Uint8Array([i % 256]), i))
    }
    usePrettyComStore.getState().setMaxLogEntriesPerSession(500)
    expect(usePrettyComStore.getState().maxLogEntriesPerSession).toBe(500)
    expect(usePrettyComStore.getState().sessions[0].logs).toHaveLength(500)
  })

  it("setTheme and setSuffix update persisted preferences", () => {
    usePrettyComStore.getState().setTheme("light")
    usePrettyComStore.getState().setSuffix("lf")
    expect(usePrettyComStore.getState().theme).toBe("light")
    expect(usePrettyComStore.getState().suffix).toBe("lf")
    expect(document.documentElement.classList.contains("dark")).toBe(false)
  })

  it("sanitizeProductionSessions keeps placeholder in dev/e2e runtime", () => {
    const sessions = [
      createSessionProfile("COM3", "Real"),
      { ...createSessionProfile("COM10", "Test Port"), id: DEV_TEST_SESSION_ID },
    ]
    expect(sanitizeProductionSessions(sessions)).toHaveLength(2)
  })

  it("sanitizeProductionSessions removes dev placeholder outside dev/e2e runtime", () => {
    vi.spyOn(runtimeEnv, "isDevOrE2eRuntime").mockReturnValue(false)
    const sessions = [
      createSessionProfile("COM3", "Real"),
      { ...createSessionProfile("COM10", "Test Port"), id: DEV_TEST_SESSION_ID },
    ]
    expect(sanitizeProductionSessions(sessions)).toHaveLength(1)
    expect(sanitizeProductionSessions(sessions)[0].path).toBe("COM3")
    vi.restoreAllMocks()
  })

  it("mergePersistedPrettyComState drops dev placeholder session in production runtime", () => {
    vi.spyOn(runtimeEnv, "isDevOrE2eRuntime").mockReturnValue(false)
    const restored = mergePersistedPrettyComState(
      {
        sessions: [
          {
            id: DEV_TEST_SESSION_ID,
            name: "Test Port",
            path: "COM10",
            config: usePrettyComStore.getState().sessions[0].config,
            status: "disconnected",
            unread: 0,
            logs: [],
          },
        ],
        currentSessionId: DEV_TEST_SESSION_ID,
      },
      usePrettyComStore.getState()
    )
    expect(restored.sessions).toHaveLength(0)
    expect(restored.currentSessionId).toBe("")
    vi.restoreAllMocks()
  })

  it("mergePersistedPrettyComState restores theme and suffix", () => {
    const restored = mergePersistedPrettyComState(
      { theme: "light", suffix: "cr" },
      usePrettyComStore.getState()
    )
    expect(restored.theme).toBe("light")
    expect(restored.suffix).toBe("cr")
  })

  it("normalizeRxDisplayMode rejects invalid persisted values", () => {
    expect(normalizeRxDisplayMode("frame")).toBe("frame")
    expect(normalizeRxDisplayMode("terminal")).toBe("terminal")
    expect(normalizeRxDisplayMode("bogus")).toBe("terminal")
    expect(normalizeRxDisplayMode(undefined)).toBe("terminal")
  })

  it("mergePersistedPrettyComState coerces invalid rxDisplayMode", () => {
    const restored = mergePersistedPrettyComState(
      { rxDisplayMode: "bogus" as never },
      usePrettyComStore.getState()
    )
    expect(restored.rxDisplayMode).toBe("terminal")
  })

  it("mergePersistedPrettyComState restores logs and highlight rules", () => {
    const entry = createTxLogEntry(new Uint8Array([0x41]), "AT+GMR", 1)
    const restored = mergePersistedPrettyComState(
      {
        sessions: [
          {
            id: "s1",
            name: "Saved",
            path: "COM10",
            config: usePrettyComStore.getState().sessions[0].config,
            status: "disconnected",
            unread: 0,
            logs: [entry],
          },
        ],
        currentSessionId: "s1",
        filter: {
          search: "",
          highlight: "",
          highlightRules: [
            {
              id: "rule-1",
              pattern: "AT\\+GMR",
              isRegex: true,
              color: "yellow",
              enabled: true,
            },
          ],
          direction: "all",
        },
        maxLogEntriesPerSession: 3000,
      },
      usePrettyComStore.getState()
    )

    expect(restored.sessions[0].logs).toHaveLength(1)
    expect(restored.sessions[0].logs[0].ascii).toBe("AT+GMR")
    expect(restored.filter.highlightRules).toHaveLength(1)
    expect(restored.selectedLogId).toBe(entry.id)
    expect(restored.sessions[0].status).toBe("disconnected")
  })

  it("addSession evicts oldest disconnected sessions at session limit", () => {
    for (let i = 0; i < MAX_SESSIONS; i++) {
      const session = createSessionProfile(`COM${20 + i}`, `Port ${i}`)
      session.id = `extra-${i}`
      usePrettyComStore.getState().addSession(session)
    }
    expect(usePrettyComStore.getState().sessions.length).toBeLessThanOrEqual(MAX_SESSIONS)
  })

  it("migrates legacy displayMode to logDisplayMode and sendDisplayMode", () => {
    const restored = mergePersistedPrettyComState(
      { displayMode: "hex" } as Record<string, unknown>,
      usePrettyComStore.getState()
    )
    expect(restored.logDisplayMode).toBe("hex")
    expect(restored.sendDisplayMode).toBe("hex")
  })

  it("setLogDisplayMode and setSendDisplayMode update independently", () => {
    usePrettyComStore.getState().setLogDisplayMode("hex")
    usePrettyComStore.getState().setSendDisplayMode("ascii")
    expect(usePrettyComStore.getState().logDisplayMode).toBe("hex")
    expect(usePrettyComStore.getState().sendDisplayMode).toBe("ascii")
  })

  it("migrateSendListCommands fills per-command suffix and mode from list defaults", () => {
    const migrated = migrateSendListCommands(
      [
        {
          id: "c1",
          command: "AT",
          loopCount: 2,
          intervalMs: 100,
        } as never,
      ],
      { suffix: "lf", mode: "hex" }
    )
    expect(migrated[0].suffix).toBe("lf")
    expect(migrated[0].mode).toBe("hex")
  })

  it("mergePersistedPrettyComState migrates send list commands with suffix and mode", () => {
    const restored = mergePersistedPrettyComState(
      {
        sendLists: [
          {
            id: "list-1",
            name: "Test",
            commands: [{ id: "c1", command: "AT+RST", loopCount: 1, intervalMs: 50, suffix: "crlf", mode: "ascii" }],
            listLoop: 1,
            listIntervalMs: 500,
            suffix: "crlf",
            mode: "ascii",
            createdAt: 1,
            updatedAt: 1,
          },
        ],
      },
      usePrettyComStore.getState()
    )
    expect(restored.sendLists[0].commands[0].suffix).toBe("crlf")
    expect(restored.sendLists[0].commands[0].mode).toBe("ascii")
  })

  it("setInspectorOpen persists inspector panel state", () => {
    usePrettyComStore.getState().setInspectorOpen(false)
    expect(usePrettyComStore.getState().inspectorOpen).toBe(false)
  })
})
