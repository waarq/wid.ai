import { addDays, format } from "date-fns"

import type {
  ActionItem,
  ActionItemStatus,
  Decision,
  KeyMoment,
  KeyMomentType,
  Meeting,
  MeetingSummary,
  Participant,
  Question,
  QuestionStatus,
  Risk,
  RiskSeverity,
  Topic,
  Transcript,
  TranscriptSegment,
} from "@/types"

/*
 * Believable content for meetings captured in the prototype. A scripted
 * conversation template is cast with the meeting's real participants,
 * scaled to the captured length, and its insights are built from the
 * resulting segments, so every decision, action, question, risk and key
 * moment points at a real segment id and timestamp.
 *
 * Two templates: an internal launch-readiness check-in and an external
 * customer call (chosen when an external participant is present). Short
 * captures (< 4 min) use only the core lines.
 */

type Role = "h" | "a" | "b" | "c"

interface TemplateLine {
  role: Role
  at: number
  text: string
  core?: boolean
}

interface TemplateInsights {
  overview: string
  keyPoints: string[]
  decisions: Array<{ line: number; title: string; context?: string; by: Role }>
  actions: Array<{ line: number; title: string; description?: string; who: Role; dueInDays?: number }>
  questions: Array<{ line: number; text: string; by: Role; status: QuestionStatus; answer?: string }>
  risks: Array<{ line: number; title: string; description?: string; severity: RiskSeverity; by: Role }>
  moments: Array<{ line: number; type: KeyMomentType; title: string; rel?: string }>
  topics: Array<{ label: string; from: number; to: number }>
}

interface Template {
  lines: TemplateLine[]
  insights: TemplateInsights
}

const t = (mmss: string): number => {
  const [m, s] = mmss.split(":").map(Number)
  return m * 60 + s
}

