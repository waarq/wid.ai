import Link from "next/link"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/shared/status-badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { Meeting } from "@/types"

import { formatDay, formatDuration, initials } from "./format"
import { MeetingStatsLine, VisibilityLabel } from "./meeting-card"
import { isInFlight, meetingHref, processingStageLabel } from "./meeting-utils"
import { ParticipantAvatars } from "./participant-avatars"
import { RetryProcessingButton } from "./retry-button"

function rowSubtext(meeting: Meeting): string | null {
  if (meeting.status === "failed") return "Processing failed"
  if (isInFlight(meeting)) return `${processingStageLabel(meeting)}…`
  return meeting.summary?.overview ?? null
}

/** Desktop list view. Hidden below md, where MeetingCards replace it. */
export function MeetingTable({ meetings, showOwner = false }: { meetings: readonly Meeting[]; showOwner?: boolean }) {
  return (
    <Table className="[&_td]:px-3 [&_td]:py-2.5 [&_th]:px-3">
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>Meeting</TableHead>
          {showOwner ? <TableHead className="w-40">Owner</TableHead> : null}
          <TableHead className="w-28">Date</TableHead>
          <TableHead className="w-24">Duration</TableHead>
          <TableHead className="w-32">Participants</TableHead>
          <TableHead className="w-36">Status</TableHead>
          <TableHead className="w-28 text-right">
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {meetings.map((meeting) => {
          const sub = rowSubtext(meeting)
          return (
            <TableRow key={meeting.id} className="group relative">
              <TableCell className="max-w-0 whitespace-normal">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 [&>span]:shrink-0 [&>span]:whitespace-nowrap">
                    <Link
                      href={meetingHref(meeting)}
                      className="truncate rounded-sm text-sm font-medium outline-none after:absolute after:inset-0 focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-ring"
                    >
                      {meeting.title}
                    </Link>
                    <VisibilityLabel meeting={meeting} />
                  </div>
                  {sub ? <p className="truncate text-xs text-muted-foreground">{sub}</p> : null}
                  <MeetingStatsLine meeting={meeting} />
                </div>
              </TableCell>
              {showOwner ? (
                <TableCell>
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Avatar size="sm">
                      {meeting.owner.avatarUrl ? <AvatarImage src={meeting.owner.avatarUrl} alt="" /> : null}
                      <AvatarFallback>{initials(meeting.owner.name)}</AvatarFallback>
                    </Avatar>
                    <span className="truncate">{meeting.owner.name}</span>
                  </span>
                </TableCell>
              ) : null}
              <TableCell className="text-sm text-muted-foreground">{formatDay(meeting.startedAt)}</TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground tabular-nums">
                {formatDuration(meeting.duration)}
              </TableCell>
              <TableCell>
                <ParticipantAvatars people={meeting.participants} />
              </TableCell>
              <TableCell>
                <StatusBadge status={meeting.status} />
              </TableCell>
              <TableCell className="text-right">
                {meeting.status === "failed" ? (
                  <span className="relative z-10">
                    <RetryProcessingButton meetingId={meeting.id} />
                  </span>
                ) : (
                  <Button asChild variant="ghost" size="sm" className="text-muted-foreground group-hover:text-foreground">
                    <Link href={meetingHref(meeting)} tabIndex={-1} aria-label={`Open ${meeting.title}`}>
                      Open
                    </Link>
                  </Button>
                )}
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
