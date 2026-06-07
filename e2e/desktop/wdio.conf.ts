export const config = {
  runner: "local",
  specs: ["./smoke.spec.ts"],
  maxInstances: 1,
  capabilities: [
    {
      browserName: "wry",
      "tauri:options": {
        application: "../../src-tauri/target/debug/app.exe",
      },
    },
  ],
  services: [],
  framework: "mocha",
  reporters: ["spec"],
  mochaOpts: { timeout: 120_000 },
}
