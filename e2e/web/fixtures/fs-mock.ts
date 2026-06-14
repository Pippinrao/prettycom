export const writtenFiles = new Map<string, string>()

declare global {
  interface Window {
    __prettycomWrittenFiles?: Map<string, string>
  }
}

if (typeof window !== "undefined") {
  window.__prettycomWrittenFiles = writtenFiles
}

export async function writeTextFile(path: string, contents: string) {
  writtenFiles.set(path, contents)
}

export async function readTextFile(path: string) {
  return writtenFiles.get(path) ?? ""
}
