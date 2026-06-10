import { invoke } from "@tauri-apps/api/core"
import { listen, type UnlistenFn } from "@tauri-apps/api/event"

import {
  bytesToAscii,
  bytesToHex,
  createRxLogEntry,
  createSysLogEntry,
} from "@/data/serial-defaults"
import {
  clearRxCoalesce,
  flushRxCoalesce,
  ingestRxChunk,
  registerRxEmitHandler,
  type RxEmit,
} from "@/lib/rx-coalesce"
import { usePrettyComStore } from "@/store/prettycom-store"
import type {
  PortInfo,
  SerialConfig,
  SerialRxPayload,
  SerialStatusPayload,
} from "@/types/serial"

let bridgeCount = 0
let listenersReady = false
let rxHandlerRegistered = false
let listenersSetupPromise: Promise<void> | null = null
let unlistenRx: UnlistenFn | null = null
let unlistenStatus: UnlistenFn | null = null
const openTerminalRxLog = new Map<string, string>()

function clearTerminalRxLog(sessionId: string) {
  openTerminalRxLog.delete(sessionId)
}

function handleRxEmit(sessionId: string, emit: RxEmit) {
  const store = usePrettyComStore.getState()
  const payload = {
    ascii: bytesToAscii(emit.bytes),
    hex: bytesToHex(emit.bytes),
    bytes: emit.bytes.length,
  }

  if (store.rxDisplayMode === "frame") {
    const entry = createRxLogEntry(emit.bytes, emit.startedAtMs, emit.priorRxAt)
    store.appendLog(sessionId, entry, emit.endedAtMs)
    return
  }

  const openId = openTerminalRxLog.get(sessionId)
  if (emit.kind === "partial") {
    if (openId) {
      store.updateLogEntry(sessionId, openId, payload, emit.endedAtMs)
      return
    }
    const entry = createRxLogEntry(emit.bytes, emit.startedAtMs, emit.priorRxAt)
    store.appendLog(sessionId, entry, emit.endedAtMs)
    openTerminalRxLog.set(sessionId, entry.id)
    return
  }

  if (openId) {
    store.updateLogEntry(sessionId, openId, payload, emit.endedAtMs)
    clearTerminalRxLog(sessionId)
    return
  }

  const entry = createRxLogEntry(emit.bytes, emit.startedAtMs, emit.priorRxAt)
  store.appendLog(sessionId, entry, emit.endedAtMs)
}

function ensureRxEmitHandler() {
  if (rxHandlerRegistered) {
    return
  }
  registerRxEmitHandler(handleRxEmit)
  rxHandlerRegistered = true
}

function canUseTauriEvents() {
  if (import.meta.env.MODE === "test" || import.meta.env.PRETTYCOM_E2E_MOCK === "1") {
    return true
  }
  return (
    typeof window !== "undefined" &&
    "__TAURI_INTERNALS__" in (window as Window & { __TAURI_INTERNALS__?: unknown })
  )
}

export function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

export { bytesToAscii, bytesToHex }

export async function listPorts(): Promise<PortInfo[]> {
  return invoke<PortInfo[]>("list_ports")
}

export async function openPort(sessionId: string, path: string, config: SerialConfig) {
  return invoke("open_port", {
    sessionId,
    path,
    baudRate: config.baudRate,
    dataBits: config.dataBits,
    parity: config.parity,
    stopBits: String(config.stopBits),
    flowControl: config.flowControl,
  })
}

export async function writePort(sessionId: string, data: number[] | Uint8Array): Promise<number> {
  const payload = data instanceof Uint8Array ? Array.from(data) : data
  return invoke<number>("write_port", { sessionId, data: payload })
}

export function flushAllSessionRx() {
  const store = usePrettyComStore.getState()
  for (const session of store.sessions) {
    flushRxCoalesce(session.id)
    clearRxCoalesce(session.id)
    clearTerminalRxLog(session.id)
  }
}

export async function closePort(sessionId: string): Promise<void> {
  flushRxCoalesce(sessionId)
  clearRxCoalesce(sessionId)
  clearTerminalRxLog(sessionId)
  return invoke("close_port", { sessionId })
}

async function ensureListeners() {
  if (listenersReady || listenersSetupPromise) {
    return listenersSetupPromise
  }

  listenersSetupPromise = (async () => {
    try {
      unlistenRx = await listen<SerialRxPayload>("serial-rx", (event) => {
        const { sessionId, data, timestampMs } = event.payload
        const bytes = base64ToBytes(data)
        const store = usePrettyComStore.getState()
        const session = store.sessions.find((item) => item.id === sessionId)
        ingestRxChunk(sessionId, bytes, timestampMs, store.rxDisplayMode, session?.lastRxAt)
      })

      unlistenStatus = await listen<SerialStatusPayload>("serial-status", (event) => {
        const { sessionId, status, message } = event.payload
        flushRxCoalesce(sessionId)
        clearRxCoalesce(sessionId)
        clearTerminalRxLog(sessionId)
        const store = usePrettyComStore.getState()
        store.setSessionStatus(sessionId, status === "error" ? "error" : "disconnected")
        if (message) {
          store.appendLog(
            sessionId,
            createSysLogEntry(message, status === "error" ? "error" : "warning")
          )
        }
      })

      listenersReady = true
      if (bridgeCount <= 0) {
        await releaseListeners()
      }
    } finally {
      listenersSetupPromise = null
    }
  })()

  return listenersSetupPromise
}

async function releaseListeners() {
  await unlistenRx?.()
  await unlistenStatus?.()
  unlistenRx = null
  unlistenStatus = null
  listenersReady = false
}

async function teardownListeners() {
  if (listenersSetupPromise) {
    await listenersSetupPromise
  }
  if (bridgeCount > 0) {
    return
  }
  await releaseListeners()
}

export function setupSerialEventBridge(): () => void {
  ensureRxEmitHandler()
  if (!canUseTauriEvents()) {
    return () => {}
  }

  bridgeCount += 1
  if (bridgeCount === 1) {
    void ensureListeners()
  }

  return () => {
    bridgeCount -= 1
    if (bridgeCount <= 0) {
      bridgeCount = 0
      void teardownListeners()
    }
  }
}
