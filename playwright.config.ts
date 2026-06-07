import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
  testDir: "e2e/web",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: "http://127.0.0.1:5199",
    trace: "on-first-retry",
    viewport: { width: 1440, height: 900 },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev:e2e",
    url: "http://127.0.0.1:5199",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { ...process.env, E2E_MOCK: "1" },
  },
})
