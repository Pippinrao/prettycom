import { create } from "zustand"
import { persist } from "zustand/middleware"

import { DEFAULT_SERIAL_CONFIG } from "@/data/serial-config"
import { createDefaultAliases } from "@/data/serial-defaults"
import { DEFAULT_TEST_PORT_A } from "@/data/test-ports"
import { filterLogs } from "@/store/log-filter"
import {
  DEFAULT_MAX_LOG_ENTRIES_PER_SESSION,
  MAX_COMMAND_HISTORY,
  MAX_SESSIONS,
  normalizeLogLimit,
  trimLogsToLimit,
} from "@/store/storage-limits"
import type {
  Alias,
  CommandHistoryEntry,
  DisplayMode,
  Language,
  LineSuffix,
  LogEntry,
  LogFilter,
  RxDisplayMode,
  SendList,
  SerialConfig,
  SessionStatus,
  Theme,
} from "@/types/serial"
import { isDevOrE2eRuntime } from "@/lib/runtime-env"
import { applyTheme, normalizeTheme } from "@/lib/theme"

export const DEV_TEST_SESSION_ID = "test-default"

export type { DisplayMode, Language, LineSuffix, Theme }

export interface SessionProfile {
  id: string
  name: string
  path: string
  config: SerialConfig
  status: SessionStatus
  logs: LogEntry[]
  unread: number
  lastRxAt?: number
}

function createSessionRestoreTemplate(): SessionProfile {
  return {
    id: "",
    name: "",
    path: "",
    config: { ...DEFAULT_SERIAL_CONFIG },
    status: "disconnected",
    logs: [],
    unread: 0,
  }
}

function createDevTestSession(): SessionProfile {
  return {
    ...createSessionRestoreTemplate(),
    id: DEV_TEST_SESSION_ID,
    name: "Test Port",
    path: DEFAULT_TEST_PORT_A,
  }
}

/** Default display name for a new session: the port identifier itself. */
export function defaultSessionNameFromPath(path: string): string {
  return path.trim()
}

/** Remove built-in dev/E2E placeholder sessions from production runtime. */
export function sanitizeProductionSessions(sessions: SessionProfile[]): SessionProfile[] {
  if (isDevOrE2eRuntime()) {
    return sessions
  }
  return sessions.filter((session) => session.id !== DEV_TEST_SESSION_ID)
}

function createInitialSessions(): SessionProfile[] {
  return isDevOrE2eRuntime() ? [createDevTestSession()] : []
}

export function normalizeRxDisplayMode(value: unknown): RxDisplayMode {
  return value === "frame" ? "frame" : "terminal"
}

function finalizeMergedState(state: PrettyComState): PrettyComState {
  const sessions = sanitizeProductionSessions(state.sessions)
  const currentSessionId =
    sessions.find((session) => session.id === state.currentSessionId)?.id ??
    sessions[0]?.id ??
    ""
  const activeSession = sessions.find((session) => session.id === currentSessionId)
  return {
    ...state,
    sessions,
    currentSessionId,
    selectedLogId: activeSession?.logs.at(-1)?.id ?? "",
    rxDisplayMode: normalizeRxDisplayMode(state.rxDisplayMode),
  }
}

