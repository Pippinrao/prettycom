/** True in Vite dev server, Vitest, or Playwright E2E mock runs. */
export function isDevOrE2eRuntime(): boolean {
  return (
    import.meta.env.DEV ||
    import.meta.env.MODE === "test" ||
    import.meta.env.PRETTYCOM_E2E_MOCK === "1"
  )
}