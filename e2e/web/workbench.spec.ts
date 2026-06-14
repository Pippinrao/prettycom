import { expect, test } from "@playwright/test"

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear()
  })
  await page.goto("/")
  await page.getByTestId("session-connect-toggle").waitFor({ state: "visible" })
})

/** @fc F01 F02 */
test("default session and inspector commands tab", async ({ page }) => {
  await expect(page.getByTestId("session-item-test-default")).toBeVisible()
  await expect(page.getByTestId("inspector-tab-commands")).toBeVisible()
  await expect(page.getByTestId("inspector-tab-sendlist")).toContainText(/List send|列表发送/i)
})

/** @fc F02 */
test("connect and disconnect session", async ({ page }) => {
  await expect(page.getByTestId("send-command")).toContainText(/未连接|Not connected/i)
  await page.getByTestId("session-connect-toggle").click()
  await expect(page.getByTestId("send-command")).toContainText(/发送命令|Send command/i)
  await page.getByTestId("session-connect-toggle").click()
  await expect(page.getByTestId("send-command")).toContainText(/未连接|Not connected/i)
})

/** @fc F03 F07 */
test("send ASCII when connected", async ({ page }) => {
  await page.getByTestId("session-connect-toggle").click()
  const editor = page.locator("[data-testid=command-input] .cm-content")
  await editor.click()
  await page.keyboard.type("AT+GMR")
  await page.getByTestId("send-command").click()
  await expect(page.getByTestId("log-stream")).toContainText("AT+GMR")
  await expect
    .poll(async () => {
      const rows = await page.locator("[data-log-row=true]").allTextContents()
      const txIndex = rows.findIndex((row) => row.includes("TX") && row.includes("AT+GMR"))
      const rxIndex = rows.findIndex((row) => row.includes("RX") && row.includes("AT+GMR"))
      return { txBeforeRx: txIndex >= 0 && rxIndex >= 0 && txIndex < rxIndex }
    })
    .toEqual({ txBeforeRx: true })
})

/** @fc F07 */
test("send disabled when disconnected", async ({ page }) => {
  await expect(page.getByTestId("send-command")).toBeDisabled()
})

/** @fc F01 */
test("remove last session from sidebar inline delete", async ({ page }) => {
  await page.getByTestId("session-item-test-default").hover()
  await page.getByTestId("session-row-delete-test-default").click({ force: true })
  await page.getByRole("button", { name: /移除|Remove/i }).last().click()
  await expect(page.getByTestId("session-item-test-default")).toHaveCount(0)
  await expect(page.getByText(/打开串口开始|Open a port to start/i)).toBeVisible()
})

/** @fc F08 */
test("log search filter", async ({ page }) => {
  await page.getByTestId("session-connect-toggle").click()
  const editor = page.locator("[data-testid=command-input] .cm-content")
  await editor.click()
  await page.keyboard.type("HELLO")
  await page.getByTestId("send-command").click()
  await page.getByTestId("log-search").fill("HELLO")
  await page.getByTestId("log-more-menu").click()
  await expect(page.getByTestId("log-filter-count")).toBeVisible()
  await page.keyboard.press("Escape")
  await page.getByTestId("log-search").fill("NOMATCH_FILTER_XYZ")
  await expect(page.getByTestId("log-search")).toBeVisible()
  await expect(page.getByTestId("log-filter-empty")).toBeVisible()
})

/** @fc F10 */
test("auto-scroll toggle", async ({ page }) => {
  await page.getByTestId("dev-sample-btn").click()
  const toggle = page.getByTestId("auto-scroll-toggle")
  await expect(toggle).toHaveAttribute("aria-pressed", "true")
  await expect(toggle).toHaveClass(/bg-primary\/15/)
  await toggle.click()
  await expect(toggle).toHaveAttribute("aria-pressed", "false")
  await expect(toggle).not.toHaveClass(/bg-primary\/15/)
})

/** @fc F13 F31 F32 */
test("default quick commands visible and recent commands empty", async ({ page }) => {
  await expect(page.getByTestId("alias-item-reset")).toBeVisible()
  await expect(page.getByTestId("alias-item-version")).toBeVisible()
  await expect(page.getByTestId("alias-item-ping")).toBeVisible()
  await expect(page.getByTestId("alias-item-boot")).toBeVisible()
  await expect(page.locator('[data-testid^="history-item-"]')).toHaveCount(0)
})

