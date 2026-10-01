"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, BookmarkPlus, Ellipsis, Link2, Pause, Play, Share2, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { StatusBadge } from "@/components/shared/status-badge"
import { DeleteMeetingDialog } from "@/components/sharing/delete-meeting-dialog"
import { ShareDialog } from "@/components/sharing/share-dialog"
import { VisibilityBadge } from "@/components/sharing/visibility-badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useShareSettings } from "@/hooks"
import type { Meeting } from "@/types"

import { meetingMetaParts } from "./meeting-info"
import { usePlaybackControls } from "./playback-context"

export function MeetingHeader({
  meeting,
  canPlay,
  onSaveMoment,
}: {
  meeting: Meeting
  /** True once the meeting is ready and the player exists. */
  canPlay: boolean
  /** Saves the moment under the playhead to the playlist. */
  onSaveMoment?: () => void
}) {
  const router = useRouter()
  const [shareOpen, setShareOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const share = useShareSettings(meeting.id)
  const canManage = share.data?.canManage === true
  const linkEnabled = Boolean(share.data?.linkSharingAvailable && share.data.link)
  const meta = meetingMetaParts(meeting)

  async function copyLink() {
    const url = `${window.location.origin}/my-calls/${meeting.id}`
    try {
      await navigator.clipboard.writeText(url)
      toast.success("Link copied", { description: "Only people with access can open it." })
    } catch {
      toast.error("Couldn't copy the link", { description: "Copy it from the address bar instead." })
    }
  }

  return (
    <header className="space-y-3 border-b border-border pb-5">
      <Link
        href="/my-calls"
        className="inline-flex items-center gap-1.5 rounded-sm text-sm text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeft className="size-4" aria-hidden />
        My Calls
      </Link>

      <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
        <div className="min-w-0 space-y-1.5">
          <h1 className="text-xl font-semibold tracking-tight text-balance sm:text-2xl">{meeting.title}</h1>
          <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-muted-foreground">
            <span>{meta.when}</span>
            <span aria-hidden>·</span>
            <span className="font-mono tabular-nums">{meta.duration}</span>
            <span aria-hidden>·</span>
            <span>{meta.people}</span>
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            <VisibilityBadge visibility={meeting.visibility} linkEnabled={linkEnabled} />
            {meeting.status !== "ready" ? <StatusBadge status={meeting.status} /> : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canPlay ? <PlayButton /> : null}
          <Button variant="outline" onClick={() => setShareOpen(true)}>
            <Share2 data-icon="inline-start" aria-hidden />
            Share
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" aria-label="More actions">
                <Ellipsis aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onSelect={() => void copyLink()}>
                <Link2 aria-hidden />
                Copy link
              </DropdownMenuItem>
              {canPlay && onSaveMoment ? (
                <DropdownMenuItem onSelect={onSaveMoment}>
                  <BookmarkPlus aria-hidden />
                  Save current moment
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                disabled={!canManage}
                onSelect={() => setDeleteOpen(true)}
              >
                <Trash2 aria-hidden />
                {canManage || share.isPending ? "Delete meeting" : "Only the owner can delete"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <ShareDialog open={shareOpen} onOpenChange={setShareOpen} meetingId={meeting.id} meetingTitle={meeting.title} />
      <DeleteMeetingDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        meetingId={meeting.id}
        meetingTitle={meeting.title}
        onDeleted={() => router.replace("/my-calls")}
      />
    </header>
  )
}

function PlayButton() {
  const { playing, toggle } = usePlaybackControls()
  return (
    <Button onClick={toggle} aria-pressed={playing}>
      {playing ? <Pause data-icon="inline-start" aria-hidden /> : <Play data-icon="inline-start" aria-hidden />}
      {playing ? "Pause" : "Play"}
    </Button>
  )
}