/* Line numbers in insights are 1-based indexes into `lines`. */
const INTERNAL: Template = {
  lines: [
    { role: "a", at: t("00:05"), core: true, text: "Thanks for jumping on. I want to leave this call knowing exactly what still stands between us and the launch." },
    { role: "h", at: t("00:22"), core: true, text: "Agreed. From my side the API integration is merged to staging, and the regression pass starts tomorrow morning." },
    { role: "b", at: t("00:48"), text: "The rate limits are in as well. I tested them against the dashboard and nothing tripped." },
    { role: "a", at: t("01:10"), text: "Good. What about the onboarding guide, {c}?" },
    { role: "c", at: t("01:24"), text: "The three screens are done. I'm waiting on final copy for the calendar step, then it can ship." },
    { role: "h", at: t("01:52"), text: "I can review that copy today so it isn't blocking you." },
    { role: "a", at: t("02:20"), core: true, text: "The thing I'm most worried about is that we still don't have a single launch checklist. Everything lives in four different docs." },
    { role: "b", at: t("02:46"), text: "That's fair. Last time we nearly missed the support handover because it was only in someone's notes." },
    { role: "h", at: t("03:05"), core: true, text: "I'll pull everything into one launch checklist and confirm each item with its owner by Friday." },
    { role: "a", at: t("03:30"), core: true, text: "Perfect. Let's treat that checklist as the source of truth from now on." },
    { role: "c", at: t("04:02"), core: true, text: "Does the feedback button make it into the beta build, or is that after launch?" },
    { role: "b", at: t("04:20"), text: "It's about a day of work. I'd rather ship it now, since the beta depends on feedback." },
    { role: "a", at: t("04:41"), core: true, text: "Then it's in. The feedback button ships with the beta build." },
    { role: "b", at: t("05:15"), core: true, text: "One concern. The capture-flow tests are still flaky on staging, so a red build might not mean anything." },
    { role: "h", at: t("05:40"), text: "That could hide a real regression. I'd like those tests fixed before we trust the pass." },
    { role: "b", at: t("06:05"), core: true, text: "I'll switch them to fake timers. That should take about half a day." },
    { role: "a", at: t("06:40"), core: true, text: "What's our plan if the auth release slips again?" },
    { role: "h", at: t("07:02"), core: true, text: "We keep the old token refresh behind the flag. Rolling back is a config change, not a deploy." },
    { role: "c", at: t("07:40"), text: "I'd like one more pass on the empty states with real data before we invite anyone." },
    { role: "a", at: t("08:05"), text: "Let's do that on Monday. {c}, can you book thirty minutes with {h}?" },
    { role: "c", at: t("08:22"), core: true, text: "Yes, I'll send an invite for the empty-state review on Monday morning." },
    { role: "a", at: t("09:10"), text: "Last thing: who's sending the beta invites? It should come from one person, not three." },
    { role: "h", at: t("09:32"), text: "I think it should be you, {a}, since you own the list." },
    { role: "a", at: t("09:50"), core: true, text: "Fine, I'll send the beta invites once the checklist is green." },
    { role: "b", at: t("10:30"), text: "Sounds good. I'll post a summary of the test fix in the engineering channel." },
    { role: "a", at: t("11:05"), core: true, text: "Great. Thanks, everyone. Checklist by Friday, tests fixed, and the feedback button is in." },
  ],
  insights: {
    overview:
      "The team walked through what still stands between them and the launch. The API integration is on staging and the regression pass starts tomorrow. Readiness items were scattered across four documents, so {h} will consolidate them into one launch checklist by Friday. The feedback button ships with the beta build, and flaky capture-flow tests need fixing before the regression pass can be trusted.",
    keyPoints: [
      "The API integration is merged to staging; the regression pass starts tomorrow.",
      "One launch checklist replaces four separate documents.",
      "The feedback button is in scope for the beta build.",
      "Rollback for the auth dependency is a config change behind the flag.",
    ],
    decisions: [
      { line: 10, by: "a", title: "The launch checklist becomes the single source of truth", context: "Readiness items were spread across four documents. One checklist now tracks every item and its owner." },
      { line: 13, by: "a", title: "The feedback button ships with the beta build", context: "It is about a day of work, and the beta depends on collecting feedback." },
    ],
    actions: [
      { line: 9, who: "h", dueInDays: 3, title: "Confirm launch checklist", description: "Pull every readiness item into one checklist and confirm each item with its owner." },
      { line: 16, who: "b", dueInDays: 2, title: "Stabilise the capture-flow tests", description: "Switch the flaky tests to fake timers so a red build means something." },
      { line: 21, who: "c", dueInDays: 4, title: "Book the empty-state review", description: "Thirty minutes with real data before any beta invites go out." },
      { line: 24, who: "a", dueInDays: 5, title: "Send the beta invites", description: "Send from one person once the launch checklist is complete." },
    ],
    questions: [
      { line: 11, by: "c", status: "answered", text: "Does the feedback button make it into the beta build?", answer: "Yes. It ships with the beta build." },
      { line: 17, by: "a", status: "answered", text: "What is the plan if the auth release slips again?", answer: "Keep the old token refresh behind the flag. Rolling back is a config change." },
    ],
    risks: [
      { line: 14, by: "b", severity: "medium", title: "Flaky capture-flow tests could hide a real regression", description: "A red build on staging may not mean anything until the tests use fake timers." },
    ],
    moments: [
      { line: 9, type: "commitment", title: "{h} commits to a single launch checklist", rel: "a1" },
      { line: 10, type: "decision", title: "Checklist is the source of truth", rel: "d1" },
      { line: 13, type: "decision", title: "Feedback button is in the beta build", rel: "d2" },
      { line: 14, type: "risk", title: "Flaky tests could hide regressions", rel: "r1" },
      { line: 18, type: "insight", title: "Rollback is a config change, not a deploy" },
    ],
    topics: [
      { label: "Readiness status", from: 1, to: 6 },
      { label: "Launch checklist", from: 7, to: 10 },
      { label: "Beta build scope", from: 11, to: 13 },
      { label: "Test stability and rollback", from: 14, to: 18 },
      { label: "Empty states and invites", from: 19, to: 26 },
    ],
  },
}

