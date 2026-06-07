import { __registerListener } from "./tauri-core-mock"

export type UnlistenFn = () => void

export async function listen<T>(
  event: string,
  handler: (ev: { payload: T }) => void
): Promise<UnlistenFn> {
  return __registerListener(event, (payload) => handler({ payload: payload as T }))
}

export async function emit(event: string, payload: unknown): Promise<void> {
  void event
  void payload
}
