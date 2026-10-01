import { Check, Circle, Loader } from "lucide-react"

import { StatusBadge } from "@/components/shared/status-badge"
import { cn } from "@/lib/utils"
import { getUpcomingEvents } from "../data"
import { Eyebrow } from "../layout/section"

const frame = "rounded-lg border border-border bg-card p-4"

/** Step 1: the calendar is visible, but nothing is capturing. */
export function CalendarVisual() {
  const events = getUpcomingEvents(4)
  return (
    <figure aria-label="Upcoming calendar meetings, none capturing" className={frame}>
      <Eyebrow className="mb-3">Upcoming</Eyebrow>
      <ul className="divide-y divide-border">
        {events.map((e) => (
          <li key={e.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-x-3 py-2.5">
            <span className="w-14 font-mono text-xs text-muted-foreground">{e.time}</span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">{e.title}</span>
              <span className="text-xs text-muted-foreground">
                {e.day} · {e.provider}
              </span>
            </span>
            <span className="text-xs text-muted-foreground">Not capturing</span>
          </li>
        ))}
      </ul>
    </figure>
  )
}

/** Step 2: capture is something the user starts. */
export function CaptureVisual() {
  return (
    <figure aria-label="Capture states: ready, then capturing" className={cn(frame, "space-y-4")}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <StatusBadge status="ready_to_capture" />
          <p className="mt-2 text-sm text-muted-foreground">Design Review, 14:00</p>
        </div>
        <span className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground">
          Start capture
        </span>
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
        <div>
          <StatusBadge status="capturing" />
          <p className="num mt-2 text-lg tracking-tight">00:17:42</p>
        </div>
        <div className="flex gap-2 text-sm font-medium">
          <span className="rounded-lg border border-border px-3 py-1.5">Pause</span>
          <span className="rounded-lg border border-border px-3 py-1.5">Stop</span>
        </div>
      </div>
    </figure>
  )
}

const processing = [
  { label: "Recording uploaded", state: "done" },
  { label: "Transcript generated", state: "done" },
  { label: "Understanding conversation", state: "active" },
  { label: "Extracting decisions", state: "pending" },
  { label: "Finding action items", state: "pending" },
] as const

/** Step 3: processing is never an unexplained spinner. */
export function ProcessingVisual() {
  return (
    <figure aria-label="Processing progress" className={frame}>
      <Eyebrow className="mb-3">Processing your meeting</Eyebrow>
      <ol className="space-y-2.5">
        {processing.map((step) => (
          <li
            key={step.label}
            className={cn(
              "flex items-center gap-2.5 text-sm",
              step.state === "pending" && "text-muted-foreground",
            )}
          >
            {step.state === "done" ? (
              <Check aria-hidden className="size-4 text-primary" />
            ) : step.state === "active" ? (
              <Loader aria-hidden className="size-4 text-info" />
            ) : (
              <Circle aria-hidden className="size-4" />
            )}
            {step.label}
          </li>
        ))}
      </ol>
    </figure>
  )
}
