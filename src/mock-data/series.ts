import type { Decision, DecisionHistory } from "@/types"

import { decisions, meetingRef, meetingsById } from "./meetings"

export interface MeetingSeries {
  id: string
  title: string
  /** Oldest first. */
  meetingIds: string[]
}

/** Recurring meetings that form a series. Used to derive decision history. */
export const meetingSeries: MeetingSeries[] = [
  {
    id: "series_product_planning",
    title: "Product Planning",
    meetingIds: ["mtg_pp_0918", "mtg_pp_0925", "mtg_pp_1001"],
  },
]

export const seriesIdByMeetingId: Record<string, string> = Object.fromEntries(
  meetingSeries.flatMap((s) => s.meetingIds.map((id) => [id, s.id])),
)

const VALUE_BY_DECISION_ID: Record<string, string> = {
  dec_pp_0918_1: "Oct 5",
  dec_pp_0925_1: "Oct 12",
  dec_pp_1001_1: "Oct 15",
}

function chainFor(latest: Decision, all: Decision[]): Decision[] {
  const chain: Decision[] = [latest]
  let cursor: Decision | undefined = latest
  while (cursor?.supersedesDecisionId) {
    const previousId: string = cursor.supersedesDecisionId
    cursor = all.find((d) => d.id === previousId)
    if (cursor) chain.unshift(cursor)
  }
  return chain
}

function historyFor(subject: string, latest: Decision): DecisionHistory {
  return {
    subject,
    entries: chainFor(latest, decisions).map((d) => ({
      decisionId: d.id,
      meeting: meetingRef(d.meetingId),
      value: VALUE_BY_DECISION_ID[d.id] ?? d.title,
      title: d.title,
      meetingId: d.meetingId,
      sourceSegmentId: d.sourceSegmentId,
      sourceTimestamp: d.sourceTimestamp,
    })),
  }
}

const latestLaunchDecision = decisions.find((d) => d.id === "dec_pp_1001_1")

/** "Launch -> Oct 5 -> Oct 12 -> Oct 15". Entries are oldest first. */
export const launchDateHistory: DecisionHistory | undefined = latestLaunchDecision
  ? historyFor("Launch date", latestLaunchDecision)
  : undefined

export const decisionHistories: DecisionHistory[] = launchDateHistory ? [launchDateHistory] : []

/** Any decision id in a chain resolves to the full history for that chain. */
export const decisionHistoryByDecisionId: Record<string, DecisionHistory> = Object.fromEntries(
  decisionHistories.flatMap((h) => h.entries.map((e) => [e.decisionId, h])),
)

/** Meetings in the same series as the given meeting, oldest first. */
export function meetingsInSeries(meetingId: string): string[] {
  const seriesId = seriesIdByMeetingId[meetingId]
  return meetingSeries.find((s) => s.id === seriesId)?.meetingIds.filter((id) => id in meetingsById) ?? []
}
