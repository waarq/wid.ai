"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { FileQuestion, Info, MessageSquareText } from "lucide-react"

import { MeetingAssistant } from "@/components/assistant"
import { CaptureHost } from "@/components/capture/capture-dock"
import { KeyMomentsTimeline, MeetingBrief } from "@/components/meeting-brief"
import type { AddToPlaylistRequest } from "@/components/meeting-brief"
import { EmptyState } from "@/components/shared/empty-state"
import { ErrorState } from "@/components/shared/error-state"
import { Transcript } from "@/components/transcript"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useCaptureController, useMeeting, useTranscript } from "@/hooks"
import { isAppError } from "@/lib/utils/errors"
import { isProcessingStatus, type Meeting, type TranscriptSegment } from "@/types"

import { AddToPlaylistDialog, type PlaylistDraft } from "./add-to-playlist-dialog"
import { MeetingDetailSkeleton } from "./meeting-detail-skeleton"
import { MeetingHeader } from "./meeting-header"
import { MeetingInfo, MeetingParticipants, MeetingTags } from "./meeting-info"
import { CapturingPanel, FailedPanel, ProcessingPanel, ReadyToCapturePanel } from "./meeting-status-panels"
import {
  MeetingPlaybackProvider,
  TRANSCRIPT_SECTION_ATTRIBUTE,
  useJumpToSource,
  usePlayback,
  usePlaybackSnapshot,
  type JumpTarget,
} from "./playback-context"
import { MeetingPlayer } from "./player/meeting-player"

const EMPTY_SEGMENTS: TranscriptSegment[] = []

