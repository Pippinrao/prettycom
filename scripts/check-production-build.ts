import { join } from "node:path"
import { fileURLToPath } from "node:url"

import { verifyProductionDist } from "../src/lib/production-gate.ts"

const root = fileURLToPath(new URL("..", import.meta.url))
const distDir = join(root, "dist")
const violations = verifyProductionDist(distDir)

if (violations.length) {
  console.error("production gate FAILED — release build must not ship test/mock artifacts:\n")
  for (const v of violations) {
    console.error(`  - ${v.marker}`)
    console.error(`    in ${v.file}`)
  }
  process.exit(1)
}

console.log(`production gate OK: dist verified at ${distDir}`)