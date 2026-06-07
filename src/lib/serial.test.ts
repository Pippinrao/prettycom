import { beforeEach, describe, expect, it, vi } from "vitest"

const invokeMock = vi.fn()
const listenMock = vi.fn()

vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => invokeMock(...args),
}))

vi.mock("@tauri-apps/api/event", () => ({
  listen: (...args: unknown[]) => listenMock(...args),
}))

import { base64ToBytes, listPorts, setupSerialEventBridge } from "@/lib/serial"
import { usePrettyComStore } from "@/store/prettycom-store"
import { createSessionProfile } from "@/store/prettycom-store"

describe("serial service", () => {
  beforeEach(() => {
    invokeMock.mockReset()
    listenMock.mockReset()
    listenMock.mockResolvedValue(() => Promise.resolve())
    const session = createSessionProfile("COM10", "T")
    session.id = "s1"
    usePrettyComStore.setState({
      currentSessionId: "s1",
      sessions: [session],
      selectedLogId: "",
    })
  })

  it("base64ToBytes decodes payload", () => {
    expect(Array.from(base64ToBytes("QUI="))).toEqual([0x41, 0x42])
  })

  it("listPorts invokes backend", async () => {
    invokeMock.mockResolvedValue([{ name: "COM10" }])
    const ports = await listPorts()
    expect(invokeMock).toHaveBeenCalledWith("list_ports")
    expect(ports[0].name).toBe("COM10")
  })

  it("setupSerialEventBridge registers listeners once with ref count", async () => {
    const cleanup1 = setupSerialEventBridge()
    const cleanup2 = setupSerialEventBridge()
    await Promise.resolve()
    expect(listenMock).toHaveBeenCalledTimes(2)
    cleanup2()
    cleanup1()
  })

  it("setupSerialEventBridge does not double-register during StrictMode remount", async () => {
    listenMock.mockReset()
    const resolvers: Array<(unlisten: () => Promise<void>) => void> = []
    listenMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvers.push(resolve)
        })
    )

    const cleanupFirstMount = setupSerialEventBridge()
    await Promise.resolve()
    expect(listenMock).toHaveBeenCalledTimes(1)

    cleanupFirstMount()
    const cleanupSecondMount = setupSerialEventBridge()
    await Promise.resolve()
    expect(listenMock).toHaveBeenCalledTimes(1)

    resolvers[0](() => Promise.resolve())
    await Promise.resolve()
    expect(listenMock).toHaveBeenCalledTimes(2)

    resolvers[1](() => Promise.resolve())
    await Promise.resolve()
    expect(listenMock).toHaveBeenCalledTimes(2)

    cleanupSecondMount()
  })
})
