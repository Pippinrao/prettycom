import type { LogDirection, SessionStatus } from "@/types/serial"

import type { ThemeFx } from "../types"

export interface ThemeFxInput {
  prevStatus: SessionStatus | null
  status: SessionStatus
  prevTxCount: number
  txCount: number
  animationsEnabled: boolean
  lastSendAt: number
  now: number
}

export interface ThemeFxResult {
  fx: ThemeFx
  nextPrevStatus: SessionStatus
  nextPrevTxCount: number
  nextLastSendAt: number
}

const SEND_DEBOUNCE_MS = 300

export function detectThemeFx(input: ThemeFxInput): ThemeFxResult {
  const {
    prevStatus,
    status,
    prevTxCount,
    txCount,
    animationsEnabled,
    lastSendAt,
    now,
  } = input

  let fx: ThemeFx = null
  const nextPrevStatus = status
  const nextPrevTxCount = txCount
  let nextLastSendAt = lastSendAt

  if (!animationsEnabled) {
    return { fx, nextPrevStatus, nextPrevTxCount, nextLastSendAt }
  }

  const wasDisconnected = prevStatus === "disconnected" || prevStatus === "error" || prevStatus === null
  if (wasDisconnected && status === "connected") {
    fx = "port-open"
  } else if (prevStatus === "connected" && status === "disconnected") {
    fx = "idle"
  } else if (txCount > prevTxCount && now - lastSendAt >= SEND_DEBOUNCE_MS) {
    fx = "send"
    nextLastSendAt = now
  }

  return { fx, nextPrevStatus, nextPrevTxCount, nextLastSendAt }
}

export function countTxLogs(logs: { direction: LogDirection }[]): number {
  return logs.reduce((count, entry) => (entry.direction === "TX" ? count + 1 : count), 0)
}
