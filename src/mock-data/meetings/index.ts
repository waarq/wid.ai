import type {
  ActionItem,
  Decision,
  KeyMoment,
  Meeting,
  MeetingRef,
  Question,
  Risk,
  Traceable,
  Transcript,
} from "@/types"

import { clock } from "../anchor"
import { buildBundle, meetingIdOf, type MeetingBundle } from "./build"
import { clientDiscovery } from "./client-discovery"
import { customerResearch } from "./customer-research"
import { designReview } from "./design-review"
import { engineeringSync } from "./engineering-sync"
import { leadershipSync } from "./leadership-sync"
import { productPlanningOct1 } from "./product-planning-oct-1"
import { productPlanningSep18 } from "./product-planning-sep-18"
import { productPlanningSep25 } from "./product-planning-sep-25"
import { salesDemo } from "./sales-demo"
import { sprintPlanning } from "./sprint-planning"
import { designReviewUpcoming, engineeringSyncUpcoming } from "./upcoming"
import { weeklyOneOnOne } from "./weekly-one-on-one"

export { meetingIdOf }

const specs = [
  productPlanningOct1,
  sprintPlanning,
  engineeringSync,
  clientDiscovery,
  leadershipSync,
  salesDemo,
  designReview,
  weeklyOneOnOne,
  customerResearch,
  productPlanningSep25,
  productPlanningSep18,
  designReviewUpcoming,
  engineeringSyncUpcoming,
]

const bundles: MeetingBundle[] = specs.map(buildBundle)

/** Newest first. Upcoming meetings sort ahead of captured ones. */
export const meetings: Meeting[] = bundles
  .map((b) => b.meeting)
  .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt))

export const meetingsById: Record<string, Meeting> = Object.fromEntries(
  meetings.map((m) => [m.id, m]),
)

/** Transcripts exist for every meeting that has been captured (including failed ones). */
export const transcriptsByMeetingId: Record<string, Transcript> = Object.fromEntries(
  bundles
    .filter((b) => b.transcript.status !== "pending")
    .map((b) => [b.meeting.id, b.transcript]),
)

export const decisions: Decision[] = bundles.flatMap((b) => b.decisions)
export const actionItems: ActionItem[] = bundles.flatMap((b) => b.actionItems)
export const questions: Question[] = bundles.flatMap((b) => b.questions)
export const risks: Risk[] = bundles.flatMap((b) => b.risks)
export const keyMoments: KeyMoment[] = bundles.flatMap((b) => b.keyMoments)

export const meetingTypeTitles = [
  "Product Planning",
  "Engineering Sync",
  "Client Discovery",
  "Sales Demo",
  "Weekly 1:1",
  "Customer Research",
  "Design Review",
  "Sprint Planning",
  "Leadership Sync",
] as const

export function meetingRef(meetingId: string): MeetingRef {
  const m = meetingsById[meetingId]
  if (!m) throw new Error(`mock-data: unknown meeting ${meetingId}`)
  return { id: m.id, title: m.title, startedAt: m.startedAt }
}

/** Build a Traceable from a meeting slug and an "mm:ss" timestamp that must hit a real segment. */
export function traceAt(slug: string, at: string): Traceable {
  const meetingId = meetingIdOf(slug)
  const seg = transcriptsByMeetingId[meetingId]?.segments.find((s) => s.startTime === clock(at))
  if (!seg) throw new Error(`mock-data: no segment at ${at} in ${meetingId}`)
  return { meetingId, sourceSegmentId: seg.id, sourceTimestamp: seg.startTime }
}

export function segmentTextAt(slug: string, at: string): string {
  const { meetingId, sourceSegmentId } = traceAt(slug, at)
  const seg = transcriptsByMeetingId[meetingId].segments.find((s) => s.id === sourceSegmentId)
  return seg ? seg.text : ""
}

export function speakerAt(slug: string, at: string): string {
  const { meetingId, sourceSegmentId } = traceAt(slug, at)
  const seg = transcriptsByMeetingId[meetingId].segments.find((s) => s.id === sourceSegmentId)
  return seg ? seg.speakerName : ""
}
