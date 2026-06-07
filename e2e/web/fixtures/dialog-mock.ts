export const exportedPaths: string[] = []

export async function save(options?: { defaultPath?: string }) {
  const path = options?.defaultPath ?? "prettycom-test-log.csv"
  exportedPaths.push(path)
  return path
}

export async function open() {
  return null
}

export async function message() {
  return null
}