/** @fc F31 */
test("quick commands DSL export and import", async ({ page }) => {
  await page.getByTestId("alias-dsl-export").click()
  const exportDialog = page.getByTestId("alias-dsl-dialog")
  await expect(exportDialog.getByRole("heading", { name: /Export DSL|导出 DSL/ })).toBeVisible()
  await expect(exportDialog.locator("textarea")).toContainText("AT+RST")
  await expect(exportDialog.getByTestId("alias-dsl-copy")).toBeVisible()
  await expect(exportDialog.getByTestId("alias-dsl-save-file")).toBeVisible()
  await expect(exportDialog.getByTestId("alias-dsl-confirm-import")).toHaveCount(0)
  await page.keyboard.press("Escape")
  await expect(exportDialog).toBeHidden()

  await page.getByTestId("alias-dsl-import").click()
  const importDialog = page.getByTestId("alias-dsl-dialog")
  await expect(importDialog.getByRole("heading", { name: /Import DSL|导入 DSL/ })).toBeVisible()
  const importDsl = [
    "@name:Imported Shortcuts",
    "@listloop:1",
    "@listinterval:500",
    "@suffix:crlf",
    "@mode:ascii",
    "---",
    "@label:CustomCmd HELLO_WORLD @loop:1 @interval:500",
  ].join("\n")
  await importDialog.locator("textarea").fill(importDsl)
  await importDialog.getByTestId("alias-dsl-confirm-import").click()
  await expect(importDialog).toBeHidden()
  await expect(page.locator('[data-testid^="alias-item-"]').filter({ hasText: "HELLO_WORLD" })).toBeVisible()
  await expect(page.getByTestId("alias-item-reset")).toHaveCount(0)
})

/** @fc F31 */
test("quick commands DSL import works without @name header", async ({ page }) => {
  await page.getByTestId("alias-dsl-import").click()
  const importDialog = page.getByTestId("alias-dsl-dialog")
  const importDsl = [
    "@suffix:crlf",
    "@mode:ascii",
    "---",
    "@label:NoNameCmd AT+TEST @loop:1 @interval:500",
  ].join("\n")
  await importDialog.locator("textarea").fill(importDsl)
  await importDialog.getByTestId("alias-dsl-confirm-import").click()
  await expect(importDialog).toBeHidden()
  await expect(page.locator('[data-testid^="alias-item-"]').filter({ hasText: "AT+TEST" })).toBeVisible()
  await expect(page.getByTestId("alias-item-reset")).toHaveCount(0)
})

/** @fc F31 */
test("quick commands DSL import shows error when empty", async ({ page }) => {
  await page.getByTestId("alias-dsl-import").click()
  const importDialog = page.getByTestId("alias-dsl-dialog")
  await importDialog.locator("textarea").fill("@name:Empty\n---\n")
  await importDialog.getByTestId("alias-dsl-confirm-import").click()
  await expect(importDialog).toBeVisible()
  await expect(importDialog.getByTestId("alias-dsl-import-error")).toBeVisible()
  await expect(page.getByTestId("alias-item-reset")).toBeVisible()
})

/** @fc F14 */
test("add quick command button stays icon-sized in English UI", async ({ page }) => {
  await page.getByTestId("settings-open").click()
  await page.getByTestId("language-select").click()
  await page.getByRole("option", { name: "English" }).click()
  await page.keyboard.press("Escape")

  const addBtn = page.getByTestId("add-alias-btn")
  await expect(addBtn).toHaveAttribute("aria-label", "Add quick command")
  const box = await addBtn.boundingBox()
  expect(box).not.toBeNull()
  expect(box!.width).toBeLessThanOrEqual(32)
  expect(box!.height).toBeLessThanOrEqual(32)
})

/** @fc F33 */
test("send list select dropdown does not hide export button", async ({ page }) => {
  await page.getByTestId("inspector-tab-sendlist").click()
  await page.getByRole("button", { name: /New list|新建列表/ }).first().click()
  await page.getByTestId("send-list-select").click()
  const exportBtn = page.getByTestId("send-list-dsl-export")
  await expect(exportBtn).toBeVisible()
  await expect(exportBtn).toBeEnabled()
})

/** @fc F32 */
test("recent commands section collapses and hides list", async ({ page }) => {
  await page.getByTestId("recent-commands-toggle").click()
  await expect(page.locator('[data-testid^="history-item-"]')).toHaveCount(0)
  await expect(page.getByText(/Sent commands will appear here|已发送命令会出现在这里/)).toHaveCount(0)
})

