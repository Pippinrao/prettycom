import { expect, type Page } from "@playwright/test"

export async function connectCurrentSession(page: Page) {
  await page.getByTestId("session-connect-toggle").click()
  await expect(page.getByTestId("send-command")).toContainText(/Send command|发送命令/i)
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

export async function sendAsciiCommand(page: Page, command: string) {
  const editor = page.locator("[data-testid=command-input] .cm-content")
  await editor.click()
  await page.keyboard.type(command)
  await page.getByTestId("send-command").click()
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