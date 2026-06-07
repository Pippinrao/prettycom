export type Language = "zh-CN" | "en-US"
export type Theme = "dark" | "light"
export type DisplayMode = "ascii" | "hex"
export type LineSuffix = "none" | "cr" | "lf" | "crlf"
export type Parity = "none" | "odd" | "even"
export type FlowControl = "none" | "hardware" | "software"
export type StopBits = 1 | 2
export type DataBits = 5 | 6 | 7 | 8
export type SessionStatus = "connected" | "disconnected" | "error"
export type LogDirection = "RX" | "TX" | "SYS"
export type HighlightColor = "yellow" | "cyan" | "green" | "violet" | "rose"

export interface SerialConfig {
  baudRate: number
  dataBits: DataBits
  parity: Parity
  stopBits: StopBits
  flowControl: FlowControl
}

export interface LogEntry {
  id: string
  time: string
  direction: LogDirection
  level: "normal" | "success" | "warning" | "error"
  ascii: string
  hex: string
  delta: number
  bytes: number
}

export interface FrameField {
  field: string
  value: string
  hint: string
}

export interface CommandHistoryEntry {
  id: string
  command: string
  suffix: LineSuffix
  mode: DisplayMode
  sentAt: string
}

export interface Alias {
  id: string
  name: string
  command: string
  mode: DisplayMode
  suffix: LineSuffix
}

export interface HighlightRule {
  id: string
  pattern: string
  isRegex: boolean
  color: HighlightColor
  enabled: boolean
}

export interface LogFilter {
  search: string
  /** Legacy comma/space-separated terms kept for older persisted UI state. */
  highlight: string
  highlightRules: HighlightRule[]
  direction: "all" | LogDirection
}

export interface PortInfo {
  name: string
  port_type?: string
  description?: string
}

export interface SendListCommand {
  id: string
  command: string
  loopCount: number
  intervalMs: number
}

export interface SendList {
  id: string
  name: string
  commands: SendListCommand[]
  listLoop: number
  listIntervalMs: number
  suffix: LineSuffix
  mode: DisplayMode
  createdAt: number
  updatedAt: number
}

export interface SerialRxPayload {
  sessionId: string
  data: string
  timestampMs: number
}

export interface SerialStatusPayload {
  sessionId: string
  status: "error" | "disconnected"
  message?: string
}
