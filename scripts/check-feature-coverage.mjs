import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"

const root = process.cwd()
const matrixPath = join(root, "docs/testing/feature-coverage-matrix.md")
const e2eDir = join(root, "e2e/web")

const matrix = readFileSync(matrixPath, "utf8")
const required = []
for (const line of matrix.split("\n")) {
  if (!line.startsWith("| F")) {
    continue
  }
  const cols = line.split("|").map((c) => c.trim())
  const id = cols[1]
  const webE2e = cols[4]
  if (webE2e === "Y") {
    required.push(id)
  }
}

const specFiles = readdirSync(e2eDir).filter((f) => f.endsWith(".spec.ts"))
const covered = new Set()
for (const file of specFiles) {
  const text = readFileSync(join(e2eDir, file), "utf8")
  for (const match of text.matchAll(/@fc\s+([^\n*]+)/g)) {
    match[1]
      .trim()
      .split(/\s+/)
      .forEach((id) => covered.add(id))
  }
}

const missing = required.filter((id) => !covered.has(id))
if (missing.length) {
  console.error("FCM Web E2E coverage missing:", missing.join(", "))
  process.exit(1)
}

console.log(`FCM OK: ${required.length} Web E2E features covered.`)
