import type { LogEntry } from "@/types/serial"

export const MAX_COMMAND_HISTORY = 50
export const MAX_SESSIONS = 32

export const DEFAULT_MAX_LOG_ENTRIES_PER_SESSION = 3000
export const MIN_MAX_LOG_ENTRIES_PER_SESSION = 500
export const MAX_MAX_LOG_ENTRIES_PER_SESSION = 100_000

export function normalizeLogLimit(value: unknown): number {
  const fallback = DEFAULT_MAX_LOG_ENTRIES_PER_SESSION
  const parsed = typeof value === "number" ? value : Number(value)
  if (!Number.isFinite(parsed)) {
    return fallback
  }
  return Math.min(
    MAX_MAX_LOG_ENTRIES_PER_SESSION,
    Math.max(MIN_MAX_LOG_ENTRIES_PER_SESSION, Math.round(parsed))
  )
}

export function trimLogsToLimit(logs: LogEntry[], limit: number): LogEntry[] {
  const normalized = normalizeLogLimit(limit)
  if (logs.length <= normalized) {
    return logs
  }
  return logs.slice(logs.length - normalized)
}