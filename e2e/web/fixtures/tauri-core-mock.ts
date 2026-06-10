type PortState = { open: boolean; sessionId?: string }

const ports = new Map<string, PortState>()
const listeners = new Map<string, Set<(payload: unknown) => void>>()

export function emitMockEvent(event: string, payload: unknown) {
  listeners.get(event)?.forEach((fn) => fn(payload))
}

declare global {
  interface Window {
    __prettycomEmitMockEvent?: typeof emitMockEvent
  }
}

if (typeof window !== "undefined") {
  window.__prettycomEmitMockEvent = emitMockEvent
}

export async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  switch (cmd) {
    case "list_ports":
      return [{ name: "COM10", portType: "usb", description: "com0com test port" }] as T
    case "open_port": {
      const sessionId = args?.sessionId as string
      ports.set(sessionId, { open: true, sessionId })
      return undefined as T
    }
    case "close_port": {
      const sessionId = args?.sessionId as string
      ports.delete(sessionId)
      return undefined as T
    }
    case "write_port": {
      const sessionId = args?.sessionId as string
      const data = args?.data as number[]
      if (!ports.get(sessionId)?.open) {
        throw new Error("not open")
      }
      const bytes = Uint8Array.from(data)
      const ascii = new TextDecoder().decode(bytes)
      emitMockEvent("serial-rx", {
        sessionId,
        data: btoa(String.fromCharCode(...bytes)),
        timestampMs: Date.now(),
      })
      return data.length as T
    }
    default:
      throw new Error(`Unhandled invoke: ${cmd}`)
  }
}

export function __registerListener(event: string, fn: (payload: unknown) => void) {
  if (!listeners.has(event)) {
    listeners.set(event, new Set())
  }
  listeners.get(event)!.add(fn)
  return () => listeners.get(event)?.delete(fn)
}
