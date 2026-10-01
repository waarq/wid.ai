import { describe, expect, it } from "vitest"

import {
  assistantNotFoundText,
  currentUser,
  decisions,
  meetingsById,
  people,
  transcriptsByMeetingId,
} from "@/mock-data"
import type { Meeting } from "@/types"

import { answerQuestion, suggestQuestions, type AssistantContext, type AssistantResult } from "./assistant-engine"

const me = {
  personId: people.find((p) => p.userId === currentUser.id)!.id,
  userId: currentUser.id,
}

function contextFor(meetingId: string, overrides: Partial<AssistantContext> = {}): AssistantContext {
  return {
    meeting: meetingsById[meetingId],
    segments: transcriptsByMeetingId[meetingId]?.segments ?? [],
    me,
    findDecision: (id) => decisions.find((d) => d.id === id),
    notFoundText: assistantNotFoundText,
    ...overrides,
  }
}

function ask(meetingId: string, question: string): AssistantResult {
  return answerQuestion(contextFor(meetingId), question)
}

/** Every cited source must be a real segment of the meeting, with a matching timestamp. */
function expectTraceable(meetingId: string, result: AssistantResult): void {
  const segments = transcriptsByMeetingId[meetingId].segments
  expect(result.sources.length).toBeGreaterThan(0)
  for (const source of result.sources) {
    expect(source.meetingId).toBe(meetingId)
    const segment = segments.find((s) => s.id === source.sourceSegmentId)
    expect(segment, source.sourceSegmentId).toBeDefined()
    expect(source.sourceTimestamp).toBe(segment!.startTime)
  }
}

const PP = "mtg_pp_1001"
const CD = "mtg_client_discovery"

describe("answerQuestion", () => {
  it("answers the launch decision with its source and the superseded date", () => {
    const result = ask(PP, "What did we decide about the launch?")
    expect(result.status).toBe("answered")
    expect(result.confidence).toBe("high")
    expect(result.answer).toContain("October 15")
    expect(result.answer).toContain("replaced an earlier decision")
    expectTraceable(PP, result)
    expect(result.sources[0].sourceTimestamp).toBe(98) // 01:38
  })

  it("answers 'my action items' with only the viewer's open items", () => {
    const result = ask(PP, "What are my action items?")
    expect(result.status).toBe("answered")
    expect(result.answer).toMatch(/^You have two open action items/)
    expect(result.answer).toContain("Finish API integration")
    expect(result.answer).toContain("Prepare beta documentation")
    expect(result.answer).not.toContain("onboarding guide")
    expectTraceable(PP, result)
  })

  it("ranks risks by severity", () => {
    const result = ask(PP, "What risks were mentioned?")
    expect(result.answer).toMatch(/The main one \(high\): API integration depends on an unconfirmed auth service release/)
    expectTraceable(PP, result)
  })

  it("lists unresolved questions", () => {
    const result = ask(PP, "What remains unresolved?")
    expect(result.answer).toContain("who owns customer onboarding during the beta")
    expectTraceable(PP, result)
  })

  it("finds client asks only from external speakers", () => {
    const result = ask(CD, "What did the client ask for?")
    expect(result.status).toBe("answered")
    const external = new Set(meetingsById[CD].participants.filter((p) => p.isExternal).map((p) => p.id))
    const segments = transcriptsByMeetingId[CD].segments
    for (const source of result.sources) {
      expect(external.has(segments.find((s) => s.id === source.sourceSegmentId)!.speakerId)).toBe(true)
    }
  })

  it("says there were no client requests in an internal meeting", () => {
    const result = ask(PP, "What did the client ask for?")
    expect(result.status).toBe("not_found")
    expect(result.sources).toEqual([])
    expect(result.answer).toMatch(/No one from outside the team/)
  })

  it("falls back to the transcript for unstructured topics", () => {
    const result = ask(PP, "screen reader accessibility")
    expect(result.status).toBe("answered")
    expectTraceable(PP, result)
  })

  it("returns not_found with no sources instead of inventing an answer", () => {
    const result = ask(PP, "zebra quantum marmalade")
    expect(result).toEqual({ answer: assistantNotFoundText, status: "not_found", sources: [], confidence: "low" })
  })

  it("does not answer for a meeting that is still processing", () => {
    const meeting: Meeting = { ...meetingsById[PP], summary: undefined, status: "understanding" }
    const result = answerQuestion(contextFor(PP, { meeting }), "What did we decide?")
    expect(result.status).toBe("not_found")
    expect(result.answer).toMatch(/still being processed/)
  })

  it("drops sources whose segment is missing", () => {
    const result = answerQuestion(contextFor(PP, { segments: [] }), "What did we decide about the launch?")
    expect(result.status).toBe("not_found")
    expect(result.sources).toEqual([])
  })

  it("is deterministic", () => {
    expect(ask(PP, "Summarize this meeting")).toEqual(ask(PP, "Summarize this meeting"))
  })
})

describe("suggestQuestions", () => {
  it("is grounded in what the meeting contains and ordered by job function", () => {
    const meeting = meetingsById[CD]
    const sales = suggestQuestions(meeting, me, "sales").map((q) => q.text)
    expect(sales[0]).toBe("What did the client ask for?")
    expect(sales.length).toBeLessThanOrEqual(4)
    const internal = suggestQuestions(meetingsById[PP], me, null).map((q) => q.text)
    expect(internal).not.toContain("What did the client ask for?")
    expect(internal[0]).toBe("What are my action items?")
  })

  it("returns nothing for a meeting without a summary", () => {
    expect(suggestQuestions({ ...meetingsById[PP], summary: undefined }, me, null)).toEqual([])
  })
})