export function mergePersistedPrettyComState(
  saved: Partial<PrettyComState> | undefined,
  current: PrettyComState
): PrettyComState {
  const maxLogEntriesPerSession = normalizeLogLimit(
    saved?.maxLogEntriesPerSession ?? current.maxLogEntriesPerSession
  )
  const filter = saved?.filter ? { ...current.filter, ...saved.filter } : current.filter
  const theme = normalizeTheme(saved?.theme ?? current.theme)
  const rxDisplayMode = normalizeRxDisplayMode(saved?.rxDisplayMode ?? current.rxDisplayMode)

  if (!saved?.sessions?.length) {
    const sendLists = (saved?.sendLists ?? current.sendLists).map((list: SendList) => {
      const migrated = { ...list } as SendList & { loopCount?: number; intervalMs?: number }
      if (migrated.loopCount !== undefined) {
        migrated.listLoop = migrated.loopCount
        delete migrated.loopCount
      }
      if (migrated.intervalMs !== undefined) {
        migrated.listIntervalMs = migrated.intervalMs
        delete migrated.intervalMs
      }
      if (migrated.listLoop === undefined) migrated.listLoop = 1
      if (migrated.listIntervalMs === undefined) migrated.listIntervalMs = 500
      migrated.commands = migrated.commands.map((cmd) => ({
        id: cmd.id,
        command: cmd.command,
        loopCount: cmd.loopCount ?? 1,
        intervalMs: cmd.intervalMs ?? 500,
      })) as SendList["commands"]
      return migrated as SendList
    })
    return finalizeMergedState({
      ...current,
      ...saved,
      sendLists,
      maxLogEntriesPerSession,
      filter,
      theme,
      rxDisplayMode,
      pendingScrollLogId: null,
      commandOpen: false,
      settingsOpen: false,
    })
  }

  let sessions: SessionProfile[] = saved.sessions.map((session) => ({
    ...createSessionRestoreTemplate(),
    ...session,
    status: "disconnected" as SessionStatus,
    logs: trimLogsToLimit(session.logs ?? [], maxLogEntriesPerSession),
    unread: 0,
    lastRxAt: undefined,
    config: { ...DEFAULT_SERIAL_CONFIG, ...session.config },
  }))
  sessions = sanitizeProductionSessions(sessions)
  if (!isDevOrE2eRuntime()) {
    sessions = sessions.map((session) =>
      session.name.trim().toUpperCase() === "STM32" && session.path.trim()
        ? { ...session, name: defaultSessionNameFromPath(session.path) }
        : session
    )
  }

  const sendLists = (saved.sendLists ?? current.sendLists).map((list: SendList) => {
    const migrated = { ...list } as SendList & { loopCount?: number; intervalMs?: number }
    if (migrated.loopCount !== undefined) {
      migrated.listLoop = migrated.loopCount
      delete migrated.loopCount
    }
    if (migrated.intervalMs !== undefined) {
      migrated.listIntervalMs = migrated.intervalMs
      delete migrated.intervalMs
    }
    if (migrated.listLoop === undefined) migrated.listLoop = 1
    if (migrated.listIntervalMs === undefined) migrated.listIntervalMs = 500
    migrated.commands = migrated.commands.map((cmd) => ({
      id: cmd.id,
      command: cmd.command,
      loopCount: cmd.loopCount ?? 1,
      intervalMs: cmd.intervalMs ?? 500,
    })) as SendList["commands"]
    return migrated as SendList
  })

  return finalizeMergedState({
    ...current,
    ...saved,
    sendLists,
    maxLogEntriesPerSession,
    filter,
    theme,
    rxDisplayMode,
    sessions,
    pendingScrollLogId: null,
    commandOpen: false,
    settingsOpen: false,
  })
}