const CUSTOMER: Template = {
  lines: [
    { role: "a", at: t("00:06"), core: true, text: "Thanks for making time, {c}. We'd like to understand how your team handles meeting follow-ups today." },
    { role: "c", at: t("00:20"), core: true, text: "Sure. Right now the notes live in the head of whoever ran the call, and maybe a shared doc if we're lucky." },
    { role: "h", at: t("00:44"), text: "When something gets missed, where does it usually break down?" },
    { role: "c", at: t("01:02"), core: true, text: "Commitments. Someone promises a customer a date, and two weeks later nobody remembers who said it." },
    { role: "a", at: t("01:30"), text: "That's exactly what WID tracks. Every commitment links back to the moment it was said." },
    { role: "c", at: t("01:52"), core: true, text: "That would help. The other thing is we can't have anything recording automatically. Our clients would object." },
    { role: "h", at: t("02:15"), core: true, text: "Understood. Capture is always manual. Nothing records unless someone on your side starts it." },
    { role: "c", at: t("02:40"), core: true, text: "Good. Where would the notes be stored? Our IT team will ask about data location." },
    { role: "h", at: t("03:02"), core: true, text: "I'll confirm the region options in writing so your IT team has them before their review." },
    { role: "c", at: t("03:30"), core: true, text: "Thanks. Their review usually takes about three weeks, so earlier is better." },
    { role: "a", at: t("04:05"), text: "Would a small pilot make that easier? One team for two weeks, before a wider rollout." },
    { role: "c", at: t("04:28"), core: true, text: "Yes, a pilot with our operations team makes sense. Maybe ten people." },
    { role: "a", at: t("04:50"), core: true, text: "Then let's plan a two-week pilot for your operations team, starting after the IT review." },
    { role: "c", at: t("05:20"), core: true, text: "What would pricing look like for ten seats?" },
    { role: "a", at: t("05:42"), core: true, text: "For a pilot that size we'd keep it simple. I'll send a pricing summary with the pilot plan." },
    { role: "c", at: t("06:10"), core: true, text: "Perfect. I'll share the list of pilot users by the end of the week." },
    { role: "h", at: t("06:35"), text: "Is there anyone else who should be part of the decision?" },
    { role: "c", at: t("06:52"), core: true, text: "Our director will want to see it before we sign, so I'll bring her to the next call." },
    { role: "a", at: t("07:20"), text: "Great. We'll send everything tomorrow and set up that call." },
    { role: "c", at: t("07:41"), core: true, text: "Sounds good. Thanks, both of you." },
  ],
  insights: {
    overview:
      "{c} from {company} described how follow-ups break down today: commitments made on calls are forgotten within weeks. Automatic recording is a non-starter for their clients, which manual capture addresses. Both sides agreed on a two-week pilot with about ten people from operations, after an IT review that may take three weeks. {h} will confirm data location options, and {a} will send the pilot plan with pricing.",
    keyPoints: [
      "Missed commitments are the main pain point.",
      "Capture must stay manual; nothing records automatically.",
      "A two-week pilot with about ten people is planned.",
      "The IT review of data location could take three weeks.",
    ],
    decisions: [
      { line: 13, by: "a", title: "Two-week pilot with the {company} operations team", context: "About ten people, starting after their IT review." },
    ],
    actions: [
      { line: 9, who: "h", dueInDays: 2, title: "Send data location options", description: "Confirm the region options in writing ahead of the IT review." },
      { line: 15, who: "a", dueInDays: 1, title: "Send pilot plan and pricing summary", description: "Ten-seat pilot pricing, kept simple." },
      { line: 16, who: "c", dueInDays: 4, title: "Share the list of pilot users" },
    ],
    questions: [
      { line: 8, by: "c", status: "open", text: "Where would meeting notes be stored?" },
      { line: 14, by: "c", status: "answered", text: "What would pricing look like for ten seats?", answer: "A pricing summary will be sent with the pilot plan." },
    ],
    risks: [
      { line: 10, by: "c", severity: "medium", title: "{company}'s IT review could take three weeks", description: "The pilot cannot start until data location is approved." },
      { line: 6, by: "c", severity: "low", title: "Automatic recording would be a blocker for their clients", description: "Addressed by manual capture, but worth restating in the proposal." },
    ],
    moments: [
      { line: 4, type: "insight", title: "Missed commitments are the real pain" },
      { line: 6, type: "risk", title: "No automatic recording, ever", rel: "r2" },
      { line: 8, type: "question", title: "Where would notes be stored?", rel: "q1" },
      { line: 9, type: "commitment", title: "{h} will confirm data location", rel: "a1" },
      { line: 13, type: "decision", title: "Two-week pilot agreed", rel: "d1" },
    ],
    topics: [
      { label: "Current follow-up process", from: 1, to: 5 },
      { label: "Recording and data location", from: 6, to: 10 },
      { label: "Pilot scope", from: 11, to: 13 },
      { label: "Pricing and next steps", from: 14, to: 20 },
    ],
  },
}

