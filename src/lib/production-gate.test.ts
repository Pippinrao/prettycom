import { join } from "node:path"
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { describe, expect, it } from "vitest"

import { verifyProductionDist } from "@/lib/production-gate"

describe("verifyProductionDist", () => {
  it("passes on a minimal clean production dist layout", () => {
    const dir = mkdtempSync(join(tmpdir(), "prettycom-gate-"))
    const assets = join(dir, "dist", "assets")
    mkdirSync(assets, { recursive: true })
    const mainName = "index-clean.js"
    writeFileSync(
      join(assets, mainName),
      "function li(){return!1}var _i=`test-default`;function Si(){return li()?[]:[]}"
    )
    writeFileSync(join(dir, "dist", "index.html"), `<script src="/assets/${mainName}"></script>`)
    expect(verifyProductionDist(join(dir, "dist"))).toEqual([])
  })

  it("fails when E2E mock markers are present", () => {
    const dir = mkdtempSync(join(tmpdir(), "prettycom-gate-"))
    const assets = join(dir, "dist", "assets")
    mkdirSync(assets, { recursive: true })
    const mainName = "index-bad.js"
    writeFileSync(
      join(assets, mainName),
      "function li(){return!0}__prettycomEmitMockEvent;com0com test port"
    )
    writeFileSync(join(dir, "dist", "index.html"), `<script src="/assets/${mainName}"></script>`)
    const violations = verifyProductionDist(join(dir, "dist"))
    expect(violations.length).toBeGreaterThan(0)
    expect(violations.some((v) => v.marker.includes("com0com test port"))).toBe(true)
  })
})