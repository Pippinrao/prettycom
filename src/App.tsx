import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { EditorView, keymap } from "@codemirror/view"
import CodeMirror from "@uiw/react-codemirror"
import { useVirtualizer } from "@tanstack/react-virtual"
import { save } from "@tauri-apps/plugin-dialog"
import { writeTextFile } from "@tauri-apps/plugin-fs"
import {
  Activity,
  Bolt,
  Braces,
  Cable,
  CircleAlert,
  CircleOff,
  Command as CommandIcon,
  Crosshair,
  Download,
  Eraser,
  Filter,
  Gauge,
  Layers3,
  PanelRight,
  Pencil,
  Play,
  PlugZap,
  Plus,
  RadioTower,
  RefreshCcw,
  Search,
  Send,
  Settings,
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
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
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
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
  macros,
  parseHexString,
  parseSendListDsl,
  serializeSendList,
} from "@/data/serial-defaults"
import { DEFAULT_TEST_PORT_A } from "@/data/test-ports"
import { useT } from "@/hooks/use-t"
import {
  closePort,
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
  Theme,
} from "@/types/serial"
import { applyTheme } from "@/lib/theme"

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

function App() {
  const commandOpen = usePrettyComStore((state) => state.commandOpen)
  const setCommandOpen = usePrettyComStore((state) => state.setCommandOpen)
  const sidebarOpen = usePrettyComStore((state) => state.sidebarOpen)
  const setSidebarOpen = usePrettyComStore((state) => state.setSidebarOpen)
  const theme = usePrettyComStore((state) => state.theme)
  const [openPortDialogOpen, setOpenPortDialogOpen] = useState(false)

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  useEffect(() => setupSerialEventBridge(), [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setCommandOpen(!commandOpen)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [commandOpen, setCommandOpen])

  return (
    <TooltipProvider>
      <SidebarProvider open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
          <AppSidebar onOpenPort={() => setOpenPortDialogOpen(true)} />
          <SidebarInset className="min-w-0 flex-1">
            <Workbench onOpenPort={() => setOpenPortDialogOpen(true)} />
          </SidebarInset>
        </div>
        <OpenPortDialog open={openPortDialogOpen} onOpenChange={setOpenPortDialogOpen} />
        <GlobalCommand onOpenPort={() => setOpenPortDialogOpen(true)} />
      </SidebarProvider>
    </TooltipProvider>
  )
}

function AppSidebar({ onOpenPort }: { onOpenPort: () => void }) {
  const t = useT()
  const sessions = usePrettyComStore((state) => state.sessions)
  const currentSessionId = usePrettyComStore((state) => state.currentSessionId)
  const setCurrentSession = usePrettyComStore((state) => state.setCurrentSession)
  const removeSession = usePrettyComStore((state) => state.removeSession)
  const setSettingsOpen = usePrettyComStore((state) => state.setSettingsOpen)
  const currentSession = sessions.find((session) => session.id === currentSessionId)

  const handleExport = async () => {
    if (!currentSession?.logs.length) {
      return
    }
    try {
      const path = await save({
        defaultPath: `${currentSession.name}-log.csv`,
        filters: [{ name: "CSV", extensions: ["csv"] }],
      })
      if (!path) {
        return
      }
      await writeTextFile(path, formatLogsForCsv(currentSession.logs))
    } catch {
      window.alert(t("Export failed"))
    }
  }

  return (
    <Sidebar variant="sidebar" collapsible="icon" className="border-r border-border/70">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Cable className="size-4" />
          </div>
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
                <SidebarMenuItem key={session.id}>
                  <SidebarMenuButton
                    isActive={session.id === currentSessionId}
                    tooltip={`${session.name} · ${session.path}`}
                    onClick={() => setCurrentSession(session.id)}
                    data-testid={`session-item-${session.id}`}
                  >
                    <StatusDot status={session.status} />
                    <span>{session.name}</span>
                  </SidebarMenuButton>
                  <SidebarMenuBadge className="gap-1">
                    {session.unread > 0 && (
                      <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                        {session.unread}
                      </Badge>
                    )}
                    {session.path}
                  </SidebarMenuBadge>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarSeparator />
        <SidebarGroup>
          <SidebarGroupLabel>{t("Tools")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip={t("Open port")} onClick={onOpenPort}>
                  <PlugZap className="size-4" />
                  <span>{t("Open Port")}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip={t("Log export")} onClick={() => void handleExport()}>
                  <Download className="size-4" />
                  <span>{t("Export Logs")}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
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
        {sessions.length > 1 && currentSession ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" className="mx-2 mb-1 justify-start gap-2 group-data-[collapsible=icon]:hidden">
                <Trash2 className="size-4" />
                {t("Remove session")}
              </Button>
            </AlertDialogTrigger>
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
                    void closePort(currentSession.id)
                    removeSession(currentSession.id)
                  }}
                >
                  {t("Remove")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : null}
        <Button
          variant="ghost"
          className="mx-2 justify-start gap-2 group-data-[collapsible=icon]:justify-center"
          onClick={() => setSettingsOpen(true)}
          data-testid="settings-open"
        >
          <Settings className="size-4" />
          <span className="group-data-[collapsible=icon]:hidden">{t("Settings")}</span>
        </Button>
      </SidebarFooter>
      <SidebarRail label={t("Toggle Sidebar")} />
    </Sidebar>
  )
}

function Workbench({ onOpenPort }: { onOpenPort: () => void }) {
  const sessions = usePrettyComStore((state) => state.sessions)
  const currentSessionId = usePrettyComStore((state) => state.currentSessionId)
  const settingsOpen = usePrettyComStore((state) => state.settingsOpen)
  const setSettingsOpen = usePrettyComStore((state) => state.setSettingsOpen)
  const currentSession = sessions.find((session) => session.id === currentSessionId) ?? sessions[0]

  if (!currentSession) {
    return null
  }

  return (
    <main className="flex h-screen min-w-0 flex-col">
      <TopBar session={currentSession} onOpenPort={onOpenPort} />
      <ResizablePanelGroup orientation="horizontal" className="min-h-0 flex-1">
        <ResizablePanel defaultSize={66} minSize={45} className="min-w-[620px]">
          <div className="flex h-full min-h-0 flex-col">
            <LogToolbar session={currentSession} />
            <LogStream session={currentSession} />
            <CommandComposer session={currentSession} />
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={34} minSize={26} className="min-w-[360px]">
          <Inspector session={currentSession} />
        </ResizablePanel>
      </ResizablePanelGroup>
      <SettingsSheet open={settingsOpen} onOpenChange={setSettingsOpen} />
    </main>
  )
}

function TopBar({ session, onOpenPort }: { session: SessionProfile; onOpenPort: () => void }) {
  const t = useT()
  const setCommandOpen = usePrettyComStore((state) => state.setCommandOpen)
  const setSessionStatus = usePrettyComStore((state) => state.setSessionStatus)
  const appendLog = usePrettyComStore((state) => state.appendLog)
  const [busy, setBusy] = useState(false)

  const refreshPorts = async () => {
    try {
      await listPorts()
    } catch {
      /* ignore in browser dev */
    }
  }

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
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border/70 px-4">
      <div className="flex min-w-0 items-center gap-3">
        <SidebarTrigger label={t("Toggle Sidebar")} />
        <Separator orientation="vertical" className="h-5" />
        <Button
          variant={session.status === "connected" ? "outline" : "default"}
          size="sm"
          className={cn(
            "h-9 gap-2 rounded-md px-3 font-semibold",
            session.status === "connected" && "border-success/40 bg-success/10 text-success hover:bg-success/15",
            session.status === "error" && "border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/15"
          )}
          disabled={busy}
          onClick={() => void toggleConnection()}
          data-testid="session-connect-toggle"
        >
          {session.status === "connected" ? <Unplug className="size-4" /> : <PlugZap className="size-4" />}
          <span>{session.status === "connected" ? t("Disconnect port") : t("Connect port")}</span>
          <span className="rounded border border-current/20 px-1.5 py-0.5 font-mono text-[11px] font-medium">
            {session.path}
          </span>
        </Button>
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">{session.name}</div>
          <div className="truncate text-xs text-muted-foreground">{formatConfigLabel(session.config)}</div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" aria-label={t("Refresh ports")} onClick={() => void refreshPorts()}>
              <RefreshCcw className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t("Refresh ports")}</TooltipContent>
        </Tooltip>
        <Button size="sm" className="h-9 gap-2 font-semibold" onClick={onOpenPort} data-testid="open-port-btn">
          <PlugZap className="size-4" />
          {t("Open Port")}
        </Button>
        <Button variant="outline" className="h-8 gap-2" onClick={() => setCommandOpen(true)}>
          <CommandIcon className="size-3.5" />
          {t("Command")}
          <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
            Ctrl K
          </kbd>
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
  const [name, setName] = useState("STM32")
  const [path, setPath] = useState(DEFAULT_TEST_PORT_A)
  const [config, setConfig] = useState<SerialConfig>({ ...DEFAULT_SERIAL_CONFIG })

  const refreshPorts = useCallback(async () => {
    setLoading(true)
    try {
      const result = await listPorts()
      setPorts(result)
      if (result.length && !result.some((port) => port.name === path)) {
        setPath(result[0].name)
      }
    } catch {
      setPorts([])
    } finally {
      setLoading(false)
    }
  }, [path])

  useEffect(() => {
    if (open) {
      void refreshPorts()
    }
  }, [open, refreshPorts])

  const handleConnect = async () => {
    if (!path || busy) {
      return
    }
    setBusy(true)
    const session = createSessionProfile(path, name.trim() || path, config)
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
            <Input className="w-full min-w-0" value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <div className="grid min-w-0 gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <label className="text-sm font-medium">{t("Select port")}</label>
              <Button variant="ghost" size="sm" className="h-7 shrink-0 gap-1" onClick={() => void refreshPorts()}>
                <RefreshCcw className="size-3.5" />
                {t("Refresh ports")}
              </Button>
            </div>
            {loading ? (
              <Skeleton className="h-9 rounded-md" />
            ) : ports.length ? (
              <Select value={path} onValueChange={setPath}>
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

function LogToolbar({ session }: { session: SessionProfile }) {
  const t = useT()
  const displayMode = usePrettyComStore((state) => state.displayMode)
  const setDisplayMode = usePrettyComStore((state) => state.setDisplayMode)
  const clearLogs = usePrettyComStore((state) => state.clearLogs)
  const setSessionLogs = usePrettyComStore((state) => state.setSessionLogs)
  const autoScroll = usePrettyComStore((state) => state.autoScroll)
  const setAutoScroll = usePrettyComStore((state) => state.setAutoScroll)

  const loadDevSample = async () => {
    const { createDevLogEntries } = await import("@/data/dev-samples")
    setSessionLogs(session.id, createDevLogEntries())
  }

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
    <div className="flex h-12 shrink-0 items-center justify-between border-b border-border/70 px-3">
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="gap-1.5 rounded-md">
          <Activity className="size-3.5" />
          {session.status === "connected" ? t("Live") : t("Idle")}
        </Badge>
      </div>
      <div className="flex items-center gap-2">
        {import.meta.env.DEV ? (
          <Button variant="outline" size="sm" className="gap-2" onClick={loadDevSample} data-testid="dev-sample-btn">
            <RefreshCcw className="size-3.5" />
            {t("Dev sample")}
          </Button>
        ) : null}
        <Select value={displayMode} onValueChange={(value) => setDisplayMode(value as DisplayMode)}>
          <SelectTrigger className="h-8 w-[116px]" data-testid="log-display-mode">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ascii">ASCII</SelectItem>
            <SelectItem value="hex">HEX</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="ghost" size="sm" className="gap-2" onClick={() => void handleExport()} disabled={!session.logs.length}>
          <Download className="size-3.5" />
          {t("Export Logs")}
        </Button>
        <Button
          variant={autoScroll ? "secondary" : "ghost"}
          size="sm"
          className={cn("gap-2", autoScroll && "text-primary")}
          data-testid="auto-scroll-toggle"
          aria-pressed={autoScroll}
          onClick={() => setAutoScroll(!autoScroll)}
        >
          <Timer className="size-3.5" />
          {t("Auto-scroll")}
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2" disabled={!session.logs.length} data-testid="clear-logs-btn">
              <Eraser className="size-3.5" />
              {t("Clear")}
            </Button>
          </AlertDialogTrigger>
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
      </div>
    </div>
  )
}

function LogStream({ session }: { session: SessionProfile }) {
  const t = useT()
  const parentRef = useRef<HTMLDivElement>(null)
  const getFilteredLogs = usePrettyComStore((state) => state.getFilteredLogs)
  const selectedLogId = usePrettyComStore((state) => state.selectedLogId)
  const setSelectedLog = usePrettyComStore((state) => state.setSelectedLog)
  const deleteLogEntry = usePrettyComStore((state) => state.deleteLogEntry)
  const displayMode = usePrettyComStore((state) => state.displayMode)
  const filter = usePrettyComStore((state) => state.filter)
  const autoScroll = usePrettyComStore((state) => state.autoScroll)
  const pendingScrollLogId = usePrettyComStore((state) => state.pendingScrollLogId)
  const setPendingScrollLogId = usePrettyComStore((state) => state.setPendingScrollLogId)
  const logs = useMemo(() => getFilteredLogs(session.id), [getFilteredLogs, session.id, session.logs, filter])
  const highlightRules = useMemo(() => getActiveHighlightRules(filter), [filter])

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
  }, [autoScroll, logs.length, logs.at(-1)?.id])

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

  return (
    <div className="min-h-0 flex-1 bg-background">
      {!logs.length ? (
        <div className="flex h-full items-center justify-center p-8">
          <div className="max-w-sm text-center">
            <div className="mx-auto flex size-10 items-center justify-center rounded-lg border border-border bg-card">
              <RadioTower className="size-5 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-sm font-medium">{t("No serial history")}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("Open a port or send a command to start collecting RX/TX records. Development sample data is available only while running the dev server.")}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex h-full min-h-0 flex-col">
          <LogTableHeader visibleCount={logs.length} totalCount={session.logs.length} />
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
                    displayMode={displayMode}
                    highlightRules={highlightRules}
                    zebra={virtualRow.index % 2 === 0}
                    selected={entry.id === selectedLogId}
                    onSelect={() => setSelectedLog(entry.id)}
                    onDelete={() => deleteLogEntry(session.id, entry.id)}
                    top={virtualRow.start}
                  />
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function LogTableHeader({ visibleCount, totalCount }: { visibleCount: number; totalCount: number }) {
  const t = useT()
  const filter = usePrettyComStore((state) => state.filter)
  const setFilter = usePrettyComStore((state) => state.setFilter)
  const activeRuleCount = filter.highlightRules.filter((rule) => rule.enabled && rule.pattern.trim()).length
  const filterActive = Boolean(filter.search || filter.direction !== "all")

  return (
    <div className="shrink-0 border-b border-border/70 bg-muted/45">
      <div className="flex h-11 items-center justify-between gap-2 px-4">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="relative min-w-[220px] max-w-[360px] flex-1">
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
              <Button variant="outline" size="sm" className="h-8 gap-2" data-testid="log-filter-direction">
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
        </div>
        <Badge variant={filterActive ? "default" : "outline"} className="shrink-0" data-testid="log-filter-count">
          {visibleCount}/{totalCount}
        </Badge>
        {activeRuleCount ? (
          <Badge variant="secondary" className="shrink-0 gap-1">
            <Bolt className="size-3" />
            {activeRuleCount}
          </Badge>
        ) : null}
      </div>
      <div className="grid h-8 grid-cols-[108px_54px_1fr_72px_64px_32px] items-center border-l-2 border-l-transparent px-4 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        <span>{t("Time")}</span>
        <span>{t("Dir")}</span>
        <span>{t("Payload")}</span>
        <span>{t("Bytes")}</span>
        <span className="text-right">{t("Gap")}</span>
        <span />
      </div>
    </div>
  )
}

function HighlightRulesDialog() {
  const t = useT()
  const filter = usePrettyComStore((state) => state.filter)
  const setFilter = usePrettyComStore((state) => state.setFilter)
  const selectedLogId = usePrettyComStore((state) => state.selectedLogId)
  const displayMode = usePrettyComStore((state) => state.displayMode)
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
    return entry ? formatLogPayload(entry, displayMode) : ""
  }, [displayMode, getCurrentSession, getFilteredLogs, open, selectedLogId])

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
    const logId = findFirstMatchingLogId(logs, rule, displayMode)
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
  displayMode,
  highlightRules,
  zebra,
  selected,
  onSelect,
  onDelete,
  top,
}: {
  entry: LogEntry
  displayMode: DisplayMode
  highlightRules: HighlightRule[]
  zebra: boolean
  selected: boolean
  onSelect: () => void
  onDelete: () => void
  top: number
}) {
  const t = useT()
  const payload = formatLogPayload(entry, displayMode)
  return (
    <div
      data-log-row="true"
      data-testid={`log-row-${entry.id}`}
      className={cn(
        "group absolute left-0 grid h-[34px] w-full grid-cols-[108px_54px_1fr_72px_64px_32px] items-center border-b border-border/35 px-4 text-left transition-colors hover:bg-accent/50",
        zebra && "bg-muted/20",
        entry.direction === "RX" && "border-l-2 border-l-sky-500/50",
        entry.direction === "TX" && "border-l-2 border-l-emerald-500/50",
        entry.direction === "SYS" && "border-l-2 border-l-amber-500/40",
        selected && "bg-primary/10 ring-1 ring-inset ring-primary/25"
      )}
      style={{ transform: `translateY(${top}px)` }}
    >
      <button type="button" className="contents text-left" onClick={onSelect}>
        <span className="text-muted-foreground">{entry.time}</span>
        <Badge
          variant={entry.direction === "RX" ? "secondary" : entry.direction === "TX" ? "outline" : "default"}
          className={cn(
            "h-5 w-fit rounded-md px-1.5 text-[10px] font-semibold",
            entry.direction === "RX" && "bg-sky-500/15 text-sky-300",
            entry.direction === "TX" && "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
            entry.direction === "SYS" && "bg-muted text-muted-foreground"
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
      <Button
        variant="ghost"
        size="icon"
        className="size-7 opacity-0 transition-opacity group-hover:opacity-100"
        aria-label={t("Delete log entry")}
        onClick={onDelete}
      >
        <Trash2 className="size-3.5" />
      </Button>
    </div>
  )
});

function CommandComposer({ session }: { session: SessionProfile }) {
  const t = useT()
  const commandText = usePrettyComStore((state) => state.commandText)
  const setCommandText = usePrettyComStore((state) => state.setCommandText)
  const suffix = usePrettyComStore((state) => state.suffix)
  const setSuffix = usePrettyComStore((state) => state.setSuffix)
  const displayMode = usePrettyComStore((state) => state.displayMode)
  const setDisplayMode = usePrettyComStore((state) => state.setDisplayMode)
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
        if (displayMode === "hex") {
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
          mode: displayMode,
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
      displayMode,
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
    <div className="shrink-0 border-t border-border/70 bg-card/70 px-3 py-2">
      <div className="flex flex-col gap-2">
        <div className="overflow-hidden rounded-lg border border-border bg-background" data-testid="command-input">
          <CodeMirror
            value={commandText}
            height="auto"
            minHeight="40px"
            maxHeight="96px"
            theme={theme === "dark" ? "dark" : "light"}
            basicSetup={{ lineNumbers: false, foldGutter: false }}
            extensions={editorExtensions}
            onChange={setCommandText}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Select value={suffix} onValueChange={(value) => setSuffix(value as LineSuffix)} disabled={displayMode === "hex"}>
              <SelectTrigger className="h-8 w-[7rem]" data-testid="suffix-select">
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
            <Select value={displayMode} onValueChange={(value) => setDisplayMode(value as DisplayMode)}>
              <SelectTrigger className="h-8 w-[5.5rem]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ascii">ASCII</SelectItem>
                <SelectItem value="hex">HEX</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            className="ml-auto h-8 gap-2"
            disabled={!commandText.trim() || !connected || sending}
            onClick={sendCommand}
            data-testid="send-command"
          >
            <Send className="size-4" />
            {connected ? t("Send command") : t("Not connected")}
          </Button>
        </div>
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
  const [dslText, setDslText] = useState("")
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const sendingRef = useRef(false)
  const loopRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [sendProgress, setSendProgress] = useState<{ cmdIndex: number; loopIndex: number } | null>(null)

  const list = sendLists.find((l) => l.id === selectedId) ?? null

  const running = sendListRunningId === selectedId && selectedId !== null

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
      commands: [{ id: crypto.randomUUID(), command: "", loopCount: 1, intervalMs: 500 }],
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

  const addCmd = () => {
    if (!list) return
    updateList({ commands: [...list.commands, { id: crypto.randomUUID(), command: "", loopCount: 1, intervalMs: 500 }] })
  }

  const updateCmd = (cmdId: string, patch: Partial<SendListCommand>) => {
    if (!list) return
    updateList({
      commands: list.commands.map((c) => (c.id === cmdId ? { ...c, ...patch } : c)),
    })
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
      const suffix = list.suffix
      const mode = list.mode
      const now = Date.now()
      let bytes: Uint8Array
      let ascii: string
      if (mode === "hex") {
        bytes = parseHexString(cmd.command)
        ascii = cmd.command
      } else {
        const payload = applySuffix(cmd.command, suffix)
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
    setDslText(serializeSendList(list))
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

  if (!list) {
    return (
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
        <Button size="sm" variant="ghost" className="gap-1" onClick={() => { setDslText(""); setDslOpen(true) }}>
          <Download className="size-3.5" />
          {t("Import DSL")}
        </Button>
      </div>
    )
  }

  const progressText =
    sendProgress
      ? `#${sendProgress.cmdIndex + 1}/${list.commands.filter((c) => c.command.trim()).length} · ×${sendProgress.loopIndex + 1}`
      : null

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center gap-2">
        <Select value={selectedId ?? ""} onValueChange={setSelectedId}>
          <SelectTrigger className="h-8 flex-1 text-xs">
            <SelectValue placeholder={t("Select a list")} />
          </SelectTrigger>
          <SelectContent>
            {sendLists.map((sl) => (
              <SelectItem key={sl.id} value={sl.id}>
                {sl.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="icon" variant="outline" className="size-8 shrink-0" onClick={createList} title={t("New list")}>
          <Plus className="size-3.5" />
        </Button>
        <Button size="icon" variant="outline" className="size-8 shrink-0" onClick={exportDsl} title={t("Export DSL")}>
          <Download className="size-3.5" />
        </Button>
        <Button size="icon" variant="outline" className="size-8 shrink-0" onClick={() => { setDslText(""); setDslOpen(true) }} title={t("Import DSL")}>
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
          <span className="text-[11px] font-medium text-muted-foreground">{t("Commands")}</span>
          <Button size="sm" variant="ghost" className="h-6 gap-1 text-xs" onClick={addCmd} disabled={running}>
            <Plus className="size-3" />
            {t("Add command")}
          </Button>
        </div>
        <ScrollArea className="min-h-0 flex-1 rounded-md border border-border/70">
          {list.commands.length ? (
            <div className="divide-y divide-border/50">
              {list.commands.map((cmd) => (
                <div key={cmd.id} className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-1 px-2 py-1">
                  <Input
                    className="h-7 min-w-0 border-0 bg-transparent px-1 text-xs font-mono shadow-none focus-visible:ring-0"
                    value={cmd.command}
                    onChange={(e) => updateCmd(cmd.id, { command: e.target.value })}
                    placeholder="AT+RST"
                    disabled={running}
                  />
                  <div className="flex items-center gap-0.5">
                    <Input
                      type="number"
                      min={0}
                      className="h-7 w-9 border-0 bg-transparent px-0 text-center text-[10px] tabular-nums shadow-none focus-visible:ring-0"
                      value={cmd.loopCount}
                      onChange={(e) => updateCmd(cmd.id, { loopCount: Math.max(0, Number(e.target.value) || 0) })}
                      title={t("Loop count")}
                      disabled={running}
                    />
                    <span className="text-[10px] text-muted-foreground">×</span>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <Input
                      type="number"
                      min={10}
                      step={10}
                      className="h-7 w-12 border-0 bg-transparent px-0 text-center text-[10px] tabular-nums shadow-none focus-visible:ring-0"
                      value={cmd.intervalMs}
                      onChange={(e) => updateCmd(cmd.id, { intervalMs: Math.max(10, Number(e.target.value) || 10) })}
                      title={t("Interval")}
                      disabled={running}
                    />
                    <span className="text-[10px] text-muted-foreground">ms</span>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-6 shrink-0"
                    onClick={() => deleteCmd(cmd.id)}
                    disabled={running}
                  >
                    <Trash2 className="size-3" />
                  </Button>
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
        <Select value={list.suffix} onValueChange={(v) => updateList({ suffix: v as LineSuffix })} disabled={running}>
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
        <Select value={list.mode} onValueChange={(v) => updateList({ mode: v as DisplayMode })} disabled={running}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ascii">ASCII</SelectItem>
            <SelectItem value="hex">HEX</SelectItem>
          </SelectContent>
        </Select>
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

      <Dialog open={dslOpen} onOpenChange={setDslOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("Send list DSL")}</DialogTitle>
            <DialogDescription>{t("Paste your send list DSL here.")}</DialogDescription>
          </DialogHeader>
          <Textarea
            className="min-h-[200px] font-mono text-xs"
            value={dslText}
            onChange={(e) => setDslText(e.target.value)}
            placeholder={`@name:My List\n@loop:3\n@interval:500\n@suffix:crlf\n@mode:ascii\n---\nAT+RST\nAT+GMR`}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDslOpen(false)}>
              {t("Cancel")}
            </Button>
            <Button onClick={importDsl}>{t("Import")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Inspector({ session }: { session: SessionProfile }) {
  const t = useT()
  const inspectorTab = usePrettyComStore((state) => state.inspectorTab)
  const setInspectorTab = usePrettyComStore((state) => state.setInspectorTab)

  return (
    <aside className="flex h-full min-h-0 flex-col border-l border-border/50 bg-card/45">
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-border/70 px-4">
        <div>
          <div className="text-sm font-medium">{t("Inspector")}</div>
          <div className="text-xs text-muted-foreground">
            {t("Selected frame")} · {session.path}
          </div>
        </div>
        <Button variant="ghost" size="icon" aria-label={t("Pin inspector")}>
          <PanelRight className="size-4" />
        </Button>
      </div>
      <Tabs value={inspectorTab} onValueChange={setInspectorTab} className="flex min-h-0 flex-1 flex-col">
        <div className="border-b border-border/70 px-3 py-2">
          <TabsList className="grid h-8 w-full grid-cols-3">
            <TabsTrigger value="commands" data-testid="inspector-tab-commands">{t("Commands")}</TabsTrigger>
            <TabsTrigger value="sendlist" data-testid="inspector-tab-sendlist">{t("Send List")}</TabsTrigger>
            <TabsTrigger value="port" data-testid="inspector-tab-port">{t("Port")}</TabsTrigger>
          </TabsList>
        </div>
        <ScrollArea className="min-h-0 flex-1">
          <TabsContent value="commands" className="m-0 space-y-3 p-3">
            <CommandsPanel />
          </TabsContent>
          <TabsContent value="sendlist" className="m-0 h-full p-3">
            <SendListPanel session={session} />
          </TabsContent>
          <TabsContent value="port" className="m-0 space-y-3 p-3">
            <PortDetails session={session} />
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </aside>
  )
}

function CommandsPanel() {
  const t = useT()
  const setCommandText = usePrettyComStore((state) => state.setCommandText)
  const setDisplayMode = usePrettyComStore((state) => state.setDisplayMode)
  const setSuffix = usePrettyComStore((state) => state.setSuffix)
  const aliases = usePrettyComStore((state) => state.aliases)
  const addAlias = usePrettyComStore((state) => state.addAlias)
  const updateAlias = usePrettyComStore((state) => state.updateAlias)
  const deleteAlias = usePrettyComStore((state) => state.deleteAlias)
  const commandHistory = usePrettyComStore((state) => state.commandHistory)
  const deleteCommandHistory = usePrettyComStore((state) => state.deleteCommandHistory)
  const clearCommandHistory = usePrettyComStore((state) => state.clearCommandHistory)
  const [editorOpen, setEditorOpen] = useState(false)
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
    setDisplayMode(alias.mode)
    setSuffix(alias.suffix)
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-medium">{t("Quick commands")}</h3>
          <Button size="sm" variant="outline" className="h-7 shrink-0 gap-1" onClick={openCreateAlias} data-testid="add-alias-btn">
            <Plus className="size-3.5" />
            {t("Add quick command")}
          </Button>
        </div>
        {aliases.length ? (
          <ScrollArea className="h-[min(220px,40vh)] rounded-md border border-border/70">
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
                    <Button size="icon" variant="ghost" className="size-6" onClick={() => insertAlias(alias)}>
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
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">{t("Built-in macros")}</h3>
          <Badge variant="secondary">{macros.length}</Badge>
        </div>
        <div className="min-w-0 divide-y divide-border/50 rounded-md border border-border/70">
          {macros.map((macro) => (
            <div
              key={macro.id}
              className="grid grid-cols-[minmax(0,5rem)_minmax(0,1fr)_auto] items-center gap-2 px-2 py-1.5 hover:bg-accent/30"
              data-testid={`macro-item-${macro.id}`}
            >
              <button
                type="button"
                className="truncate text-left text-xs font-medium"
                title={t(macro.name)}
                onClick={() => setCommandText(macro.body)}
              >
                {t(macro.name)}
              </button>
              <button
                type="button"
                className="truncate text-left font-mono text-[11px] text-muted-foreground"
                title={macro.body}
                onClick={() => setCommandText(macro.body)}
              >
                {macro.body}
              </button>
              <Button size="sm" variant="outline" className="h-6 px-2 text-xs" onClick={() => setCommandText(macro.body)}>
                {t("Insert")}
              </Button>
            </div>
          ))}
        </div>
      </div>
      <Separator />
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">{t("Recent commands")}</h3>
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
        {commandHistory.length ? (
          <ScrollArea className="h-[min(220px,40vh)] rounded-md border border-border/70">
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
                      setDisplayMode(entry.mode)
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
        )}
      </div>
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

function PortDetails({ session }: { session: SessionProfile }) {
  const t = useT()
  const flowLabel =
    session.config.flowControl === "none"
      ? t("None")
      : session.config.flowControl === "hardware"
        ? t("Hardware")
        : t("Software")
  const parityLabel =
    session.config.parity === "none" ? t("None") : session.config.parity === "odd" ? t("Odd") : t("Even")

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t("Port profile")}</CardTitle>
          <CardDescription>
            {session.path} {t("connection parameters")}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2">
          <Detail label={t("Baud rate")} value={`${session.config.baudRate}`} icon={Gauge} />
          <Detail label={t("Data bits")} value={`${session.config.dataBits}`} icon={Layers3} />
          <Detail label={t("Parity")} value={parityLabel} icon={CircleOff} />
          <Detail label={t("Stop bits")} value={`${session.config.stopBits}`} icon={Unplug} />
          <Detail label={t("Flow control")} value={flowLabel} icon={Bolt} />
          <Detail
            label={t("Type")}
            value={session.status === "connected" ? t("Connected") : session.status === "error" ? t("Error") : t("Disconnected")}
            icon={PlugZap}
          />
        </CardContent>
      </Card>
      <Skeleton className="h-24 rounded-lg" />
    </div>
  )
}

function GlobalCommand({ onOpenPort }: { onOpenPort: () => void }) {
  const t = useT()
  const commandOpen = usePrettyComStore((state) => state.commandOpen)
  const setCommandOpen = usePrettyComStore((state) => state.setCommandOpen)
  const setSettingsOpen = usePrettyComStore((state) => state.setSettingsOpen)
  const setDisplayMode = usePrettyComStore((state) => state.setDisplayMode)
  const setCommandText = usePrettyComStore((state) => state.setCommandText)
  const currentSession = usePrettyComStore((state) => state.getCurrentSession())

  const handleExport = async () => {
    if (!currentSession?.logs.length) {
      setCommandOpen(false)
      return
    }
    try {
      const path = await save({
        defaultPath: `${currentSession.name}-log.csv`,
        filters: [{ name: "CSV", extensions: ["csv"] }],
      })
      if (path) {
        await writeTextFile(path, formatLogsForCsv(currentSession.logs))
      }
    } catch {
      window.alert(t("Export failed"))
    }
    setCommandOpen(false)
  }

  return (
    <CommandDialog
      open={commandOpen}
      onOpenChange={setCommandOpen}
      title={t("PrettyCOM command palette")}
      description={t("Run serial actions")}
      className="max-w-2xl"
      data-testid="command-palette"
    >
      <Command>
        <CommandInput placeholder={t("Open port, run macro, switch view...")} />
        <CommandList>
          <CommandEmpty>{t("No command found.")}</CommandEmpty>
          <CommandGroup heading={t("Serial")}>
            <CommandItem
              onSelect={() => {
                setCommandOpen(false)
                onOpenPort()
              }}
            >
              <PlugZap className="size-4" />
              {t("Open COM port")}
              <CommandShortcut>Enter</CommandShortcut>
            </CommandItem>
            <CommandItem
              onSelect={() => {
                void listPorts()
                setCommandOpen(false)
              }}
            >
              <RadioTower className="size-4" />
              {t("Rescan ports")}
            </CommandItem>
            <CommandItem onSelect={() => setDisplayMode("hex")}>
              <Braces className="size-4" />
              {t("Switch log to HEX")}
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading={t("Macros")}>
            {macros.map((macro) => (
              <CommandItem
                key={macro.id}
                onSelect={() => {
                  setCommandText(macro.body)
                  setCommandOpen(false)
                }}
              >
                <Play className="size-4" />
                {t("Insert")} {t(macro.name)}
                <CommandShortcut>{macro.shortcut}</CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading={t("Workspace")}>
            <CommandItem
              onSelect={() => {
                setCommandOpen(false)
                setSettingsOpen(true)
              }}
            >
              <Settings className="size-4" />
              {t("Open settings")}
            </CommandItem>
            <CommandItem onSelect={() => void handleExport()}>
              <Download className="size-4" />
              {t("Export current log")}
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
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
  const theme = usePrettyComStore((state) => state.theme)
  const setTheme = usePrettyComStore((state) => state.setTheme)
  const suffix = usePrettyComStore((state) => state.suffix)
  const setSuffix = usePrettyComStore((state) => state.setSuffix)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[460px] sm:max-w-[460px]" data-testid="settings-sheet">
        <SheetHeader>
          <SheetTitle>{t("Settings")}</SheetTitle>
          <SheetDescription>{t("Workspace preferences and serial defaults.")}</SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{t("Language")}</CardTitle>
              <CardDescription>{t("Interface language")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={language} onValueChange={(value) => setLanguage(value as Language)}>
                <SelectTrigger data-testid="language-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="zh-CN">简体中文</SelectItem>
                  <SelectItem value="en-US">English</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{t("Log retention limit")}</CardTitle>
              <CardDescription>{t("Max log entries per session")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
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
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{t("Appearance")}</CardTitle>
              <CardDescription>{t("Choose light or dark interface theme.")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={theme} onValueChange={(value) => setTheme(value as Theme)}>
                <SelectTrigger data-testid="theme-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dark">{t("Dark theme")}</SelectItem>
                  <SelectItem value="light">{t("Light theme")}</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{t("Default suffix")}</CardTitle>
              <CardDescription>{t("Applied when sending ASCII commands.")}</CardDescription>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function Detail({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: string
  icon: typeof Gauge
}) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-border/70 p-2 text-sm">
      <Icon className="size-4 text-muted-foreground" />
      <span className="text-muted-foreground">{label}</span>
      <span className="ml-auto font-mono">{value}</span>
    </div>
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