interface PrettyComState {
  currentSessionId: string
  selectedLogId: string
  commandText: string
  commandHistory: CommandHistoryEntry[]
  aliases: Alias[]
  filter: LogFilter
  language: Language
  theme: Theme
  displayMode: DisplayMode
  rxDisplayMode: RxDisplayMode
  suffix: LineSuffix
  commandOpen: boolean
  settingsOpen: boolean
  sidebarOpen: boolean
  inspectorTab: string
  autoScroll: boolean
  pendingScrollLogId: string | null
  maxLogEntriesPerSession: number
  sendLists: SendList[]
  sendListRunningId: string | null
  sessions: SessionProfile[]
  setCurrentSession: (sessionId: string) => void
  setSelectedLog: (logId: string) => void
  setCommandText: (text: string) => void
  appendLog: (sessionId: string, entry: LogEntry, rxAt?: number) => void
  deleteLogEntry: (sessionId: string, logId: string) => void
  clearLogs: (sessionId: string) => void
  setSessionLogs: (sessionId: string, logs: LogEntry[]) => void
  addSession: (session: SessionProfile) => void
  removeSession: (sessionId: string) => void
  updateSession: (sessionId: string, patch: Partial<SessionProfile>) => void
  setSessionStatus: (sessionId: string, status: SessionStatus) => void
  markSessionRead: (sessionId: string) => void
  addCommandHistory: (entry: CommandHistoryEntry) => void
  deleteCommandHistory: (historyId: string) => void
  clearCommandHistory: () => void
  addAlias: (alias: Alias) => void
  updateAlias: (aliasId: string, patch: Partial<Alias>) => void
  deleteAlias: (aliasId: string) => void
  setFilter: (patch: Partial<LogFilter>) => void
  setLanguage: (language: Language) => void
  setTheme: (theme: Theme) => void
  setDisplayMode: (mode: DisplayMode) => void
  setRxDisplayMode: (mode: RxDisplayMode) => void
  updateLogEntry: (
    sessionId: string,
    logId: string,
    patch: Partial<Pick<LogEntry, "ascii" | "hex" | "bytes">>,
    rxAt?: number
  ) => void
  setSuffix: (suffix: LineSuffix) => void
  setCommandOpen: (open: boolean) => void
  setSettingsOpen: (open: boolean) => void
  setSidebarOpen: (open: boolean) => void
  setInspectorTab: (tab: string) => void
  setAutoScroll: (autoScroll: boolean) => void
  setPendingScrollLogId: (logId: string | null) => void
  setMaxLogEntriesPerSession: (limit: number) => void
  addSendList: (list: SendList) => void
  updateSendList: (id: string, patch: Partial<SendList>) => void
  deleteSendList: (id: string) => void
  setSendListRunning: (id: string | null) => void
  getCurrentSession: () => SessionProfile | undefined
  getFilteredLogs: (sessionId?: string) => LogEntry[]
}

