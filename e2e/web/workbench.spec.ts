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
test("remove last session from sidebar and context menu", async ({ page }) => {
  await page.getByTestId("sidebar-remove-session").click()
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
  await expect(page.getByTestId("log-filter-count")).toBeVisible()
  await page.getByTestId("log-search").fill("NOMATCH_FILTER_XYZ")
  await expect(page.getByTestId("log-search")).toBeVisible()
  await expect(page.getByTestId("log-filter-empty")).toBeVisible()
})

/** @fc F10 */
test("auto-scroll toggle", async ({ page }) => {
  const toggle = page.getByTestId("auto-scroll-toggle")
  await expect(toggle).toHaveAttribute("aria-pressed", "true")
  await toggle.click()
  await expect(toggle).toHaveAttribute("aria-pressed", "false")
})

/** @fc F13 */
test("insert macro into composer", async ({ page }) => {
  await page.getByTestId("macro-item-reset").getByRole("button", { name: /插入|Insert/i }).click()
  await expect(page.locator("[data-testid=command-input]")).toContainText("AT+RST")
})

/** @fc F16 */
test("switch language in settings", async ({ page }) => {
  await page.getByTestId("settings-open").click()
  await page.getByTestId("language-select").click()
  await page.getByRole("option", { name: "English" }).click()
  await expect(page.getByText("Serial workbench")).toBeVisible()
})

/** @fc F12 */
test("export logs when connected with data", async ({ page }) => {
  await page.getByTestId("session-connect-toggle").click()
  const editor = page.locator("[data-testid=command-input] .cm-content")
  await editor.click()
  await page.keyboard.type("EXPORT_ME")
  await page.getByTestId("send-command").click()
  await page.getByRole("button", { name: /导出日志|Export Logs/i }).first().click()
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
