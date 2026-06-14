import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react"

import { usePrettyComStore } from "@/store/prettycom-store"

import { getThemeDefinition } from "../registry"
import type { ThemeFx } from "../types"
import { countTxLogs, detectThemeFx } from "./useThemeFx"

const FX_DURATION_MS: Record<Exclude<ThemeFx, null>, number> = {
  "port-open": 400,
  send: 280,
  idle: 200,
}

const ThemeFxContext = createContext<ThemeFx>(null)

export function useThemeFxValue() {
  return useContext(ThemeFxContext)
}

function useThemeFx(): ThemeFx {
  const theme = usePrettyComStore((state) => state.theme)
  const currentSessionId = usePrettyComStore((state) => state.currentSessionId)
  const sessions = usePrettyComStore((state) => state.sessions)
  const session = sessions.find((item) => item.id === currentSessionId)
  const status = session?.status ?? "disconnected"
  const txCount = countTxLogs(session?.logs ?? [])

  const animationsEnabled = getThemeDefinition(theme).animations
  const prevStatusRef = useRef(status)
  const prevTxCountRef = useRef(txCount)
  const lastSendAtRef = useRef(0)
  const [fx, setFx] = useState<ThemeFx>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const result = detectThemeFx({
      prevStatus: prevStatusRef.current,
      status,
      prevTxCount: prevTxCountRef.current,
      txCount,
      animationsEnabled,
      lastSendAt: lastSendAtRef.current,
      now: Date.now(),
    })

    prevStatusRef.current = result.nextPrevStatus
    prevTxCountRef.current = result.nextPrevTxCount
    lastSendAtRef.current = result.nextLastSendAt

    if (!result.fx) {
      return
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    setFx(result.fx)
    timeoutRef.current = setTimeout(() => {
      setFx(null)
      timeoutRef.current = null
    }, FX_DURATION_MS[result.fx])
  }, [animationsEnabled, status, txCount])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return fx
}

export function ThemeAnimationBridge({ children }: { children?: ReactNode }) {
  const fx = useThemeFx()
  return <ThemeFxContext.Provider value={fx}>{children ?? null}</ThemeFxContext.Provider>
}
