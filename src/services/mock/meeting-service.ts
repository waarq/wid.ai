import { endOfDay, endOfMonth, endOfWeek, format, parseISO, startOfDay, startOfMonth, startOfWeek } from "date-fns"

import { AppException } from "@/lib/utils/errors"
import type { MeetingService } from "@/services/interfaces"
import {
  CAPTURE_MODES,
  MEETING_STATUSES,
  MEETING_VISIBILITIES,
  type CreateMeetingInput,
  type Decision,
  type DecisionHistory,
  type FollowUpEmail,
  type FollowUpTone,
  type GenerateFollowUpInput,
  type ListResponse,
  type Meeting,
  type MeetingListParams,
  type MeetingScope,
  type MeetingStatus,
  type ProcessingProgress,
  type ShareMeetingInput,
  type ShareRecipient,
  type ShareSettings,
  type StartCaptureInput,
  type StopCaptureInput,
  type UpdateMeetingInput,
} from "@/types"

import type { MockDb } from "./db"
import {
  defaultVisibility,
  deleteMeetingOp,
  linkMeetingToDeal,
  retryProcessingOp,
  setCapturePausedOp,
  startCaptureOp,
  stopCaptureOp,
  unlinkMeetingFromDeal,
  validatePlatform,
  validateTitle,
} from "./meeting-ops"
import { mockCall, mockWrite } from "./runtime"
import { createId, isValidEmail, normalize, nowIso, paginate, rawTokens } from "./utils"

/* ---------- list helpers ---------- */

const WEEK = { weekStartsOn: 1 } as const

function inRange(meeting: Meeting, range: MeetingListParams["range"]): boolean {
  if (!range || range === "all") return true
  const now = new Date()
  const at = Date.parse(meeting.startedAt)
  const [from, to] =
    range === "today"
      ? [startOfDay(now), endOfDay(now)]
      : range === "this_week"
        ? [startOfWeek(now, WEEK), endOfWeek(now, WEEK)]
        : [startOfMonth(now), endOfMonth(now)]
  return at >= from.getTime() && at <= to.getTime()
}

function inScope(db: MockDb, meeting: Meeting, scope: MeetingScope): boolean {
  const owner = db.isOwner(meeting)
  const sharedWithMe = !owner && db.canAccess(meeting)
  const personal = db.isParticipant(meeting) || db.isExplicitlyShared(meeting)
  switch (scope) {
    case "my_calls":
      return owner || (sharedWithMe && personal)
    case "shared_with_me":
      return sharedWithMe && personal
    case "team":
      return meeting.visibility !== "private" || sharedWithMe
    case "my_team": {
      if (!(meeting.visibility !== "private" || sharedWithMe)) return false
      const myTeam = db.teamOf(db.me.personId)
      return owner || (myTeam !== undefined && db.teamOf(meeting.owner.id) === myTeam)
    }
  }
}

function searchHaystack(meeting: Meeting): string {
  const s = meeting.summary
  return normalize(
    [
      meeting.title,
      ...meeting.participants.flatMap((p) => [p.name, p.email ?? "", p.company ?? ""]),
      meeting.owner.name,
      ...meeting.tags.map((t) => t.label),
      s?.overview ?? "",
      ...(s?.keyPoints ?? []),
      ...(s?.decisions.map((d) => d.title) ?? []),
      ...(s?.actionItems.map((a) => a.title) ?? []),
      ...(s?.topics.map((t) => t.label) ?? []),
    ].join(" \n "),
  )
}

function matchesSearch(meeting: Meeting, search: string | undefined): boolean {
  if (!search?.trim()) return true
  const haystack = searchHaystack(meeting)
  const tokens = rawTokens(search)
  if (tokens.length === 0) return true
  // Every token must start a word somewhere (prefix match: "launc" finds "launch").
  return tokens.every((token) => new RegExp(`(^|[^a-z0-9])${token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`).test(haystack))
}

function statusList(status: MeetingListParams["status"]): MeetingStatus[] | null {
  if (!status) return null
  const list = Array.isArray(status) ? status : [status]
  for (const value of list) {
    if (!(MEETING_STATUSES as readonly string[]).includes(value)) {
      throw new AppException("validation_error", { details: { fieldErrors: { status: [`Unknown status "${value}".`] } } })
    }
  }
  return list
}

