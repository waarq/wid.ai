import { AppException } from "@/lib/utils/errors"
import {
  CAPTURE_MODES,
  type CaptureMode,
  type ConferenceProvider,
  type Deal,
  type Meeting,
  type MeetingVisibility,
  type Participant,
  type StartCaptureInput,
  type StopCaptureInput,
} from "@/types"

import { mockControls } from "./controls"
import type { MockDb } from "./db"
import { generateMeetingContent } from "./generators"
import { createId, nowIso } from "./utils"

/*
 * Meeting operations shared by MockMeetingService and MockCaptureService.
 * They act on the MockDb directly (no latency, no cloning); the services
 * wrap them in mockCall.
 */

const CONFERENCE_PROVIDERS: readonly ConferenceProvider[] = ["zoom", "google_meet", "microsoft_teams", "in_person", "other"]

export function defaultVisibility(db: MockDb): MeetingVisibility {
  return db.state.settings.meetings.defaultSharing === "all_attendees" ? "attendees" : "private"
}

export function validateTitle(title: string | undefined, field = "title"): string {
  const value = (title ?? "").trim()
  if (value.length === 0 || value.length > 200) {
    throw new AppException("validation_error", {
      details: { fieldErrors: { [field]: [value.length === 0 ? "Add a title." : "Keep the title under 200 characters."] } },
    })
  }
  return value
}

export function validateMode(mode: unknown): CaptureMode {
  if (!(CAPTURE_MODES as readonly unknown[]).includes(mode)) {
    throw new AppException("validation_error", { details: { fieldErrors: { mode: ["Choose a capture mode."] } } })
  }
  return mode as CaptureMode
}

export function validatePlatform(platform: unknown): ConferenceProvider | undefined {
  if (platform === undefined) return undefined
  if (!CONFERENCE_PROVIDERS.includes(platform as ConferenceProvider)) {
    throw new AppException("validation_error", { details: { fieldErrors: { platform: ["Unknown platform."] } } })
  }
  return platform as ConferenceProvider
}

/** Default people for an ad-hoc capture: the user plus up to three teammates. */
function adHocParticipants(db: MockDb): Participant[] {
  const teammates = db
    .members()
    .filter((m) => !m.isCurrentUser)
    .slice(0, 3)
    .map((m) => db.participantFrom({ name: m.name, email: m.email, isExternal: false }))
  return [db.meAsParticipant("host"), ...teammates]
}

export function activeCaptureMeeting(db: MockDb): Meeting | undefined {
  return db.state.meetings.find((m) => db.isOwner(m) && (m.status === "capturing" || m.status === "paused"))
}

/** Creates (or attaches to the user's own) meeting record in "capturing". Only ever user-initiated. */
export function startCaptureOp(db: MockDb, input: StartCaptureInput): { meeting: Meeting; created: boolean } {
  const mode = validateMode(input.mode)
  const platform = validatePlatform(input.platform)
  if (activeCaptureMeeting(db)) {
    throw new AppException("conflict", { message: "A capture is already in progress. Stop it before starting another." })
  }

  const now = nowIso()
  const event = input.calendarEventId
    ? db.state.calendarEvents.find((e) => e.id === input.calendarEventId)
    : undefined
  if (input.calendarEventId && !event) {
    throw new AppException("not_found", { message: "That calendar event is no longer available." })
  }
  const title = validateTitle(input.title ?? event?.title)

  // Attach to an existing pre-capture record the user owns for this event.
  const existing = event?.meetingId ? db.findMeeting(event.meetingId) : undefined
  if (existing && db.isOwner(existing) && (existing.status === "upcoming" || existing.status === "ready_to_capture")) {
    Object.assign(existing, {
      title,
      status: "capturing",
      startedAt: now,
      duration: 0,
      captureMode: mode,
      platform: platform ?? existing.platform,
      updatedAt: now,
    } satisfies Partial<Meeting>)
    return { meeting: existing, created: false }
  }

  const participants: Participant[] = event
    ? event.attendees.map((a) =>
        db.participantFrom({ name: a.name, email: a.email }, a.email === db.me.email ? "host" : "attendee"),
      )
    : adHocParticipants(db)
  if (!participants.some((p) => p.id === db.me.personId)) participants.unshift(db.meAsParticipant("host"))
  for (const p of participants) if (p.id === db.me.personId) p.role = "host"

  const me = db.me
  const meeting: Meeting = {
    id: createId("mtg"),
    title,
    startedAt: now,
    duration: 0,
    participants,
    status: "capturing",
    visibility: defaultVisibility(db),
    owner: { id: me.personId, name: me.name, email: me.email },
    platform: platform ?? event?.conference?.provider ?? "other",
    captureMode: mode,
    tags: [],
    calendarEventId: event?.id,
    sharedWithMe: false,
    createdAt: now,
    updatedAt: now,
  }
  db.state.meetings.unshift(meeting)
  db.state.share[meeting.id] = { invited: [], removedPersonIds: [], link: null }
  if (event) event.meetingId = meeting.id
  return { meeting, created: true }
}

