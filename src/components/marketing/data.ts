/**
 * The single place marketing visuals read demo data. Product mock-ups on the
 * marketing site are built from the same fixtures the app uses, so the story
 * (Product Planning, 42 minutes, launch moved to October 15) stays consistent.
 * Everything here is pure and deterministic: no clock reads.
 */
import {
  MOCK_NOW,
  actionItems,
  assistantAnswers,
  calendarEvents,
  clock,
  currentUser,
  launchDateHistory,
  meetingsById,
  productPlanningFollowUp,
  transcriptsByMeetingId,
} from "@/mock-data"
import type { ConferenceProvider, KeyMomentType } from "@/types"

const PRODUCT_PLANNING_ID = "mtg_pp_1001"
const KARACHI = "Asia/Karachi"

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const mm = String(m).padStart(2, "0")
  const ss = String(sec).padStart(2, "0")
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

const dayKey = (iso: string) => iso.slice(0, 10)

function whenLabel(iso: string): string {
  const today = dayKey(MOCK_NOW)
  const day = dayKey(iso)
  if (day === today) return "Today"
  const diff = Math.round((Date.parse(`${day}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000)
  if (diff === -1) return "Yesterday"
  if (diff === 1) return "Tomorrow"
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: KARACHI })
}

export function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: KARACHI })
}

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: KARACHI,
  })
}

/** "Friday", "Monday", "tomorrow" or "No deadline", relative to the fixed anchor date. */
export function dueLabel(dueDate?: string): string {
  if (!dueDate) return "No deadline"
  const diff = Math.round(
    (Date.parse(`${dueDate}T00:00:00Z`) - Date.parse(`${dayKey(MOCK_NOW)}T00:00:00Z`)) / 86_400_000,
  )
  if (diff === 0) return "today"
  if (diff === 1) return "tomorrow"
  return new Date(`${dueDate}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" })
}

const providerLabels: Record<ConferenceProvider, string> = {
  zoom: "Zoom",
  google_meet: "Google Meet",
  microsoft_teams: "Microsoft Teams",
  in_person: "In person",
  other: "Video call",
}

function productPlanning() {
  const meeting = meetingsById[PRODUCT_PLANNING_ID]
  if (!meeting?.summary || !meeting.stats) throw new Error("marketing: Product Planning fixture is missing")
  return { meeting, summary: meeting.summary, stats: meeting.stats }
}

export interface ActionRow {
  id: string
  title: string
  meetingTitle: string
  due: string
  /** Mono timestamp of the source moment. */
  source: string
}

function toActionRow(id: string): ActionRow {
  const item = actionItems.find((a) => a.id === id)
  if (!item) throw new Error(`marketing: missing action item ${id}`)
  return {
    id: item.id,
    title: item.title,
    meetingTitle: item.meeting.title,
    due: dueLabel(item.dueDate),
    source: formatClock(item.sourceTimestamp),
  }
}

export interface BriefData {
  title: string
  when: string
  minutes: number
  participants: number
  stats: { decisions: number; actions: number; questions: number }
  overview: string
  keyPoints: string[]
  decisions: string[]
  yourActions: ActionRow[]
  moments: TimelineMoment[]
  durationLabel: string
}

export interface TimelineMoment {
  id: string
  type: KeyMomentType
  title: string
  timestamp: number
  label: string
  /** 0..100 position along the meeting. */
  position: number
}

export function getBriefData(): BriefData {
  const { meeting, summary, stats } = productPlanning()
  const mine = actionItems.filter(
    (a) => a.meeting.id === meeting.id && a.assignee?.userId === currentUser.id,
  )
  return {
    title: meeting.title,
    when: whenLabel(meeting.startedAt),
    minutes: Math.round(meeting.duration / 60),
    participants: meeting.participants.length,
    stats: { decisions: stats.decisions, actions: stats.actionItems, questions: stats.openQuestions },
    overview: summary.overview,
    keyPoints: summary.keyPoints.slice(0, 3),
    decisions: summary.decisions.map((d) => d.title),
    yourActions: mine.slice(0, 2).map((a) => toActionRow(a.id)),
    moments: summary.keyMoments.map((m) => ({
      id: m.id,
      type: m.type,
      title: m.title,
      timestamp: m.sourceTimestamp,
      label: formatClock(m.sourceTimestamp),
      position: (m.sourceTimestamp / meeting.duration) * 100,
    })),
    durationLabel: formatClock(meeting.duration),
  }
}

export function getYourActions(): ActionRow[] {
  return ["act_pp_1001_1", "act_client_discovery_1", "act_eng_sync_1"].map(toActionRow)
}

export interface TranscriptLine {
  id: string
  time: string
  speaker: string
  text: string
}

export interface MomentDemo extends TimelineMoment {
  lines: TranscriptLine[]
  focusId: string
}

/** Key moments for the Smart moments demo, each with the transcript lines around it. */
export function getSmartMomentsData(): { duration: number; durationLabel: string; moments: MomentDemo[] } {
  const { meeting, summary } = productPlanning()
  const segments = transcriptsByMeetingId[meeting.id].segments
  const moments = summary.keyMoments.map<MomentDemo>((m) => {
    const index = segments.findIndex((s) => s.id === m.sourceSegmentId)
    const slice = segments.slice(Math.max(0, index - 1), index + 2)
    return {
      id: m.id,
      type: m.type,
      title: m.title,
      timestamp: m.sourceTimestamp,
      label: formatClock(m.sourceTimestamp),
      position: (m.sourceTimestamp / meeting.duration) * 100,
      focusId: m.sourceSegmentId,
      lines: slice.map((s) => ({
        id: s.id,
        time: formatClock(s.startTime),
        speaker: s.speakerName.split(" ")[0],
        text: s.text,
      })),
    }
  })
  return { duration: meeting.duration, durationLabel: formatClock(meeting.duration), moments }
}

export interface AskDemoItem {
  id: string
  question: string
  answer: string
  sources: Array<{ id: string; time: string; speaker: string; quote: string }>
}

export function getAskDemoData(): { meetingTitle: string; items: AskDemoItem[] } {
  const { meeting } = productPlanning()
  const ids = ["ans_pp_launch", "ans_pp_risks", "ans_pp_unresolved"]
  const items = ids.flatMap((id) => {
    const found = assistantAnswers.find((a) => a.answer.id === id)
    if (!found) return []
    const { answer } = found
    return [
      {
        id: answer.id,
        question: answer.question,
        answer: answer.answer,
        sources: answer.sources.map((s) => ({
          id: s.sourceSegmentId,
          time: formatClock(s.sourceTimestamp),
          speaker: s.speakerName ?? "",
          quote: s.quote ?? "",
        })),
      },
    ]
  })
  return { meetingTitle: meeting.title, items }
}

export interface SearchHit {
  id: string
  meetingTitle: string
  date: string
  time: string
  speaker: string
  quote: string
}

function hit(meetingId: string, at: string): SearchHit {
  const meeting = meetingsById[meetingId]
  const seg = transcriptsByMeetingId[meetingId]?.segments.find((s) => s.startTime === clock(at))
  if (!meeting || !seg) throw new Error(`marketing: missing segment ${meetingId} ${at}`)
  return {
    id: seg.id,
    meetingTitle: meeting.title,
    date: shortDate(meeting.startedAt),
    time: formatClock(seg.startTime),
    speaker: seg.speakerName,
    quote: seg.text,
  }
}

export function getSearchDemoData(): { query: string; hits: SearchHit[] } {
  return {
    query: "What did the client say about pricing?",
    hits: [hit("mtg_client_discovery", "02:31"), hit("mtg_client_discovery", "03:41"), hit("mtg_sales_demo", "16:45")],
  }
}

export interface HistoryStep {
  id: string
  date: string
  value: string
  title: string
  time: string
}

export function getDecisionHistoryData(): { meetingTitle: string; subject: string; steps: HistoryStep[] } {
  if (!launchDateHistory) throw new Error("marketing: decision history fixture is missing")
  return {
    meetingTitle: launchDateHistory.entries[0]?.meeting.title ?? "Product Planning",
    subject: launchDateHistory.subject,
    steps: launchDateHistory.entries.map((e) => ({
      id: e.decisionId,
      date: shortDate(e.meeting.startedAt),
      value: e.value,
      title: e.title,
      time: formatClock(e.sourceTimestamp),
    })),
  }
}

export function getFollowUpData() {
  return {
    subject: productPlanningFollowUp.subject,
    body: productPlanningFollowUp.body,
    recipients: productPlanningFollowUp.recipients.map((r) => r.name),
  }
}

export interface UpcomingRow {
  id: string
  title: string
  day: string
  time: string
  provider: string
}

/** The first few calendar events, shown with their capture state ("Not capturing"). */
export function getUpcomingEvents(limit = 4): UpcomingRow[] {
  return calendarEvents.slice(0, limit).map((e) => ({
    id: e.id,
    title: e.title,
    day: whenLabel(e.startsAt),
    time: timeLabel(e.startsAt),
    provider: providerLabels[e.conference?.provider ?? "other"],
  }))
}

export const demoUserFirstName = currentUser.firstName

/** The three lines that settle the launch date, plus the decision they produced. */
export function getLaunchExchange(): { lines: TranscriptLine[]; decision: string; source: string } {
  const { meeting, summary } = productPlanning()
  const segments = transcriptsByMeetingId[meeting.id].segments
  const wanted = ["01:12", "01:24", "01:38"].map(clock)
  const lines = segments
    .filter((s) => wanted.includes(s.startTime))
    .map((s) => ({
      id: s.id,
      time: formatClock(s.startTime),
      speaker: s.speakerName.split(" ")[0],
      text: s.text,
    }))
  const decision = summary.decisions[0]
  return {
    lines,
    decision: decision.title,
    source: `${meeting.title} · ${formatClock(decision.sourceTimestamp)}`,
  }
}
