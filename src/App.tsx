import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { EditorView, keymap } from "@codemirror/view"
import CodeMirror from "@uiw/react-codemirror"
import { useVirtualizer } from "@tanstack/react-virtual"
import { save } from "@tauri-apps/plugin-dialog"
import { writeTextFile } from "@tauri-apps/plugin-fs"
import {
  Bolt,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  CircleOff,
  Copy,
  Crosshair,
  Download,
  Eraser,
  Filter,
  ListOrdered,
  MoreHorizontal,
  PanelRight,
  Pencil,
  Play,
  PlugZap,
  Plus,
  RefreshCcw,
  Search,
  Send,
  Settings,
  SlidersHorizontal,
  Timer,
  Trash2,
  Unplug,
  Upload,
} from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DslImportExportDialog, type DslDialogMode } from "@/components/DslImportExportDialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  applySuffix,
  createSysLogEntry,
  createTxLogEntry,
  DEFAULT_SERIAL_CONFIG,
  formatLogPayload,
  parseAliasesDsl,
  parseHexString,
  parseSendListDsl,
  serializeAliases,
  serializeSendList,
} from "@/data/serial-defaults"
import { DEFAULT_TEST_PORT_A } from "@/data/test-ports"
import { isDevOrE2eRuntime } from "@/lib/runtime-env"
import { useT } from "@/hooks/use-t"
import {
  closePort,
  flushAllSessionRx,
  listPorts,
  openPort,
  setupSerialEventBridge,
  writePort,
} from "@/lib/serial"
import { formatLogsForCsv } from "@/lib/log-export"
import {
  createHighlightRule,
  findFirstMatchingLogId,
  findRuleMatches,
  getActiveHighlightRules,
  highlightColorOptions,
  highlightText,
  isInvalidRegex,
} from "@/lib/log-highlight"
import { cn } from "@/lib/utils"
import {
  createSessionProfile,
  defaultSessionNameFromPath,
  usePrettyComStore,
  type Language,
  type SessionProfile,
} from "@/store/prettycom-store"
import type {
  Alias,
  DisplayMode,
  HighlightRule,
  LineSuffix,
  LogEntry,
  PortInfo,
  SendList,
  SendListCommand,
  SerialConfig,
} from "@/types/serial"
import { applyTheme, getCodeMirrorTheme } from "@/lib/theme"
import {
  ThemeAnimationBridge,
  ThemeAppearanceSection,
  ThemeCompanionRail,
  ThemeEmptyIllustration,
  ThemeWatermark,
} from "@/themes"

const suffixLabel: Record<LineSuffix, string> = {
  none: "None",
  cr: "CR",
  lf: "LF",
  crlf: "CRLF",
}

function formatConfigLabel(config: SerialConfig) {
  const parity = config.parity === "none" ? "N" : config.parity === "odd" ? "O" : "E"
  return `${config.baudRate} · ${config.dataBits}${parity}${config.stopBits}`
}

function formatFlowControlShort(config: SerialConfig, t: (key: string) => string) {
  if (config.flowControl === "hardware") {
    return "RTS"
  }
  if (config.flowControl === "software") {
    return "XON"
  }
  return t("None")
}

function formatPortParamsLabel(config: SerialConfig, t: (key: string) => string) {
  return `${formatConfigLabel(config)} · ${formatFlowControlShort(config, t)}`
}

function formatSendListCommandMeta(cmd: SendListCommand, t: (key: string) => string) {
  const loopText =
    cmd.loopCount === 0 ? t("Repeat forever") : t("Send N times").replace("{n}", String(cmd.loopCount))
  const intervalText = t("Interval ms").replace("{ms}", String(cmd.intervalMs))
  const suffixText = t(suffixLabel[cmd.suffix])
  const modeText = cmd.mode === "hex" ? "HEX" : "ASCII"
  return `${loopText} · ${intervalText} · ${suffixText} · ${modeText}`
}

function App() {
  const sidebarOpen = usePrettyComStore((state) => state.sidebarOpen)
  const setSidebarOpen = usePrettyComStore((state) => state.setSidebarOpen)
  const theme = usePrettyComStore((state) => state.theme)
  const [openPortDialogOpen, setOpenPortDialogOpen] = useState(false)

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  useEffect(() => setupSerialEventBridge(), [])

  return (
    <ThemeAnimationBridge>
      <TooltipProvider>
        <SidebarProvider open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <div className="relative flex h-screen w-full overflow-hidden bg-background text-foreground">
            <AppSidebar />
            <SidebarInset className="min-w-0 flex-1">
              <Workbench onOpenPort={() => setOpenPortDialogOpen(true)} />
            </SidebarInset>
            <ThemeWatermark />
          </div>
          <OpenPortDialog open={openPortDialogOpen} onOpenChange={setOpenPortDialogOpen} />
        </SidebarProvider>
      </TooltipProvider>
    </ThemeAnimationBridge>
  )
}

function SessionRemoveDialog({
  session,
  open,
  onOpenChange,
}: {
  session: SessionProfile
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const t = useT()
  const removeSession = usePrettyComStore((state) => state.removeSession)

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("Delete session?")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("This closes the port and removes the session from the sidebar.")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("Cancel")}</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              void closePort(session.id)
              removeSession(session.id)
            }}
          >
            {t("Remove")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function SessionSidebarMenuItem({
  session,
  isActive,
  onSelect,
}: {
  session: SessionProfile
  isActive: boolean
  onSelect: () => void
}) {
  const t = useT()
  const { state } = useSidebar()
  const collapsed = state === "collapsed"
  const [deleteOpen, setDeleteOpen] = useState(false)

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <SidebarMenuItem className="group/session">
            <SidebarMenuButton
              isActive={isActive}
              tooltip={`${session.name} · ${session.path}`}
              onClick={onSelect}
              data-testid={`session-item-${session.id}`}
              className={cn(collapsed && "justify-center")}
            >
              <StatusDot status={session.status} />
              <span className="truncate group-data-[collapsible=icon]:hidden">{session.name}</span>
            </SidebarMenuButton>
            {session.unread > 0 && !collapsed ? (
              <SidebarMenuBadge>
                <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                  {session.unread}
                </Badge>
              </SidebarMenuBadge>
            ) : null}
            {!collapsed ? (
              <SidebarMenuAction
                showOnHover
                aria-label={t("Remove session")}
                data-testid={`session-row-delete-${session.id}`}
                onClick={(event) => {
                  event.stopPropagation()
                  setDeleteOpen(true)
                }}
              >
                <Trash2 className="size-3.5" />
              </SidebarMenuAction>
            ) : null}
          </SidebarMenuItem>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem
            variant="destructive"
            data-testid={`session-delete-${session.id}`}
            onSelect={() => setDeleteOpen(true)}
          >
            <Trash2 className="size-4" />
            {t("Remove session")}
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
      <SessionRemoveDialog session={session} open={deleteOpen} onOpenChange={setDeleteOpen} />
    </>
  )
}

