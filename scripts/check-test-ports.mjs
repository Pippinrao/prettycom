import { SerialPort } from "serialport"
import { execSync } from "node:child_process"

const portA = process.env.PRETTYCOM_TEST_PORT_A ?? "COM10"
const portB = process.env.PRETTYCOM_TEST_PORT_B ?? "COM11"

function diagnose() {
  try {
    const out = execSync("node scripts/diagnose-test-ports.mjs", {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    })
    console.error(out)
  } catch (err) {
    if (err.stdout) console.error(err.stdout)
  }
}

async function openPort(path) {
  const port = new SerialPort({ path, baudRate: 115200, autoOpen: false })
  await new Promise((resolve, reject) => {
    port.open((err) => (err ? reject(err) : resolve()))
  })
  await new Promise((resolve) => port.close(() => resolve()))
}

const available = await SerialPort.list()
const paths = available.map((p) => p.path)
console.log(`Visible ports: ${paths.length ? paths.join(", ") : "(none)"}`)

for (const path of [portA, portB]) {
  try {
    await openPort(path)
    console.log(`OK: opened ${path}`)
  } catch (err) {
    console.error(`\nFailed to open ${path}: ${err.message}`)
    console.error(
      "\nPhysical USB serial (e.g. STM32 COM5) uses Microsoft-signed usbser.sys and works immediately."
    )
    console.error(
      "com0com is a separate kernel driver; on Windows 11 it is often blocked by Memory Integrity (HVCI), not a missing reboot."
    )
    diagnose()
    process.exit(1)
  }
}

console.log(`Test port pair ${portA} <-> ${portB} is ready.`)
