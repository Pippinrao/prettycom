import { invoke } from "@tauri-apps/api/core"
import { listen, type UnlistenFn } from "@tauri-apps/api/event"

import {
  bytesToAscii,
  bytesToHex,
  createRxLogEntry,
  createSysLogEntry,
} from "@/data/serial-defaults"
import { usePrettyComStore } from "@/store/prettycom-store"
import type {
  PortInfo,
  SerialConfig,
  SerialRxPayload,
  SerialStatusPayload,
} from "@/types/serial"

let bridgeCount = 0
let listenersReady = false
let listenersSetupPromise: Promise<void> | null = null
let unlistenRx: UnlistenFn | null = null
let unlistenStatus: UnlistenFn | null = null

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

export async function closePort(sessionId: string): Promise<void> {
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
        const entry = createRxLogEntry(bytes, timestampMs, session?.lastRxAt)
        store.appendLog(sessionId, entry, timestampMs)
      })

      unlistenStatus = await listen<SerialStatusPayload>("serial-status", (event) => {
        const { sessionId, status, message } = event.payload
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