/** @fc F33 */
test("send list DSL export and import use shared dialog", async ({ page }) => {
  await page.getByTestId("inspector-tab-sendlist").click()
  await page.getByRole("button", { name: /New list|新建列表/ }).first().click()
  await page.getByTestId("send-list-dsl-import").click()
  const importDialog = page.getByTestId("send-list-dsl-dialog")
  const importDsl = [
    "@name:Bench List",
    "@listloop:1",
    "@listinterval:500",
    "@suffix:crlf",
    "@mode:ascii",
    "---",
    "LIST_CMD @loop:1 @interval:500",
  ].join("\n")
  await importDialog.locator("textarea").fill(importDsl)
  await importDialog.getByTestId("send-list-dsl-confirm-import").click()
  await expect(importDialog).toBeHidden()
  await expect(page.getByText("LIST_CMD")).toBeVisible()

  await page.getByTestId("send-list-dsl-export").click()
  const exportDialog = page.getByTestId("send-list-dsl-dialog")
  await expect(exportDialog.getByRole("heading", { name: /Export DSL|导出 DSL/ })).toBeVisible()
  await expect(exportDialog.locator("textarea")).toContainText("LIST_CMD")
  await expect(exportDialog.getByTestId("send-list-dsl-copy")).toBeVisible()
  await expect(exportDialog.getByTestId("send-list-dsl-save-file")).toBeVisible()
  await expect(exportDialog.getByTestId("send-list-dsl-confirm-import")).toHaveCount(0)
})

/** @fc F13 F14 */
test("insert quick command into composer", async ({ page }) => {
  await page.getByTestId("alias-item-reset").getByRole("button", { name: /插入|Insert/i }).click()
  await expect(page.locator("[data-testid=command-input]")).toContainText("AT+RST")
})

/** @fc F16 */
test("switch language in settings", async ({ page }) => {
  await page.getByTestId("settings-open").click()
  await page.getByTestId("language-select").click()
  await page.getByRole("option", { name: "English" }).click()
  await expect(page.getByText("Serial workbench")).toBeVisible()
})

/** @fc F29 */
test("switch neon theme keeps connect and send working", async ({ page }) => {
  await page.getByTestId("settings-open").click()
  await page.getByTestId("theme-card-anime").click()
  await expect(page.locator("html")).toHaveAttribute("data-theme", "anime")
  await expect(page.locator("html")).toHaveClass(/dark/)
  await page.keyboard.press("Escape")

  await page.getByTestId("session-connect-toggle").click()
  const editor = page.locator("[data-testid=command-input] .cm-content")
  await editor.click()
  await page.keyboard.type("THEME_OK")
  await page.getByTestId("send-command").click()
  await expect(page.getByTestId("log-stream")).toContainText("THEME_OK")
})

/** @fc F30 */
test("switch cyber theme keeps connect and send working", async ({ page }) => {
  await page.getByTestId("settings-open").click()
  await page.getByTestId("theme-card-cyber").click()
  await expect(page.locator("html")).toHaveAttribute("data-theme", "cyber")
  await expect(page.locator("html")).toHaveClass(/dark/)
  await page.keyboard.press("Escape")

  await page.getByTestId("session-connect-toggle").click()
  const editor = page.locator("[data-testid=command-input] .cm-content")
  await editor.click()
  await page.keyboard.type("CYBER_OK")
  await page.getByTestId("send-command").click()
  await expect(page.getByTestId("log-stream")).toContainText("CYBER_OK")
})

/** @fc F12 */
test("export logs when connected with data", async ({ page }) => {
  await page.getByTestId("session-connect-toggle").click()
  const editor = page.locator("[data-testid=command-input] .cm-content")
  await editor.click()
  await page.keyboard.type("EXPORT_ME")
  await page.getByTestId("send-command").click()
  await page.getByTestId("log-more-menu").click()
  await page.getByRole("menuitem", { name: /导出日志|Export Logs/i }).click()
  const count = await page.evaluate(() => window.__prettycomWrittenFiles?.size ?? 0)
  expect(count).toBeGreaterThan(0)
})

/** @fc F19 */
test("highlight rules regex preview and log marks", async ({ page }) => {
  await page.getByTestId("dev-sample-btn").click()
  await page.getByTestId("highlight-rules-open").click()
  await page.getByTestId("highlight-rule-add").click()

  const ruleCard = page.locator("[data-testid^=highlight-pattern-]").last()
  await ruleCard.fill("AT\\+GMR")
  await page.locator("[data-testid^=highlight-regex-]").last().click()
  await page.locator("[data-testid^=highlight-sample-]").last().fill("reply AT+GMR ok")

  const preview = page.locator("[data-testid^=highlight-preview-]").last()
  await expect(preview.locator("mark")).toContainText("AT+GMR")

  await page.keyboard.press("Escape")
  await expect(page.getByTestId("log-stream").locator("mark").first()).toContainText("AT+GMR")
})
