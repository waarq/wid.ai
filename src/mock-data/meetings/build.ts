import type {
  ActionItem,
  Decision,
  KeyMoment,
  Meeting,
  MeetingRef,
  MeetingStats,
  MeetingSummary,
  Question,
  Risk,
  Topic,
  Transcript,
  TranscriptSegment,
} from "@/types"

import { atDay, clock, dateOnly, plusSeconds } from "../anchor"
import { participantOf, personProfiles, personRefOf } from "../people"
import { tagCatalog } from "../tags"
import type { Line, MeetingSpec } from "./spec"

export interface MeetingBundle {
  meeting: Meeting
  transcript: Transcript
  decisions: Decision[]
  actionItems: ActionItem[]
  questions: Question[]
  risks: Risk[]
  keyMoments: KeyMoment[]
}

export const meetingIdOf = (slug: string) => `mtg_${slug}`

function pad(n: number, size = 2) {
  return String(n).padStart(size, "0")
}

export function buildSegments(slug: string, lines: Line[], durationSec: number): TranscriptSegment[] {
  return lines.map(([speaker, at, text], index) => {
    const start = clock(at)
    const next = lines[index + 1]
    const words = text.split(/\s+/).length
    const spoken = Math.max(2, Math.round(words / 2.7))
    const ceiling = next ? clock(next[1]) - 1 : durationSec
    const end = Math.min(start + spoken, ceiling)
    const person = personProfiles[speaker]
    return {
      id: `seg_${slug}_${pad(index + 1)}`,
      speakerId: person.id,
      speakerName: person.name,
      startTime: start,
      endTime: end,
      text,
      confidence: Number((0.9 + ((index * 7) % 9) / 100).toFixed(2)),
    }
  })
}

function segmentAt(segments: TranscriptSegment[], at: string, slug: string): TranscriptSegment {
  const found = segments.find((s) => s.startTime === clock(at))
  if (!found) throw new Error(`mock-data: no transcript segment at ${at} in meeting "${slug}"`)
  return found
}

export function buildBundle(spec: MeetingSpec): MeetingBundle {
  const id = meetingIdOf(spec.slug)
  const startedAt = atDay(spec.day, spec.time)
  const captured = spec.status !== "upcoming" && spec.status !== "ready_to_capture"
  const endedAt = captured ? plusSeconds(startedAt, spec.durationSec) : undefined
  const readyAt = endedAt ? plusSeconds(endedAt, 13 * 60) : startedAt
  const ref: MeetingRef = { id, title: spec.title, startedAt }
  const participants = spec.participants.map(([key, role]) =>
    participantOf(key, role ?? (key === spec.owner ? "host" : undefined)),
  )
  const owner = personRefOf(spec.owner)

  const segments = spec.lines ? buildSegments(spec.slug, spec.lines, spec.durationSec) : []
  const transcript: Transcript = {
    meetingId: id,
    status: spec.lines ? "ready" : spec.status === "failed" ? "failed" : "pending",
    language: "en",
    duration: spec.durationSec,
    segments,
  }

  const decisions: Decision[] = []
  const actionItems: ActionItem[] = []
  const questions: Question[] = []
  const risks: Risk[] = []
  const keyMoments: KeyMoment[] = []
  const topics: Topic[] = []
  let summary: MeetingSummary | undefined
  let stats: MeetingStats | undefined

  const ins = spec.insights
  if (ins && spec.status === "ready") {
    const trace = (at: string) => {
      const seg = segmentAt(segments, at, spec.slug)
      return { meetingId: id, sourceSegmentId: seg.id, sourceTimestamp: seg.startTime }
    }
    const byKey = (key: keyof typeof personProfiles | undefined) =>
      key ? participants.find((p) => p.id === personProfiles[key].id) : undefined

    ins.decisions.forEach((d, i) =>
      decisions.push({
        id: `dec_${spec.slug}_${i + 1}`,
        title: d.title,
        context: d.context,
        decidedBy: byKey(d.by),
        supersedesDecisionId: d.supersedes,
        createdAt: readyAt,
        ...trace(d.at),
      }),
    )
    ins.actions.forEach((a, i) => {
      const done = a.status === "completed"
      actionItems.push({
        id: `act_${spec.slug}_${i + 1}`,
        title: a.title,
        description: a.description,
        assignee: byKey(a.who),
        dueDate: a.due === undefined ? undefined : dateOnly(a.due),
        status: a.status,
        meeting: ref,
        completedAt: done ? plusSeconds(readyAt, 20 * 3600) : undefined,
        createdAt: readyAt,
        updatedAt: done ? plusSeconds(readyAt, 20 * 3600) : readyAt,
        ...trace(a.at),
      })
    })
    ins.questions.forEach((q, i) =>
      questions.push({
        id: `qst_${spec.slug}_${i + 1}`,
        text: q.text,
        askedBy: byKey(q.by),
        status: q.status,
        answer: q.answer,
        ...trace(q.at),
      }),
    )
    ins.risks.forEach((r, i) =>
      risks.push({
        id: `rsk_${spec.slug}_${i + 1}`,
        title: r.title,
        description: r.description,
        severity: r.severity,
        raisedBy: byKey(r.by),
        ...trace(r.at),
      }),
    )
    const relId = (rel?: string) => {
      if (!rel) return undefined
      const n = Number(rel.slice(1))
      const prefix = { d: "dec", a: "act", q: "qst", r: "rsk" }[rel[0] as "d" | "a" | "q" | "r"]
      return `${prefix}_${spec.slug}_${n}`
    }
    ins.moments.forEach((m, i) =>
      keyMoments.push({
        id: `mom_${spec.slug}_${i + 1}`,
        type: m.type,
        title: m.title,
        description: m.description,
        relatedId: relId(m.rel),
        ...trace(m.at),
      }),
    )
    ins.topics.forEach((t, i) =>
      topics.push({
        id: `top_${spec.slug}_${i + 1}`,
        label: t.label,
        startTime: clock(t.from),
        endTime: clock(t.to),
      }),
    )
    summary = {
      overview: ins.overview,
      keyPoints: ins.keyPoints,
      decisions,
      actionItems,
      questions,
      risks,
      keyMoments,
      topics,
    }
    stats = {
      decisions: decisions.length,
      actionItems: actionItems.length,
      openQuestions: questions.filter((q) => q.status === "open").length,
      risks: risks.length,
    }
  }

  const meeting: Meeting = {
    id,
    title: spec.title,
    startedAt,
    endedAt,
    duration: spec.durationSec,
    participants,
    status: spec.status,
    visibility: spec.visibility,
    owner,
    platform: spec.platform,
    captureMode: spec.captureMode,
    tags: spec.tags.map((k) => tagCatalog[k]),
    summary,
    stats,
    processing: spec.processing ? { meetingId: id, ...spec.processing } : undefined,
    calendarEventId: spec.calendarEventId,
    dealId: spec.dealId,
    sharedWithMe: spec.sharedWithMe,
    createdAt: captured ? atDay(spec.day - 2, "12:00") : atDay(-3, "12:00"),
    updatedAt: captured ? readyAt : atDay(-3, "12:00"),
  }

  return { meeting, transcript, decisions, actionItems, questions, risks, keyMoments }
}
