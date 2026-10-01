"use client"

import type { ComponentProps } from "react"
import { Mic } from "lucide-react"

import { CaptureHost } from "@/components/capture/capture-dock"
import { useCaptureUIStore, type StartCapturePreset } from "@/components/capture/capture-ui-store"
import { CaptureClock } from "@/components/capture/live-capture-panel"
import { Button } from "@/components/ui/button"
import { useCaptureController } from "@/hooks"
import { cn } from "@/lib/utils"
import { isRecordingStatus } from "@/store/capture-machine"

/**
 * "Capture meeting" entry point (My Calls header, empty states, meeting page).
 *
 * Idle: opens the start dialog (calendar meeting or ad hoc, capture mode,
 * explicit manual-capture copy). While a capture is running it becomes a
 * live "Capturing 03:12" button that expands the floating capture panel.
 * It also mounts the CaptureHost (deduplicated), so the dock and the
 * "Meeting ready" toast exist wherever this button does.
 */
export function CaptureMeetingButton({
  variant = "default",
  size = "default",
  label = "Capture meeting",
  preset,
  className,
}: {
  variant?: ComponentProps<typeof Button>["variant"]
  size?: ComponentProps<typeof Button>["size"]
  label?: string
  /** Pre-select a calendar meeting, title or mode in the start dialog. */
  preset?: StartCapturePreset
  className?: string
}) {
  const capture = useCaptureController()
  const openStart = useCaptureUIStore((s) => s.openStart)
  const setDockCollapsed = useCaptureUIStore((s) => s.setDockCollapsed)
  const recording = capture.hydrated && isRecordingStatus(capture.status)

  return (
    <>
      {recording ? (
        <Button
          variant="outline"
          size={size}
          className={cn("gap-2", className)}
          onClick={() => setDockCollapsed(false)}
          aria-label={`${capture.status === "paused" ? "Capture paused" : "Capturing"}. Show capture controls.`}
        >
          <span
            aria-hidden
            className={cn(
              "size-2 rounded-full",
              capture.status === "capturing" ? "bg-status-capturing motion-safe:animate-pulse" : "bg-status-paused",
            )}
          />
          <span aria-hidden>{capture.status === "paused" ? "Paused" : "Capturing"}</span>
          <CaptureClock className="text-muted-foreground" />
        </Button>
      ) : (
        <Button variant={variant} size={size} className={className} onClick={() => openStart(preset)}>
          <Mic data-icon="inline-start" aria-hidden />
          {label}
        </Button>
      )}
      <CaptureHost />
    </>
  )
}