const SHORT_CAPTURE_SECONDS = 240

export interface GeneratedContent {
  transcript: Transcript
  summary: MeetingSummary
  /** Duration actually covered by the transcript (>= captured length). */
  duration: number
}

function firstName(p: Participant): string {
  return p.name.split(/\s+/)[0] ?? p.name
}

function cast(meeting: Meeting, hostId: string, external: boolean): Record<Role, Participant> {
  const host = meeting.participants.find((p) => p.id === hostId) ?? meeting.participants[0]
  const others = meeting.participants.filter((p) => p.id !== host.id)
  if (external) {
    const client = others.find((p) => p.isExternal) ?? others[0] ?? host
    const colleague = others.find((p) => !p.isExternal) ?? host
    return { h: host, a: colleague, b: colleague, c: client }
  }
  const a = others[0] ?? host
  const b = others[1] ?? others[0] ?? host
  const c = others[2] ?? others[1] ?? others[0] ?? host
  return { h: host, a, b, c }
}

function fill(text: string, roles: Record<Role, Participant>, company: string): string {
  return text
    .replaceAll("{h}", firstName(roles.h))
    .replaceAll("{a}", firstName(roles.a))
    .replaceAll("{b}", firstName(roles.b))
    .replaceAll("{c}", firstName(roles.c))
    .replaceAll("{company}", company)
}

function pad(n: number): string {
  return String(n).padStart(2, "0")
}

/**
 * Generates a transcript and a traceable summary for a just-captured meeting.
 * `hostId` is the participant id of the person who captured it.
 */
