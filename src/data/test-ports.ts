/** Default com0com loopback pair for automated tests. Override via PRETTYCOM_TEST_PORT_A/B. */
export const DEFAULT_TEST_PORT_A =
  (import.meta.env.PRETTYCOM_TEST_PORT_A as string | undefined) ??
  (import.meta.env.VITE_PRETTYCOM_TEST_PORT_A as string | undefined) ??
  "COM10"

export const DEFAULT_TEST_PORT_B =
  (import.meta.env.PRETTYCOM_TEST_PORT_B as string | undefined) ??
  (import.meta.env.VITE_PRETTYCOM_TEST_PORT_B as string | undefined) ??
  "COM11"