export const usePrettyComStore = create<PrettyComState>()(
  persist(
    (set, get) => {
      const initialSessions = createInitialSessions()
      return {
      currentSessionId: initialSessions[0]?.id ?? "",
      selectedLogId: "",
      commandText: "",
      commandHistory: [],
      aliases: createDefaultAliases(),
      filter: { search: "", highlight: "", highlightRules: [], direction: "all" },
      language: "zh-CN",
      theme: "dark",
      displayMode: "ascii",
      rxDisplayMode: "terminal",
      suffix: "crlf",
      commandOpen: false,
      settingsOpen: false,
      sidebarOpen: true,
      inspectorTab: "commands",
      autoScroll: true,
      pendingScrollLogId: null,
      maxLogEntriesPerSession: DEFAULT_MAX_LOG_ENTRIES_PER_SESSION,
      sendLists: [],
      sendListRunningId: null,
      sessions: initialSessions,
      setCurrentSession: (currentSessionId) =>
        set((state) => {
          const sessions = state.sessions.map((session) =>
            session.id === currentSessionId ? { ...session, unread: 0 } : session
          )
          const current = sessions.find((session) => session.id === currentSessionId)
          return {
            currentSessionId,
            sessions,
            selectedLogId: current?.logs.at(-1)?.id ?? "",
          }
        }),
      setSelectedLog: (selectedLogId) => set({ selectedLogId }),
      setCommandText: (commandText) => set({ commandText }),
      appendLog: (sessionId, entry, rxAt) =>
        set((state) => {
          const isCurrent = state.currentSessionId === sessionId
          const sessions = state.sessions.map((session) => {
            if (session.id !== sessionId) {
              return session
            }
            const logs = trimLogsToLimit([...session.logs, entry], state.maxLogEntriesPerSession)
            const lastRxAt = entry.direction === "RX" ? (rxAt ?? Date.now()) : session.lastRxAt
            return {
              ...session,
              logs,
              lastRxAt,
              unread: isCurrent ? 0 : session.unread + (entry.direction === "RX" ? 1 : 0),
            }
          })
          return {
            sessions,
            selectedLogId: isCurrent ? entry.id : state.selectedLogId,
          }
        }),
      deleteLogEntry: (sessionId, logId) =>
        set((state) => {
          const sessions = state.sessions.map((session) => {
            if (session.id !== sessionId) {
              return session
            }
            const logs = session.logs.filter((entry) => entry.id !== logId)
            return { ...session, logs }
          })
          const current = sessions.find((session) => session.id === sessionId)
          return {
            sessions,
            selectedLogId:
              state.selectedLogId === logId ? current?.logs.at(-1)?.id ?? "" : state.selectedLogId,
          }
        }),
      updateLogEntry: (sessionId, logId, patch, rxAt) =>
        set((state) => {
          const sessions = state.sessions.map((session) => {
            if (session.id !== sessionId) {
              return session
            }
            const logs = session.logs.map((entry) =>
              entry.id === logId ? { ...entry, ...patch } : entry
            )
            return {
              ...session,
              logs,
              lastRxAt: rxAt ?? session.lastRxAt,
            }
          })
          return { sessions }
        }),
      clearLogs: (sessionId) =>
        set((state) => ({
          sessions: state.sessions.map((session) =>
            session.id === sessionId ? { ...session, logs: [], unread: 0, lastRxAt: undefined } : session
          ),
          selectedLogId: state.currentSessionId === sessionId ? "" : state.selectedLogId,
        })),
      setSessionLogs: (sessionId, logs) =>
        set((state) => ({
          sessions: state.sessions.map((session) =>
            session.id === sessionId
              ? { ...session, logs: trimLogsToLimit(logs, state.maxLogEntriesPerSession) }
              : session
          ),
          selectedLogId:
            state.currentSessionId === sessionId ? logs.at(-1)?.id ?? "" : state.selectedLogId,
        })),
      addSession: (session) =>
        set((state) => {
          let sessions = [...state.sessions, session]
          while (sessions.length > MAX_SESSIONS) {
            const removeIndex = sessions.findIndex(
              (item) =>
                item.id !== session.id &&
                item.id !== state.currentSessionId &&
                item.status === "disconnected"
            )
            if (removeIndex < 0) {
              const fallbackIndex = sessions.findIndex((item) => item.id !== session.id)
              if (fallbackIndex < 0) {
                break
              }
              sessions = sessions.filter((_, index) => index !== fallbackIndex)
            } else {
              sessions = sessions.filter((_, index) => index !== removeIndex)
            }
          }
          return {
            sessions,
            currentSessionId: session.id,
            selectedLogId: "",
          }
        }),
      removeSession: (sessionId) =>
        set((state) => {
          const sessions = state.sessions.filter((session) => session.id !== sessionId)
          if (!sessions.length) {
            return {
              sessions: [],
              currentSessionId: "",
              selectedLogId: "",
            }
          }
          const currentSessionId =
            state.currentSessionId === sessionId ? sessions[0].id : state.currentSessionId
          const current = sessions.find((session) => session.id === currentSessionId)
          return {
            sessions,
            currentSessionId,
            selectedLogId: current?.logs.at(-1)?.id ?? "",
          }
        }),
      updateSession: (sessionId, patch) =>
        set((state) => ({
          sessions: state.sessions.map((session) =>
            session.id === sessionId ? { ...session, ...patch } : session
          ),
        })),
      setSessionStatus: (sessionId, status) =>
        set((state) => ({
          sessions: state.sessions.map((session) =>
            session.id === sessionId ? { ...session, status } : session
          ),
        })),
      markSessionRead: (sessionId) =>
        set((state) => ({
          sessions: state.sessions.map((session) =>
            session.id === sessionId ? { ...session, unread: 0 } : session
          ),
        })),
      addCommandHistory: (entry) =>
        set((state) => ({
          commandHistory: [entry, ...state.commandHistory.filter((item) => item.command !== entry.command)].slice(
            0,
            MAX_COMMAND_HISTORY
          ),
        })),
      deleteCommandHistory: (historyId) =>
        set((state) => ({
          commandHistory: state.commandHistory.filter((entry) => entry.id !== historyId),
        })),
      clearCommandHistory: () => set({ commandHistory: [] }),
      addAlias: (alias) => set((state) => ({ aliases: [...state.aliases, alias] })),
      updateAlias: (aliasId, patch) =>
        set((state) => ({
          aliases: state.aliases.map((alias) => (alias.id === aliasId ? { ...alias, ...patch } : alias)),
        })),
      deleteAlias: (aliasId) =>
        set((state) => ({
          aliases: state.aliases.filter((alias) => alias.id !== aliasId),
        })),
      setFilter: (patch) => set((state) => ({ filter: { ...state.filter, ...patch } })),
      setLanguage: (language) => set({ language }),
      setTheme: (theme) => {
        const nextTheme = normalizeTheme(theme)
        applyTheme(nextTheme)
        set({ theme: nextTheme })
      },
      setDisplayMode: (displayMode) => set({ displayMode }),
      setRxDisplayMode: (rxDisplayMode) => set({ rxDisplayMode }),
      setSuffix: (suffix) => set({ suffix }),
      setCommandOpen: (commandOpen) => set({ commandOpen }),
      setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      setInspectorTab: (inspectorTab) => set({ inspectorTab }),
      setAutoScroll: (autoScroll) => set({ autoScroll }),
      setPendingScrollLogId: (pendingScrollLogId) => set({ pendingScrollLogId }),
      setMaxLogEntriesPerSession: (limit) =>
        set((state) => {
          const maxLogEntriesPerSession = normalizeLogLimit(limit)
          return {
            maxLogEntriesPerSession,
            sessions: state.sessions.map((session) => ({
              ...session,
              logs: trimLogsToLimit(session.logs, maxLogEntriesPerSession),
            })),
          }
        }),
      addSendList: (list) => set((state) => ({ sendLists: [...state.sendLists, list] })),
      updateSendList: (id, patch) =>
        set((state) => ({
          sendLists: state.sendLists.map((list) =>
            list.id === id ? { ...list, ...patch, updatedAt: Date.now() } : list
          ),
        })),
      deleteSendList: (id) =>
        set((state) => ({
          sendLists: state.sendLists.filter((list) => list.id !== id),
        })),
      setSendListRunning: (sendListRunningId) => set({ sendListRunningId }),
      getCurrentSession: () => get().sessions.find((session) => session.id === get().currentSessionId),
      getFilteredLogs: (sessionId) => {
        const id = sessionId ?? get().currentSessionId
        const session = get().sessions.find((item) => item.id === id)
        if (!session) {
          return []
        }
        return filterLogs(session.logs, get().filter)
      },
    }
    },
    {
      name: "prettycom-ui-state",
      partialize: (state) => ({
        currentSessionId: state.currentSessionId,
        displayMode: state.displayMode,
        rxDisplayMode: state.rxDisplayMode,
        suffix: state.suffix,
        sidebarOpen: state.sidebarOpen,
        inspectorTab: state.inspectorTab,
        commandHistory: state.commandHistory,
        aliases: state.aliases,
        language: state.language,
        theme: state.theme,
        autoScroll: state.autoScroll,
        maxLogEntriesPerSession: state.maxLogEntriesPerSession,
        sendLists: state.sendLists,
        filter: state.filter,
        sessions: state.sessions.map(({ id, name, path, config, logs }) => ({
          id,
          name,
          path,
          config,
          logs: trimLogsToLimit(logs, state.maxLogEntriesPerSession),
        })),
      }),
      merge: (persisted, current) =>
        mergePersistedPrettyComState(persisted as Partial<PrettyComState> | undefined, current),
      onRehydrateStorage: () => (state) => {
        if (state?.theme) {
          applyTheme(state.theme)
        }
      },
    }
  )
)

export function createSessionProfile(
  path: string,
  name: string,
  config: SerialConfig = DEFAULT_SERIAL_CONFIG
): SessionProfile {
  return {
    id: crypto.randomUUID(),
    name,
    path,
    config: { ...config },
    status: "disconnected",
    logs: [],
    unread: 0,
  }
}