function sortMeetings(meetings: Meeting[], sort: MeetingListParams["sort"] = "recent"): Meeting[] {
  const by = {
    recent: (a: Meeting, b: Meeting) => Date.parse(b.startedAt) - Date.parse(a.startedAt),
    oldest: (a: Meeting, b: Meeting) => Date.parse(a.startedAt) - Date.parse(b.startedAt),
    longest: (a: Meeting, b: Meeting) => b.duration - a.duration || Date.parse(b.startedAt) - Date.parse(a.startedAt),
  }[sort]
  if (!by) throw new AppException("validation_error", { details: { fieldErrors: { sort: ["Unknown sort."] } } })
  return [...meetings].sort(by)
}

/* ---------- sharing ---------- */

function shareSettingsOf(db: MockDb, meeting: Meeting): ShareSettings {
  const canManage = db.isOwner(meeting)
  const share = db.state.share[meeting.id] ?? { invited: [], removedPersonIds: [], link: null }
  db.state.share[meeting.id] = share
  const addedAt = meeting.updatedAt
  const recipients: ShareRecipient[] = []

  if (meeting.visibility !== "private") {
    for (const p of meeting.participants) {
      if (p.id === meeting.owner.id || share.removedPersonIds.includes(p.id)) continue
      recipients.push({
        id: `rcp_${meeting.id}_${p.id}`,
        name: p.name,
        email: p.email ?? "",
        source: "attendee",
        addedAt,
        canRemove: canManage,
      })
    }
  }
  if (meeting.visibility === "team") {
    for (const m of db.members()) {
      if (m.id === meeting.owner.id || recipients.some((r) => r.id.endsWith(`_${m.id}`))) continue
      if (meeting.participants.some((p) => p.id === m.id)) continue
      recipients.push({ id: `rcp_${meeting.id}_${m.id}`, name: m.name, email: m.email, source: "team", addedAt, canRemove: false })
    }
  }
  for (const invited of share.invited) {
    if (!recipients.some((r) => r.email.toLowerCase() === invited.email.toLowerCase())) {
      recipients.push({ ...invited, canRemove: canManage })
    }
  }

  const linkSharingAvailable = db.state.settings.sharing.linkSharingAvailable
  return {
    meetingId: meeting.id,
    visibility: meeting.visibility,
    recipients,
    linkSharingAvailable,
    link: linkSharingAvailable ? share.link : null,
    canManage,
  }
}

/* ---------- follow-up ---------- */

function weekdayDate(iso: string): string {
  return format(parseISO(iso), "EEEE, MMMM d")
}

function composeFollowUp(db: MockDb, meeting: Meeting, tone: FollowUpTone, signOffName: string): FollowUpEmail {
  const summary = meeting.summary!
  const decisions = summary.decisions.map((d) => d.title)
  const open = summary.actionItems.filter((a) => a.status === "open" || a.status === "in_progress")
  const nextSteps = open.map((a) => ({
    owner: a.assignee?.name.split(" ")[0] ?? "Team",
    task: a.title,
    actionItemId: a.id,
  }))
  const openQuestions = summary.questions.filter((q) => q.status === "open")
  const recipients = meeting.participants
    .filter((p) => p.id !== db.me.personId && p.email)
    .map((p) => ({ name: p.name, email: p.email! }))
  const external = meeting.participants.find((p) => p.isExternal && p.id !== db.me.personId)
  const greeting = external && recipients.length === 1 ? `Hi ${external.name.split(" ")[0]},` : "Hi everyone,"

  const lines: string[] = [greeting, ""]
  if (tone === "friendly") lines.push(`Thanks so much for the time today. It was a really useful conversation.`, "")
  else if (tone === "detailed") lines.push(`Thanks for joining ${meeting.title}. Here is a full recap of where we landed.`, "", summary.overview, "")
  else lines.push("Thanks for today's discussion.", "")

  if (decisions.length > 0) {
    lines.push("We aligned on:", "", ...decisions.map((d) => `- ${d}`), "")
  }
  if (nextSteps.length > 0) {
    lines.push(
      "Next steps:",
      "",
      ...open.map((a) => {
        const owner = a.assignee?.name.split(" ")[0] ?? "Team"
        return `- ${owner}: ${a.title.charAt(0).toLowerCase()}${a.title.slice(1)}${a.dueDate ? ` (${weekdayDate(a.dueDate)})` : ""}`
      }),
      "",
    )
  }
  if (tone === "detailed" && summary.risks.length > 0) {
    lines.push("Risks to watch:", "", ...summary.risks.map((r) => `- ${r.title}`), "")
  }
  if (openQuestions.length > 0) {
    lines.push(`Still open: ${openQuestions.map((q) => q.text.replace(/\?$/, "").toLowerCase()).join("; ")}.`, "")
  }
  lines.push("Best,", signOffName)

  return {
    meetingId: meeting.id,
    subject: `${meeting.title}: Decisions & Next Steps`,
    body: lines.join("\n"),
    recipients,
    decisions,
    nextSteps,
    tone,
    generatedAt: nowIso(),
  }
}

