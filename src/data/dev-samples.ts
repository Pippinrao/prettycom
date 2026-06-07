import type { LogEntry } from "@/types/serial"

const rxMessages = [
  "boot: chip revision v3",
  "wifi init complete, heap=243k",
  "device ready; prompt=at",
  "sensor temp=24.8 humidity=41.2",
  "ack sequence=17 status=ok",
  "brownout detector active",
  "packet accepted, crc=valid",
]

export function createDevLogEntries(count = 240): LogEntry[] {
  return Array.from({ length: count }, (_, index) => {
    const isTx = index % 11 === 0
    const isSys = index % 97 === 0
    const warning = index % 89 === 0
    const direction = isSys ? "SYS" : isTx ? "TX" : "RX"
    const level = warning ? "warning" : isTx ? "success" : "normal"
    const seconds = 18 + Math.floor(index / 32)
    const millis = String((241 + index * 17) % 1000).padStart(3, "0")
    const ascii = isSys
      ? "port hotplug scan complete"
      : isTx
        ? index % 22 === 0
          ? "AT+RST"
          : "AT+GMR"
        : rxMessages[index % rxMessages.length]

    return {
      id: `dev-line-${index}`,
      time: `12:04:${String(seconds % 60).padStart(2, "0")}.${millis}`,
      direction,
      level,
      ascii,
      hex: direction === "TX" ? "41 54 2B 47 4D 52 0D 0A" : "7E 01 04 FF 00 2A 8C 1D",
      delta: 7 + (index % 64),
      bytes: direction === "TX" ? 8 : 10 + (index % 6),
    }
  })
}
