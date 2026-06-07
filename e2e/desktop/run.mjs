import { spawn, spawnSync } from "node:child_process"
import { existsSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, "../..")

function hasCommand(cmd, args = ["--version"]) {
  try {
    const r = spawnSync(cmd, args, { shell: true, stdio: "ignore" })
    return r.status === 0
  } catch {
    return false
  }
}

function printScaffoldHint(reason) {
  console.log(
    `Desktop E2E scaffold (${reason}): install tauri-driver and WebDriverIO, then add specs under e2e/desktop/.\n` +
      "  cargo install tauri-driver --locked\n" +
      "  npm i -D webdriverio @wdio/cli @wdio/mocha-framework\n" +
      "Prerequisites: npm run test:ports:install (com0com COM10↔COM11, Administrator PowerShell)"
  )
}

if (!hasCommand("tauri-driver")) {
  printScaffoldHint("tauri-driver not found")
  process.exit(0)
}

if (!hasCommand("npx", ["wdio", "--version"])) {
  printScaffoldHint("WebDriverIO not installed")
  process.exit(0)
}

const wdioConfig = join(here, "wdio.conf.ts")
if (!existsSync(wdioConfig)) {
  console.error("Missing e2e/desktop/wdio.conf.ts")
  process.exit(1)
}

const appExe = join(root, "src-tauri/target/debug/app.exe")
if (!existsSync(appExe)) {
  console.log("Building debug app for desktop E2E...")
  const build = spawnSync("cargo", ["build", "--manifest-path", join(root, "src-tauri/Cargo.toml")], {
    stdio: "inherit",
    shell: true,
    cwd: root,
  })
  if (build.status !== 0) {
    console.error("cargo build failed; cannot run desktop E2E")
    process.exit(build.status ?? 1)
  }
}

const portCheck = spawnSync(
  "powershell",
  ["-ExecutionPolicy", "Bypass", "-File", join(root, "scripts/ensure-test-ports.ps1")],
  { stdio: "inherit", shell: true, cwd: root }
)
if (portCheck.status !== 0) {
  process.exit(portCheck.status ?? 1)
}

const child = spawn("npx", ["wdio", "run", wdioConfig], { stdio: "inherit", shell: true, cwd: here })
child.on("exit", (code) => process.exit(code ?? 1))
