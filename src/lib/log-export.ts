import type { LogEntry } from "@/types/serial"

function escapeCsvField(value: string) {
  if (/[",\n\r]/.test(value)) {
    const escaped = value.split('"').join('""')
    return `"${escaped}"`
  }
  return value
}

export function formatLogsForCsv(entries: LogEntry[]) {
  const header = "time,direction,level,ascii,hex,bytes,delta_ms"
  const rows = entries.map((entry) =>
    [
      entry.time,
      entry.direction,
      entry.level,
      entry.ascii,
      entry.hex,
      String(entry.bytes),
      String(entry.delta),
    ]
      .map(escapeCsvField)
      .join(",")
  )
  return [header, ...rows].join("\n")
}

/** @deprecated Use formatLogsForCsv; kept for backward compatibility in tests. */
export function formatLogsForExport(entries: LogEntry[]) {
  return formatLogsForCsv(entries)
}