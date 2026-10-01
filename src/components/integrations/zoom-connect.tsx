"use client"

import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { CircleCheck, Loader2, TriangleAlert, Video } from "lucide-react"
import { useEffect, useRef } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useConnectZoom, useDisconnectIntegration, useIntegration } from "@/hooks"
import { cn } from "@/lib/utils"

import type { IntegrationContext } from "./calendar-connect"

interface ZoomConnectProps {
  context: IntegrationContext
  onStatusChange?: (connected: boolean) => void
  className?: string
}

/*
 * Zoom connection, reusable in onboarding and Settings. Never required:
 * the onboarding step renders its own "Skip this step" link underneath.
 */
export function ZoomConnect({ context, onStatusChange, className }: ZoomConnectProps) {
  const reduceMotion = useReducedMotion()
  const zoom = useIntegration("zoom")
  const connect = useConnectZoom()
  const disconnect = useDisconnectIntegration()

  const connected = zoom.data?.status === "connected"

  const onStatusChangeRef = useRef(onStatusChange)
  useEffect(() => {
    onStatusChangeRef.current = onStatusChange
  })
  useEffect(() => {
    if (zoom.isSuccess) onStatusChangeRef.current?.(connected)
  }, [zoom.isSuccess, connected])

  function handleConnect() {
    connect.mutate(undefined, {
      onSuccess: (result) => {
        if (result.authorizationUrl) {
          window.location.assign(result.authorizationUrl)
          return
        }
        toast.success("Zoom connected", { description: "WIT can now work with your Zoom meetings." })
      },
    })
  }

  function handleDisconnect() {
    disconnect.mutate("zoom", {
      onSuccess: () => toast.success("Zoom disconnected"),
      onError: () => toast.error("Zoom couldn't be disconnected. Please try again."),
    })
  }

  if (zoom.isPending) {
    return (
      <div className={cn("grid gap-3", className)} aria-busy="true" aria-label="Loading Zoom connection">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-64" />
        <Skeleton className="mt-2 h-9 w-32" />
      </div>
    )
  }

  if (zoom.isError) {
    return (
      <div role="alert" className={cn("grid gap-3 text-sm", className)}>
        <p className="text-foreground">We couldn&apos;t check your Zoom connection.</p>
        <div>
          <Button type="button" variant="outline" size="sm" onClick={() => zoom.refetch()}>
            Try again
          </Button>
        </div>
      </div>
    )
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
          <Video className="size-4" />
        </span>
        <div className="grid gap-0.5" aria-live="polite">
          {connected ? (
            <>
              <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                <CircleCheck aria-hidden className="size-4 text-primary" />
                Zoom connected
              </p>
              <p className="text-sm text-muted-foreground">
                WIT can now work with your Zoom meetings.
                {zoom.data?.accountLabel ? <> · {zoom.data.accountLabel}</> : null}
              </p>
            </>
          ) : connect.isPending ? (
            <>
              <p className="text-sm font-medium text-foreground">Connecting to Zoom</p>
              <p className="text-sm text-muted-foreground">Waiting for Zoom to confirm access…</p>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-foreground">Zoom</p>
              <p className="text-sm text-muted-foreground">
                WIT requires a Zoom connection to capture Zoom meetings.
              </p>
            </>
          )}
        </div>
      </div>

      <AnimatePresence initial={false}>
        {!connected && connect.isError ? (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: reduceMotion ? 0 : 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
            role="alert"
            className="grid grid-cols-[auto_1fr] items-start gap-3 rounded-lg bg-destructive-soft px-3 py-3 text-sm"
          >
            <TriangleAlert aria-hidden className="mt-0.5 size-4 text-destructive" />
            <div className="grid gap-1">
              <p className="font-medium text-foreground">Zoom couldn&apos;t be connected.</p>
              <p className="text-muted-foreground">Nothing was changed. You can try again or skip for now.</p>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {!connected ? (
        <div>
          <Button type="button" size="lg" className="px-4" disabled={connect.isPending} onClick={handleConnect}>
            {connect.isPending ? <Loader2 aria-hidden className="animate-spin" /> : null}
            {connect.isPending ? "Connecting" : connect.isError ? "Try again" : "Connect Zoom"}
          </Button>
        </div>
      ) : context === "settings" ? (
        <div>
          <Button type="button" variant="outline" size="sm" disabled={disconnect.isPending} onClick={handleDisconnect}>
            {disconnect.isPending ? <Loader2 aria-hidden className="animate-spin" /> : null}
            Disconnect
          </Button>
        </div>
      ) : null}
    </div>
  )
}