export function setCapturePausedOp(db: MockDb, meetingId: string, paused: boolean): Meeting {
  const meeting = db.requireOwnedMeeting(meetingId)
  const from = paused ? "capturing" : "paused"
  if (meeting.status !== from) {
    throw new AppException("conflict", { message: paused ? "This capture isn't running." : "This capture isn't paused." })
  }
  meeting.status = paused ? "paused" : "capturing"
  db.touchMeeting(meeting)
  return meeting
}

/** Finalises the recording, generates content and starts time-driven processing. */
export function stopCaptureOp(db: MockDb, meetingId: string, input: StopCaptureInput): Meeting {
  const meeting = db.requireOwnedMeeting(meetingId)
  if (meeting.status !== "capturing" && meeting.status !== "paused") {
    throw new AppException("conflict", { message: "This meeting isn't being captured." })
  }
  if (!Number.isFinite(input.elapsedSeconds) || input.elapsedSeconds < 0) {
    throw new AppException("validation_error", { details: { fieldErrors: { elapsedSeconds: ["Invalid duration."] } } })
  }
  const captured = Math.max(1, Math.round(input.elapsedSeconds))
  const content = generateMeetingContent(meeting, db.me.personId, captured)
  meeting.duration = content.duration
  meeting.endedAt = nowIso()
  db.startProcessing(meeting, {
    fail: mockControls.consumeProcessingFailure(),
    summary: content.summary,
    transcript: content.transcript,
  })
  db.touchMeeting(meeting)
  return meeting
}

/** Re-runs processing after a failure, regenerating content if none exists. */
export function retryProcessingOp(db: MockDb, meetingId: string): Meeting {
  const meeting = db.requireMeeting(meetingId)
  if (meeting.status !== "failed") {
    throw new AppException("conflict", { message: "Only failed meetings can be processed again." })
  }
  const duration = meeting.duration > 0 ? meeting.duration : 1800
  const hostId = meeting.participants.some((p) => p.id === meeting.owner.id) ? meeting.owner.id : meeting.participants[0]?.id
  const content = generateMeetingContent(meeting, hostId ?? db.me.personId, duration)
  meeting.duration = Math.max(meeting.duration, content.duration)
  db.startProcessing(meeting, { fail: mockControls.consumeProcessingFailure(), summary: content.summary, transcript: content.transcript })
  db.touchMeeting(meeting)
  return meeting
}

/* ---------- deals linkage ---------- */

function refOf(meeting: Meeting) {
  return { id: meeting.id, title: meeting.title, startedAt: meeting.startedAt }
}

export function recomputeDealMeetings(deal: Deal, db: MockDb): void {
  deal.meetings = deal.meetings
    .filter((ref) => db.findMeeting(ref.id))
    .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt))
  deal.lastMeetingAt = deal.meetings[0]?.startedAt
}

export function linkMeetingToDeal(db: MockDb, deal: Deal, meeting: Meeting): void {
  if (meeting.dealId && meeting.dealId !== deal.id) {
    const previous = db.state.deals.find((d) => d.id === meeting.dealId)
    if (previous) {
      previous.meetings = previous.meetings.filter((r) => r.id !== meeting.id)
      recomputeDealMeetings(previous, db)
    }
  }
  meeting.dealId = deal.id
  if (!deal.meetings.some((r) => r.id === meeting.id)) deal.meetings.push(refOf(meeting))
  recomputeDealMeetings(deal, db)
  deal.updatedAt = nowIso()
}

export function unlinkMeetingFromDeal(db: MockDb, deal: Deal, meetingId: string): void {
  deal.meetings = deal.meetings.filter((r) => r.id !== meetingId)
  const meeting = db.findMeeting(meetingId)
  if (meeting?.dealId === deal.id) meeting.dealId = undefined
  recomputeDealMeetings(deal, db)
  deal.updatedAt = nowIso()
}

/* ---------- deletion ---------- */

/** Removes a meeting and every reference to it, so nothing dangles. */
export function deleteMeetingOp(db: MockDb, meetingId: string): void {
  const { state } = db
  state.meetings = state.meetings.filter((m) => m.id !== meetingId)
  delete state.transcripts[meetingId]
  delete state.plans[meetingId]
  delete state.share[meetingId]
  delete state.assistantHistory[meetingId]
  state.playlist = state.playlist.filter((p) => p.meetingId !== meetingId)
  state.alerts = state.alerts.flatMap((alert) => {
    const target = alert.target
    if (target.kind === "meetings") {
      const meetingIds = target.meetingIds.filter((id) => id !== meetingId)
      if (meetingIds.length === 0) return []
      return [{ ...alert, target: { ...target, meetingIds } }]
    }
    if ((target.kind === "meeting" || target.kind === "action_item" || target.kind === "decision") && target.meetingId === meetingId) {
      return []
    }
    return [alert]
  })
  for (const deal of state.deals) {
    if (deal.meetings.some((r) => r.id === meetingId)) recomputeDealMeetings(deal, db)
  }
  for (const event of state.calendarEvents) if (event.meetingId === meetingId) delete event.meetingId
  if (state.capture?.session.meetingId === meetingId) state.capture = null
}
