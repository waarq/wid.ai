"use client"

import { useState } from "react"
import { Pause, Play, Square, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { Button } from "@/components/ui/button"
import { useCaptureController, useCaptureElapsedSeconds } from "@/hooks"
import { cn } from "@/lib/utils"
import { getUserMessage } from "@/lib/utils/errors"
import { formatCaptureClock } from "@/store/capture-machine"

import { CAPTURE_MODE_LABEL } from "./capture-meta"
import { Waveform } from "./waveform"

/** Live elapsed timer. Isolated so only it re-renders on each tick. */
export function CaptureClock({ className }: { className?: string }) {
  const seconds = useCaptureElapsedSeconds()
  return (
    <span className={cn("font-mono tabular-nums", className)}>
      <span className="sr-only">Elapsed </span>
      {formatCaptureClock(seconds)}
    </span>
  )
}

/**
 * "● Capturing 00:17:42 [Pause] [Stop]". Only renders meaningful controls
 * while the session is capturing or paused. Stop asks for confirmation
 * because it cannot be undone.
 */
export function LiveCapturePanel({ className, compact = false }: { className?: string; compact?: boolean }) {
  const capture = useCaptureController()
  const [confirmStop, setConfirmStop] = useState(false)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const paused = capture.status === "paused"
  const capturing = capture.status === "capturing"
  const busy = capture.pause.isPending || capture.resume.isPending

  function togglePause() {
    if (paused) {
      capture.resume.mutate(undefined, {
        onSuccess: () => toast.success("Capture resumed"),
        onError: (error) => toast.error("Couldn't resume", { description: getUserMessage(error) }),
      })
    } else {
      capture.pause.mutate(undefined, {
        onSuccess: () => toast("Capture paused", { description: "Nothing is recorded while paused." }),
        onError: (error) => toast.error("Couldn't pause", { description: getUserMessage(error) }),
      })
    }
  }

  function stop() {
    capture.stop.mutate(undefined, {
      onSuccess: () => {
        setConfirmStop(false)
        toast.success("Capture stopped", { description: "Processing your meeting. This takes a few moments." })
      },
      onError: (error) => toast.error("Couldn't stop the capture", { description: getUserMessage(error) }),
    })
  }

  function discard() {
    capture.discard.mutate(undefined, {
      onSuccess: () => {
        setConfirmDiscard(false)
        toast.success("Capture discarded", { description: "Nothing from this session was kept." })
      },
      onError: (error) => toast.error("Couldn't discard the capture", { description: getUserMessage(error) }),
    })
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-xs font-medium" role="status" aria-live="polite">
            <span
              aria-hidden
              className={cn(
                "size-2 rounded-full",
                capturing ? "bg-status-capturing motion-safe:animate-pulse" : "bg-status-paused",
              )}
            />
            <span className={capturing ? "text-destructive" : "text-warning"}>{capturing ? "Capturing" : "Paused"}</span>
            {capture.session.mode ? (
              <span className="text-muted-foreground">· {CAPTURE_MODE_LABEL[capture.session.mode]}</span>
            ) : null}
          </p>
          <p className="mt-0.5 truncate text-sm font-medium">{capture.session.title ?? "Untitled meeting"}</p>
        </div>
        <CaptureClock className={cn("text-2xl font-medium tracking-tight", compact && "text-xl")} />
      </div>

      <Waveform active={capturing} className="w-full justify-between" />

      <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
        <Button variant="outline" onClick={togglePause} disabled={busy || capture.stop.isPending}>
          {paused ? <Play data-icon="inline-start" aria-hidden /> : <Pause data-icon="inline-start" aria-hidden />}
          {paused ? "Resume" : "Pause"}
        </Button>
        <Button variant="destructive" onClick={() => setConfirmStop(true)} disabled={capture.stop.isPending}>
          <Square data-icon="inline-start" aria-hidden />
          Stop
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setConfirmDiscard(true)}
          disabled={capture.discard.isPending || capture.stop.isPending}
          aria-label="Discard capture"
          title="Discard capture"
        >
          <Trash2 aria-hidden />
        </Button>
      </div>

      <ConfirmDialog
        open={confirmStop}
        onOpenChange={setConfirmStop}
        title="Stop capturing?"
        description="WIT stops recording and starts building your notes, decisions and action items. You can't resume this capture after stopping."
        confirmLabel="Stop and process"
        loading={capture.stop.isPending}
        onConfirm={stop}
      />
      <ConfirmDialog
        open={confirmDiscard}
        onOpenChange={setConfirmDiscard}
        title="Discard this capture?"
        description="Everything recorded in this session is thrown away and no notes are created. This can't be undone."
        confirmLabel="Discard capture"
        variant="destructive"
        loading={capture.discard.isPending}
        onConfirm={discard}
      />
    </div>
  )
}
