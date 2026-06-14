import { open, save } from "@tauri-apps/plugin-dialog"
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs"

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

function pickTextFileInBrowser(): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = ".dsl,.txt,text/plain"
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) {
        resolve(null)
        return
      }
      void file.text().then(resolve).catch(() => resolve(null))
    }
    input.click()
  })
}

export async function loadTextFromFile(): Promise<string | null> {
  try {
    const path = await open({
      multiple: false,
      filters: [
        { name: "DSL", extensions: ["dsl", "txt"] },
        { name: "Text", extensions: ["txt"] },
      ],
    })
    if (!path || Array.isArray(path)) {
      return null
    }
    return await readTextFile(path)
  } catch {
    return pickTextFileInBrowser()
  }
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