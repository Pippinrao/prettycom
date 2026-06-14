import { save } from "@tauri-apps/plugin-dialog"
import { writeTextFile } from "@tauri-apps/plugin-fs"

export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

function downloadTextInBrowser(content: string, fileName: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = fileName
  anchor.click()
  URL.revokeObjectURL(url)
}

export async function saveTextToFile(content: string, defaultPath: string): Promise<boolean> {
  try {
    const path = await save({
      defaultPath,
      filters: [
        { name: "DSL", extensions: ["dsl", "txt"] },
        { name: "Text", extensions: ["txt"] },
      ],
    })
    if (!path) {
      return false
    }
    await writeTextFile(path, content)
    return true
  } catch {
    downloadTextInBrowser(content, defaultPath)
    return true
  }
}