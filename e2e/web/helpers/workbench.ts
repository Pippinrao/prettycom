import { expect, type Page } from "@playwright/test"

export async function gotoWorkbench(page: Page) {
  await page.addInitScript(() => {
    localStorage.clear()
  })
  await page.goto("/")
  await page.getByTestId("session-connect-toggle").waitFor({ state: "visible" })
}

export async function connectCurrentSession(page: Page) {
  await page.getByTestId("session-connect-toggle").click()
  await expect(page.getByTestId("send-command")).toContainText(/Send command|发送命令/i)
}

export async function disconnectCurrentSession(page: Page) {
  await page.getByTestId("session-connect-toggle").click()
  await expect(page.getByTestId("send-command")).toContainText(/Not connected|未连接/i)
}

export async function openPortDialogAndConnect(page: Page, options?: { name?: string }) {
  await page.getByTestId("open-port-btn").first().click()
  await expect(page.getByTestId("open-port-dialog")).toBeVisible()
  await expect(page.getByTestId("port-select")).toBeVisible()
  if (options?.name) {
    await page.getByTestId("open-port-dialog").getByRole("textbox").first().fill(options.name)
  }
  await page.getByTestId("port-select").click()
  await page.getByRole("option", { name: /COM10/ }).click()
  await page.getByTestId("connect-btn").click()
  await expect(page.getByTestId("open-port-dialog")).toBeHidden()
  await expect(page.getByTestId("send-command")).toContainText(/Send command|发送命令/i)
}

export function commandEditor(page: Page) {
  return page.locator("[data-testid=command-input] .cm-content")
}

export async function typeCommand(page: Page, command: string) {
  const editor = commandEditor(page)
  await editor.click()
  await page.keyboard.type(command)
}

export async function sendAsciiCommand(page: Page, command: string) {
  await typeCommand(page, command)
  await page.getByTestId("send-command").click()
}

export async function loadDevSample(page: Page) {
  await page.getByTestId("dev-sample-btn").click()
  await expect(page.getByTestId("log-search")).toBeVisible()
}

export async function selectLogFormat(page: Page, mode: "ascii" | "hex") {
  await page.getByTestId("log-display-mode").click()
  const option = page.getByRole("option", { name: mode === "hex" ? /^HEX$/ : /^ASCII$/ })
  await option.waitFor({ state: "visible" })
  await option.evaluate((el) => (el as HTMLElement).click())
}

export async function selectSendFormat(page: Page, mode: "ascii" | "hex") {
  await page.getByTestId("send-options-trigger").click()
  await page.getByTestId(`send-format-${mode}`).click()
}

export async function emitMockRxChunks(
  page: Page,
  sessionId: string,
  chunks: string[],
  startMs = Date.now()
) {
  await page.evaluate(
    ({ sessionId, chunks, startMs }) => {
      const emit = window.__prettycomEmitMockEvent
      if (!emit) {
        throw new Error("E2E mock event bridge is unavailable")
      }
      const encoder = new TextEncoder()
      chunks.forEach((chunk, index) => {
        const bytes = encoder.encode(chunk)
        const data = btoa(String.fromCharCode(...bytes))
        emit("serial-rx", {
          sessionId,
          data,
          timestampMs: startMs + index,
        })
      })
    },
    { sessionId, chunks, startMs }
  )
}
