import type { LogEntry, LogFilter } from "@/types/serial"

export function filterLogs(logs: LogEntry[], filter: LogFilter): LogEntry[] {
  const query = filter.search.trim().toLowerCase()
  return logs.filter((entry) => {
    if (filter.direction !== "all" && entry.direction !== filter.direction) {
      return false
    }
    if (!query) {
      return true
    }
    return (
      entry.ascii.toLowerCase().includes(query) ||
      entry.hex.toLowerCase().includes(query) ||
      entry.direction.toLowerCase().includes(query)
    )
  })
}
