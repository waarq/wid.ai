import { beforeAll, describe, expect, it } from "vitest"

import type { SearchResult, SearchResultType } from "@/types"

import { getMockDb, type MockDb } from "./db"
import { runSearch } from "./search-engine"

let db: MockDb

beforeAll(async () => {
  db = await getMockDb()
})

function ofType<T extends SearchResultType>(results: SearchResult[], type: T): Extract<SearchResult, { type: T }>[] {
  return results.filter((r): r is Extract<SearchResult, { type: T }> => r.type === type)
}

describe("runSearch", () => {
  it("matches the PRD 'launch' example across meetings, decisions and actions", () => {
    const results = runSearch(db, "launch")
    const meetings = ofType(results, "meeting").map((r) => r.title)
    expect(meetings).toContain("Product Planning")

    const decisions = ofType(results, "decision")
    // The current launch decision outranks the ones it superseded.
    expect(decisions[0].title).toBe("Launch moved to October 15")

    const actions = ofType(results, "action").map((r) => r.title)
    expect(actions).toContain("Confirm launch checklist")
  })

  it("prefix-matches and stems tokens", () => {
    const titles = (q: string) => ofType(runSearch(db, q), "decision").map((r) => r.decisionId)
    expect(titles("launc")).toEqual(titles("launch"))
    expect(titles("launched").length).toBeGreaterThan(0)
  })

  it("returns results sorted by score and within the limit", () => {
    const results = runSearch(db, "launch", { limit: 5 })
    expect(results).toHaveLength(5)
    for (let i = 1; i < results.length; i++) expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score)
  })

  it("filters by type, and only includes commands when not excluded", () => {
    const actionsOnly = runSearch(db, "launch", { types: ["action"] })
    expect(actionsOnly.every((r) => r.type === "action")).toBe(true)
    expect(ofType(runSearch(db, "settings"), "command").length).toBeGreaterThan(0)
    expect(ofType(runSearch(db, "settings", { types: ["meeting", "action"] }), "command")).toEqual([])
  })

  it("scopes to one meeting and drops global types", () => {
    const results = runSearch(db, "launch", { meetingId: "mtg_pp_1001" })
    expect(results.length).toBeGreaterThan(0)
    for (const r of results) {
      expect(["meeting", "transcript", "decision", "action"]).toContain(r.type)
      if ("meetingId" in r) expect(r.meetingId).toBe("mtg_pp_1001")
    }
  })

  it("keeps every insight result traceable to a real segment", () => {
    const results = ["launch", "beta", "api", "pricing", "onboarding"].flatMap((q) => runSearch(db, q, { limit: 100 }))
    const traceable = results.filter(
      (r): r is Extract<SearchResult, { type: "transcript" | "decision" | "action" }> =>
        r.type === "transcript" || r.type === "decision" || r.type === "action",
    )
    expect(traceable.length).toBeGreaterThan(0)
    for (const r of traceable) {
      const segment = db.state.transcripts[r.meetingId]?.segments.find((s) => s.id === r.sourceSegmentId)
      expect(segment, `${r.id} -> ${r.sourceSegmentId}`).toBeDefined()
      expect(r.sourceTimestamp).toBe(segment!.startTime)
    }
  })

  it("caps transcript lines per meeting in global search", () => {
    const perMeeting = new Map<string, number>()
    for (const r of ofType(runSearch(db, "the api", { limit: 100 }), "transcript")) {
      perMeeting.set(r.meetingId, (perMeeting.get(r.meetingId) ?? 0) + 1)
    }
    for (const count of perMeeting.values()) expect(count).toBeLessThanOrEqual(2)
  })

  it("requires every token to match", () => {
    expect(runSearch(db, "launch zebra")).toEqual([])
  })

  it("returns nothing for empty or stopword-free blank queries", () => {
    expect(runSearch(db, "")).toEqual([])
    expect(runSearch(db, "   ")).toEqual([])
  })

  it("finds people and deals by name", () => {
    expect(ofType(runSearch(db, "Ayesha"), "person")[0]?.title).toBe("Ayesha Malik")
    expect(ofType(runSearch(db, "Meridian"), "deal")[0]?.company).toBe("Meridian Freight")
  })
})
