import type { MeetingAnswer, SuggestedQuestion } from "@/types"

/** "Ask this meeting". Shaped so a backend RAG endpoint can drop in unchanged. */
export interface AssistantService {
  ask(meetingId: string, question: string): Promise<MeetingAnswer>
  /** Personalised by job function when AI settings allow it. */
  getSuggestedQuestions(meetingId: string): Promise<SuggestedQuestion[]>
  /** Previous questions for this meeting, oldest first. */
  listHistory(meetingId: string): Promise<MeetingAnswer[]>
}