/* ---------- service ---------- */

export class MockMeetingService implements MeetingService {
  list(params: MeetingListParams = {}): Promise<ListResponse<Meeting>> {
    return mockCall("meetings.list", (db) => {
      const statuses = statusList(params.status)
      const scope = params.scope ?? "my_calls"
      const filtered = db.accessibleMeetings().filter(
        (m) =>
          inScope(db, m, scope) &&
          inRange(m, params.range) &&
          (!statuses || statuses.includes(m.status)) &&
          (!params.ownerId || m.owner.id === params.ownerId || m.owner.email === params.ownerId) &&
          (!params.participantId || m.participants.some((p) => p.id === params.participantId || p.userId === params.participantId)) &&
          (!params.tagId || m.tags.some((t) => t.id === params.tagId)) &&
          (!params.dealId || m.dealId === params.dealId) &&
          matchesSearch(m, params.search),
      )
      return paginate(sortMeetings(filtered, params.sort).map((m) => db.present(m)), params)
    })
  }

  getById(id: string): Promise<Meeting> {
    return mockCall("meetings.getById", (db) => db.present(db.requireMeeting(id)))
  }

  create(input: CreateMeetingInput): Promise<Meeting> {
    return mockWrite("meetings.create", (db) => {
      const title = validateTitle(input.title)
      const platform = validatePlatform(input.platform)
      if (input.captureMode && !(CAPTURE_MODES as readonly string[]).includes(input.captureMode)) {
        throw new AppException("validation_error", { details: { fieldErrors: { captureMode: ["Choose a capture mode."] } } })
      }
      if (input.visibility && !(MEETING_VISIBILITIES as readonly string[]).includes(input.visibility)) {
        throw new AppException("validation_error", { details: { fieldErrors: { visibility: ["Choose who can see this."] } } })
      }
      const startedAt = input.startedAt ?? nowIso()
      if (Number.isNaN(Date.parse(startedAt))) {
        throw new AppException("validation_error", { details: { fieldErrors: { startedAt: ["Invalid date."] } } })
      }
      const event = input.calendarEventId ? db.state.calendarEvents.find((e) => e.id === input.calendarEventId) : undefined
      if (input.calendarEventId && !event) throw new AppException("not_found", { message: "That calendar event is no longer available." })

      const participants = [db.meAsParticipant("host")]
      for (const contact of input.participants ?? []) {
        if (contact.email && !isValidEmail(contact.email)) {
          throw new AppException("validation_error", { details: { fieldErrors: { participants: [`${contact.email} isn't a valid email.`] } } })
        }
        const participant = db.participantFrom(contact)
        if (!participants.some((p) => p.id === participant.id)) participants.push(participant)
      }

      const now = nowIso()
      const me = db.me
      const meeting: Meeting = {
        id: createId("mtg"),
        title,
        startedAt,
        duration: event ? Math.round((Date.parse(event.endsAt) - Date.parse(event.startsAt)) / 1000) : 0,
        participants,
        status: Date.parse(startedAt) > Date.now() ? "upcoming" : "ready_to_capture",
        visibility: input.visibility ?? defaultVisibility(db),
        owner: { id: me.personId, name: me.name, email: me.email },
        platform: platform ?? event?.conference?.provider ?? "other",
        captureMode: input.captureMode ?? db.state.settings.capture.defaultCaptureMode,
        tags: [],
        calendarEventId: event?.id,
        sharedWithMe: false,
        createdAt: now,
        updatedAt: now,
      }
      db.state.meetings.unshift(meeting)
      db.state.share[meeting.id] = { invited: [], removedPersonIds: [], link: null }
      if (event) event.meetingId = meeting.id
      return db.present(meeting)
    })
  }