function AppSidebar() {
  const t = useT()
  const sessions = usePrettyComStore((state) => state.sessions)
  const currentSessionId = usePrettyComStore((state) => state.currentSessionId)
  const setCurrentSession = usePrettyComStore((state) => state.setCurrentSession)
  const setSettingsOpen = usePrettyComStore((state) => state.setSettingsOpen)
  const currentSession = sessions.find((session) => session.id === currentSessionId)

  return (
    <Sidebar variant="sidebar" collapsible="icon" className="border-r border-border/70">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5 group-data-[collapsible=icon]:justify-center">
          <img
            src="/app-icon.png"
            alt=""
            className="size-8 shrink-0 rounded-lg group-data-[collapsible=icon]:size-7"
            width={32}
            height={32}
          />
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <div className="truncate text-sm font-semibold tracking-tight">PrettyCOM</div>
            <div className="truncate text-xs text-muted-foreground">{t("Serial workbench")}</div>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t("Sessions")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {sessions.map((session) => (
                <SessionSidebarMenuItem
                  key={session.id}
                  session={session}
                  isActive={session.id === currentSessionId}
                  onSelect={() => setCurrentSession(session.id)}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        {currentSession?.status === "error" ? (
          <Alert className="mx-2 mb-2 hidden border-destructive/30 bg-destructive/10 text-xs group-data-[collapsible=icon]:hidden lg:block">
            <CircleAlert className="size-4 text-destructive" />
            <AlertTitle>{t("Error")}</AlertTitle>
            <AlertDescription>{currentSession.path}</AlertDescription>
          </Alert>
        ) : null}
        <ThemeCompanionRail />
        <div className="mx-2">
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
            onClick={() => setSettingsOpen(true)}
            data-testid="settings-open"
            title={t("Settings")}
          >
            <Settings className="size-4" />
            <span className="group-data-[collapsible=icon]:hidden">{t("Settings")}</span>
          </Button>
        </div>
      </SidebarFooter>
      <SidebarRail label={t("Toggle Sidebar")} />
    </Sidebar>
  )
}

function Workbench({ onOpenPort }: { onOpenPort: () => void }) {
  const t = useT()
  const sessions = usePrettyComStore((state) => state.sessions)
  const currentSessionId = usePrettyComStore((state) => state.currentSessionId)
  const settingsOpen = usePrettyComStore((state) => state.settingsOpen)
  const setSettingsOpen = usePrettyComStore((state) => state.setSettingsOpen)
  const inspectorOpen = usePrettyComStore((state) => state.inspectorOpen)
  const setInspectorOpen = usePrettyComStore((state) => state.setInspectorOpen)
  const currentSession = sessions.find((session) => session.id === currentSessionId) ?? sessions[0]

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "l") {
        event.preventDefault()
        document.querySelector<HTMLInputElement>('[data-testid="log-search"]')?.focus()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  if (!currentSession) {
    return (
      <main className="flex h-screen min-w-0 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border/70 px-4">
          <div className="flex items-center gap-3">
            <SidebarTrigger label={t("Toggle Sidebar")} />
            <Separator orientation="vertical" className="h-5" />
            <span className="text-sm text-muted-foreground">{t("No session yet")}</span>
          </div>
          <Button size="sm" className="h-9 gap-2 font-semibold" onClick={onOpenPort} data-testid="open-port-btn">
            <PlugZap className="size-4" />
            {t("Open Port")}
          </Button>
        </header>
        <div className="flex min-h-0 flex-1 items-center justify-center p-8">
          <div className="max-w-sm text-center">
            <div className="mx-auto flex size-10 items-center justify-center rounded-lg border border-border bg-card">
              <PlugZap className="size-5 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-sm font-medium">{t("Open a port to start")}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("Click Open Port in the top bar to create a serial session.")}
            </p>
          </div>
        </div>
        <SettingsSheet open={settingsOpen} onOpenChange={setSettingsOpen} />
      </main>
    )
  }

  return (
    <main className="flex h-screen min-w-0 flex-col">
      <TopBar session={currentSession} onOpenPort={onOpenPort} />
      <SidebarProvider
        open={inspectorOpen}
        onOpenChange={setInspectorOpen}
        className="min-h-0 flex-1"
        style={{ "--sidebar-width": "17.5rem" } as React.CSSProperties}
      >
        <div className="flex min-h-0 flex-1">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <LogStream session={currentSession} />
            <StatusBar session={currentSession} />
            <CommandComposer session={currentSession} />
          </div>
          <Inspector session={currentSession} />
        </div>
      </SidebarProvider>
      <SettingsSheet open={settingsOpen} onOpenChange={setSettingsOpen} />
    </main>
  )
}

function TopBar({ session, onOpenPort }: { session: SessionProfile; onOpenPort: () => void }) {
  const t = useT()
  const setSessionStatus = usePrettyComStore((state) => state.setSessionStatus)
  const appendLog = usePrettyComStore((state) => state.appendLog)
  const inspectorOpen = usePrettyComStore((state) => state.inspectorOpen)
  const setInspectorOpen = usePrettyComStore((state) => state.setInspectorOpen)
  const [busy, setBusy] = useState(false)

  const toggleConnection = async () => {
    if (busy) {
      return
    }
    setBusy(true)
    try {
      if (session.status === "connected") {
        await closePort(session.id)
        setSessionStatus(session.id, "disconnected")
        appendLog(session.id, createSysLogEntry(`${t("Disconnect")}: ${session.path}`))
      } else {
        await openPort(session.id, session.path, session.config)
        setSessionStatus(session.id, "connected")
        appendLog(session.id, createSysLogEntry(`${t("Connect")}: ${session.path}`, "success"))
      }
    } catch (error) {
      setSessionStatus(session.id, "error")
      appendLog(
        session.id,
        createSysLogEntry(error instanceof Error ? error.message : String(error), "error")
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-border/70 px-3">
      <div className="flex min-w-0 items-center gap-2.5">
        <SidebarTrigger label={t("Toggle Sidebar")} />
        <Separator orientation="vertical" className="h-5" />
        <Button
          variant={session.status === "connected" ? "outline" : "default"}
          size="sm"
          className={cn(
            "h-8 gap-2 rounded-md px-2.5 text-xs font-semibold",
            session.status === "connected" && "border-success/40 bg-success/10 text-success hover:bg-success/15",
            session.status === "error" && "border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/15"
          )}
          disabled={busy}
          onClick={() => void toggleConnection()}
          data-testid="session-connect-toggle"
        >
          {session.status === "connected" ? <Unplug className="size-3.5" /> : <PlugZap className="size-3.5" />}
          <span>{session.status === "connected" ? t("Disconnect port") : t("Connect port")}</span>
          <span className="rounded border border-current/20 px-1.5 py-0.5 font-mono text-[10px] font-medium">
            {session.path}
          </span>
        </Button>
        <span
          className={cn(
            "hidden shrink-0 font-mono text-[11px] text-muted-foreground sm:inline",
            session.status === "connected" && "text-success",
            session.status === "error" && "text-destructive"
          )}
          data-testid="session-port-params"
        >
          {formatPortParamsLabel(session.config, t)}
        </span>
        <div className="min-w-0 truncate text-sm font-medium">{session.name}</div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon-sm"
          className="size-8 shrink-0"
          aria-label={t("Toggle tools panel")}
          title={t("Toggle tools panel")}
          data-testid="inspector-toggle"
          onClick={() => setInspectorOpen(!inspectorOpen)}
        >
          <PanelRight className="size-4" />
        </Button>
        <Button size="sm" className="h-8 gap-1.5 text-xs font-semibold" onClick={onOpenPort} data-testid="open-port-btn">
          <PlugZap className="size-3.5" />
          {t("Open Port")}
        </Button>
      </div>
    </header>
  )
}

function OpenPortDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const t = useT()
  const addSession = usePrettyComStore((state) => state.addSession)
  const setSessionStatus = usePrettyComStore((state) => state.setSessionStatus)
  const appendLog = usePrettyComStore((state) => state.appendLog)
  const [ports, setPorts] = useState<PortInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [name, setName] = useState("")
  const [nameCustomized, setNameCustomized] = useState(false)
  const [path, setPath] = useState(isDevOrE2eRuntime() ? DEFAULT_TEST_PORT_A : "")
  const [config, setConfig] = useState<SerialConfig>({ ...DEFAULT_SERIAL_CONFIG })

  const applySelectedPort = useCallback(
    (nextPath: string) => {
      setPath(nextPath)
      if (!nameCustomized) {
        setName(defaultSessionNameFromPath(nextPath))
      }
    },
    [nameCustomized]
  )

  const refreshPorts = useCallback(async (preferredPath?: string) => {
    setLoading(true)
    try {
      const result = await listPorts()
      setPorts(result)
      if (!result.length) {
        return
      }
      setPath((currentPath) => {
        const candidate = preferredPath ?? currentPath
        if (candidate && result.some((port) => port.name === candidate)) {
          return candidate
        }
        return result[0].name
      })
    } catch {
      setPorts([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!open) {
      return
    }
    setNameCustomized(false)
    const initialPath = isDevOrE2eRuntime() ? DEFAULT_TEST_PORT_A : ""
    setPath(initialPath)
    setName(initialPath ? defaultSessionNameFromPath(initialPath) : "")
    void refreshPorts(initialPath || undefined)
  }, [open, refreshPorts])

  useEffect(() => {
    if (!open || nameCustomized || !path) {
      return
    }
    setName(defaultSessionNameFromPath(path))
  }, [open, path, nameCustomized])

  const handleConnect = async () => {
    if (!path || busy) {
      return
    }
    setBusy(true)
    const session = createSessionProfile(path, name.trim() || defaultSessionNameFromPath(path), config)
    addSession(session)
    try {
      await openPort(session.id, session.path, session.config)
      setSessionStatus(session.id, "connected")
      appendLog(session.id, createSysLogEntry(`${t("Connect")}: ${session.path}`, "success"))
      onOpenChange(false)
    } catch (error) {
      setSessionStatus(session.id, "error")
      appendLog(
        session.id,
        createSysLogEntry(error instanceof Error ? error.message : String(error), "error")
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[min(calc(100vw-2rem),28rem)] max-w-[calc(100vw-2rem)] overflow-hidden sm:max-w-lg" data-testid="open-port-dialog">
        <DialogHeader>
          <DialogTitle>{t("Port dialog")}</DialogTitle>
          <DialogDescription>{t("Configure serial connection")}</DialogDescription>
        </DialogHeader>
        <div className="grid max-h-[calc(90vh-10rem)] gap-3 overflow-y-auto py-2 pr-1">
          <div className="grid gap-1.5">
            <label className="text-sm font-medium">{t("Session name")}</label>
            <Input
              className="w-full min-w-0"
              value={name}
              placeholder={path ? defaultSessionNameFromPath(path) : t("Session name")}
              onChange={(event) => {
                setNameCustomized(true)
                setName(event.target.value)
              }}
            />
          </div>
          <div className="grid min-w-0 gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <label className="text-sm font-medium">{t("Select port")}</label>
              <Button variant="ghost" size="sm" className="h-7 shrink-0 gap-1" onClick={() => void refreshPorts(path)} data-testid="refresh-ports-btn">
                <RefreshCcw className="size-3.5" />
                {t("Refresh ports")}
              </Button>
            </div>
            {loading ? (
              <Skeleton className="h-9 rounded-md" />
            ) : ports.length ? (
              <Select value={path || undefined} onValueChange={applySelectedPort}>
                <SelectTrigger className="w-full min-w-0 max-w-full truncate" data-testid="port-select">
                  <SelectValue placeholder={t("Select port")}>
                    {path ? (
                      <span className="truncate">{path}</span>
                    ) : (
                      <span className="text-muted-foreground">{t("Select port")}</span>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="max-w-[min(calc(100vw-2rem),26rem)]">
                  {ports.map((port) => (
                    <SelectItem key={port.name} value={port.name} textValue={port.name}>
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <span className="font-medium">{port.name}</span>
                        {port.description ? (
                          <span className="truncate text-xs text-muted-foreground" title={port.description}>
                            {port.description}
                          </span>
                        ) : null}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="rounded-md border border-dashed border-border px-3 py-2 text-sm text-muted-foreground">
                {t("No ports found")}
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="grid gap-1.5">
              <label className="text-sm font-medium">{t("Baud rate")}</label>
              <Select
                value={String(config.baudRate)}
                onValueChange={(value) => setConfig((current) => ({ ...current, baudRate: Number(value) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[9600, 19200, 38400, 57600, 115200, 230400, 460800, 921600].map((rate) => (
                    <SelectItem key={rate} value={String(rate)}>
                      {rate}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <label className="text-sm font-medium">{t("Data bits")}</label>
              <Select
                value={String(config.dataBits)}
                onValueChange={(value) =>
                  setConfig((current) => ({ ...current, dataBits: Number(value) as SerialConfig["dataBits"] }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[5, 6, 7, 8].map((bits) => (
                    <SelectItem key={bits} value={String(bits)}>
                      {bits}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <label className="text-sm font-medium">{t("Parity")}</label>
              <Select
                value={config.parity}
                onValueChange={(value) =>
                  setConfig((current) => ({ ...current, parity: value as SerialConfig["parity"] }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("None")}</SelectItem>
                  <SelectItem value="odd">{t("Odd")}</SelectItem>
                  <SelectItem value="even">{t("Even")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <label className="text-sm font-medium">{t("Stop bits")}</label>
              <Select
                value={String(config.stopBits)}
                onValueChange={(value) =>
                  setConfig((current) => ({ ...current, stopBits: Number(value) as SerialConfig["stopBits"] }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1</SelectItem>
                  <SelectItem value="2">2</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 grid gap-1.5">
              <label className="text-sm font-medium">{t("Flow control")}</label>
              <Select
                value={config.flowControl}
                onValueChange={(value) =>
                  setConfig((current) => ({ ...current, flowControl: value as SerialConfig["flowControl"] }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("None")}</SelectItem>
                  <SelectItem value="hardware">{t("Hardware")}</SelectItem>
                  <SelectItem value="software">{t("Software")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("Cancel")}
          </Button>
          <Button disabled={!path || busy} onClick={() => void handleConnect()} data-testid="connect-btn">
            <PlugZap className="size-4" />
            {t("Open and connect")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function LogStream({ session }: { session: SessionProfile }) {
  const t = useT()
  const parentRef = useRef<HTMLDivElement>(null)
  const getFilteredLogs = usePrettyComStore((state) => state.getFilteredLogs)
  const selectedLogId = usePrettyComStore((state) => state.selectedLogId)
  const setSelectedLog = usePrettyComStore((state) => state.setSelectedLog)
  const setSessionLogs = usePrettyComStore((state) => state.setSessionLogs)
  const logDisplayMode = usePrettyComStore((state) => state.logDisplayMode)
  const filter = usePrettyComStore((state) => state.filter)
  const autoScroll = usePrettyComStore((state) => state.autoScroll)
  const pendingScrollLogId = usePrettyComStore((state) => state.pendingScrollLogId)
  const setPendingScrollLogId = usePrettyComStore((state) => state.setPendingScrollLogId)
  const logs = useMemo(() => getFilteredLogs(session.id), [getFilteredLogs, session.id, session.logs, filter])
  const highlightRules = useMemo(() => getActiveHighlightRules(filter), [filter])

  const loadDevSample = async () => {
    const { createDevLogEntries } = await import("@/data/dev-samples")
    setSessionLogs(session.id, createDevLogEntries())
  }

  const rowVirtualizer = useVirtualizer({
    count: logs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 34,
    overscan: 8,
  })

  useEffect(() => {
    if (!autoScroll || !logs.length || !parentRef.current) {
      return
    }
    parentRef.current.scrollTop = parentRef.current.scrollHeight
  }, [autoScroll, logs.length, logs.at(-1)?.id, logs.at(-1)?.bytes])

  useEffect(() => {
    if (!pendingScrollLogId || !logs.length) {
      return
    }
    const index = logs.findIndex((entry) => entry.id === pendingScrollLogId)
    if (index < 0) {
      setPendingScrollLogId(null)
      return
    }
    rowVirtualizer.scrollToIndex(index, { align: "center" })
    setSelectedLog(pendingScrollLogId)
    setPendingScrollLogId(null)
  }, [pendingScrollLogId, logs, rowVirtualizer, setPendingScrollLogId, setSelectedLog])

  const totalCount = session.logs.length

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-background">
      {!totalCount ? (
        <div className="flex h-full items-center justify-center p-8">
          <div className="max-w-sm text-center">
            <ThemeEmptyIllustration />
            <h3 className="mt-4 text-sm font-medium">{t("No serial history")}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {import.meta.env.DEV
                ? t("Open a port or send a command to start collecting RX/TX records. Development sample data is available only while running the dev server.")
                : t("Open a port or send a command to start collecting RX/TX records.")}
            </p>
            {import.meta.env.DEV ? (
              <Button
                variant="outline"
                size="sm"
                className="mt-4 gap-2"
                onClick={() => void loadDevSample()}
                data-testid="dev-sample-btn"
              >
                <RefreshCcw className="size-3.5" />
                {t("Dev sample")}
              </Button>
            ) : null}
          </div>
        </div>
      ) : (
        <>
          <LogChrome session={session} visibleCount={logs.length} totalCount={totalCount} />
          {logs.length ? (
            <div
              ref={parentRef}
              className="min-h-0 flex-1 overflow-auto font-mono text-[12px] leading-none"
              aria-label={t("Realtime serial log")}
              data-testid="log-stream"
            >
              <div className="relative w-full" style={{ height: rowVirtualizer.getTotalSize() + 40 }}>
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const entry = logs[virtualRow.index]
                  return (
                    <LogLine
                      key={entry.id}
                      entry={entry}
                      logDisplayMode={logDisplayMode}
                      highlightRules={highlightRules}
                      zebra={virtualRow.index % 2 === 0}
                      selected={entry.id === selectedLogId}
                      onSelect={() => setSelectedLog(entry.id)}
                      top={virtualRow.start}
                    />
                  )
                })}
              </div>
            </div>
          ) : (
            <div
              className="flex min-h-0 flex-1 items-center justify-center p-8 text-sm text-muted-foreground"
              data-testid="log-filter-empty"
            >
              {t("No logs match filter")}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function LogChrome({
  session,
  visibleCount,
  totalCount,
}: {
  session: SessionProfile
  visibleCount: number
  totalCount: number
}) {
  const t = useT()
  const filter = usePrettyComStore((state) => state.filter)
  const setFilter = usePrettyComStore((state) => state.setFilter)
  const rxDisplayMode = usePrettyComStore((state) => state.rxDisplayMode)
  const setRxDisplayMode = usePrettyComStore((state) => state.setRxDisplayMode)
  const logDisplayMode = usePrettyComStore((state) => state.logDisplayMode)
  const setLogDisplayMode = usePrettyComStore((state) => state.setLogDisplayMode)
  const clearLogs = usePrettyComStore((state) => state.clearLogs)
  const autoScroll = usePrettyComStore((state) => state.autoScroll)
  const setAutoScroll = usePrettyComStore((state) => state.setAutoScroll)
  const activeRuleCount = filter.highlightRules.filter((rule) => rule.enabled && rule.pattern.trim()).length
  const [clearDialogOpen, setClearDialogOpen] = useState(false)

  const handleExport = async () => {
    if (!session.logs.length) {
      return
    }
    try {
      const path = await save({
        defaultPath: `${session.name}-log.csv`,
        filters: [{ name: "CSV", extensions: ["csv"] }],
      })
      if (!path) {
        return
      }
      await writeTextFile(path, formatLogsForCsv(session.logs))
    } catch {
      window.alert(t("Export failed"))
    }
  }

  return (
    <div className="min-w-0 shrink-0 border-b border-border/70 bg-muted">
      <div className="flex h-11 min-w-0 items-center gap-2 overflow-x-auto px-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {session.status === "connected" ? (
          <span className="size-1.5 shrink-0 rounded-full bg-success" aria-hidden />
        ) : null}
        <div className="relative min-w-[140px] max-w-[280px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-8 w-full pl-8"
            placeholder={t("Filter logs...")}
            value={filter.search}
            onChange={(event) => setFilter({ search: event.target.value })}
            data-testid="log-search"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 shrink-0 gap-1.5 text-xs" data-testid="log-filter-direction">
              <Filter className="size-3.5" />
              {filter.direction === "all" ? t("All directions") : filter.direction}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>{t("Direction filter")}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup
              value={filter.direction}
              onValueChange={(value) => setFilter({ direction: value as typeof filter.direction })}
            >
              <DropdownMenuRadioItem value="all">{t("All")}</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="RX">{t("RX")}</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="TX">{t("TX")}</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="SYS">{t("SYS")}</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <HighlightRulesDialog />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 shrink-0 gap-1.5 text-xs" data-testid="log-rx-display-mode">
              {rxDisplayMode === "terminal" ? t("Terminal mode") : t("Frame mode")}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>{t("RX display")}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup
              value={rxDisplayMode}
              onValueChange={(value) => {
                flushAllSessionRx()
                setRxDisplayMode(value as typeof rxDisplayMode)
              }}
            >
              <DropdownMenuRadioItem value="terminal">{t("Terminal mode")}</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="frame">{t("Frame mode")}</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          <Select
            value={logDisplayMode}
            onValueChange={(value) => setLogDisplayMode(value as DisplayMode)}
          >
            <SelectTrigger className="h-8 w-[132px] text-xs" data-testid="log-display-mode">
              <span className="truncate">
                {t("Log format")}: {logDisplayMode === "hex" ? "HEX" : "ASCII"}
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ascii">ASCII</SelectItem>
              <SelectItem value="hex">HEX</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant={autoScroll ? "secondary" : "ghost"}
            size="sm"
            className={cn(
              "h-8 shrink-0 gap-1.5 text-xs",
              autoScroll && "border border-primary/25 bg-primary/15 text-primary"
            )}
            data-testid="auto-scroll-toggle"
            aria-pressed={autoScroll}
            onClick={() => setAutoScroll(!autoScroll)}
          >
            <Timer className="size-3.5" />
            {t("Auto-scroll")}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 shrink-0 gap-1.5 text-xs"
                aria-label={t("More actions")}
                data-testid="log-more-menu"
              >
                <MoreHorizontal className="size-3.5" />
                {t("More")}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>{t("More actions")}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => void handleExport()}>
                <Download className="size-3.5" />
                {t("Export Logs")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setClearDialogOpen(true)} data-testid="clear-logs-btn">
                <Eraser className="size-3.5" />
                {t("Clear")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled className="text-xs" data-testid="log-filter-count">
                {visibleCount}/{totalCount} {t("log entries")}
              </DropdownMenuItem>
              {activeRuleCount ? (
                <DropdownMenuItem disabled className="gap-1 text-xs">
                  <Bolt className="size-3" />
                  {activeRuleCount} {t("Highlight rules")}
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <AlertDialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Clear log history?")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("This removes all log entries from the current workspace history. Exported files are not affected.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("Cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => clearLogs(session.id)} data-testid="clear-logs-confirm">
              {t("Clear history")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <div className="grid h-7 grid-cols-[108px_54px_1fr_72px_64px] items-center border-l-2 border-l-transparent px-3 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        <span>{t("Time")}</span>
        <span>{t("Dir")}</span>
        <span>{t("Payload")}</span>
        <span>{t("Bytes")}</span>
        <span className="text-right">{t("Gap")}</span>
      </div>
    </div>
  )
}

function HighlightRulesDialog() {
  const t = useT()
  const filter = usePrettyComStore((state) => state.filter)
  const setFilter = usePrettyComStore((state) => state.setFilter)
  const selectedLogId = usePrettyComStore((state) => state.selectedLogId)
  const logDisplayMode = usePrettyComStore((state) => state.logDisplayMode)
  const getCurrentSession = usePrettyComStore((state) => state.getCurrentSession)
  const getFilteredLogs = usePrettyComStore((state) => state.getFilteredLogs)
  const setPendingScrollLogId = usePrettyComStore((state) => state.setPendingScrollLogId)
  const [open, setOpen] = useState(false)
  const [testSamples, setTestSamples] = useState<Record<string, string>>({})
  const [locateErrorId, setLocateErrorId] = useState<string | null>(null)
  const rules = filter.highlightRules

  const defaultSample = useMemo(() => {
    const session = getCurrentSession()
    if (!session) {
      return ""
    }
    const logs = getFilteredLogs(session.id)
    const selected = logs.find((entry) => entry.id === selectedLogId)
    const entry = selected ?? logs.at(-1)
    return entry ? formatLogPayload(entry, logDisplayMode) : ""
  }, [logDisplayMode, getCurrentSession, getFilteredLogs, open, selectedLogId])

  useEffect(() => {
    if (!open) {
      setLocateErrorId(null)
      return
    }
    setTestSamples((current) => {
      const next = { ...current }
      for (const rule of rules) {
        if (!(rule.id in next)) {
          next[rule.id] = defaultSample
        }
      }
      return next
    })
  }, [defaultSample, open, rules])

  const updateRules = (nextRules: HighlightRule[]) => {
    setFilter({ highlightRules: nextRules, highlight: "" })
  }

  const updateRule = (ruleId: string, patch: Partial<HighlightRule>) => {
    updateRules(rules.map((rule) => (rule.id === ruleId ? { ...rule, ...patch } : rule)))
  }

  const addRule = () => {
    const rule = createHighlightRule()
    setTestSamples((current) => ({ ...current, [rule.id]: defaultSample }))
    updateRules([...rules, rule])
  }

  const removeRule = (ruleId: string) => {
    updateRules(rules.filter((rule) => rule.id !== ruleId))
    setTestSamples((current) => {
      const next = { ...current }
      delete next[ruleId]
      return next
    })
    if (locateErrorId === ruleId) {
      setLocateErrorId(null)
    }
  }

  const locateInLogs = (rule: HighlightRule) => {
    const session = getCurrentSession()
    if (!session) {
      return
    }
    const logs = getFilteredLogs(session.id)
    const logId = findFirstMatchingLogId(logs, rule, logDisplayMode)
    if (!logId) {
      setLocateErrorId(rule.id)
      return
    }
    setLocateErrorId(null)
    setPendingScrollLogId(logId)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        variant={rules.some((rule) => rule.enabled && rule.pattern.trim()) ? "secondary" : "outline"}
        size="sm"
        className="h-8 gap-2"
        onClick={() => setOpen(true)}
        data-testid="highlight-rules-open"
      >
        <Bolt className="size-3.5" />
        {t("Highlight rules")}
      </Button>
      <DialogContent
        className="w-[min(calc(100vw-2rem),960px)] max-w-[calc(100vw-2rem)] overflow-x-hidden"
        data-testid="highlight-rules-dialog"
      >
        <DialogHeader>
          <DialogTitle>{t("Highlight rules")}</DialogTitle>
          <DialogDescription>{t("Add keyword or regular expression rules and assign colors independently.")}</DialogDescription>
        </DialogHeader>
        <div className="max-h-[56vh] space-y-2 overflow-y-auto overflow-x-hidden pr-1">
          {rules.length ? (
            rules.map((rule) => {
              const sample = testSamples[rule.id] ?? defaultSample
              const invalidRegex = rule.isRegex && isInvalidRegex(rule.pattern)
              const matches = invalidRegex ? [] : findRuleMatches(sample, rule)
              const matchLabel = invalidRegex
                ? t("Invalid regular expression")
                : matches.length
                  ? t("{n} matches").replace("{n}", String(matches.length))
                  : t("No matches")

              return (
                <div
                  key={rule.id}
                  className="flex flex-col gap-2 overflow-x-hidden rounded-md border border-border bg-background/60 p-3"
                >
                  <div className="flex min-w-0 items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <Input
                        className={cn("h-8", invalidRegex && "border-destructive")}
                        value={rule.pattern}
                        placeholder={rule.isRegex ? t("Regex pattern...") : t("Keyword...")}
                        onChange={(event) => updateRule(rule.id, { pattern: event.target.value })}
                        data-testid={`highlight-pattern-${rule.id}`}
                      />
                    </div>
                    <TooltipProvider delayDuration={200}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant={rule.isRegex ? "secondary" : "outline"}
                            size="sm"
                            className="h-8 shrink-0"
                            onClick={() => updateRule(rule.id, { isRegex: !rule.isRegex })}
                            data-testid={`highlight-regex-${rule.id}`}
                          >
                            .*
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {rule.isRegex ? t("Regex mode (case-insensitive)") : t("Keyword")}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1">
                      {highlightColorOptions.map((option) => (
                        <Button
                          key={option.color}
                          variant="ghost"
                          size="icon"
                          className={cn(
                            "size-7 rounded-md border border-transparent",
                            rule.color === option.color && "border-foreground/70 bg-accent"
                          )}
                          aria-label={`${t("Highlight color")} ${option.color}`}
                          onClick={() => updateRule(rule.id, { color: option.color })}
                        >
                          <span className={cn("size-3.5 rounded-full", option.className)} />
                        </Button>
                      ))}
                    </div>
                    <Button
                      variant={rule.enabled ? "secondary" : "outline"}
                      size="sm"
                      className="h-8"
                      onClick={() => updateRule(rule.id, { enabled: !rule.enabled })}
                    >
                      {rule.enabled ? t("Enabled") : t("Disabled")}
                    </Button>
                    <Button variant="ghost" size="icon" className="size-8" onClick={() => removeRule(rule.id)}>
                      <Trash2 className="size-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5"
                      onClick={() => locateInLogs(rule)}
                      data-testid={`highlight-locate-${rule.id}`}
                    >
                      <Crosshair className="size-3.5" />
                      {t("Locate in logs")}
                    </Button>
                  </div>
                  <div className="space-y-2 border-t border-border/50 pt-2">
                    <Textarea
                      className="min-h-[56px] resize-y font-mono text-xs"
                      placeholder={t("Test sample...")}
                      value={sample}
                      onChange={(event) =>
                        setTestSamples((current) => ({ ...current, [rule.id]: event.target.value }))
                      }
                      data-testid={`highlight-sample-${rule.id}`}
                    />
                    <div className="flex items-start justify-between gap-2 text-xs">
                      <div
                        className="min-w-0 flex-1 break-all font-mono"
                        data-testid={`highlight-preview-${rule.id}`}
                      >
                        {sample ? highlightText(sample, [rule]) : null}
                      </div>
                      <span
                        className={cn(
                          "shrink-0",
                          invalidRegex ? "text-destructive" : matches.length ? "text-success" : "text-muted-foreground"
                        )}
                      >
                        {matchLabel}
                      </span>
                    </div>
                    {locateErrorId === rule.id ? (
                      <p className="text-xs text-destructive">{t("No matching log found")}</p>
                    ) : null}
                  </div>
                </div>
              )
            })
          ) : (
            <div className="rounded-md border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
              {t("No highlight rules yet")}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => updateRules([])}>
            {t("Clear rules")}
          </Button>
          <Button onClick={addRule} data-testid="highlight-rule-add">
            <Plus className="size-4" />
            {t("Add rule")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

const LogLine = memo(function LogLine({
  entry,
  logDisplayMode,
  highlightRules,
  zebra,
  selected,
  onSelect,
  top,
}: {
  entry: LogEntry
  logDisplayMode: DisplayMode
  highlightRules: HighlightRule[]
  zebra: boolean
  selected: boolean
  onSelect: () => void
  top: number
}) {
  const t = useT()
  const payload = formatLogPayload(entry, logDisplayMode)

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          data-log-row="true"
          data-testid={`log-row-${entry.id}`}
          className={cn(
            "group absolute left-0 grid h-[34px] w-full grid-cols-[108px_54px_1fr_72px_64px] items-center border-b border-border/35 px-4 text-left transition-colors hover:bg-accent/50",
            zebra && "bg-muted/20",
            entry.direction === "RX" && "border-l-2 border-l-log-rx/50",
            entry.direction === "TX" && "border-l-2 border-l-log-tx/50",
            entry.direction === "SYS" && "border-l-2 border-l-log-sys/40",
            selected && "bg-primary/10 ring-1 ring-inset ring-primary/30"
          )}
          style={{ transform: `translateY(${top}px)` }}
        >
          <button type="button" className="contents text-left" onClick={onSelect}>
            <span className="text-muted-foreground">{entry.time}</span>
            <Badge
              variant={entry.direction === "RX" ? "secondary" : entry.direction === "TX" ? "outline" : "default"}
              className={cn(
                "h-5 w-fit rounded-md px-1.5 text-[10px] font-semibold",
                entry.direction === "RX" && "bg-log-rx/15 text-log-rx",
                entry.direction === "TX" && "border-log-tx/40 bg-log-tx/10 text-log-tx",
                entry.direction === "SYS" && "bg-muted text-log-sys"
              )}
            >
              {entry.direction}
            </Badge>
            <span
              className={cn(
                "truncate text-foreground",
                entry.level === "success" && "text-success",
                entry.level === "warning" && "text-warning",
                entry.level === "error" && "text-destructive"
              )}
            >
              {highlightText(payload, highlightRules)}
            </span>
            <span className="text-muted-foreground">{entry.bytes} bytes</span>
            <span className="text-right text-muted-foreground">+{entry.delta}ms</span>
          </button>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem data-testid="log-row-copy-payload" onSelect={() => void copyText(payload)}>
          <Copy className="size-4" />
          {t("Copy payload")}
        </ContextMenuItem>
        <ContextMenuItem data-testid="log-row-copy-hex" onSelect={() => void copyText(entry.hex)}>
          <Copy className="size-4" />
          {t("Copy HEX")}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
});

function formatByteCount(bytes: number) {
  if (bytes < 1024) {
    return `${bytes}B`
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)}KB`
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

function StatusBar({ session }: { session: SessionProfile }) {
  const t = useT()
  const autoScroll = usePrettyComStore((state) => state.autoScroll)
  const filter = usePrettyComStore((state) => state.filter)
  const getFilteredLogs = usePrettyComStore((state) => state.getFilteredLogs)

  const totalCount = session.logs.length
  const visibleCount = useMemo(
    () => getFilteredLogs(session.id).length,
    [getFilteredLogs, session.id, session.logs, filter]
  )

  const { rxBytes, txBytes } = useMemo(() => {
    let rxBytes = 0
    let txBytes = 0
    for (const entry of session.logs) {
      if (entry.direction === "RX") {
        rxBytes += entry.bytes
      } else if (entry.direction === "TX") {
        txBytes += entry.bytes
      }
    }
    return { rxBytes, txBytes }
  }, [session.logs])

  if (!totalCount) {
    return null
  }

  return (
    <div
      className="flex h-6 shrink-0 items-center gap-4 border-t border-border/70 bg-card px-3 text-[11px] text-muted-foreground"
      data-testid="status-bar"
    >
      <span className="inline-flex items-center gap-1.5">
        <span
          className={cn("size-1.5 rounded-full", session.status === "connected" ? "bg-success" : "bg-muted-foreground/50")}
          aria-hidden
        />
        {session.status === "connected"
          ? `${t("Connected")} ${session.path}`
          : session.status === "error"
            ? t("Port error")
            : t("Idle")}
      </span>
      <span>RX {formatByteCount(rxBytes)}</span>
      <span>TX {formatByteCount(txBytes)}</span>
      <span>
        {visibleCount}/{totalCount} {t("log entries")}
      </span>
      <span>{autoScroll ? t("Auto-scroll on") : t("Auto-scroll off")}</span>
    </div>
  )
}

function CommandComposer({ session }: { session: SessionProfile }) {
  const t = useT()
  const commandText = usePrettyComStore((state) => state.commandText)
  const setCommandText = usePrettyComStore((state) => state.setCommandText)
  const suffix = usePrettyComStore((state) => state.suffix)
  const setSuffix = usePrettyComStore((state) => state.setSuffix)
  const sendDisplayMode = usePrettyComStore((state) => state.sendDisplayMode)
  const setSendDisplayMode = usePrettyComStore((state) => state.setSendDisplayMode)
  const appendLog = usePrettyComStore((state) => state.appendLog)
  const deleteLogEntry = usePrettyComStore((state) => state.deleteLogEntry)
  const addCommandHistory = usePrettyComStore((state) => state.addCommandHistory)
  const theme = usePrettyComStore((state) => state.theme)
  const [sending, setSending] = useState(false)
  const sendingRef = useRef(false)
  const connected = session.status === "connected"

  const executeSend = useCallback(
    async (options?: { clearAfter?: boolean }) => {
      const clearAfter = options?.clearAfter ?? true
      const command = commandText.trim()
      if (!command || !connected || sendingRef.current) {
        return false
      }
      sendingRef.current = true
      setSending(true)
      let txEntryId = ""
      try {
        let bytes: Uint8Array
        let ascii: string
        if (sendDisplayMode === "hex") {
          bytes = parseHexString(command)
          ascii = command
        } else {
          const payload = applySuffix(command, suffix)
          bytes = new TextEncoder().encode(payload)
          ascii = command
        }
        const now = Date.now()
        const txEntry = createTxLogEntry(bytes, ascii, now, session.lastRxAt)
        txEntryId = txEntry.id
        appendLog(session.id, txEntry)
        await writePort(session.id, bytes)
        addCommandHistory({
          id: `history-${now}`,
          command,
          suffix,
          mode: sendDisplayMode,
          sentAt: new Date(now).toLocaleTimeString("en-US", { hour12: false }),
        })
        if (clearAfter) {
          setCommandText("")
        }
        return true
      } catch (error) {
        if (txEntryId) {
          deleteLogEntry(session.id, txEntryId)
        }
        appendLog(
          session.id,
          createSysLogEntry(
            error instanceof Error ? error.message : t("Send failed"),
            "error"
          )
        )
        return false
      } finally {
        sendingRef.current = false
        setSending(false)
      }
    },
    [
      addCommandHistory,
      appendLog,
      commandText,
      connected,
      deleteLogEntry,
      sendDisplayMode,
      session.id,
      session.lastRxAt,
      setCommandText,
      suffix,
      t,
    ]
  )

  const sendCommand = () => void executeSend({ clearAfter: true })

  const executeSendRef = useRef(executeSend)
  executeSendRef.current = executeSend

  const editorExtensions = useMemo(
    () => [
      EditorView.lineWrapping,
      EditorView.theme({
        ".cm-scroller": { fontFamily: "inherit" },
      }),
      keymap.of([
        {
          key: "Mod-Enter",
          run: () => {
            void executeSendRef.current({ clearAfter: true })
            return true
          },
        },
      ]),
    ],
    []
  )

  return (
    <div className="shrink-0 border-t border-border/70 bg-card px-3 py-2">
      <div className="flex items-end gap-2">
        <div
          className="min-h-10 max-h-24 min-w-0 flex-1 overflow-hidden rounded-lg border border-border bg-background"
          data-testid="command-input"
        >
          <CodeMirror
            value={commandText}
            height="auto"
            minHeight="40px"
            maxHeight="96px"
            theme={getCodeMirrorTheme(theme)}
            basicSetup={{ lineNumbers: false, foldGutter: false }}
            extensions={editorExtensions}
            onChange={setCommandText}
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-9 shrink-0 gap-1.5 px-2.5 text-[11px] font-medium"
              data-testid="send-options-trigger"
            >
              <SlidersHorizontal className="size-3.5" />
              <span>
                {t(suffixLabel[suffix])} · {sendDisplayMode === "hex" ? "HEX" : "ASCII"}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuLabel>{t("Send options")}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-[11px] font-normal text-muted-foreground">
              {t("Default suffix")}
            </DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={suffix}
              onValueChange={(value) => setSuffix(value as LineSuffix)}
            >
              {Object.entries(suffixLabel).map(([value, label]) => (
                <DropdownMenuRadioItem
                  key={value}
                  value={value}
                  disabled={sendDisplayMode === "hex"}
                  data-testid={`send-suffix-${value}`}
                >
                  {t(label)}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-[11px] font-normal text-muted-foreground">
              {t("Send format")}
            </DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={sendDisplayMode}
              onValueChange={(value) => setSendDisplayMode(value as DisplayMode)}
            >
              <DropdownMenuRadioItem value="ascii" data-testid="send-format-ascii">
                ASCII
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="hex" data-testid="send-format-hex">
                HEX
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              className={cn(
                "h-9 shrink-0 gap-1.5 px-3 text-xs font-semibold",
                connected && "bg-success text-success-foreground hover:bg-success/90"
              )}
              disabled={!commandText.trim() || !connected || sending}
              onClick={sendCommand}
              data-testid="send-command"
            >
              <Send className="size-3.5" />
              {connected ? t("Send command") : t("Not connected")}
            </Button>
          </TooltipTrigger>
          {connected ? <TooltipContent>{t("Mod+Enter to send")}</TooltipContent> : null}
        </Tooltip>
      </div>
    </div>
  )
}

function SendListPanel({ session }: { session: SessionProfile }) {
  const t = useT()
  const sendLists = usePrettyComStore((s) => s.sendLists)
  const addSendList = usePrettyComStore((s) => s.addSendList)
  const updateSendList = usePrettyComStore((s) => s.updateSendList)
  const deleteSendList = usePrettyComStore((s) => s.deleteSendList)
  const sendListRunningId = usePrettyComStore((s) => s.sendListRunningId)
  const setSendListRunning = usePrettyComStore((s) => s.setSendListRunning)
  const appendLog = usePrettyComStore((s) => s.appendLog)
  const deleteLogEntry = usePrettyComStore((s) => s.deleteLogEntry)
  const connected = session.status === "connected"

  const [selectedId, setSelectedId] = useState<string | null>(sendLists[0]?.id ?? null)
  const [dslOpen, setDslOpen] = useState(false)
  const [dslMode, setDslMode] = useState<DslDialogMode>("import")
  const [dslText, setDslText] = useState("")
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [cmdDialogOpen, setCmdDialogOpen] = useState(false)
  const [editingCmdId, setEditingCmdId] = useState<string | null>(null)
  const [draftCommand, setDraftCommand] = useState("")
  const [draftLoopCount, setDraftLoopCount] = useState(1)
  const [draftIntervalMs, setDraftIntervalMs] = useState(500)
  const [draftSuffix, setDraftSuffix] = useState<LineSuffix>("crlf")
  const [draftMode, setDraftMode] = useState<DisplayMode>("ascii")
  const sendingRef = useRef(false)
  const loopRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [sendProgress, setSendProgress] = useState<{ cmdIndex: number; loopIndex: number } | null>(null)

  const list = sendLists.find((l) => l.id === selectedId) ?? null
  const running = sendListRunningId === selectedId && selectedId !== null
  const activeCommands = list?.commands.filter((c) => c.command.trim()) ?? []

  const updateList = (patch: Partial<SendList>) => {
    if (!selectedId) return
    updateSendList(selectedId, patch)
  }

  const createList = () => {
    const id = crypto.randomUUID()
    const now = Date.now()
    addSendList({
      id,
      name: `List ${sendLists.length + 1}`,
      commands: [],
      listLoop: 1,
      listIntervalMs: 500,
      suffix: "crlf",
      mode: "ascii",
      createdAt: now,
      updatedAt: now,
    })
    setSelectedId(id)
  }

  const handleDelete = () => {
    if (!selectedId) return
    if (running) {
      stopSending()
    }
    deleteSendList(selectedId)
    setSelectedId(sendLists.find((l) => l.id !== selectedId)?.id ?? null)
    setDeleteConfirm(false)
  }

  const openCmdDialog = (cmd?: SendListCommand) => {
    if (!list) return
    if (cmd) {
      setEditingCmdId(cmd.id)
      setDraftCommand(cmd.command)
      setDraftLoopCount(cmd.loopCount)
      setDraftIntervalMs(cmd.intervalMs)
      setDraftSuffix(cmd.suffix)
      setDraftMode(cmd.mode)
    } else {
      setEditingCmdId(null)
      setDraftCommand("")
      setDraftLoopCount(1)
      setDraftIntervalMs(500)
      setDraftSuffix(list.suffix)
      setDraftMode(list.mode)
    }
    setCmdDialogOpen(true)
  }

  const saveCmdDialog = () => {
    if (!list) return
    const command = draftCommand.trim()
    if (!command) return
    const nextCmd: SendListCommand = {
      id: editingCmdId ?? crypto.randomUUID(),
      command,
      loopCount: Math.max(0, draftLoopCount),
      intervalMs: Math.max(10, draftIntervalMs),
      suffix: draftSuffix,
      mode: draftMode,
    }
    if (editingCmdId) {
      updateList({
        commands: list.commands.map((c) => (c.id === editingCmdId ? nextCmd : c)),
      })
    } else {
      updateList({ commands: [...list.commands, nextCmd] })
    }
    setCmdDialogOpen(false)
  }

  const deleteCmd = (cmdId: string) => {
    if (!list) return
    updateList({ commands: list.commands.filter((c) => c.id !== cmdId) })
  }

  const stopSending = () => {
    if (loopRef.current) {
      clearTimeout(loopRef.current)
      loopRef.current = null
    }
    sendingRef.current = false
    setSendListRunning(null)
    setSendProgress(null)
  }

  const sendAll = useCallback(async () => {
    if (!list || !connected || sendingRef.current) return
    const cmds = list.commands.filter((c) => c.command.trim())
    if (!cmds.length) return

    sendingRef.current = true
    setSendListRunning(selectedId)

    const sendOne = async (cmd: SendListCommand) => {
      const now = Date.now()
      let bytes: Uint8Array
      let ascii: string
      if (cmd.mode === "hex") {
        bytes = parseHexString(cmd.command)
        ascii = cmd.command
      } else {
        const payload = applySuffix(cmd.command, cmd.suffix)
        bytes = new TextEncoder().encode(payload)
        ascii = cmd.command
      }
      const txEntry = createTxLogEntry(bytes, ascii, now, session.lastRxAt)
      const txEntryId = txEntry.id
      appendLog(session.id, txEntry)
      try {
        await writePort(session.id, bytes)
      } catch (error) {
        deleteLogEntry(session.id, txEntryId)
        appendLog(
          session.id,
          createSysLogEntry(error instanceof Error ? error.message : t("Send failed"), "error")
        )
        stopSending()
      }
    }

    let cmdIdx = 0
    const runCmd = () => {
      if (!sendingRef.current) return
      if (cmdIdx >= cmds.length) {
        stopSending()
        return
      }
      const cmd = cmds[cmdIdx]
      const maxLoops = cmd.loopCount === 0 ? Infinity : cmd.loopCount
      let loopIdx = 0
      const runLoop = () => {
        if (!sendingRef.current || loopIdx >= maxLoops) {
          cmdIdx++
          setSendProgress(null)
          loopRef.current = setTimeout(runCmd, 50)
          return
        }
        setSendProgress({ cmdIndex: cmdIdx, loopIndex: loopIdx })
        void sendOne(cmd).then(() => {
          if (!sendingRef.current) return
          loopIdx++
          loopRef.current = setTimeout(runLoop, cmd.intervalMs)
        })
      }
      runLoop()
    }

    cmdIdx = 0
    runCmd()
  }, [list, connected, selectedId, session, appendLog, deleteLogEntry, setSendListRunning, t])

  useEffect(() => {
    return () => {
      if (loopRef.current) {
        clearTimeout(loopRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!connected && running) {
      stopSending()
    }
  }, [connected, running])

  const exportDsl = () => {
    if (!list) return
    setDslMode("export")
    setDslText(serializeSendList(list))
    setDslOpen(true)
  }

  const openImportDsl = () => {
    setDslMode("import")
    setDslText("")
    setDslOpen(true)
  }

  const importDsl = () => {
    const parsed = parseSendListDsl(dslText)
    if (!parsed.name || !parsed.commands.length) return
    if (list) {
      updateList({
        name: parsed.name,
        commands: parsed.commands,
        listLoop: parsed.listLoop,
        listIntervalMs: parsed.listIntervalMs,
        suffix: parsed.suffix,
        mode: parsed.mode,
      })
    } else {
      const id = crypto.randomUUID()
      const now = Date.now()
      addSendList({
        id,
        name: parsed.name,
        commands: parsed.commands,
        listLoop: parsed.listLoop,
        listIntervalMs: parsed.listIntervalMs,
        suffix: parsed.suffix,
        mode: parsed.mode,
        createdAt: now,
        updatedAt: now,
      })
      setSelectedId(id)
    }
    setDslOpen(false)
  }

  const progressText =
    sendProgress && list
      ? `${t("Send progress item")
          .replace("{cmd}", String(sendProgress.cmdIndex + 1))
          .replace("{total}", String(activeCommands.length))} · ${t("Send progress loop").replace(
          "{n}",
          String(sendProgress.loopIndex + 1)
        )}`
      : null

  const cmdDialog = (
    <Dialog open={cmdDialogOpen} onOpenChange={setCmdDialogOpen}>
      <DialogContent className="sm:max-w-md" data-testid="send-list-cmd-dialog">
        <DialogHeader>
          <DialogTitle>{editingCmdId ? t("Edit list command") : t("Add list command")}</DialogTitle>
          <DialogDescription>{t("Interval between command sends")}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <label className="text-[11px] font-medium text-muted-foreground">{t("Command")}</label>
            <Textarea
              className="min-h-[72px] font-mono text-xs"
              value={draftCommand}
              onChange={(e) => setDraftCommand(e.target.value)}
              placeholder="AT+RST"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="grid gap-1.5">
              <label className="text-[11px] font-medium text-muted-foreground">{t("Send count")}</label>
              <Input
                type="number"
                min={0}
                className="h-8 text-xs"
                value={draftLoopCount}
                onChange={(e) => setDraftLoopCount(Math.max(0, Number(e.target.value) || 0))}
              />
              <p className="text-[10px] text-muted-foreground">{t("Repeat forever")} = 0</p>
            </div>
            <div className="grid gap-1.5">
              <label className="text-[11px] font-medium text-muted-foreground">
                {t("Interval between sends")}
              </label>
              <Input
                type="number"
                min={10}
                step={10}
                className="h-8 text-xs"
                value={draftIntervalMs}
                onChange={(e) => setDraftIntervalMs(Math.max(10, Number(e.target.value) || 10))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="grid gap-1.5">
              <label className="text-[11px] font-medium text-muted-foreground">{t("Default suffix")}</label>
              <Select
                value={draftSuffix}
                onValueChange={(value) => setDraftSuffix(value as LineSuffix)}
                disabled={draftMode === "hex"}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(suffixLabel).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {t(label)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <label className="text-[11px] font-medium text-muted-foreground">{t("Send format")}</label>
              <Select value={draftMode} onValueChange={(value) => setDraftMode(value as DisplayMode)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ascii">ASCII</SelectItem>
                  <SelectItem value="hex">HEX</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setCmdDialogOpen(false)}>
            {t("Cancel")}
          </Button>
          <Button onClick={saveCmdDialog} disabled={!draftCommand.trim()}>
            {t("Save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )

  if (!list) {
    return (
      <>
        <div className="flex h-full flex-col items-center justify-center gap-3 p-4">
          <div className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
            {t("No send lists yet")}
            <br />
            {t("Create a send list to batch commands with loop and interval.")}
          </div>
          <Button size="sm" variant="outline" className="gap-1" onClick={createList}>
            <Plus className="size-3.5" />
            {t("New list")}
          </Button>
          <Button size="sm" variant="ghost" className="gap-1" onClick={openImportDsl} data-testid="send-list-dsl-import">
            <Upload className="size-3.5" />
            {t("Import DSL")}
          </Button>
        </div>
        <DslImportExportDialog
          open={dslOpen}
          onOpenChange={setDslOpen}
          mode={dslMode}
          text={dslText}
          onTextChange={setDslText}
          onImport={importDsl}
          placeholder={`@name:My List\n@listloop:1\n@listinterval:500\n@suffix:crlf\n@mode:ascii\n---\nAT+RST\nAT+GMR`}
          testIdPrefix="send-list-dsl"
          defaultFileName="send-list.dsl"
          importDescriptionKey="Paste your send list DSL here."
        />
      </>
    )
  }

  return (
    <>
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <Select value={selectedId ?? ""} onValueChange={setSelectedId}>
            <SelectTrigger className="h-8 min-w-0 w-full text-xs" data-testid="send-list-select">
              <SelectValue placeholder={t("Select a list")} />
            </SelectTrigger>
            <SelectContent position="popper" className="z-50 max-h-64">
              {sendLists.map((sl) => (
                <SelectItem key={sl.id} value={sl.id}>
                  {sl.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button size="icon" variant="outline" className="size-8 shrink-0" onClick={createList} title={t("New list")}>
          <Plus className="size-3.5" />
        </Button>
        <Button
          size="icon"
          variant="outline"
          className="size-8 shrink-0"
          onClick={exportDsl}
          title={t("Export DSL")}
          data-testid="send-list-dsl-export"
        >
          <Download className="size-3.5" />
        </Button>
        <Button
          size="icon"
          variant="outline"
          className="size-8 shrink-0"
          onClick={openImportDsl}
          title={t("Import DSL")}
          data-testid="send-list-dsl-import"
        >
          <Upload className="size-3.5" />
        </Button>
        <AlertDialog open={deleteConfirm} onOpenChange={setDeleteConfirm}>
          <AlertDialogTrigger asChild>
            <Button size="icon" variant="outline" className="size-8 shrink-0" disabled={running}>
              <Trash2 className="size-3.5" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("Delete send list?")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("This permanently removes the send list and all its commands.")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("Cancel")}</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>{t("Remove")}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <div className="grid gap-1.5">
        <label className="text-[11px] font-medium text-muted-foreground">{t("List name")}</label>
        <Input
          className="h-8 text-xs"
          value={list.name}
          onChange={(e) => updateList({ name: e.target.value })}
          disabled={running}
        />
      </div>

      <Separator />

      <div className="flex min-h-0 flex-1 flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-muted-foreground">{t("Send list commands")}</span>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 gap-1 text-xs"
            onClick={() => openCmdDialog()}
            disabled={running}
          >
            <Plus className="size-3" />
            {t("Add command")}
          </Button>
        </div>
        <ScrollArea className="min-h-0 flex-1 rounded-md border border-border/70">
          {list.commands.length ? (
            <div className="divide-y divide-border/50">
              {list.commands.map((cmd) => (
                <div key={cmd.id} className="px-2 py-2">
                  <div className="flex items-start gap-1">
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-mono text-xs">{cmd.command || "—"}</div>
                      <div className="mt-0.5 text-[10px] text-muted-foreground">
                        {formatSendListCommandMeta(cmd, t)}
                      </div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-6 shrink-0"
                      onClick={() => openCmdDialog(cmd)}
                      disabled={running}
                      aria-label={t("Edit list command")}
                    >
                      <Pencil className="size-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-6 shrink-0"
                      onClick={() => deleteCmd(cmd.id)}
                      disabled={running}
                      aria-label={t("Remove")}
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-[11px] text-muted-foreground">
              {t("No commands in list")}
              <br />
              {t("Add a command to get started.")}
            </div>
          )}
        </ScrollArea>
      </div>

      <Separator />

      <div className="grid grid-cols-2 gap-2">
        <div className="grid gap-1">
          <label className="text-[10px] text-muted-foreground">{t("List repeat")}</label>
          <Input
            type="number"
            min={0}
            className="h-8 text-xs"
            value={list.listLoop}
            onChange={(e) => updateList({ listLoop: Math.max(0, Number(e.target.value) || 0) })}
            disabled={running}
          />
        </div>
        <div className="grid gap-1">
          <label className="text-[10px] text-muted-foreground">{t("Cmd gap")}</label>
          <Input
            type="number"
            min={10}
            step={10}
            className="h-8 text-xs"
            value={list.listIntervalMs}
            onChange={(e) => updateList({ listIntervalMs: Math.max(10, Number(e.target.value) || 10) })}
            disabled={running}
          />
        </div>
      </div>

      {progressText ? (
        <Badge variant="secondary" className="h-6 justify-center text-[10px]">
          {progressText}
        </Badge>
      ) : null}

      <Button
        className="h-9 gap-2"
        variant={running ? "default" : "outline"}
        disabled={!running && !list.commands.some((c) => c.command.trim())}
        onClick={running ? stopSending : sendAll}
      >
        {running ? (
          <>
            <CircleOff className="size-4" />
            {t("Stop sending")}
          </>
        ) : connected ? (
          <>
            <Play className="size-4" />
            {t("Send all")}
          </>
        ) : (
          <>
            <Unplug className="size-4" />
            {t("Not connected")}
          </>
        )}
      </Button>

      {cmdDialog}
    </div>
    <DslImportExportDialog
      open={dslOpen}
      onOpenChange={setDslOpen}
      mode={dslMode}
      text={dslText}
      onTextChange={setDslText}
      onImport={importDsl}
      placeholder={`@name:My List\n@listloop:1\n@listinterval:500\n@suffix:crlf\n@mode:ascii\n---\nAT+RST\nAT+GMR`}
      testIdPrefix="send-list-dsl"
      defaultFileName={`${list.name.replace(/[^\w.-]+/g, "_") || "send-list"}.dsl`}
      importDescriptionKey="Paste your send list DSL here."
    />
    </>
  )
}

function Inspector({ session }: { session: SessionProfile }) {
  const t = useT()
  const inspectorTab = usePrettyComStore((state) => state.inspectorTab)
  const setInspectorTab = usePrettyComStore((state) => state.setInspectorTab)
  const { state: sidebarState } = useSidebar()
  const collapsed = sidebarState === "collapsed"

  return (
    <Sidebar
      side="right"
      collapsible="icon"
      variant="sidebar"
      className="top-12 h-[calc(100svh-3rem)] border-border/50 bg-card"
      data-testid="inspector-panel"
    >
      <SidebarHeader className="h-12 border-b border-border/70 px-3 py-0">
        <div className="flex h-12 items-center gap-2 group-data-[collapsible=icon]:justify-center">
          {!collapsed ? (
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">{t("Tools panel")}</div>
              <div className="truncate text-xs text-muted-foreground">{session.path}</div>
            </div>
          ) : (
            <PanelRight className="size-4 text-muted-foreground" />
          )}
        </div>
      </SidebarHeader>
      {collapsed ? (
        <SidebarContent className="px-1 py-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={inspectorTab === "commands"}
                tooltip={t("Commands")}
                onClick={() => setInspectorTab("commands")}
                data-testid="inspector-tab-commands"
              >
                <Bolt className="size-4" />
                <span>{t("Commands")}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={inspectorTab === "sendlist"}
                tooltip={t("List send")}
                onClick={() => setInspectorTab("sendlist")}
                data-testid="inspector-tab-sendlist"
              >
                <ListOrdered className="size-4" />
                <span>{t("List send")}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
      ) : (
        <SidebarContent className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
          <Tabs value={inspectorTab} onValueChange={setInspectorTab} className="flex min-h-0 flex-1 flex-col">
            <div className="border-b border-border/70 px-3 py-2">
              <TabsList className="grid h-8 w-full grid-cols-2">
                <TabsTrigger value="commands" data-testid="inspector-tab-commands">
                  {t("Commands")}
                </TabsTrigger>
                <TabsTrigger value="sendlist" data-testid="inspector-tab-sendlist">
                  {t("List send")}
                </TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="commands" className="m-0 flex h-full min-h-0 flex-col p-3">
                <CommandsPanel />
              </TabsContent>
              <TabsContent value="sendlist" className="m-0 h-full min-h-0 p-3">
                <SendListPanel session={session} />
              </TabsContent>
          </Tabs>
        </SidebarContent>
      )}
      <SidebarRail label={t("Toggle tools panel")} />
    </Sidebar>
  )
}

function CommandsPanel() {
  const t = useT()
  const setCommandText = usePrettyComStore((state) => state.setCommandText)
  const setSendDisplayMode = usePrettyComStore((state) => state.setSendDisplayMode)
  const setSuffix = usePrettyComStore((state) => state.setSuffix)
  const aliases = usePrettyComStore((state) => state.aliases)
  const addAlias = usePrettyComStore((state) => state.addAlias)
  const updateAlias = usePrettyComStore((state) => state.updateAlias)
  const deleteAlias = usePrettyComStore((state) => state.deleteAlias)
  const replaceAliases = usePrettyComStore((state) => state.replaceAliases)
  const commandHistory = usePrettyComStore((state) => state.commandHistory)
  const deleteCommandHistory = usePrettyComStore((state) => state.deleteCommandHistory)
  const clearCommandHistory = usePrettyComStore((state) => state.clearCommandHistory)
  const recentCommandsCollapsed = usePrettyComStore((state) => state.recentCommandsCollapsed)
  const setRecentCommandsCollapsed = usePrettyComStore((state) => state.setRecentCommandsCollapsed)
  const [editorOpen, setEditorOpen] = useState(false)
  const [dslOpen, setDslOpen] = useState(false)
  const [dslMode, setDslMode] = useState<DslDialogMode>("import")
  const [dslText, setDslText] = useState("")
  const [dslImportError, setDslImportError] = useState("")
  const [editingAlias, setEditingAlias] = useState<Alias | null>(null)
  const [aliasName, setAliasName] = useState("")
  const [aliasCommand, setAliasCommand] = useState("")
  const [aliasMode, setAliasMode] = useState<DisplayMode>("ascii")
  const [aliasSuffix, setAliasSuffix] = useState<LineSuffix>("crlf")

  const openCreateAlias = () => {
    setEditingAlias(null)
    setAliasName("")
    setAliasCommand("")
    setAliasMode("ascii")
    setAliasSuffix("crlf")
    setEditorOpen(true)
  }

  const openEditAlias = (alias: Alias) => {
    setEditingAlias(alias)
    setAliasName(alias.name)
    setAliasCommand(alias.command)
    setAliasMode(alias.mode)
    setAliasSuffix(alias.suffix)
    setEditorOpen(true)
  }

  const saveAlias = () => {
    const name = aliasName.trim()
    const command = aliasCommand.trim()
    if (!name || !command) {
      return
    }
    if (editingAlias) {
      updateAlias(editingAlias.id, { name, command, mode: aliasMode, suffix: aliasSuffix })
    } else {
      addAlias({
        id: crypto.randomUUID(),
        name,
        command,
        mode: aliasMode,
        suffix: aliasSuffix,
      })
    }
    setEditorOpen(false)
  }

  const insertAlias = (alias: Alias) => {
    setCommandText(alias.command)
    setSendDisplayMode(alias.mode)
    setSuffix(alias.suffix)
  }

  const exportAliasDsl = () => {
    setDslMode("export")
    setDslText(serializeAliases(aliases))
    setDslOpen(true)
  }

  const openImportAliasDsl = () => {
    setDslMode("import")
    setDslText("")
    setDslImportError("")
    setDslOpen(true)
  }

  const importAliasDsl = () => {
    const parsed = parseAliasesDsl(dslText)
    if (!parsed.aliases.length) {
      setDslImportError(t("No valid commands found in DSL."))
      return
    }
    setDslImportError("")
    replaceAliases(parsed.aliases)
    setDslOpen(false)
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex min-h-0 flex-[2] flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-medium">{t("Quick commands")}</h3>
          <div className="flex shrink-0 items-center gap-1">
            <Button
              size="icon"
              variant="outline"
              className="size-7"
              onClick={exportAliasDsl}
              title={t("Export DSL")}
              data-testid="alias-dsl-export"
            >
              <Download className="size-3.5" />
            </Button>
            <Button
              size="icon"
              variant="outline"
              className="size-7"
              onClick={openImportAliasDsl}
              title={t("Import DSL")}
              data-testid="alias-dsl-import"
            >
              <Upload className="size-3.5" />
            </Button>
            <Button
              size="icon"
              variant="outline"
              className="size-7 shrink-0"
              onClick={openCreateAlias}
              title={t("Add quick command")}
              aria-label={t("Add quick command")}
              data-testid="add-alias-btn"
            >
              <Plus className="size-3.5" />
            </Button>
          </div>
        </div>
        {aliases.length ? (
          <ScrollArea className="min-h-0 flex-1 rounded-md border border-border/70">
            <div className="min-w-0 divide-y divide-border/50">
              {aliases.map((alias) => (
                <div
                  key={alias.id}
                  className="group grid grid-cols-[minmax(0,5rem)_minmax(0,1fr)_auto] items-center gap-2 px-2 py-1.5 hover:bg-accent/30"
                  data-testid={`alias-item-${alias.id}`}
                >
                  <button
                    type="button"
                    className="truncate text-left text-xs font-medium"
                    title={alias.name}
                    onClick={() => insertAlias(alias)}
                  >
                    {alias.name}
                  </button>
                  <button
                    type="button"
                    className="truncate text-left font-mono text-[11px] text-muted-foreground"
                    title={alias.command}
                    onClick={() => insertAlias(alias)}
                  >
                    {alias.command}
                  </button>
                  <div className="flex shrink-0 items-center gap-0.5 opacity-70 transition-opacity group-hover:opacity-100">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-6"
                      aria-label={t("Insert")}
                      onClick={() => insertAlias(alias)}
                    >
                      <Play className="size-3" />
                    </Button>
                    <Button size="icon" variant="ghost" className="size-6" onClick={() => openEditAlias(alias)}>
                      <Pencil className="size-3" />
                    </Button>
                    <Button size="icon" variant="ghost" className="size-6" onClick={() => deleteAlias(alias.id)}>
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
            {t("No quick commands yet")} {t("Create shortcuts for commands you send often.")}
          </div>
        )}
      </div>
      <Separator />
      <div className={cn("flex min-h-0 flex-col gap-2", !recentCommandsCollapsed && "flex-1")}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="size-7 shrink-0"
              aria-expanded={!recentCommandsCollapsed}
              aria-label={t("Toggle recent commands")}
              data-testid="recent-commands-toggle"
              onClick={() => setRecentCommandsCollapsed(!recentCommandsCollapsed)}
            >
              {recentCommandsCollapsed ? (
                <ChevronRight className="size-4" />
              ) : (
                <ChevronDown className="size-4" />
              )}
            </Button>
            <h3 className="truncate text-sm font-medium">{t("Recent commands")}</h3>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 gap-1.5"
            disabled={!commandHistory.length}
            onClick={clearCommandHistory}
          >
            <Eraser className="size-3.5" />
            {t("Clear")}
          </Button>
        </div>
        {!recentCommandsCollapsed ? (
          commandHistory.length ? (
            <ScrollArea className="min-h-0 flex-1 rounded-md border border-border/70">
              <div className="min-w-0 divide-y divide-border/50">
                {commandHistory.map((entry) => (
                  <div
                    key={entry.id}
                    className="group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-2 py-1.5 hover:bg-accent/30"
                    data-testid={`history-item-${entry.id}`}
                  >
                    <button
                      type="button"
                      className="min-w-0 text-left"
                      onClick={() => {
                        setCommandText(entry.command)
                        setSendDisplayMode(entry.mode)
                        setSuffix(entry.suffix)
                      }}
                    >
                      <div className="truncate font-mono text-[11px]">{entry.command}</div>
                      <div className="truncate text-[11px] text-muted-foreground">
                        {entry.sentAt} · {entry.mode.toUpperCase()} · {t(suffixLabel[entry.suffix])}
                      </div>
                    </button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-6 opacity-70 transition-opacity group-hover:opacity-100"
                      aria-label={t("Delete command history")}
                      onClick={() => deleteCommandHistory(entry.id)}
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
              {t("Sent commands will appear here. You can reuse or remove them at any time.")}
            </div>
          )
        ) : null}
      </div>
      <DslImportExportDialog
        open={dslOpen}
        onOpenChange={setDslOpen}
        mode={dslMode}
        text={dslText}
        onTextChange={(text) => {
          setDslText(text)
          if (dslImportError) {
            setDslImportError("")
          }
        }}
        onImport={importAliasDsl}
        placeholder={`@name:Team Shortcuts\n@listloop:1\n@listinterval:500\n@suffix:crlf\n@mode:ascii\n---\n@label:Reset AT+RST @loop:1 @interval:500\n@label:Version AT+GMR @loop:1 @interval:500`}
        testIdPrefix="alias-dsl"
        defaultFileName="quick-commands.dsl"
        importDescriptionKey="Paste your quick commands DSL here."
        importError={dslImportError || undefined}
      />
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingAlias ? t("Edit quick command") : t("Add quick command")}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <label className="text-sm font-medium">{t("Shortcut name")}</label>
              <Input value={aliasName} onChange={(event) => setAliasName(event.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <label className="text-sm font-medium">{t("Command body")}</label>
              <Textarea value={aliasCommand} onChange={(event) => setAliasCommand(event.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Select value={aliasMode} onValueChange={(value) => setAliasMode(value as DisplayMode)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ascii">ASCII</SelectItem>
                  <SelectItem value="hex">HEX</SelectItem>
                </SelectContent>
              </Select>
              <Select value={aliasSuffix} onValueChange={(value) => setAliasSuffix(value as LineSuffix)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(suffixLabel).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {t(label)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditorOpen(false)}>
              {t("Cancel")}
            </Button>
            <Button onClick={saveAlias} data-testid="alias-save-btn">
              {t("Save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function SettingsSheet({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const t = useT()
  const language = usePrettyComStore((state) => state.language)
  const setLanguage = usePrettyComStore((state) => state.setLanguage)
  const maxLogEntriesPerSession = usePrettyComStore((state) => state.maxLogEntriesPerSession)
  const setMaxLogEntriesPerSession = usePrettyComStore((state) => state.setMaxLogEntriesPerSession)
  const suffix = usePrettyComStore((state) => state.suffix)
  const setSuffix = usePrettyComStore((state) => state.setSuffix)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[460px] sm:max-w-[460px]" data-testid="settings-sheet">
        <SheetHeader>
          <SheetTitle>{t("Settings")}</SheetTitle>
          <SheetDescription>{t("Workspace preferences and serial defaults.")}</SheetDescription>
        </SheetHeader>
        <div className="mt-6 overflow-hidden rounded-lg border border-border">
          <div className="grid grid-cols-[1fr_1fr] items-center gap-4 border-b border-border px-4 py-3">
            <div>
              <div className="text-sm font-medium">{t("Language")}</div>
              <div className="text-xs text-muted-foreground">{t("Interface language")}</div>
            </div>
            <Select value={language} onValueChange={(value) => setLanguage(value as Language)}>
              <SelectTrigger data-testid="language-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="zh-CN">简体中文</SelectItem>
                <SelectItem value="en-US">English</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-[1fr_1fr] items-start gap-4 border-b border-border px-4 py-3">
            <div>
              <div className="text-sm font-medium">{t("Log retention limit")}</div>
              <div className="text-xs text-muted-foreground">{t("Max log entries per session")}</div>
            </div>
            <div className="space-y-2">
              <Input
                type="number"
                min={500}
                max={100000}
                step={100}
                value={maxLogEntriesPerSession}
                data-testid="log-retention-limit"
                onChange={(event) => {
                  const next = Number(event.target.value)
                  if (Number.isFinite(next)) {
                    setMaxLogEntriesPerSession(next)
                  }
                }}
              />
              <p className="text-xs text-muted-foreground">
                {t(
                  "Oldest log entries are dropped when the limit is exceeded. Saved to local storage with sessions and highlight rules."
                )}
              </p>
            </div>
          </div>
          <ThemeAppearanceSection />
          <div className="grid grid-cols-[1fr_1fr] items-center gap-4 px-4 py-3">
            <div>
              <div className="text-sm font-medium">{t("Default suffix")}</div>
              <div className="text-xs text-muted-foreground">{t("Applied when sending ASCII commands.")}</div>
            </div>
            <Select value={suffix} onValueChange={(value) => setSuffix(value as LineSuffix)}>
              <SelectTrigger data-testid="default-suffix-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(suffixLabel).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {t(label)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function StatusDot({ status }: { status: SessionProfile["status"] }) {
  return (
    <span
      className={cn(
        "size-2 rounded-full",
        status === "connected" && "bg-success shadow-[0_0_12px_var(--success)]",
        status === "disconnected" && "bg-muted-foreground/40",
        status === "error" && "bg-destructive"
      )}
    />
  )
}

export default App
