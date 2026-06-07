import { SerialPort } from "serialport"

const PORT_B = process.env.PRETTYCOM_TEST_PORT_B ?? "COM11"
const BAUD = 115200

let port: SerialPort | null = null
let readBuffer: Buffer[] = []

export function getTestPortB(): string {
  return PORT_B
}

export async function openPeerPort(baudRate = BAUD): Promise<SerialPort> {
  if (port?.isOpen) {
    return port
  }
  port = new SerialPort({ path: PORT_B, baudRate, autoOpen: false })
  await new Promise<void>((resolve, reject) => {
    port!.open((err) => (err ? reject(err) : resolve()))
  })
  port.on("data", (chunk: Buffer) => {
    readBuffer.push(chunk)
  })
  return port
}

export async function closePeerPort(): Promise<void> {
  if (!port) {
    return
  }
  await new Promise<void>((resolve) => {
    port!.close(() => resolve())
  })
  port = null
  readBuffer = []
}

export function drainReadBuffer(): Buffer {
  const combined = Buffer.concat(readBuffer)
  readBuffer = []
  return combined
}

export async function writePeer(data: Buffer | string): Promise<void> {
  const p = await openPeerPort()
  const payload = typeof data === "string" ? Buffer.from(data) : data
  await new Promise<void>((resolve, reject) => {
    p.write(payload, (err) => (err ? reject(err) : resolve()))
  })
}

export async function readWithTimeout(ms = 3000): Promise<Buffer> {
  const deadline = Date.now() + ms
  while (Date.now() < deadline) {
    const buf = drainReadBuffer()
    if (buf.length) {
      return buf
    }
    await new Promise((r) => setTimeout(r, 50))
  }
  return Buffer.alloc(0)
}

export async function writeAndExpect(
  writeData: Buffer | string,
  expected: Buffer | string,
  timeoutMs = 3000
): Promise<void> {
  drainReadBuffer()
  await writePeer(writeData)
  const expectedBuf = typeof expected === "string" ? Buffer.from(expected) : expected
  const received = await readWithTimeout(timeoutMs)
  if (!received.equals(expectedBuf)) {
    throw new Error(
      `Loopback mismatch: expected ${expectedBuf.toString("hex")}, got ${received.toString("hex")}`
    )
  }
}
