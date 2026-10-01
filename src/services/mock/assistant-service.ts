import { AppException } from "@/lib/utils/errors"
import type { AssistantService, SearchService } from "@/services/interfaces"
import type { MeetingAnswer, SearchParams, SearchResult, SuggestedQuestion } from "@/types"

import { answerQuestion, suggestQuestions } from "./assistant-engine"
import { mockCall, mockWrite } from "./runtime"
import { runSearch } from "./search-engine"
import { createId, nowIso } from "./utils"

const MAX_HISTORY = 50

export class MockAssistantService implements AssistantService {
  ask(meetingId: string, question: string): Promise<MeetingAnswer> {
    return mockWrite("assistant.ask", (db) => {
      const trimmed = question.trim()
      if (!trimmed || trimmed.length > 500) {
        throw new AppException("validation_error", { details: { fieldErrors: { question: ["Ask a question (under 500 characters)."] } } })
      }
      const meeting = db.requireMeeting(meetingId)
      const allDecisions = db.accessibleMeetings().flatMap((m) => m.summary?.decisions ?? [])
      const result = answerQuestion(
        {
          meeting,
          segments: db.state.transcripts[meetingId]?.segments ?? [],
          me: db.me,
          findDecision: (id) => allDecisions.find((d) => d.id === id),
          notFoundText: db.statics.notFoundText,
        },
        trimmed,
      )
      const answer: MeetingAnswer = { id: createId("ans"), meetingId, question: trimmed, createdAt: nowIso(), ...result }
      const history = (db.state.assistantHistory[meetingId] ??= [])
      history.push(answer)
      if (history.length > MAX_HISTORY) history.splice(0, history.length - MAX_HISTORY)
      return answer
    })
  }

  getSuggestedQuestions(meetingId: string): Promise<SuggestedQuestion[]> {
    return mockCall("assistant.getSuggestedQuestions", (db) => {
      const meeting = db.requireMeeting(meetingId)
      const { ai } = db.state.settings
      if (!ai.showSuggestedQuestions || meeting.status !== "ready") return []
      const curated = db.statics.suggestedQuestionsByMeetingId[meetingId]
      if (curated && !ai.personalizeByJobFunction) return curated
      return curated ?? suggestQuestions(meeting, db.me, ai.personalizeByJobFunction ? db.state.user.jobFunction : null)
    })
  }

  listHistory(meetingId: string): Promise<MeetingAnswer[]> {
    return mockCall("assistant.listHistory", (db) => {
      db.requireMeeting(meetingId)
      return db.state.assistantHistory[meetingId] ?? []
    })
  }
}

export class MockSearchService implements SearchService {
  search(query: string, params: SearchParams = {}): Promise<SearchResult[]> {
    return mockCall("search.search", (db) => {
      if (query.length > 200) {
        throw new AppException("validation_error", { details: { fieldErrors: { query: ["Use a shorter search."] } } })
      }
      return runSearch(db, query, params)
    })
  }
}
