"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { ChevronDown, ChevronUp } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { useCaptureController } from "@/hooks"
import { useUIStore } from "@/store/ui-store"
import { cn } from "@/lib/utils"
import { isRecordingStatus } from "@/store/capture-machine"
import type { CaptureStatus } from "@/types"

import { CaptureSessionPanel } from "./capture-session-panel"
import { useCaptureUIStore, useIsPrimaryCaptureHost } from "./capture-ui-store"
import { CaptureClock } from "./live-capture-panel"
import { StartCaptureDialog } from "./start-capture-dialog"

const VISIBLE: ReadonlySet<CaptureStatus> = new Set<CaptureStatus>([
  "capturing",
  "paused",
  "processing",
  "transcribing",
  "understanding",
  "complete",
  "failed",
])

const SPRING = { type: "spring", stiffness: 260, damping: 26 } as const

/**
 * Everything capture needs once per page: the start dialog, the floating
 * session panel and the "Meeting ready" toast. Safe to mount from several
 * places; only the first instance renders. State is timestamp-based and
 * persisted per tab, so the panel survives navigation and refresh.
 */
export function CaptureHost() {
  const primary = useIsPrimaryCaptureHost()
  if (!primary) return null
  return (
    <>
      <StartCaptureDialog />
      <CaptureDock />
      <CaptureReadyNotifier />
    </>
  )
}

const NOTIFIED_KEY = "wit-capture-notified"

function readNotified(): string | null {
  try {
    return window.sessionStorage.getItem(NOTIFIED_KEY)
  } catch {
    return null
  }
}

function writeNotified(token: string): void {
  try {
    window.sessionStorage.setItem(NOTIFIED_KEY, token)
  } catch {
    // Storage unavailable: worst case the toast shows again after a refresh.
  }
}

/**
 * Toasts once per finished session ("Meeting ready" + Open meeting), even if
 * the user navigated or refreshed while it was processing.
 */
function CaptureReadyNotifier() {
  const router = useRouter()
  const { status, meetingId, session, hydrated, error } = useCaptureController()

  useEffect(() => {
    if (!hydrated || !meetingId || (status !== "complete" && status !== "failed")) return
    const token = `${meetingId}:${status}`
    if (readNotified() === token) return
    writeNotified(token)
    const href = `/my-calls/${meetingId}`
    if (status === "complete") {
      toast.success("Meeting ready", {
        description: `${session.title ?? "Your meeting"} has notes, decisions and action items.`,
        action: { label: "Open meeting", onClick: () => router.push(href) },
        duration: 10_000,
      })
    } else {
      const wasRecording = session.failedFrom === "capturing" || session.failedFrom === "paused"
      toast.error(wasRecording ? "Capture stopped unexpectedly" : "Processing didn't finish", {
        description: error ?? "Open the meeting to retry.",
        action: { label: "Open meeting", onClick: () => router.push(href) },
        duration: 10_000,
      })
    }
  }, [status, meetingId, hydrated, session.title, session.failedFrom, error, router])

  return null
}

function CaptureDock() {
  const pathname = usePathname()
  const reduce = useReducedMotion()
  const { status, meetingId, hydrated } = useCaptureController()
  const collapsed = useCaptureUIStore((s) => s.dockCollapsed)
  const setCollapsed = useCaptureUIStore((s) => s.setDockCollapsed)
  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed)

  // The meeting page renders this session inline, so the dock steps aside there.
  const onOwnPage = Boolean(meetingId) && pathname === `/my-calls/${meetingId}`
  const visible = hydrated && VISIBLE.has(status) && !onOwnPage
  const recording = isRecordingStatus(status)

  return (
    <AnimatePresence>
      {visible ? (
        <motion.section
          key="capture-dock"
          aria-label="Capture session"
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
          transition={SPRING}
          // Bottom-left of the content area: toasts own the bottom-right corner.
          className={cn(
            "fixed right-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] left-3 z-40 rounded-lg border border-border bg-popover shadow-float",
            "sm:right-auto sm:w-80 md:bottom-6 md:left-[calc(3.5rem+1.5rem)]",
            sidebarCollapsed ? "lg:left-[calc(3.5rem+2rem)]" : "lg:left-[calc(15rem+2rem)]",
          )}
        >
          <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b border-border px-3 py-1.5">
            <span className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
              {recording ? (
                <span
                  aria-hidden
                  className={cn(
                    "size-1.5 rounded-full",
                    status === "capturing" ? "bg-status-capturing motion-safe:animate-pulse" : "bg-status-paused",
                  )}
                />
              ) : null}
              <span className="truncate">WIT capture</span>
              {collapsed && recording ? <CaptureClock className="text-foreground" /> : null}
              {collapsed && !recording ? (
                <span className="text-foreground">
                  {status === "complete" ? "Meeting ready" : status === "failed" ? "Needs attention" : "Processing…"}
                </span>
              ) : null}
            </span>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => setCollapsed(!collapsed)}
              aria-expanded={!collapsed}
              aria-label={collapsed ? "Expand capture panel" : "Collapse capture panel"}
            >
              {collapsed ? <ChevronUp aria-hidden /> : <ChevronDown aria-hidden />}
            </Button>
          </header>
          {collapsed ? null : (
            <div className="p-3">
              <CaptureSessionPanel />
            </div>
          )}
        </motion.section>
      ) : null}
    </AnimatePresence>
  )
}
