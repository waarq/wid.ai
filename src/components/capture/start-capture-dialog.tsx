"use client"

import { useState, type FormEvent } from "react"
import Link from "next/link"
import { CalendarDays, CalendarOff, ShieldCheck } from "lucide-react"
import { toast } from "sonner"

import { formatDay, pluralize } from "@/components/calls/format"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Skeleton } from "@/components/ui/skeleton"
import { useCalendar, useCalendarEvents, useCaptureController } from "@/hooks"
import { cn } from "@/lib/utils"
import { getUserMessage } from "@/lib/utils/errors"
import { isRecordingStatus } from "@/store/capture-machine"
import type { CalendarEvent, CaptureMode } from "@/types"

import { CAPTURE_MODE_OPTIONS, MANUAL_CAPTURE_COPY } from "./capture-meta"
import { useCaptureUIStore } from "./capture-ui-store"

type Source = "calendar" | "adhoc"

const LOOKBACK_MS = 3 * 3_600_000
const LOOKAHEAD_MS = 12 * 3_600_000

function timeRange(event: CalendarEvent): string {
  const fmt = (iso: string) => new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
  return `${formatDay(event.startsAt)}, ${fmt(event.startsAt)} – ${fmt(event.endsAt)}`
}

/** Global start-capture dialog, opened through `useCaptureUIStore().openStart()`. */
export function StartCaptureDialog() {
  const open = useCaptureUIStore((s) => s.startOpen)
  const closeStart = useCaptureUIStore((s) => s.closeStart)
  return (
    <Dialog open={open} onOpenChange={(next) => (next ? undefined : closeStart())}>
      <DialogContent className="max-h-[90dvh] gap-5 overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Capture a meeting</DialogTitle>
          <DialogDescription>
            Pick the meeting you are in, or start an ad hoc capture. Notes, decisions and action items are ready a few
            minutes after you stop.
          </DialogDescription>
        </DialogHeader>
        {open ? <StartCaptureForm onDone={closeStart} /> : null}
      </DialogContent>
    </Dialog>
  )
}

