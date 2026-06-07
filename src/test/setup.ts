import "@testing-library/jest-dom/vitest"
import { afterEach, beforeEach, vi } from "vitest"

const storage = new Map<string, string>()
const localStorageMock = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => {
    storage.set(key, value)
  },
  removeItem: (key: string) => {
    storage.delete(key)
  },
  clear: () => {
    storage.clear()
  },
  key: (index: number) => Array.from(storage.keys())[index] ?? null,
  get length() {
    return storage.size
  },
}

vi.stubGlobal("localStorage", localStorageMock)

beforeEach(() => {
  storage.clear()
})

afterEach(() => {
  vi.clearAllMocks()
})
