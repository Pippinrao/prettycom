import { fileURLToPath } from "node:url"
import path from "node:path"
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

const browserRoot = path.join(fileURLToPath(new URL(".", import.meta.url)), "design-preview/browser")

export default defineConfig({
  root: browserRoot,
  plugins: [react()],
  server: {
    port: 5198,
    strictPort: true,
    open: true,
    host: "127.0.0.1",
  },
})