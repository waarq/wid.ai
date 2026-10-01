"use client"

import Link from "next/link"
import { ArrowRight, CircleCheck, TriangleAlert } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useCaptureController } from "@/hooks"
import { isProcessingCaptureStatus, isRecordingStatus } from "@/store/capture-machine"

import { LiveCapturePanel } from "./live-capture-panel"
import { ProcessingStepper } from "./processing-stepper"

/**
 * Whatever the current capture session needs right now: live controls,
 * the processing checklist, "Meeting ready", or a recoverable failure.
 * Returns null when there is no session to show.
 */
export function CaptureSessionPanel({ onNavigate }: { onNavigate?: () => void }) {
  const capture = useCaptureController()
  const { status, meetingId, session } = capture

  if (!capture.hydrated) return null

  if (isRecordingStatus(status)) return <LiveCapturePanel />

  if (isProcessingCaptureStatus(status)) {
    return (
      <div className="space-y-3">
        <div>
          <p className="text-xs font-medium text-info">Processing your meeting…</p>
          <p className="mt-0.5 truncate text-sm font-medium">{session.title ?? "Untitled meeting"}</p>
        </div>
        <ProcessingStepper progress={capture.processing} status={status as "processing" | "transcribing" | "understanding"} />
        <p className="text-xs text-muted-foreground">You can keep working. We&apos;ll let you know when it&apos;s ready.</p>
      </div>
    )
  }

  if (status === "complete") {
    return (
      <div className="space-y-3">
        <p className="flex items-center gap-2 text-sm font-medium" role="status">
          <CircleCheck className="size-4 text-primary" aria-hidden />
          Meeting ready
        </p>
        <p className="truncate text-sm text-muted-foreground">{session.title ?? "Your meeting"}</p>
        <div className="grid grid-cols-[1fr_auto] gap-2">
          {meetingId ? (
            <Button asChild>
              <Link
                href={`/my-calls/${meetingId}`}
                onClick={() => {
                  capture.reset()
                  onNavigate?.()
                }}
              >
                Open meeting
                <ArrowRight data-icon="inline-end" aria-hidden />
              </Link>
            </Button>
          ) : (
            <span />
          )}
          <Button variant="ghost" onClick={capture.reset}>
            Dismiss
          </Button>
        </div>
      </div>
    )
  }

  if (status === "failed") {
    const wasRecording = session.failedFrom === "capturing" || session.failedFrom === "paused"
    return (
      <div className="space-y-3" role="alert">
        <p className="flex items-center gap-2 text-sm font-medium">
          <TriangleAlert className="size-4 text-destructive" aria-hidden />
          {wasRecording ? "Capture stopped unexpectedly" : "Processing didn't finish"}
        </p>
        <p className="text-sm text-muted-foreground">
          {capture.error ?? "Something went wrong."}{" "}
          {meetingId ? "Open the meeting to retry processing." : ""}
        </p>
        <div className="grid grid-cols-[1fr_auto] gap-2">
          {meetingId ? (
            <Button asChild variant="outline">
              <Link
                href={`/my-calls/${meetingId}`}
                onClick={() => {
                  capture.reset()
                  onNavigate?.()
                }}
              >
                Open meeting
              </Link>
            </Button>
          ) : (
            <span />
          )}
          <Button variant="ghost" onClick={capture.reset}>
            Dismiss
          </Button>
        </div>
      </div>
    )
  }

  return null
}
