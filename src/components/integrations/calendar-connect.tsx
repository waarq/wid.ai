"use client"

import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { CalendarDays, CircleCheck, Loader2, TriangleAlert } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useCalendar, useConnectCalendar, useDisconnectCalendar } from "@/hooks"
import { cn } from "@/lib/utils"
import type { CalendarConnection } from "@/types"

import { CalendarPermissionsPanel } from "./calendar-permissions-panel"

export type IntegrationContext = "onboarding" | "settings"

interface CalendarConnectProps {
  context: IntegrationContext
  /** Fires whenever the known connection state changes (initial load included). */
  onStatusChange?: (connected: boolean, connection: CalendarConnection | null) => void
  className?: string
}

function formatCount(count: number): string {
  return `${count} upcoming ${count === 1 ? "meeting" : "meetings"}`
}

/*
 * Google Calendar connection, reusable in onboarding and Settings.
 * idle (permissions + Connect) -> connecting -> connected | failed.
 * Calendar access is for context only: nothing is captured automatically.
 */
export function CalendarConnect({ context, onStatusChange, className }: CalendarConnectProps) {
  const reduceMotion = useReducedMotion()
  const calendar = useCalendar()
  const connect = useConnectCalendar()
  const disconnect = useDisconnectCalendar()
  const [showNotice, setShowNotice] = useState(false)
  const noticeButtonRef = useRef<HTMLButtonElement>(null)

  const connection = calendar.data ?? null
  const connected = connection?.status === "connected"

  const onStatusChangeRef = useRef(onStatusChange)
  useEffect(() => {
    onStatusChangeRef.current = onStatusChange
  })
  useEffect(() => {
    if (calendar.isSuccess) onStatusChangeRef.current?.(connected, connection)
  }, [calendar.isSuccess, connected, connection])

  useEffect(() => {
    if (showNotice) noticeButtonRef.current?.focus({ preventScroll: true })
  }, [showNotice])

  function handleConnect() {
    connect.mutate(undefined, {
      onSuccess: (result) => {
        if (result.authorizationUrl) {
          // Redirect-based OAuth: finish consent on the provider's page.
          window.location.assign(result.authorizationUrl)
          return
        }
        toast.success("Google Calendar connected", {
          description: `${formatCount(result.upcomingEventCount)} found. Nothing will be recorded automatically.`,
        })
        setShowNotice(true)
      },
    })
  }

  function handleDisconnect() {
    disconnect.mutate(undefined, {
      onSuccess: () => {
        setShowNotice(false)
        toast.success("Google Calendar disconnected", {
          description: "Your existing meeting notes are unchanged.",
        })
      },
      onError: () => toast.error("Google Calendar couldn't be disconnected. Please try again."),
    })
  }

  if (calendar.isPending) {
    return (
      <div className={cn("grid gap-3", className)} aria-busy="true" aria-label="Loading calendar connection">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-4 w-56" />
        <Skeleton className="mt-2 h-9 w-52" />
      </div>
    )
  }

  if (calendar.isError) {
    return (
      <div role="alert" className={cn("grid gap-3 text-sm", className)}>
        <p className="text-foreground">We couldn&apos;t check your calendar connection.</p>
        <div>
          <Button type="button" variant="outline" size="sm" onClick={() => calendar.refetch()}>
            Try again
          </Button>
        </div>
      </div>
    )
  }

  const motionProps = {
    initial: { opacity: 0, y: reduceMotion ? 0 : 4 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0 },
    transition: { type: "spring" as const, stiffness: 260, damping: 26 },
  }

  return (
    <div className={cn("grid gap-6", className)}>
      <div className="grid grid-cols-[auto_1fr] items-start gap-3 border-y border-border py-4">
        <span
          aria-hidden
          className={cn(
            "grid size-9 place-items-center rounded-lg border border-border bg-card",
            connected && "border-primary/30 bg-primary-soft text-primary-ink",
          )}
        >
          <CalendarDays className="size-4" />
        </span>
        <div className="grid gap-0.5" aria-live="polite">
          {connected ? (
            <>
              <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                <CircleCheck aria-hidden className="size-4 text-primary" />
                Google Calendar connected
              </p>
              <p className="text-sm text-muted-foreground">
                <span className="num text-foreground">{connection.upcomingEventCount}</span>{" "}
                {connection.upcomingEventCount === 1 ? "upcoming meeting" : "upcoming meetings"} found
                {connection.accountEmail ? <> · {connection.accountEmail}</> : null}
              </p>
            </>
          ) : connect.isPending ? (
            <>
              <p className="text-sm font-medium text-foreground">Connecting to Google Calendar</p>
              <p className="text-sm text-muted-foreground">Waiting for Google to confirm access…</p>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-foreground">Google Calendar</p>
              <p className="text-sm text-muted-foreground">
                {context === "onboarding"
                  ? "Bring your meetings into WIT."
                  : "Not connected. WIT can't show your upcoming meetings."}
              </p>
            </>
          )}
        </div>
      </div>

      <AnimatePresence mode="popLayout" initial={false}>
        {connected && showNotice ? (
          <motion.div
            key="notice"
            {...motionProps}
            role="status"
            className="grid gap-3 rounded-lg bg-primary-soft px-4 py-4 text-sm text-primary-ink"
          >
            <p className="font-medium">Your calendar is connected.</p>
            <p>
              WIT can see your upcoming meetings, but nothing will be recorded automatically. You decide when to
              capture.
            </p>
            <div>
              <Button
                ref={noticeButtonRef}
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setShowNotice(false)}
                className="bg-background"
              >
                Got it
              </Button>
            </div>
          </motion.div>
        ) : null}

        {!connected && connect.isError ? (
          <motion.div
            key="error"
            {...motionProps}
            role="alert"
            className="grid grid-cols-[auto_1fr] items-start gap-3 rounded-lg bg-destructive-soft px-3 py-3 text-sm"
          >
            <TriangleAlert aria-hidden className="mt-0.5 size-4 text-destructive" />
            <div className="grid gap-1">
              <p className="font-medium text-foreground">Google Calendar connection failed.</p>
              <p className="text-muted-foreground">Your meetings haven&apos;t been changed.</p>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {!connected ? (
        <>
          <CalendarPermissionsPanel />
          <div>
            <Button type="button" size="lg" className="px-4" disabled={connect.isPending} onClick={handleConnect}>
              {connect.isPending ? <Loader2 aria-hidden className="animate-spin" /> : null}
              {connect.isPending ? "Connecting" : connect.isError ? "Try again" : "Connect Google Calendar"}
            </Button>
          </div>
        </>
      ) : context === "settings" ? (
        <div className="grid gap-3">
          <CalendarPermissionsPanel />
          <div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disconnect.isPending}
              onClick={handleDisconnect}
            >
              {disconnect.isPending ? <Loader2 aria-hidden className="animate-spin" /> : null}
              Disconnect
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
