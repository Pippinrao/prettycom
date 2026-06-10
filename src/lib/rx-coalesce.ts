import type { RxDisplayMode } from "@/types/serial"

const MAX_FRAME_BYTES = 64 * 1024

export interface RxFrame {
  bytes: Uint8Array
  startedAtMs: number
  endedAtMs: number
  priorRxAt?: number
}

export type RxEmitKind = "complete" | "partial"

export interface RxEmit extends RxFrame {
  kind: RxEmitKind
}

interface SessionBuffer {
  chunks: Uint8Array[]
  startedAtMs: number
  lastChunkAtMs: number
  priorRxAt?: number
}

const buffers = new Map<string, SessionBuffer>()
let emitHandler: ((sessionId: string, emit: RxEmit) => void) | null = null

export function registerRxEmitHandler(handler: (sessionId: string, emit: RxEmit) => void) {
  emitHandler = handler
}

function totalBytes(chunks: Uint8Array[]) {
  return chunks.reduce((sum, chunk) => sum + chunk.length, 0)
}

function concatChunks(chunks: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(totalBytes(chunks))
  let offset = 0
  for (const chunk of chunks) {
    out.set(chunk, offset)
    offset += chunk.length
  }
  return out
}

function findNewlineIndex(bytes: Uint8Array): number {
  for (let i = 0; i < bytes.length; i++) {
    if (bytes[i] === 0x0a) {
      return i
    }
  }
  return -1
}

function lineLengthThroughNewline(bytes: Uint8Array, newlineIndex: number) {
  if (newlineIndex > 0 && bytes[newlineIndex - 1] === 0x0d) {
    return newlineIndex + 1
  }
  return newlineIndex + 1
}

function dispatch(sessionId: string, frame: RxFrame, kind: RxEmitKind) {
  emitHandler?.(sessionId, { ...frame, kind })
}

function emitFrame(buf: SessionBuffer, bytes: Uint8Array, kind: RxEmitKind, sessionId: string) {
  if (bytes.length === 0) {
    return
  }
  dispatch(sessionId, {
    bytes,
    startedAtMs: buf.startedAtMs,
    endedAtMs: buf.lastChunkAtMs,
    priorRxAt: buf.priorRxAt,
  }, kind)
  buf.priorRxAt = buf.lastChunkAtMs
}

function flushTerminalLines(buf: SessionBuffer, sessionId: string) {
  let pending = concatChunks(buf.chunks)
  buf.chunks = []

  while (pending.length > 0) {
    const newlineIndex = findNewlineIndex(pending)
    if (newlineIndex === -1) {
      buf.chunks = [pending]
      return
    }

    const lineLength = lineLengthThroughNewline(pending, newlineIndex)
    const line = pending.subarray(0, lineLength)
    pending = pending.subarray(lineLength)
    emitFrame(buf, line, "complete", sessionId)
    buf.startedAtMs = buf.lastChunkAtMs
  }
}

function emitTerminalPartial(buf: SessionBuffer, sessionId: string) {
  const pending = concatChunks(buf.chunks)
  if (pending.length === 0) {
    return
  }
  emitFrame(buf, pending, "partial", sessionId)
}

function ingestTerminalChunk(
  sessionId: string,
  chunk: Uint8Array,
  timestampMs: number,
  priorRxAt?: number
) {
  let buf = buffers.get(sessionId)
  if (!buf) {
    buf = {
      chunks: [],
      startedAtMs: timestampMs,
      lastChunkAtMs: timestampMs,
      priorRxAt,
    }
    buffers.set(sessionId, buf)
  }

  if (totalBytes(buf.chunks) === 0) {
    buf.startedAtMs = timestampMs
    buf.priorRxAt = priorRxAt
  }

  buf.chunks.push(chunk)
  buf.lastChunkAtMs = timestampMs

  flushTerminalLines(buf, sessionId)

  const pending = totalBytes(buf.chunks)
  if (pending === 0) {
    return
  }

  if (pending >= MAX_FRAME_BYTES) {
    const bytes = concatChunks(buf.chunks)
    buf.chunks = []
    emitFrame(buf, bytes, "complete", sessionId)
    return
  }

  emitTerminalPartial(buf, sessionId)
}

function ingestFrameChunk(
  sessionId: string,
  chunk: Uint8Array,
  timestampMs: number,
  priorRxAt?: number
) {
  dispatch(sessionId, {
    bytes: chunk,
    startedAtMs: timestampMs,
    endedAtMs: timestampMs,
    priorRxAt,
  }, "complete")
}

export function ingestRxChunk(
  sessionId: string,
  chunk: Uint8Array,
  timestampMs: number,
  mode: RxDisplayMode,
  priorRxAt?: number
) {
  if (mode === "frame") {
    ingestFrameChunk(sessionId, chunk, timestampMs, priorRxAt)
    return
  }
  ingestTerminalChunk(sessionId, chunk, timestampMs, priorRxAt)
}

function flushPendingTerminal(buf: SessionBuffer, sessionId: string) {
  const pending = concatChunks(buf.chunks)
  buf.chunks = []
  emitFrame(buf, pending, "complete", sessionId)
}

export function flushRxCoalesce(sessionId: string) {
  const buf = buffers.get(sessionId)
  if (!buf || totalBytes(buf.chunks) === 0) {
    clearRxCoalesce(sessionId)
    return
  }
  flushPendingTerminal(buf, sessionId)
  clearRxCoalesce(sessionId)
}

export function flushAllSessionsCoalesce(sessionIds: string[]) {
  for (const sessionId of sessionIds) {
    flushRxCoalesce(sessionId)
  }
}

export function clearRxCoalesce(sessionId: string) {
  buffers.delete(sessionId)
}

/** @internal test helper */
export function resetRxCoalesce() {
  buffers.clear()
}