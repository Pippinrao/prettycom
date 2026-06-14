import { translate } from "@/i18n"
import type { Alias, DisplayMode, FrameField, Language, LineSuffix, LogEntry, SendList, SendListCommand } from "@/types/serial"

export { DEFAULT_SERIAL_CONFIG } from "@/data/serial-config"

/** Default quick commands for new installs; users can edit or delete them like any alias. */
export function createDefaultAliases(): Alias[] {
  return [
    { id: "reset", name: "Reset", command: "AT+RST", mode: "ascii", suffix: "crlf" },
    { id: "version", name: "Version", command: "AT+GMR", mode: "ascii", suffix: "crlf" },
    { id: "ping", name: "Ping", command: "AT+PING?", mode: "ascii", suffix: "crlf" },
    { id: "boot", name: "Bootloader", command: "BOOT 0x1000", mode: "ascii", suffix: "crlf" },
  ]
}

export function formatLogPayload(entry: LogEntry, mode: DisplayMode) {
  return mode === "hex" ? entry.hex : entry.ascii
}

export function buildFrameFields(entry: LogEntry | undefined, language: Language): FrameField[] {
  if (!entry) {
    return []
  }
  const t = (key: string) => translate(key, language)

  return [
    { field: t("Direction"), value: entry.direction, hint: "日志来源" },
    { field: t("Bytes"), value: `${entry.bytes}`, hint: "载荷字节数" },
    { field: t("Delta"), value: `${entry.delta} ms`, hint: "距离上一条记录" },
    { field: "ASCII", value: entry.ascii || "-", hint: "ASCII 视图" },
    { field: "HEX", value: entry.hex || "-", hint: "HEX 视图" },
  ]
}

export function formatLogTime(timestampMs: number) {
  return new Date(timestampMs).toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    fractionalSecondDigits: 3,
  })
}

export function bytesToAscii(bytes: Uint8Array) {
  return Array.from(bytes)
    .map((byte) => (byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : "."))
    .join("")
}

export function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0").toUpperCase())
    .join(" ")
}

export function asciiToHex(value: string) {
  return bytesToHex(new TextEncoder().encode(value))
}

export function applySuffix(text: string, suffix: LineSuffix) {
  switch (suffix) {
    case "cr":
      return text + "\r"
    case "lf":
      return text + "\n"
    case "crlf":
      return text + "\r\n"
    default:
      return text
  }
}

export function parseHexString(input: string): Uint8Array {
  const cleaned = input.replace(/0x/gi, "").replace(/[^0-9a-fA-F]/g, "")
  if (!cleaned.length) {
    return new Uint8Array()
  }
  if (cleaned.length % 2 !== 0) {
    throw new Error("Invalid hex string: odd number of digits")
  }
  const bytes = new Uint8Array(cleaned.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Number.parseInt(cleaned.slice(i * 2, i * 2 + 2), 16)
  }
  return bytes
}

function computeDelta(lastRxAt: number | undefined, timestampMs: number) {
  if (lastRxAt === undefined) {
    return 0
  }
  return Math.max(0, timestampMs - lastRxAt)
}

export function createRxLogEntry(
  bytes: Uint8Array,
  timestampMs: number,
  lastRxAt?: number
): LogEntry {
  return {
    id: `rx-${timestampMs}-${Math.random().toString(36).slice(2, 8)}`,
    time: formatLogTime(timestampMs),
    direction: "RX",
    level: "normal",
    ascii: bytesToAscii(bytes),
    hex: bytesToHex(bytes),
    delta: computeDelta(lastRxAt, timestampMs),
    bytes: bytes.length,
  }
}

export function createTxLogEntry(
  bytes: Uint8Array,
  ascii: string,
  timestampMs: number,
  lastRxAt?: number
): LogEntry {
  return {
    id: `tx-${timestampMs}-${Math.random().toString(36).slice(2, 8)}`,
    time: formatLogTime(timestampMs),
    direction: "TX",
    level: "success",
    ascii,
    hex: bytesToHex(bytes),
    delta: computeDelta(lastRxAt, timestampMs),
    bytes: bytes.length,
  }
}

