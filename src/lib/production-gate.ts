import { readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"

const FORBIDDEN_MARKERS = [
  "com0com test port",
  "__prettycomEmitMockEvent",
  "Unhandled invoke:",
  "e2e-mock",
] as const

const DEV_SAMPLE_MARKERS = ["boot: chip revision v3", "dev-line-0"] as const

function collectFiles(dir: string): string[] {
  const files: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      files.push(...collectFiles(full))
      continue
    }
    if (/\.(js|html|css)$/i.test(entry)) {
      files.push(full)
    }
  }
  return files
}

export type ProductionGateViolation = {
  marker: string
  file: string
}

export function verifyProductionDist(distDir: string): ProductionGateViolation[] {
  let distStat
  try {
    distStat = statSync(distDir)
  } catch {
    return [{ marker: "dist directory missing", file: distDir }]
  }
  if (!distStat.isDirectory()) {
    return [{ marker: "dist is not a directory", file: distDir }]
  }

  const files = collectFiles(distDir)
  if (!files.length) {
    return [{ marker: "dist is empty", file: distDir }]
  }

  const indexHtml = readFileSync(join(distDir, "index.html"), "utf8")
  const mainEntryMatch = indexHtml.match(/assets\/index-[^"']+\.js/)
  if (!mainEntryMatch) {
    return [{ marker: "main JS entry not found in index.html", file: join(distDir, "index.html") }]
  }

  const mainEntryRel = mainEntryMatch[0]
  const mainEntryPath = join(distDir, ...mainEntryRel.split("/"))
  const mainEntryText = readFileSync(mainEntryPath, "utf8")

  const violations: ProductionGateViolation[] = []

  for (const marker of FORBIDDEN_MARKERS) {
    for (const file of files) {
      const text = readFileSync(file, "utf8")
      if (text.includes(marker)) {
        violations.push({ marker, file })
      }
    }
  }

  for (const marker of DEV_SAMPLE_MARKERS) {
    if (mainEntryText.includes(marker)) {
      violations.push({ marker, file: mainEntryPath })
    }
  }

  if (!/function\s+\w+\(\)\{return!1\}/.test(mainEntryText)) {
    violations.push({
      marker: "isDevOrE2eRuntime not folded to false in main bundle",
      file: mainEntryPath,
    })
  }

  return violations
}