  update(id: string, input: UpdateMeetingInput): Promise<Meeting> {
    return mockWrite("meetings.update", (db) => {
      const meeting = db.requireOwnedMeeting(id)
      if (input.title !== undefined) {
        meeting.title = validateTitle(input.title)
        db.renameMeetingRefs(meeting.id, meeting.title)
      }
      if (input.visibility !== undefined) {
        if (!(MEETING_VISIBILITIES as readonly string[]).includes(input.visibility)) {
          throw new AppException("validation_error", { details: { fieldErrors: { visibility: ["Choose who can see this."] } } })
        }
        meeting.visibility = input.visibility
      }
      if (input.tagIds !== undefined) {
        const tags = input.tagIds.map((tagId) => db.statics.tags.find((t) => t.id === tagId))
        if (tags.some((t) => !t)) throw new AppException("validation_error", { details: { fieldErrors: { tagIds: ["Unknown tag."] } } })
        meeting.tags = tags.map((t) => ({ ...t! }))
      }
      if (input.dealId !== undefined) {
        if (input.dealId === null) {
          const deal = db.state.deals.find((d) => d.id === meeting.dealId)
          if (deal) unlinkMeetingFromDeal(db, deal, meeting.id)
          meeting.dealId = undefined
        } else {
          const deal = db.state.deals.find((d) => d.id === input.dealId)
          if (!deal) throw new AppException("validation_error", { details: { fieldErrors: { dealId: ["Unknown deal."] } } })
          linkMeetingToDeal(db, deal, meeting)
        }
      }
      db.touchMeeting(meeting)
      return db.present(meeting)
    })
  }

  delete(id: string): Promise<void> {
    return mockWrite("meetings.delete", (db) => {
      const meeting = db.requireOwnedMeeting(id)
      if (meeting.status === "capturing" || meeting.status === "paused") {
        throw new AppException("conflict", { message: "Stop or discard the capture before deleting this meeting." })
      }
      deleteMeetingOp(db, id)
    })
  }

  startCapture(input: StartCaptureInput): Promise<Meeting> {
    return mockWrite("meetings.startCapture", (db) => db.present(startCaptureOp(db, input).meeting))
  }

  setCapturePaused(meetingId: string, paused: boolean): Promise<Meeting> {
    return mockWrite("meetings.setCapturePaused", (db) => db.present(setCapturePausedOp(db, meetingId, paused)))
  }

  stopCapture(meetingId: string, input: StopCaptureInput): Promise<Meeting> {
    return mockWrite("meetings.stopCapture", (db) => db.present(stopCaptureOp(db, meetingId, input)))
  }

  getProcessingStatus(meetingId: string): Promise<ProcessingProgress> {
    return mockCall("meetings.getProcessingStatus", (db) => db.processingFor(db.requireMeeting(meetingId)))
  }

  retryProcessing(meetingId: string): Promise<ProcessingProgress> {
    return mockWrite("meetings.retryProcessing", (db) => db.processingFor(retryProcessingOp(db, meetingId)))
  }

  getShareSettings(meetingId: string): Promise<ShareSettings> {
    return mockCall("meetings.getShareSettings", (db) => shareSettingsOf(db, db.requireMeeting(meetingId)))
  }

  share(meetingId: string, input: ShareMeetingInput): Promise<ShareSettings> {
    return mockWrite("meetings.share", (db) => {
      const meeting = db.requireMeeting(meetingId)
      if (!db.isOwner(meeting)) throw new AppException("forbidden", { message: "Only the meeting owner can change sharing." })
      const share = db.state.share[meeting.id] ?? { invited: [], removedPersonIds: [], link: null }
      db.state.share[meeting.id] = share

      if (input.visibility !== undefined) {
        if (!(MEETING_VISIBILITIES as readonly string[]).includes(input.visibility)) {
          throw new AppException("validation_error", { details: { fieldErrors: { visibility: ["Choose who can see this."] } } })
        }
        meeting.visibility = input.visibility
        // Re-sharing with attendees restores anyone previously removed.
        if (input.visibility !== "private") share.removedPersonIds = []
      }

      if (input.inviteEmails?.length) {
        const invalid = input.inviteEmails.filter((e) => !isValidEmail(e))
        if (invalid.length > 0) {
          throw new AppException("validation_error", {
            details: { fieldErrors: { inviteEmails: invalid.map((e) => `${e} isn't a valid email.`) } },
          })
        }
        const now = nowIso()
        for (const raw of input.inviteEmails) {
          const email = raw.trim().toLowerCase()
          if (email === meeting.owner.email?.toLowerCase()) continue
          if (share.invited.some((r) => r.email.toLowerCase() === email)) continue
          const person = db.personByEmail(email)
          share.invited.push({
            id: `rcp_${meeting.id}_${person?.id ?? createId("inv")}`,
            name: person?.name ?? email.split("@")[0],
            email: person?.email ?? email,
            source: "invited",
            addedAt: now,
            canRemove: true,
          })
          if (person) share.removedPersonIds = share.removedPersonIds.filter((id) => id !== person.id)
        }
      }

      if (input.linkEnabled !== undefined && db.state.settings.sharing.linkSharingAvailable) {
        share.link = input.linkEnabled
          ? (share.link ?? { url: `/my-calls/${meeting.id}?share=${createId("lnk").slice(4)}`, createdAt: nowIso() })
          : null
      }

      db.touchMeeting(meeting)
      return shareSettingsOf(db, meeting)
    })
  }

