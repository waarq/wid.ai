import type { Traceable } from "@/types"

import { alerts } from "./alerts"
import { assistantAnswers, suggestedQuestionsByMeetingId } from "./assistant"
import { calendarEvents } from "./calendar"
import { deals } from "./deals"
import { followUpTemplates } from "./follow-up"
import {
  actionItems,
  decisions,
  keyMoments,
  meetingTypeTitles,
  meetings,
  meetingsById,
  questions,
  risks,
  transcriptsByMeetingId,
} from "./meetings"
import { people } from "./people"
import { playlistItems } from "./playlist"
import { decisionHistories, meetingSeries } from "./series"
import { shareSettingsByMeetingId } from "./sharing"

function unique(label: string, ids: string[], errors: string[]) {
  const seen = new Set<string>()
  for (const id of ids) {
    if (seen.has(id)) errors.push(`duplicate ${label} id: ${id}`)
    seen.add(id)
  }
}

/**
 * Verifies the fixtures are internally consistent: traceable insights, ordered
 * transcripts, unique ids and resolvable references. Throws with every problem found.
 */
export function assertMockIntegrity(): void {
  const errors: string[] = []

  const personIds = new Set(people.map((p) => p.id))

  unique("meeting", meetings.map((m) => m.id), errors)
  unique("decision", decisions.map((d) => d.id), errors)
  unique("action item", actionItems.map((a) => a.id), errors)
  unique("question", questions.map((q) => q.id), errors)
  unique("risk", risks.map((r) => r.id), errors)
  unique("key moment", keyMoments.map((k) => k.id), errors)
  unique("deal", deals.map((d) => d.id), errors)
  unique("playlist item", playlistItems.map((p) => p.id), errors)
  unique("alert", alerts.map((a) => a.id), errors)
  unique("calendar event", calendarEvents.map((e) => e.id), errors)
  unique(
    "segment",
    Object.values(transcriptsByMeetingId).flatMap((t) => t.segments.map((s) => s.id)),
    errors,
  )

  // Transcripts: ordered, within duration, speakers are participants.
  for (const [meetingId, transcript] of Object.entries(transcriptsByMeetingId)) {
    const meeting = meetingsById[meetingId]
    if (!meeting) {
      errors.push(`transcript for unknown meeting ${meetingId}`)
      continue
    }
    const participantIds = new Set(meeting.participants.map((p) => p.id))
    let previousEnd = -1
    for (const seg of transcript.segments) {
      if (seg.startTime < 0 || seg.endTime <= seg.startTime)
        errors.push(`${seg.id}: bad range ${seg.startTime}-${seg.endTime}`)
      if (seg.startTime < previousEnd)
        errors.push(`${seg.id}: starts before the previous segment ends`)
      if (seg.endTime > meeting.duration)
        errors.push(`${seg.id}: ends after meeting duration ${meeting.duration}`)
      if (!participantIds.has(seg.speakerId))
        errors.push(`${seg.id}: speaker ${seg.speakerId} is not a participant`)
      previousEnd = seg.endTime
    }
    if (meeting.status === "ready" || meeting.status === "understanding") {
      const minimum = meeting.title === "Product Planning" && meeting.id === "mtg_pp_1001" ? 40 : 20
      if (transcript.segments.length < minimum)
        errors.push(`${meetingId}: ${transcript.segments.length} segments, expected at least ${minimum}`)
    }
  }

  // Traceability: every insight points to a real segment with a matching timestamp.
  const traceable: Array<[string, Traceable]> = [
    ...decisions.map((x): [string, Traceable] => [x.id, x]),
    ...actionItems.map((x): [string, Traceable] => [x.id, x]),
    ...questions.map((x): [string, Traceable] => [x.id, x]),
    ...risks.map((x): [string, Traceable] => [x.id, x]),
    ...keyMoments.map((x): [string, Traceable] => [x.id, x]),
    ...playlistItems.map((x): [string, Traceable] => [x.id, x]),
    ...deals.flatMap((d) => d.signals.map((s): [string, Traceable] => [s.id, s])),
    ...assistantAnswers.flatMap((a) =>
      a.answer.sources.map((s, i): [string, Traceable] => [`${a.answer.id}#${i}`, s]),
    ),
    ...decisionHistories.flatMap((h) => h.entries.map((e): [string, Traceable] => [e.decisionId, e])),
  ]
  for (const [id, t] of traceable) {
    const seg = transcriptsByMeetingId[t.meetingId]?.segments.find((s) => s.id === t.sourceSegmentId)
    if (!seg) errors.push(`${id}: source segment ${t.sourceSegmentId} not found in ${t.meetingId}`)
    else if (seg.startTime !== t.sourceTimestamp)
      errors.push(`${id}: sourceTimestamp ${t.sourceTimestamp} != segment start ${seg.startTime}`)
  }

  // References.
  for (const m of meetings) {
    if (m.dealId && !deals.some((d) => d.id === m.dealId)) errors.push(`${m.id}: unknown deal ${m.dealId}`)
    for (const p of m.participants)
      if (!personIds.has(p.id)) errors.push(`${m.id}: unknown participant ${p.id}`)
    if (!personIds.has(m.owner.id)) errors.push(`${m.id}: unknown owner ${m.owner.id}`)
    if (m.calendarEventId && !calendarEvents.some((e) => e.id === m.calendarEventId))
      errors.push(`${m.id}: unknown calendar event ${m.calendarEventId}`)
    if (m.status === "ready" && !m.summary) errors.push(`${m.id}: ready meeting has no summary`)
  }
  for (const a of actionItems) {
    if (a.assignee && !meetingsById[a.meetingId]?.participants.some((p) => p.id === a.assignee?.id))
      errors.push(`${a.id}: assignee is not a participant`)
  }
  for (const d of decisions)
    if (d.supersedesDecisionId && !decisions.some((x) => x.id === d.supersedesDecisionId))
      errors.push(`${d.id}: supersedes unknown decision`)
  for (const k of keyMoments)
    if (
      k.relatedId &&
      ![...decisions, ...actionItems, ...questions, ...risks].some((x) => x.id === k.relatedId)
    )
      errors.push(`${k.id}: unknown relatedId ${k.relatedId}`)
  for (const d of deals) {
    for (const ref of d.meetings) if (!meetingsById[ref.id]) errors.push(`${d.id}: unknown meeting ${ref.id}`)
    if (d.nextAction?.actionItemId && !actionItems.some((a) => a.id === d.nextAction?.actionItemId))
      errors.push(`${d.id}: unknown next action item`)
  }
  for (const p of playlistItems) {
    if (!meetingsById[p.meeting.id]) errors.push(`${p.id}: unknown meeting`)
    if (p.endTimestamp !== undefined && p.endTimestamp <= p.sourceTimestamp)
      errors.push(`${p.id}: endTimestamp before start`)
  }
  for (const a of alerts) {
    const t = a.target
    const ids =
      t.kind === "meeting"
        ? [t.meetingId]
        : t.kind === "action_item" || t.kind === "decision"
          ? [t.meetingId]
          : t.kind === "meetings"
            ? t.meetingIds
            : []
    for (const id of ids) if (!meetingsById[id]) errors.push(`${a.id}: unknown meeting ${id}`)
    if (t.kind === "deal" && !deals.some((d) => d.id === t.dealId)) errors.push(`${a.id}: unknown deal`)
    if (t.kind === "action_item" && !actionItems.some((x) => x.id === t.actionItemId))
      errors.push(`${a.id}: unknown action item`)
  }
  for (const s of meetingSeries)
    for (const id of s.meetingIds) if (!meetingsById[id]) errors.push(`${s.id}: unknown meeting ${id}`)
  for (const id of [
    ...Object.keys(suggestedQuestionsByMeetingId),
    ...Object.keys(followUpTemplates),
    ...Object.keys(shareSettingsByMeetingId),
  ])
    if (!meetingsById[id]) errors.push(`unknown meeting key ${id}`)

  // Coverage.
  for (const title of meetingTypeTitles)
    if (!meetings.some((m) => m.title === title)) errors.push(`missing meeting type: ${title}`)
  if (calendarEvents.length !== 12) errors.push(`expected 12 calendar events, got ${calendarEvents.length}`)
  const pp = meetingsById["mtg_pp_1001"]
  if (!pp?.stats || pp.stats.decisions !== 3 || pp.stats.actionItems !== 4 || pp.stats.openQuestions !== 1)
    errors.push("Product Planning (Oct 1) must have 3 decisions, 4 actions, 1 open question")

  // Content hygiene.
  const text = JSON.stringify({ meetings, deals, alerts, playlistItems })
  if (/acme/i.test(text)) errors.push("contains forbidden name: Acme")
  if (/99\.99/.test(text)) errors.push("contains 99.99")
  if (/\p{Extended_Pictographic}/u.test(text)) errors.push("contains an emoji")

  if (errors.length > 0) {
    throw new Error(`Mock data integrity check failed (${errors.length}):\n- ${errors.join("\n- ")}`)
  }
}