function StartCaptureForm({ onDone }: { onDone: () => void }) {
  const preset = useCaptureUIStore((s) => s.preset)
  const capture = useCaptureController()
  const calendar = useCalendar()
  const connected = calendar.data?.status === "connected"

  const [source, setSource] = useState<Source>(preset?.title && !preset.calendarEventId ? "adhoc" : "calendar")
  const [eventId, setEventId] = useState<string | undefined>(preset?.calendarEventId)
  const [title, setTitle] = useState(preset?.calendarEventId ? "" : (preset?.title ?? ""))
  const [mode, setMode] = useState<CaptureMode>(preset?.mode ?? "audio")
  const [titleError, setTitleError] = useState<string | null>(null)
  // Stable window so the query key does not change on every render.
  const [range] = useState(() => {
    const now = Date.now()
    return { from: new Date(now - LOOKBACK_MS).toISOString(), to: new Date(now + LOOKAHEAD_MS).toISOString() }
  })
  const events = useCalendarEvents(
    { ...range, includeCaptured: false, limit: 10 },
    { enabled: connected && source === "calendar" },
  )

  const recording = isRecordingStatus(capture.status)
  const effectiveSource: Source = connected ? source : "adhoc"
  const selected = events.data?.find((e) => e.id === eventId)

  function submit(event: FormEvent) {
    event.preventDefault()
    if (recording) return
    if (effectiveSource === "calendar") {
      if (!selected) {
        toast.error("Choose a meeting from your calendar", { description: "Or switch to an ad hoc capture." })
        return
      }
    } else if (title.trim() === "") {
      setTitleError("Give the meeting a title so you can find it later.")
      return
    }
    setTitleError(null)

    const input =
      effectiveSource === "calendar" && selected
        ? { calendarEventId: selected.id, title: selected.title, mode, platform: selected.conference?.provider }
        : { title: title.trim(), mode }

    capture.start.mutate(input, {
      onSuccess: () => {
        onDone()
        toast.success("Capture started", { description: `${input.title}. Pause or stop from the capture panel.` })
      },
      onError: (error) => toast.error("Capture didn't start", { description: getUserMessage(error) }),
    })
  }

  if (recording) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          A capture is already running{capture.session.title ? ` for ${capture.session.title}` : ""}. Stop it from the
          capture panel before starting another.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={onDone}>
            Close
          </Button>
        </DialogFooter>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      {connected ? (
        <div role="group" aria-label="What are you capturing?" className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
          {(
            [
              { value: "calendar", label: "From calendar" },
              { value: "adhoc", label: "Ad hoc meeting" },
            ] as const
          ).map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={source === option.value}
              onClick={() => setSource(option.value)}
              className={cn(
                "h-7 rounded-md text-[13px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98]",
                source === option.value
                  ? "bg-background text-foreground shadow-[0_0_0_1px_var(--color-border)]"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}

      {effectiveSource === "calendar" ? (
        <CalendarPicker
          loading={events.isPending}
          error={events.isError}
          onRetry={() => void events.refetch()}
          events={events.data ?? []}
          value={eventId}
          onChange={setEventId}
          onAdhoc={() => setSource("adhoc")}
        />
      ) : (
        <div className="space-y-1.5">
          <Label htmlFor="capture-title">Meeting title</Label>
          <Input
            id="capture-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Product Planning"
            maxLength={120}
            autoFocus
            aria-invalid={titleError ? true : undefined}
            aria-describedby={titleError ? "capture-title-error" : undefined}
          />
          {titleError ? (
            <p id="capture-title-error" className="text-xs text-destructive">
              {titleError}
            </p>
          ) : null}
          {!connected && calendar.isSuccess ? (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarOff className="size-3.5" aria-hidden />
              Calendar not connected.{" "}
              <Link href="/settings?section=integrations" className="text-primary-ink underline-offset-2 hover:underline" onClick={onDone}>
                Connect it
              </Link>{" "}
              to pick meetings from your schedule.
            </p>
          ) : null}
        </div>
      )}

      <fieldset className="space-y-2">
        <legend className="mb-2 text-sm font-medium">Capture mode</legend>
        <RadioGroup
          value={mode}
          onValueChange={(v) => setMode(v as CaptureMode)}
          className="grid-cols-1 gap-2 sm:grid-cols-3"
        >
          {CAPTURE_MODE_OPTIONS.map((option) => {
            const id = `capture-mode-${option.value}`
            const Icon = option.icon
            return (
              <label
                key={option.value}
                htmlFor={id}
                className={cn(
                  "grid cursor-pointer grid-cols-[auto_1fr_auto] items-start gap-2 rounded-lg border px-3 py-2.5 transition-colors sm:grid-cols-[1fr_auto]",
                  mode === option.value ? "border-primary bg-primary-soft/50" : "border-border hover:bg-muted/60",
                )}
              >
                <Icon className="mt-0.5 size-4 text-muted-foreground sm:hidden" aria-hidden />
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5 text-sm font-medium">
                    <Icon className="hidden size-4 text-muted-foreground sm:inline" aria-hidden />
                    {option.label}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{option.description}</span>
                </span>
                <RadioGroupItem id={id} value={option.value} className="mt-0.5" />
              </label>
            )
          })}
        </RadioGroup>
      </fieldset>

      <p className="flex gap-2 rounded-lg bg-primary-soft px-3 py-2.5 text-xs text-primary-ink">
        <ShieldCheck className="mt-px size-4 shrink-0" aria-hidden />
        <span>{MANUAL_CAPTURE_COPY}</span>
      </p>

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={capture.start.isPending}>
          {capture.start.isPending ? "Starting…" : "Start capture"}
        </Button>
      </DialogFooter>
    </form>
  )
}

function CalendarPicker({
  loading,
  error,
  onRetry,
  events,
  value,
  onChange,
  onAdhoc,
}: {
  loading: boolean
  error: boolean
  onRetry: () => void
  events: CalendarEvent[]
  value: string | undefined
  onChange: (id: string) => void
  onAdhoc: () => void
}) {
  if (loading) {
    return (
      <div role="status" aria-busy="true" className="space-y-2">
        <span className="sr-only">Loading your calendar</span>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    )
  }
  if (error) {
    return (
      <div role="alert" className="space-y-2 rounded-lg border border-border px-3 py-3 text-sm">
        <p>Your calendar didn&apos;t load. Nothing has been recorded.</p>
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="outline" onClick={onRetry}>
            Try again
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={onAdhoc}>
            Capture ad hoc instead
          </Button>
        </div>
      </div>
    )
  }
  if (events.length === 0) {
    return (
      <div className="grid justify-items-start gap-2 rounded-lg border border-border px-3 py-3 text-sm">
        <span className="flex items-center gap-2 text-muted-foreground">
          <CalendarDays className="size-4" aria-hidden />
          No meetings on your calendar around now.
        </span>
        <Button type="button" size="sm" variant="outline" onClick={onAdhoc}>
          Capture an ad hoc meeting
        </Button>
      </div>
    )
  }
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium">Meeting</legend>
      <RadioGroup
        value={value ?? ""}
        onValueChange={onChange}
        className="max-h-60 gap-0 divide-y divide-border overflow-y-auto rounded-lg border border-border"
      >
        {events.map((event) => {
          const id = `capture-event-${event.id}`
          return (
            <label
              key={event.id}
              htmlFor={id}
              className={cn(
                "grid cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-2.5 transition-colors hover:bg-muted/60",
                value === event.id && "bg-primary-soft/50",
              )}
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{event.title}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  <span className="font-mono tabular-nums">{timeRange(event)}</span> ·{" "}
                  {pluralize(event.attendees.length, "attendee")}
                </span>
              </span>
              <RadioGroupItem id={id} value={event.id} />
            </label>
          )
        })}
      </RadioGroup>
    </fieldset>
  )
}