export function createSysLogEntry(message: string, level: LogEntry["level"] = "warning"): LogEntry {
  const now = Date.now()
  return {
    id: `sys-${now}-${Math.random().toString(36).slice(2, 8)}`,
    time: formatLogTime(now),
    direction: "SYS",
    level,
    ascii: message,
    hex: "",
    delta: 0,
    bytes: 0,
  }
}

export { formatLogsForCsv, formatLogsForExport } from "@/lib/log-export"

const SENDLIST_SEPARATOR = "---"

function escapeDslValue(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n")
}

function unescapeDslValue(value: string) {
  return value.replace(/\\n/g, "\n").replace(/\\\\/g, "\\")
}

export function serializeSendList(list: SendList): string {
  const lines = [
    `@name:${escapeDslValue(list.name)}`,
    `@listloop:${list.listLoop}`,
    `@listinterval:${list.listIntervalMs}`,
    `@suffix:${list.suffix}`,
    `@mode:${list.mode}`,
    SENDLIST_SEPARATOR,
    ...list.commands.map((cmd) => {
      const parts = [cmd.command, `@loop:${cmd.loopCount}`, `@interval:${cmd.intervalMs}`]
      if (cmd.suffix !== list.suffix) {
        parts.push(`@suffix:${cmd.suffix}`)
      }
      if (cmd.mode !== list.mode) {
        parts.push(`@mode:${cmd.mode}`)
      }
      return parts.join(" ")
    }),
  ]
  return lines.join("\n")
}

export function parseSendListDsl(dsl: string): {
  name: string
  commands: SendListCommand[]
  listLoop: number
  listIntervalMs: number
  suffix: LineSuffix
  mode: DisplayMode
} {
  const lines = dsl.split("\n")
  const sepIndex = lines.findIndex((line) => line.trim() === SENDLIST_SEPARATOR)

  const headerLines = sepIndex >= 0 ? lines.slice(0, sepIndex) : []
  const commandLines = sepIndex >= 0 ? lines.slice(sepIndex + 1) : lines

  const meta: Record<string, string> = {}
  for (const line of headerLines) {
    const match = line.match(/^@(\w+):(.*)$/)
    if (match) {
      meta[match[1]] = unescapeDslValue(match[2].trim())
    }
  }

  const listSuffix = (meta["suffix"] as LineSuffix) || "crlf"
  const listMode = (meta["mode"] as DisplayMode) || "ascii"

  const commands: SendListCommand[] = commandLines
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((raw) => {
      let loopCount = 1
      let intervalMs = 500
      let suffix = listSuffix
      let mode = listMode
      const loopMatch = raw.match(/@loop:(\d+)/)
      if (loopMatch) {
        loopCount = Number(loopMatch[1])
      }
      const intervalMatch = raw.match(/@interval:(\d+)/)
      if (intervalMatch) {
        intervalMs = Number(intervalMatch[1])
      }
      const suffixMatch = raw.match(/@suffix:(\w+)/)
      if (suffixMatch) {
        suffix = suffixMatch[1] as LineSuffix
      }
      const modeMatch = raw.match(/@mode:(\w+)/)
      if (modeMatch) {
        mode = modeMatch[1] as DisplayMode
      }
      const command = raw
        .replace(/@label:\S+\s+/, "")
        .replace(/@loop:\d+/, "")
        .replace(/@interval:\d+/, "")
        .replace(/@suffix:\w+/, "")
        .replace(/@mode:\w+/, "")
        .trim()
      return {
        id: crypto.randomUUID(),
        command,
        loopCount,
        intervalMs,
        suffix,
        mode,
      }
    })

  return {
    name: meta["name"] || "",
    listLoop: Number(meta["listloop"]) || 1,
    listIntervalMs: Number(meta["listinterval"]) || 500,
    suffix: listSuffix,
    mode: listMode,
    commands,
  }
}