function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`
}

/**
 * Meeting detail screen (client root). Deep links `?t=<seconds>&segment=<id>`
 * seek and highlight on load.
 */
export function MeetingDetail({
  meetingId,
  initialTime,
  initialSegmentId,
}: {
  meetingId: string
  initialTime?: number
  initialSegmentId?: string
}) {
  return (
    <MeetingPlaybackProvider initialTime={initialTime} initialSegmentId={initialSegmentId}>
      <MeetingDetailContent meetingId={meetingId} />
      <CaptureHost />
    </MeetingPlaybackProvider>
  )
}

function MeetingDetailContent({ meetingId }: { meetingId: string }) {
  const meeting = useMeeting(meetingId)

  if (meeting.isPending) return <MeetingDetailSkeleton />

  if (meeting.isError) {
    const code = isAppError(meeting.error) ? meeting.error.code : undefined
    if (code === "not_found" || code === "forbidden") {
      return (
        <EmptyState
          icon={FileQuestion}
          title="This meeting isn't available."
          description="It may have been deleted, or it hasn't been shared with you. Ask the owner to share it."
          action={
            <Button asChild variant="outline" size="sm">
              <Link href="/my-calls">Back to My Calls</Link>
            </Button>
          }
        />
      )
    }
    return (
      <ErrorState
        title="This meeting didn't load."
        description="Your notes and recording are safe. Check your connection and try again."
        onRetry={() => void meeting.refetch()}
        retrying={meeting.isFetching}
      />
    )
  }

  return <MeetingScreen meeting={meeting.data} />
}

function MeetingScreen({ meeting }: { meeting: Meeting }) {
  const ready = meeting.status === "ready"
  useClearFinishedCapture(meeting)

  return (
    <div className="space-y-6">
      {ready ? (
        <ReadyMeeting meeting={meeting} />
      ) : (
        <>
          <MeetingHeader meeting={meeting} canPlay={false} />
          {isProcessingStatus(meeting.status) ? (
            <ProcessingPanel meeting={meeting} />
          ) : meeting.status === "failed" ? (
            <FailedPanel meeting={meeting} />
          ) : meeting.status === "capturing" || meeting.status === "paused" ? (
            <CapturingPanel meeting={meeting} />
          ) : (
            <ReadyToCapturePanel meeting={meeting} />
          )}
        </>
      )}
    </div>
  )
}

/** Once the meeting this tab captured is ready and on screen, the capture session is done. */
function useClearFinishedCapture(meeting: Meeting) {
  const capture = useCaptureController()
  const { status, meetingId, reset } = capture
  useEffect(() => {
    if (meeting.status === "ready" && meetingId === meeting.id && status === "complete") reset()
  }, [meeting.status, meeting.id, meetingId, status, reset])
}

function ReadyMeeting({ meeting }: { meeting: Meeting }) {
  const transcript = useTranscript(meeting.id)
  const segments = transcript.data?.segments ?? EMPTY_SEGMENTS
  const jumpTo = useJumpToSource()
  const [draft, setDraft] = useState<PlaylistDraft | null>(null)
  const [sheet, setSheet] = useState<"assistant" | "info" | null>(null)

  const segmentById = useMemo(() => new Map(segments.map((s) => [s.id, s])), [segments])

  const onJump = useCallback((target: JumpTarget) => jumpTo(target), [jumpTo])

  const onAddInsight = useCallback(
    (request: AddToPlaylistRequest) => {
      const segment = segmentById.get(request.sourceSegmentId)
      setDraft({ ...request, quote: segment?.text, speakerName: segment?.speakerName })
    },
    [segmentById],
  )

  const onAddSegment = useCallback(
    (segment: TranscriptSegment) =>
      setDraft({
        kind: "quote",
        title: truncate(segment.text, 80),
        quote: segment.text,
        speakerName: segment.speakerName,
        meetingId: meeting.id,
        sourceSegmentId: segment.id,
        sourceTimestamp: segment.startTime,
      }),
    [meeting.id],
  )

  const getPlayhead = usePlaybackSnapshot()
  const onSaveMoment = useCallback(() => {
    const { currentTime, activeSegmentId } = getPlayhead()
    const segment = activeSegmentId ? segmentById.get(activeSegmentId) : segments[0]
    if (!segment) return
    setDraft({
      kind: "timestamp",
      title: truncate(segment.text, 80),
      quote: segment.text,
      speakerName: segment.speakerName,
      meetingId: meeting.id,
      sourceSegmentId: segment.id,
      sourceTimestamp: Math.floor(currentTime),
    })
  }, [getPlayhead, segmentById, segments, meeting.id])

  const keyMoments = meeting.summary?.keyMoments ?? []

  return (
    <>
      <MeetingHeader meeting={meeting} canPlay onSaveMoment={segments.length > 0 ? onSaveMoment : undefined} />

      <div className="grid grid-cols-2 gap-2 lg:hidden">
        <Button variant="outline" onClick={() => setSheet("assistant")}>
          <MessageSquareText data-icon="inline-start" aria-hidden />
          Ask WID
        </Button>
        <Button variant="outline" onClick={() => setSheet("info")}>
          <Info data-icon="inline-start" aria-hidden />
          Meeting info
        </Button>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-8">
          <div className="sticky top-12 z-20 -mx-4 border-b border-border bg-background px-4 py-3 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
            <MeetingPlayer audioUrl={meeting.audioUrl} duration={meeting.duration} segments={segments} />
          </div>

          <MeetingBrief meeting={meeting} onJumpToSource={onJump} onAddToPlaylist={onAddInsight} />

          {keyMoments.length > 0 ? (
            <section aria-labelledby="timeline-title" className="space-y-3">
              <h2 id="timeline-title" className="text-sm font-semibold tracking-tight">
                Timeline
              </h2>
              <KeyMomentsTimeline
                moments={keyMoments}
                duration={meeting.duration}
                meetingTitle={meeting.title}
                onJumpToSource={onJump}
                onAddToPlaylist={onAddInsight}
              />
            </section>
          ) : null}

          <section
            aria-labelledby="transcript-title"
            className="scroll-mt-44 space-y-3"
            {...{ [TRANSCRIPT_SECTION_ATTRIBUTE]: "" }}
          >
            <h2 id="transcript-title" className="text-sm font-semibold tracking-tight">
              Transcript
            </h2>
            {transcript.isError ? (
              <ErrorState
                title="The transcript didn't load."
                description="The brief above is unaffected. Try again to load the full conversation."
                onRetry={() => void transcript.refetch()}
                retrying={transcript.isFetching}
              />
            ) : (
              <ConnectedTranscript
                segments={segments}
                meeting={meeting}
                loading={transcript.isPending}
                onAddToPlaylist={onAddSegment}
              />
            )}
          </section>
        </div>

        <aside aria-label="Meeting details" className="hidden lg:block">
          <div className="sticky top-16 max-h-[calc(100dvh-5rem)] space-y-8 overflow-y-auto overscroll-contain pr-1 pb-6">
            <MeetingAssistant
              meetingId={meeting.id}
              meetingTitle={meeting.title}
              onJumpToSource={onJump}
              className="max-h-[70dvh]"
            />
            <MeetingInfo meeting={meeting} />
            <MeetingParticipants meeting={meeting} />
            <MeetingTags meeting={meeting} />
          </div>
        </aside>
      </div>

      <Sheet open={sheet === "assistant"} onOpenChange={(open) => setSheet(open ? "assistant" : null)}>
        <SheetContent side="bottom" className="rounded-t-xl px-4 data-[side=bottom]:h-[85dvh] pb-[max(1rem,env(safe-area-inset-bottom))]">
          <SheetHeader className="px-0">
            <SheetTitle>Ask WID</SheetTitle>
            <SheetDescription className="sr-only">Ask questions about {meeting.title}.</SheetDescription>
          </SheetHeader>
          <MeetingAssistant
            meetingId={meeting.id}
            meetingTitle={meeting.title}
            onJumpToSource={(target) => {
              setSheet(null)
              onJump(target)
            }}
            className="min-h-0 flex-1"
          />
        </SheetContent>
      </Sheet>

      <Sheet open={sheet === "info"} onOpenChange={(open) => setSheet(open ? "info" : null)}>
        <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto rounded-t-xl px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <SheetHeader className="px-0">
            <SheetTitle>Meeting info</SheetTitle>
            <SheetDescription className="sr-only">Details, participants and tags for {meeting.title}.</SheetDescription>
          </SheetHeader>
          <div className="space-y-8">
            <MeetingInfo meeting={meeting} />
            <MeetingParticipants meeting={meeting} />
            <MeetingTags meeting={meeting} />
          </div>
        </SheetContent>
      </Sheet>

      <AddToPlaylistDialog draft={draft} onOpenChange={(open) => (open ? undefined : setDraft(null))} />
    </>
  )
}

function ConnectedTranscript({
  segments,
  meeting,
  loading,
  onAddToPlaylist,
}: {
  segments: TranscriptSegment[]
  meeting: Meeting
  loading: boolean
  onAddToPlaylist: (segment: TranscriptSegment) => void
}) {
  const activeSegmentId = usePlayback((s) => s.activeSegmentId)
  const highlightSegmentId = usePlayback((s) => s.highlight?.segmentId)
  const jumpTo = useJumpToSource()
  return (
    <Transcript
      segments={segments}
      participants={meeting.participants}
      activeSegmentId={activeSegmentId}
      highlightSegmentId={highlightSegmentId}
      isLoading={loading}
      onSeek={(seconds, segmentId) =>
        jumpTo({ sourceTimestamp: seconds, sourceSegmentId: segmentId }, { play: true, scroll: false })
      }
      onAddToPlaylist={onAddToPlaylist}
    />
  )
}
