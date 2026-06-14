import { expect, test } from "@playwright/test"

import {
  loadDevSample,
  openPortDialogAndConnect,
  selectLogFormat,
  selectSendFormat,
} from "./helpers/workbench"

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear()
  })
  await page.goto("/")
  await page.getByTestId("session-connect-toggle").waitFor({ state: "visible" })
})

/** @fc F20 */
test("log toolbar controls stay within main panel bounds", async ({ page }) => {
  await loadDevSample(page)

  const inspector = page.getByTestId("inspector-panel")
  const inspectorBox = await inspector.boundingBox()
  expect(inspectorBox).not.toBeNull()

  for (const testId of ["log-display-mode", "auto-scroll-toggle", "log-more-menu"]) {
    const control = page.getByTestId(testId)
    await control.scrollIntoViewIfNeeded()
    await expect(control).toBeVisible()
    const box = await control.boundingBox()
    expect(box).not.toBeNull()
    expect(box!.x + box!.width).toBeLessThanOrEqual(inspectorBox!.x + 8)
  }
})

/** @fc F08 F18 */
test("log format and send format are independent", async ({ page }) => {
  await loadDevSample(page)

  await selectLogFormat(page, "hex")

  const firstRow = page.locator("[data-log-row=true]").first()
  await expect(firstRow).toBeVisible()
  const rowText = await firstRow.textContent()
  expect(rowText).toMatch(/[0-9A-F]{2}( [0-9A-F]{2})+/i)

  await expect(page.getByTestId("log-display-mode")).toContainText(/HEX/)

  await selectSendFormat(page, "hex")
  await expect(page.getByTestId("send-options-trigger")).toContainText(/HEX/)
  await expect(page.getByTestId("log-display-mode")).toContainText(/HEX/)
})

/** @fc F10 */
test("auto-scroll toggle shows primary background when on", async ({ page }) => {
  await loadDevSample(page)
  const toggle = page.getByTestId("auto-scroll-toggle")

  await expect(toggle).toHaveAttribute("aria-pressed", "true")
  await expect(toggle).toHaveClass(/bg-primary\/15/)

  await toggle.click()
  await expect(toggle).toHaveAttribute("aria-pressed", "false")
  await expect(toggle).not.toHaveClass(/bg-primary\/15/)
})

test("command palette removed from UI and keyboard", async ({ page }) => {
  await expect(page.getByTestId("command-palette-hint")).toHaveCount(0)
  await page.keyboard.press("Control+k")
  await expect(page.getByTestId("command-palette")).toHaveCount(0)
})

test("refresh ports only in open port dialog", async ({ page }) => {
  await expect(page.getByRole("button", { name: /Refresh ports|刷新串口/i })).toHaveCount(0)

  await page.getByTestId("open-port-btn").first().click()
  await expect(page.getByTestId("refresh-ports-btn")).toBeVisible()
})

/** @fc F06 */
test("session delete uses inline row button", async ({ page }) => {
  await openPortDialogAndConnect(page, { name: "Bench B" })
  await expect(page.getByTestId("sidebar-remove-session")).toHaveCount(0)

  await page.getByTestId("session-item-test-default").hover()
  const deleteBtn = page.getByTestId("session-row-delete-test-default")
  await expect(deleteBtn).toBeVisible()
  await deleteBtn.click({ force: true })
  await page.getByRole("button", { name: /^Remove$|^移除$/ }).click()

  await expect(page.getByTestId("session-item-test-default")).toHaveCount(0)
})

test("inspector collapses between icon and expanded width", async ({ page }) => {
  await loadDevSample(page)

  const inspector = page.getByTestId("inspector-panel")
  await expect(inspector).toBeVisible()

  const expandedBox = await inspector.boundingBox()
  expect(expandedBox).not.toBeNull()
  expect(expandedBox!.width).toBeGreaterThan(200)

  await page.getByTestId("inspector-toggle").click()
  await expect
    .poll(async () => {
      const box = await inspector.boundingBox()
      return box?.width ?? 999
    })
    .toBeLessThanOrEqual(52)

  await page.getByTestId("inspector-toggle").click()
  await expect
    .poll(async () => {
      const box = await inspector.boundingBox()
      return box?.width ?? 0
    })
    .toBeGreaterThan(200)
})

test("port tab removed and session params shown in top bar", async ({ page }) => {
  await expect(page.getByTestId("inspector-tab-port")).toHaveCount(0)
  await expect(page.getByTestId("session-port-params")).toBeVisible()
  await expect(page.getByTestId("session-port-params")).toContainText(/115200/)
})

test("send options trigger and single-row composer", async ({ page }) => {
  await expect(page.getByTestId("send-options-trigger")).toBeVisible()
  const input = page.getByTestId("command-input")
  const box = await input.boundingBox()
  expect(box).not.toBeNull()
  expect(box!.height).toBeGreaterThanOrEqual(38)
  expect(box!.height).toBeLessThanOrEqual(100)
})