function parseDslMetaLine(raw: string, listSuffix: LineSuffix, listMode: DisplayMode) {
  let suffix = listSuffix
  let mode = listMode
  const suffixMatch = raw.match(/@suffix:(\w+)/)
  if (suffixMatch) {
    suffix = suffixMatch[1] as LineSuffix
  }
  const modeMatch = raw.match(/@mode:(\w+)/)
  if (modeMatch) {
    mode = modeMatch[1] as DisplayMode
  }
  return { suffix, mode }
}

function stripDslMetaTags(raw: string) {
  return raw
    .replace(/@label:\S+\s+/, "")
    .replace(/@loop:\d+/, "")
    .replace(/@interval:\d+/, "")
    .replace(/@suffix:\w+/, "")
    .replace(/@mode:\w+/, "")
    .trim()
}

export function serializeAliases(aliases: Alias[]): string {
  const listSuffix = aliases[0]?.suffix ?? "crlf"
  const listMode = aliases[0]?.mode ?? "ascii"
  const lines = [
    `@name:Quick Commands`,
    `@listloop:1`,
    `@listinterval:500`,
    `@suffix:${listSuffix}`,
    `@mode:${listMode}`,
    SENDLIST_SEPARATOR,
    ...aliases.map((alias) => {
      const parts = [
        `@label:${escapeDslValue(alias.name)} ${escapeDslValue(alias.command)}`,
        `@loop:1`,
        `@interval:500`,
      ]
      if (alias.suffix !== listSuffix) {
        parts.push(`@suffix:${alias.suffix}`)
      }
      if (alias.mode !== listMode) {
        parts.push(`@mode:${alias.mode}`)
      }
      return parts.join(" ")
    }),
  ]
  return lines.join("\n")
}

export function parseAliasesDsl(dsl: string): { name: string; aliases: Alias[] } {
  const lines = dsl.split("\n")
  const sepIndex = lines.findIndex((line) => line.trim() === SENDLIST_SEPARATOR)

  const headerLines = sepIndex >= 0 ? lines.slice(0, sepIndex) : []
  const commandLines = sepIndex >= 0 ? lines.slice(sepIndex + 1) : lines

  const meta: Record<string, string> = {}
  for (const line of headerLines) {
    const match = line.match(/^@(\w+):(.*)$/)
    if (match) {
      meta[match[1]] = unescapeDslValue(match[2].trim())
    }
  }

  const listSuffix = (meta["suffix"] as LineSuffix) || "crlf"
  const listMode = (meta["mode"] as DisplayMode) || "ascii"

  const aliases: Alias[] = commandLines
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((raw) => {
      const { suffix, mode } = parseDslMetaLine(raw, listSuffix, listMode)
      const labelMatch = raw.match(/@label:(.+)/)
      let name = ""
      let command = stripDslMetaTags(raw)
      if (labelMatch) {
        const labelBody = labelMatch[1]
          .replace(/@loop:\d+/, "")
          .replace(/@interval:\d+/, "")
          .replace(/@suffix:\w+/, "")
          .replace(/@mode:\w+/, "")
          .trim()
        const spaceIndex = labelBody.indexOf(" ")
        if (spaceIndex < 0) {
          name = unescapeDslValue(labelBody)
          command = unescapeDslValue(labelBody)
        } else {
          name = unescapeDslValue(labelBody.slice(0, spaceIndex).trim())
          command = unescapeDslValue(labelBody.slice(spaceIndex + 1).trim())
        }
      }
      if (!name) {
        const spaceIndex = command.indexOf(" ")
        name = spaceIndex < 0 ? command : command.slice(0, spaceIndex)
      }
      return {
        id: crypto.randomUUID(),
        name,
        command,
        suffix,
        mode,
      }
    })
    .filter((alias) => alias.command)

  return {
    name: meta["name"] || "",
    aliases,
  }
}
