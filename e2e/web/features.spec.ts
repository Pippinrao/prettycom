import { expect, test } from "@playwright/test"

import {
  connectCurrentSession,
  emitMockRxChunks,
  openPortDialogAndConnect,
  sendAsciiCommand,
} from "./helpers/workbench"

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear()
  })
  await page.goto("/")
  await page.getByTestId("session-connect-toggle").waitFor({ state: "visible" })
})

/** @fc F04 F22 */
test("open port dialog selects COM10 and connects", async ({ page }) => {
  await expect(page.getByTestId("open-port-btn").first()).toBeVisible()
  await page.getByTestId("open-port-btn").first().click()
  await expect(page.getByTestId("open-port-dialog")).toBeVisible()
  await page.getByTestId("port-select").click()
  await page.getByRole("option", { name: /COM10/ }).click()
  await page.getByTestId("connect-btn").click()
  await expect(page.getByTestId("open-port-dialog")).toBeHidden()
  await expect(page.getByTestId("send-command")).toContainText(/Send command|发送命令/i)
})

/** @fc F05 */
test("switch between multiple sessions", async ({ page }) => {
  await openPortDialogAndConnect(page, { name: "Bench B" })
  const secondSession = page.locator('[data-testid^="session-item-"]').filter({ hasText: "Bench B" })
  await expect(secondSession).toBeVisible()

  await page.getByTestId("session-item-test-default").click()
  await expect(page.locator("header")).toContainText("Test Port")

  await secondSession.click()
  await expect(page.locator("header")).toContainText("Bench B")
})

/** @fc F06 */
test("remove one session while another remains", async ({ page }) => {
  await openPortDialogAndConnect(page, { name: "Bench B" })
  const secondSession = page.locator('[data-testid^="session-item-"]').filter({ hasText: "Bench B" })
  await secondSession.click({ button: "right" })
  await page.getByRole("menuitem", { name: /Remove session|移除会话/ }).click()
  await page.getByRole("button", { name: /^Remove$|^移除$/ }).click()

  await expect(secondSession).toHaveCount(0)
  await expect(page.getByTestId("session-item-test-default")).toBeVisible()
})

/** @fc F09 */
test("direction filter shows RX only", async ({ page }) => {
  await connectCurrentSession(page)
  await sendAsciiCommand(page, "DIRFILTER")
  await expect(page.locator("[data-log-row=true]").filter({ hasText: "TX" })).not.toHaveCount(0)

  await page.getByTestId("log-filter-direction").click()
  await page.getByRole("menuitemradio", { name: /^RX$/ }).click()

  await expect(page.locator("[data-log-row=true]").filter({ hasText: "TX" })).toHaveCount(0)
  await expect(page.locator("[data-log-row=true]").filter({ hasText: "RX" })).not.toHaveCount(0)
})

/** @fc F11 */
test("clear log history for current session", async ({ page }) => {
  await connectCurrentSession(page)
  await sendAsciiCommand(page, "CLEAR_ME")
  await expect(page.getByTestId("log-stream")).toContainText("CLEAR_ME")

  await page.getByTestId("clear-logs-btn").click()
  await page.getByTestId("clear-logs-confirm").click()
  await expect(page.getByText(/No serial history|暂无串口历史/)).toBeVisible()
})

/** @fc F17 */
test("command palette opens with Ctrl+K", async ({ page }) => {
  await page.keyboard.press("Control+k")
  await expect(page.getByRole("dialog")).toBeVisible()
  await expect(page.getByRole("dialog").getByText(/Open COM port|打开 COM 串口/)).toBeVisible()
})

/** @fc F20 */
test("log table header keeps filter controls visible", async ({ page }) => {
  await page.getByTestId("dev-sample-btn").click()
  await expect(page.getByTestId("log-search")).toBeVisible()
  await expect(page.getByTestId("log-filter-direction")).toBeVisible()
  await expect(page.getByTestId("highlight-rules-open")).toBeVisible()
  await expect(page.getByTestId("log-filter-count")).toBeVisible()

  await page.getByTestId("log-search").fill("NOMATCH_FILTER_XYZ")
  await expect(page.getByTestId("log-filter-empty")).toBeVisible()
  await expect(page.getByTestId("log-search")).toBeVisible()
})

/** @fc F21 */
test("collapsing sidebar expands main workbench", async ({ page }) => {
  const main = page.locator("main.flex.h-screen")
  const before = await main.boundingBox()
  expect(before).not.toBeNull()

  await page.locator("header").getByRole("button", { name: /Toggle Sidebar|切换侧栏/ }).click()

  await expect
    .poll(async () => {
      const after = await main.boundingBox()
      return after ? before!.x - after.x : 0
    })
    .toBeGreaterThan(80)
})

/** @fc F25 */
test("terminal mode merges fragmented RX until newline", async ({ page }) => {
  await connectCurrentSession(page)
  await emitMockRxChunks(page, "test-default", ["=== P", "andora", " Boot\n"])

  await expect
    .poll(async () => {
      const rows = await page.locator("[data-log-row=true]").filter({ hasText: "RX" }).allTextContents()
      return rows.filter((row) => row.includes("=== Pandora Boot")).length
    })
    .toBe(1)
})

/** @fc F25 */
test("frame mode keeps each RX chunk on its own row", async ({ page }) => {
  await page.getByTestId("dev-sample-btn").click()
  await page.getByTestId("log-rx-display-mode").click()
  await page.getByRole("menuitemradio", { name: /Frame mode|逐帧显示/ }).click()

  await emitMockRxChunks(page, "test-default", ["ZZFRAME_A", "ZZFRAME_B"])

  await expect(page.locator("[data-log-row=true]").filter({ hasText: "ZZFRAME_A" })).toHaveCount(1)
  await expect(page.locator("[data-log-row=true]").filter({ hasText: "ZZFRAME_B" })).toHaveCount(1)
})