  unshare(meetingId: string, recipientId: string): Promise<ShareSettings> {
    return mockWrite("meetings.unshare", (db) => {
      const meeting = db.requireMeeting(meetingId)
      if (!db.isOwner(meeting)) throw new AppException("forbidden", { message: "Only the meeting owner can change sharing." })
      const settings = shareSettingsOf(db, meeting)
      const recipient = settings.recipients.find((r) => r.id === recipientId)
      if (!recipient) throw new AppException("not_found", { message: "That person no longer has access." })
      if (!recipient.canRemove) {
        throw new AppException("forbidden", { message: "Everyone on the team can see this meeting. Change visibility to remove them." })
      }
      const share = db.state.share[meeting.id]
      share.invited = share.invited.filter((r) => r.email.toLowerCase() !== recipient.email.toLowerCase())
      const person = meeting.participants.find((p) => recipientId === `rcp_${meeting.id}_${p.id}`)
      if (person && !share.removedPersonIds.includes(person.id)) share.removedPersonIds.push(person.id)
      db.touchMeeting(meeting)
      return shareSettingsOf(db, meeting)
    })
  }

  listDecisions(meetingId: string): Promise<Decision[]> {
    return mockCall("meetings.listDecisions", (db) => db.requireMeeting(meetingId).summary?.decisions ?? [])
  }

  getDecisionHistory(decisionId: string): Promise<DecisionHistory> {
    return mockCall("meetings.getDecisionHistory", (db) => {
      const all = db.accessibleMeetings().flatMap((m) => (m.summary?.decisions ?? []).map((d) => ({ d, m })))
      const start = all.find((x) => x.d.id === decisionId)
      if (!start) throw new AppException("not_found", { cause: new Error(`decision ${decisionId}`) })

      // Walk back through supersedesDecisionId, then forward to newer decisions.
      const chain = [start]
      let cursor = start
      while (cursor.d.supersedesDecisionId) {
        const previous = all.find((x) => x.d.id === cursor.d.supersedesDecisionId)
        if (!previous || chain.includes(previous)) break
        chain.unshift(previous)
        cursor = previous
      }
      cursor = start
      for (;;) {
        const newer = all.find((x) => x.d.supersedesDecisionId === cursor.d.id)
        if (!newer || chain.includes(newer)) break
        chain.push(newer)
        cursor = newer
      }

      const seeded = chain.map((x) => db.statics.decisionHistoryByDecisionId[x.d.id]).find(Boolean)
      const valueOf = (id: string, title: string) => seeded?.entries.find((e) => e.decisionId === id)?.value ?? title
      return {
        subject: seeded?.subject ?? start.d.title,
        entries: chain.map(({ d, m }) => ({
          decisionId: d.id,
          meeting: { id: m.id, title: m.title, startedAt: m.startedAt },
          value: valueOf(d.id, d.title),
          title: d.title,
          meetingId: d.meetingId,
          sourceSegmentId: d.sourceSegmentId,
          sourceTimestamp: d.sourceTimestamp,
        })),
      }
    })
  }

  generateFollowUp(meetingId: string, input: GenerateFollowUpInput = {}): Promise<FollowUpEmail> {
    return mockCall("meetings.generateFollowUp", (db) => {
      const meeting = db.requireMeeting(meetingId)
      if (meeting.status !== "ready" || !meeting.summary) {
        throw new AppException("conflict", { message: "The follow-up is available once the meeting is ready." })
      }
      const signOffName = input.signOffName?.trim() || db.state.user.firstName
      const template = db.statics.followUpTemplates[meeting.id]
      const untouched =
        template &&
        (!input.tone || input.tone === template.tone) &&
        !input.signOffName &&
        template.nextSteps.every((step) =>
          meeting.summary!.actionItems.some((a) => a.id === step.actionItemId && (a.status === "open" || a.status === "in_progress")),
        )
      // Hand-written template while it still matches the meeting; otherwise compose from live data.
      if (untouched) return { ...template, generatedAt: nowIso() }
      return composeFollowUp(db, meeting, input.tone ?? "concise", signOffName)
    })
  }
}
