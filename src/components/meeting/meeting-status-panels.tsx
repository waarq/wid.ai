"use client"

import type { ReactNode } from "react"
import { CalendarClock, CircleDot, RotateCcw, ShieldCheck, TriangleAlert } from "lucide-react"
import { toast } from "sonner"

import { MANUAL_CAPTURE_COPY } from "@/components/capture/capture-meta"
import { LiveCapturePanel } from "@/components/capture/live-capture-panel"
import { ProcessingStepper } from "@/components/capture/processing-stepper"
import { CaptureMeetingButton } from "@/components/calls/capture-meeting-button"
import { formatDayTime } from "@/components/calls/format"
import { Button } from "@/components/ui/button"
import { useCaptureController, useProcessingStatus, useRetryProcessing } from "@/hooks"
import { getUserMessage } from "@/lib/utils/errors"
import { isRecordingStatus } from "@/store/capture-machine"
import { isProcessingStatus, type Meeting } from "@/types"

function Panel({ children, labelledBy }: { children: ReactNode; labelledBy: string }) {
  return (
    <section aria-labelledby={labelledBy} className="mx-auto w-full max-w-lg space-y-5 py-10">
      {children}
    </section>
  )
}

export function ProcessingPanel({ meeting }: { meeting: Meeting }) {
  const progress = useProcessingStatus(meeting.id)
  const status = progress.data?.status ?? meeting.status
  return (
    <Panel labelledBy="processing-title">
      <div className="space-y-1">
        <h2 id="processing-title" className="text-base font-semibold tracking-tight">
          Processing your meeting…
        </h2>
        <p className="text-sm text-muted-foreground">
          WID is turning the conversation into a brief, decisions and action items. You can leave this page; we&apos;ll
          let you know when it&apos;s ready.
        </p>
      </div>
      <ProcessingStepper
        progress={progress.data ?? meeting.processing}
        status={isProcessingStatus(status) || status === "ready" || status === "failed" ? status : "processing"}
      />
    </Panel>
  )
}

export function FailedPanel({ meeting }: { meeting: Meeting }) {
  const retry = useRetryProcessing()
  const capture = useCaptureController()

  function onRetry() {
    retry.mutate(meeting.id, {
      onSuccess: () => {
        // The tab's capture session for this meeting is now superseded by the retry.
        if (capture.meetingId === meeting.id && capture.status === "failed") capture.reset()
        toast.success("Processing again", { description: "This page updates as soon as the meeting is ready." })
      },
      onError: (error) => toast.error("Couldn't restart processing", { description: getUserMessage(error) }),
    })
  }

  return (
    <Panel labelledBy="failed-title">
      <div role="alert" className="space-y-3">
        <span className="grid size-10 place-items-center rounded-lg bg-destructive-soft text-destructive">
          <TriangleAlert className="size-5" aria-hidden />
        </span>
        <h2 id="failed-title" className="text-base font-semibold tracking-tight">
          We couldn&apos;t finish processing this meeting.
        </h2>
        <p className="text-sm text-muted-foreground">
          {meeting.processing?.error?.message ??
            "Something interrupted processing. The recording is kept, so retrying won't lose anything."}
        </p>
      </div>
      {meeting.processing ? <ProcessingStepper progress={meeting.processing} status="failed" /> : null}
      <Button onClick={onRetry} disabled={retry.isPending}>
        <RotateCcw data-icon="inline-start" aria-hidden />
        {retry.isPending ? "Retrying…" : "Retry processing"}
      </Button>
    </Panel>
  )
}

export function ReadyToCapturePanel({ meeting }: { meeting: Meeting }) {
  const upcoming = meeting.status === "upcoming"
  return (
    <Panel labelledBy="capture-ready-title">
      <div className="space-y-1">
        <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          {upcoming ? (
            <CalendarClock className="size-4" aria-hidden />
          ) : (
            <CircleDot className="size-4 text-status-ready" aria-hidden />
          )}
          {upcoming ? `Scheduled for ${formatDayTime(meeting.startedAt)}` : "Ready to capture"}
        </p>
        <h2 id="capture-ready-title" className="text-base font-semibold tracking-tight">
          {upcoming ? "This meeting hasn't started yet." : "Capture this meeting when it starts."}
        </h2>
        <p className="text-sm text-muted-foreground">
          Notes, decisions and action items appear here a few minutes after you stop capturing.
        </p>
      </div>
      <p className="flex gap-2 rounded-lg bg-primary-soft px-3 py-2.5 text-xs text-primary-ink">
        <ShieldCheck className="mt-px size-4 shrink-0" aria-hidden />
        <span>{MANUAL_CAPTURE_COPY}</span>
      </p>
      <CaptureMeetingButton
        label="Start capture"
        preset={{ calendarEventId: meeting.calendarEventId, title: meeting.title, mode: meeting.captureMode }}
      />
    </Panel>
  )
}

export function CapturingPanel({ meeting }: { meeting: Meeting }) {
  const capture = useCaptureController()
  const ownSession = capture.hydrated && capture.meetingId === meeting.id && isRecordingStatus(capture.status)
  return (
    <Panel labelledBy="capturing-title">
      <h2 id="capturing-title" className="sr-only">
        Capture in progress
      </h2>
      {!capture.hydrated ? null : ownSession ? (
        <div className="rounded-lg border border-border p-4">
          <LiveCapturePanel />
        </div>
      ) : (
        <div className="space-y-1">
          <p className="text-base font-semibold tracking-tight">
            {meeting.status === "paused" ? "Capture is paused." : "This meeting is being captured."}
          </p>
          <p className="text-sm text-muted-foreground">
            The capture is running in another tab or device. Its controls are there; this page updates when processing
            starts.
          </p>
        </div>
      )}
    </Panel>
  )
}
