import { useId, type ReactNode } from "react"

import { CAPTURE_MODE_LABEL } from "@/components/capture/capture-meta"
import { formatDayTime, formatDuration, initials, pluralize } from "@/components/calls/format"
import { VisibilityBadge } from "@/components/sharing/visibility-badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import type { ConferenceProvider, Meeting, ParticipantRole, Tone } from "@/types"

const PLATFORM_LABEL: Record<ConferenceProvider, string> = {
  zoom: "Zoom",
  google_meet: "Google Meet",
  microsoft_teams: "Microsoft Teams",
  in_person: "In person",
  other: "Other",
}

const ROLE_LABEL: Record<ParticipantRole, string> = {
  host: "Host",
  attendee: "Attendee",
  guest: "Guest",
}

const TONE_VARIANT: Record<Tone, "muted" | "success" | "info" | "warning" | "danger"> = {
  neutral: "muted",
  accent: "success",
  info: "info",
  warning: "warning",
  danger: "danger",
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-3 py-2 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  )
}

export function MeetingInfo({ meeting }: { meeting: Meeting }) {
  const id = useId()
  return (
    <section aria-labelledby={id} className="space-y-1">
      <h2 id={id} className="text-sm font-semibold tracking-tight">
        Meeting info
      </h2>
      <dl className="divide-y divide-border">
        <Row label="When">{formatDayTime(meeting.startedAt)}</Row>
        <Row label="Duration">
          <span className="font-mono tabular-nums">{formatDuration(meeting.duration)}</span>
        </Row>
        <Row label="Platform">{PLATFORM_LABEL[meeting.platform]}</Row>
        <Row label="Captured as">{CAPTURE_MODE_LABEL[meeting.captureMode]}</Row>
        <Row label="Owner">
          <span className="truncate">{meeting.owner.name}</span>
          {meeting.sharedWithMe ? <span className="block text-xs text-muted-foreground">Shared with you</span> : null}
        </Row>
        <Row label="Visibility">
          <VisibilityBadge visibility={meeting.visibility} />
        </Row>
      </dl>
    </section>
  )
}

export function MeetingParticipants({ meeting }: { meeting: Meeting }) {
  const id = useId()
  return (
    <section aria-labelledby={id} className="space-y-2">
      <h2 id={id} className="text-sm font-semibold tracking-tight">
        Participants <span className="ml-1 font-mono text-xs font-normal text-muted-foreground tabular-nums">{meeting.participants.length}</span>
      </h2>
      {meeting.participants.length === 0 ? (
        <p className="text-sm text-muted-foreground">No participants were recorded.</p>
      ) : (
        <ul className="divide-y divide-border">
          {meeting.participants.map((p) => (
            <li key={p.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 py-2">
              <Avatar size="sm">
                {p.avatarUrl ? <AvatarImage src={p.avatarUrl} alt="" /> : null}
                <AvatarFallback>{initials(p.name)}</AvatarFallback>
              </Avatar>
              <span className="min-w-0">
                <span className="block truncate text-sm">{p.name}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {ROLE_LABEL[p.role]}
                  {p.company ? ` · ${p.company}` : ""}
                </span>
              </span>
              {p.isExternal ? <Badge variant="outline">External</Badge> : <span />}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export function MeetingTags({ meeting }: { meeting: Meeting }) {
  const id = useId()
  return (
    <section aria-labelledby={id} className="space-y-2">
      <h2 id={id} className="text-sm font-semibold tracking-tight">
        Tags
      </h2>
      {meeting.tags.length === 0 ? (
        <p className="text-sm text-muted-foreground">No tags yet.</p>
      ) : (
        <ul className="flex flex-wrap gap-1.5">
          {meeting.tags.map((tag) => (
            <li key={tag.id}>
              <Badge variant={TONE_VARIANT[tag.tone]}>{tag.label}</Badge>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/** Short meta line for the header: "Today, 9:30 AM · 42 min · 5 participants". */
export function meetingMetaParts(meeting: Meeting): { when: string; duration: string; people: string } {
  return {
    when: formatDayTime(meeting.startedAt),
    duration: formatDuration(meeting.duration),
    people: pluralize(meeting.participants.length, "participant"),
  }
}
