/// <reference types="vitest/config" />
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import path from "path"

const e2eMock = process.env.E2E_MOCK === "1"

// https://vite.dev/config/
export default defineConfig({
  envPrefix: ["VITE_", "PRETTYCOM_"],
  define: {
    "import.meta.env.PRETTYCOM_E2E_MOCK": JSON.stringify(e2eMock ? "1" : ""),
  },
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes("node_modules/react") || id.includes("node_modules/react-dom")) return "react"
          if (id.includes("node_modules/@uiw/react-codemirror") || id.includes("node_modules/@codemirror")) return "codemirror"
          if (id.includes("node_modules/@tanstack")) return "table"
          if (id.includes("node_modules/@radix-ui")) return "ui"
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      ...(e2eMock
        ? {
            "@tauri-apps/api/core": path.resolve(__dirname, "e2e/web/fixtures/tauri-core-mock.ts"),
            "@tauri-apps/api/event": path.resolve(__dirname, "e2e/web/fixtures/tauri-event-mock.ts"),
            "@tauri-apps/plugin-dialog": path.resolve(__dirname, "e2e/web/fixtures/dialog-mock.ts"),
            "@tauri-apps/plugin-fs": path.resolve(__dirname, "e2e/web/fixtures/fs-mock.ts"),
          }
        : {}),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["src/test/setup.ts"],
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    exclude: ["e2e/**", "node_modules/**"],
    coverage: {
      provider: "v8",
      include: ["src/**"],
      exclude: ["src/components/ui/**", "src/test/**"],
    },
  },
})
