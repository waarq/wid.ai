import Link from "next/link"
import { ArrowRight, Lock, Users } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/shared/status-badge"
import { cn } from "@/lib/utils"
import type { Meeting } from "@/types"

import { formatDay, formatDuration, initials, pluralize } from "./format"
import { isInFlight, meetingHref, processingFraction, processingStageLabel, VISIBILITY_LABEL } from "./meeting-utils"
import { ParticipantAvatars } from "./participant-avatars"
import { RetryProcessingButton } from "./retry-button"

export function MeetingStatsLine({ meeting, className }: { meeting: Meeting; className?: string }) {
  const stats = meeting.stats
  if (!stats || meeting.status !== "ready") return null
  return (
    <p className={cn("font-mono text-xs text-muted-foreground tabular-nums", className)}>
      {pluralize(stats.decisions, "decision")} · {pluralize(stats.actionItems, "action")} ·{" "}
      {pluralize(stats.openQuestions, "question")}
    </p>
  )
}

export function VisibilityLabel({ meeting }: { meeting: Meeting }) {
  const Icon = meeting.visibility === "private" ? Lock : Users
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <Icon className="size-3" aria-hidden />
      {VISIBILITY_LABEL[meeting.visibility]}
    </span>
  )
}

/** Body text under the title: summary, processing stage, or failure message. */
export function MeetingBlurb({ meeting }: { meeting: Meeting }) {
  if (meeting.status === "failed") {
    return <p className="text-sm text-destructive">We couldn&apos;t finish processing this meeting.</p>
  }
  if (isInFlight(meeting)) {
    const fraction = processingFraction(meeting)
    return (
      <div className="space-y-1.5">
        <p className="text-sm text-muted-foreground">{processingStageLabel(meeting)}…</p>
        <div
          role="progressbar"
          aria-label="Processing progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={fraction === null ? undefined : Math.round(fraction * 100)}
          className="h-1 w-full overflow-hidden rounded-full bg-muted"
        >
          <div
            className="h-full rounded-full bg-status-processing transition-[width] duration-500 motion-safe:animate-pulse"
            style={{ width: `${Math.max(8, Math.round((fraction ?? 0.15) * 100))}%` }}
          />
        </div>
      </div>
    )
  }
  if (meeting.status === "upcoming" || meeting.status === "ready_to_capture") {
    return <p className="text-sm text-muted-foreground">Scheduled. Capture it when it starts.</p>
  }
  const overview = meeting.summary?.overview
  return overview ? (
    <p className="line-clamp-2 text-sm text-muted-foreground">{overview}</p>
  ) : (
    <p className="text-sm text-muted-foreground">No summary yet.</p>
  )
}

interface MeetingCardProps {
  meeting: Meeting
  /** Team Calls: show who captured it. */
  showOwner?: boolean
  className?: string
}

/**
 * One meeting as a card. Used in the grid view and as the mobile
 * representation of the desktop table. The title link covers the whole card.
 */
export function MeetingCard({ meeting, showOwner = false, className }: MeetingCardProps) {
  return (
    <article
      className={cn(
        "group relative grid gap-3 rounded-lg border border-border bg-card p-4 transition-colors",
        "hover:border-border-strong focus-within:border-border-strong",
        className
      )}
    >
      <header className="grid grid-cols-[1fr_auto] items-start gap-3">
        <div className="min-w-0 space-y-0.5">
          <h3 className="truncate text-sm font-semibold tracking-tight">
            <Link
              href={meetingHref(meeting)}
              className="rounded-sm outline-none after:absolute after:inset-0 after:rounded-lg focus-visible:after:ring-2 focus-visible:after:ring-ring"
            >
              {meeting.title}
            </Link>
          </h3>
          <p className="text-xs text-muted-foreground">
            {formatDay(meeting.startedAt)} · <span className="font-mono tabular-nums">{formatDuration(meeting.duration)}</span>
          </p>
        </div>
        <StatusBadge status={meeting.status} />
      </header>

      <MeetingBlurb meeting={meeting} />

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        {showOwner ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Avatar size="sm">
              {meeting.owner.avatarUrl ? <AvatarImage src={meeting.owner.avatarUrl} alt="" /> : null}
              <AvatarFallback>{initials(meeting.owner.name)}</AvatarFallback>
            </Avatar>
            {meeting.owner.name}
          </span>
        ) : null}
        <ParticipantAvatars people={meeting.participants} withCount />
        <VisibilityLabel meeting={meeting} />
      </div>

      <footer className="grid grid-cols-[1fr_auto] items-center gap-3 border-t border-border pt-3">
        <MeetingStatsLine meeting={meeting} />
        {meeting.status === "failed" ? (
          <span className="relative z-10 col-start-2">
            <RetryProcessingButton meetingId={meeting.id} />
          </span>
        ) : (
          <Button asChild variant="ghost" size="sm" className="col-start-2 text-muted-foreground group-hover:text-foreground">
            <Link href={meetingHref(meeting)} tabIndex={-1} aria-hidden>
              Open
              <ArrowRight aria-hidden />
            </Link>
          </Button>
        )}
      </footer>
    </article>
  )
}