export function generateMeetingContent(meeting: Meeting, hostId: string, capturedSeconds: number): GeneratedContent {
  const external = meeting.participants.some((p) => p.isExternal)
  const template = external ? CUSTOMER : INTERNAL
  const roles = cast(meeting, hostId, external)
  const company = roles.c.company ?? "their team"
  const suffix = meeting.id.replace(/^mtg_/, "")
  const short = capturedSeconds < SHORT_CAPTURE_SECONDS

  // 1-based template line number -> included index.
  const included = template.lines
    .map((line, index) => ({ line, number: index + 1 }))
    .filter(({ line }) => !short || line.core)

  const naturalLength = template.lines[template.lines.length - 1].at + 12
  const target = Math.max(capturedSeconds, included.length * 2 + 2)
  const factor = short
    ? target / (included.length * 6 + 6)
    : target / naturalLength

  const segments: TranscriptSegment[] = []
  const segmentByLine = new Map<number, TranscriptSegment>()
  let previousStart = -1
  included.forEach(({ line, number }, index) => {
    const rawStart = short ? (index * 6 + 2) * factor : line.at * factor
    const startTime = Math.max(Math.round(rawStart), previousStart + 1)
    previousStart = startTime
    const speaker = roles[line.role]
    const segment: TranscriptSegment = {
      id: `seg_${suffix}_${pad(index + 1)}`,
      speakerId: speaker.id,
      speakerName: speaker.name,
      startTime,
      endTime: startTime + 1,
      text: fill(line.text, roles, company),
      confidence: Number((0.9 + ((index * 7) % 9) / 100).toFixed(2)),
    }
    segments.push(segment)
    segmentByLine.set(number, segment)
  })

  const duration = Math.max(target, previousStart + 2)
  segments.forEach((segment, index) => {
    const next = segments[index + 1]
    const words = segment.text.split(/\s+/).length
    const spoken = Math.max(1, Math.round((words / 2.7) * Math.min(1, factor)))
    const ceiling = next ? next.startTime - 0.5 : duration
    segment.endTime = Math.max(segment.startTime + 0.5, Math.min(segment.startTime + spoken, ceiling))
  })

  const meetingRef = { id: meeting.id, title: meeting.title, startedAt: meeting.startedAt }
  const now = new Date().toISOString()
  const trace = (line: number) => {
    const segment = segmentByLine.get(line)
    return segment
      ? { meetingId: meeting.id, sourceSegmentId: segment.id, sourceTimestamp: segment.startTime }
      : null
  }
  const ins = template.insights
  const text = (value: string) => fill(value, roles, company)

  const decisions: Decision[] = []
  ins.decisions.forEach((d) => {
    const source = trace(d.line)
    if (!source) return
    decisions.push({
      id: `dec_${suffix}_${decisions.length + 1}`,
      title: text(d.title),
      context: d.context ? text(d.context) : undefined,
      decidedBy: roles[d.by],
      createdAt: now,
      ...source,
    })
  })

  const actionItems: ActionItem[] = []
  ins.actions.forEach((a) => {
    const source = trace(a.line)
    if (!source) return
    const status: ActionItemStatus = "open"
    actionItems.push({
      id: `act_${suffix}_${actionItems.length + 1}`,
      title: text(a.title),
      description: a.description ? text(a.description) : undefined,
      assignee: roles[a.who],
      dueDate: a.dueInDays === undefined ? undefined : format(addDays(new Date(), a.dueInDays), "yyyy-MM-dd"),
      status,
      meeting: meetingRef,
      createdAt: now,
      updatedAt: now,
      ...source,
    })
  })

  const questions: Question[] = []
  ins.questions.forEach((q) => {
    const source = trace(q.line)
    if (!source) return
    questions.push({
      id: `qst_${suffix}_${questions.length + 1}`,
      text: text(q.text),
      askedBy: roles[q.by],
      status: q.status,
      answer: q.answer ? text(q.answer) : undefined,
      ...source,
    })
  })

  const risks: Risk[] = []
  ins.risks.forEach((r) => {
    const source = trace(r.line)
    if (!source) return
    risks.push({
      id: `rsk_${suffix}_${risks.length + 1}`,
      title: text(r.title),
      description: r.description ? text(r.description) : undefined,
      severity: r.severity,
      raisedBy: roles[r.by],
      ...source,
    })
  })

  // Resolve "a1"/"d2" style references against what was actually included.
  const templateIndexToId = (prefix: "d" | "a" | "q" | "r", n: number): string | undefined => {
    const lists = { d: ins.decisions, a: ins.actions, q: ins.questions, r: ins.risks }
    const built = { d: decisions, a: actionItems, q: questions, r: risks }
    const spec = lists[prefix][n - 1]
    if (!spec) return undefined
    const source = trace(spec.line)
    return source ? built[prefix].find((x) => x.sourceSegmentId === source.sourceSegmentId)?.id : undefined
  }

  const keyMoments: KeyMoment[] = []
  ins.moments.forEach((m) => {
    const source = trace(m.line)
    if (!source) return
    const relatedId = m.rel ? templateIndexToId(m.rel[0] as "d" | "a" | "q" | "r", Number(m.rel.slice(1))) : undefined
    keyMoments.push({ id: `mom_${suffix}_${keyMoments.length + 1}`, type: m.type, title: text(m.title), relatedId, ...source })
  })

  const topics: Topic[] = []
  ins.topics.forEach((topic) => {
    const inRange = included.filter(({ number }) => number >= topic.from && number <= topic.to)
    if (inRange.length === 0) return
    const first = segmentByLine.get(inRange[0].number)!
    const last = segmentByLine.get(inRange[inRange.length - 1].number)!
    topics.push({ id: `top_${suffix}_${topics.length + 1}`, label: topic.label, startTime: first.startTime, endTime: last.endTime })
  })

  return {
    duration,
    transcript: { meetingId: meeting.id, status: "ready", language: "en", duration, segments },
    summary: {
      overview: text(ins.overview),
      keyPoints: ins.keyPoints.map(text),
      decisions,
      actionItems,
      questions,
      risks,
      keyMoments,
      topics,
    },
  }
}
