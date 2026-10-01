import type { AnswerConfidence, AnswerSource, MeetingAnswer, SuggestedQuestion } from "@/types"

import { atDay } from "./anchor"
import { meetingIdOf, segmentTextAt, speakerAt, traceAt } from "./meetings"

/** Suggested questions shown for any meeting. */
export const suggestedQuestions: SuggestedQuestion[] = [
  { id: "sq_actions", text: "What are my action items?" },
  { id: "sq_risks", text: "What risks were mentioned?" },
  { id: "sq_client", text: "What did the client ask for?" },
  { id: "sq_unresolved", text: "What remains unresolved?" },
]

export const suggestedQuestionsByMeetingId: Record<string, SuggestedQuestion[]> = {
  [meetingIdOf("pp_1001")]: [
    { id: "sq_pp_launch", text: "What did we decide about the launch?" },
    { id: "sq_pp_actions", text: "What are my action items?" },
    { id: "sq_pp_risks", text: "What risks were mentioned?" },
    { id: "sq_pp_unresolved", text: "What remains unresolved?" },
  ],
  [meetingIdOf("client_discovery")]: [
    { id: "sq_cd_pricing", text: "What did the client say about pricing?" },
    { id: "sq_cd_ask", text: "What did the client ask for?" },
    { id: "sq_cd_next", text: "What are the next steps?" },
    { id: "sq_cd_risks", text: "What risks were mentioned?" },
  ],
}

function source(slug: string, at: string): AnswerSource {
  return {
    ...traceAt(slug, at),
    quote: segmentTextAt(slug, at),
    speakerName: speakerAt(slug, at),
  }
}

export interface CannedAnswer {
  /** Lowercase words that should appear in a question for this answer to match. */
  keywords: string[]
  answer: MeetingAnswer
}

function canned(
  id: string,
  slug: string,
  question: string,
  answer: string,
  sources: AnswerSource[],
  keywords: string[],
  confidence: AnswerConfidence = "high",
): CannedAnswer {
  return {
    keywords,
    answer: {
      id,
      meetingId: meetingIdOf(slug),
      question,
      answer,
      status: "answered",
      sources,
      confidence,
      createdAt: atDay(0, "09:20"),
    },
  }
}

/** Pre-written answers a mock AssistantService can match by keyword. */
export const assistantAnswers: CannedAnswer[] = [
  canned(
    "ans_pp_launch",
    "pp_1001",
    "What did we decide about the launch?",
    "The team agreed to launch on October 15. It was previously October 12. Waleed proposed moving it to the following Friday and the team set October 15 as the official target.",
    [source("pp_1001", "01:38"), source("pp_1001", "01:12")],
    ["launch", "decide", "date"],
  ),
  canned(
    "ans_pp_actions",
    "pp_1001",
    "What are my action items?",
    "You have two action items. Finish the API integration by Friday, October 9, and prepare the beta documentation by Monday, October 5.",
    [source("pp_1001", "39:12"), source("pp_1001", "39:40")],
    ["action", "my", "todo"],
  ),
  canned(
    "ans_pp_risks",
    "pp_1001",
    "What risks were mentioned?",
    "The main risk is that the API integration depends on an unconfirmed auth service release. If it slips past next Tuesday, the October 15 launch is affected. Hamza also raised that the new endpoints have no rate limits yet.",
    [source("pp_1001", "08:14"), source("pp_1001", "21:30")],
    ["risk", "risks", "blocker", "dependency"],
  ),
  canned(
    "ans_pp_unresolved",
    "pp_1001",
    "What remains unresolved?",
    "Customer onboarding for the beta still has no owner. Ayesha will look at whether customer success can take it and bring it to the next Leadership Sync.",
    [source("pp_1001", "31:05"), source("pp_1001", "32:50")],
    ["unresolved", "open", "owner", "onboarding"],
  ),
  canned(
    "ans_pp_beta",
    "pp_1001",
    "How big is the beta and is it paid?",
    "The beta is limited to 50 users and is free. Pricing will be reviewed in the week of October 26.",
    [source("pp_1001", "17:22"), source("pp_1001", "18:10")],
    ["beta", "pricing", "price", "users", "free"],
  ),
  canned(
    "ans_cd_pricing",
    "client_discovery",
    "What did the client say about pricing?",
    "Usman said Meridian needs to understand the pricing before moving forward, and that the number is well above budget. Finance expected closer to eighteen thousand against the proposed $24,800.",
    [source("client_discovery", "02:31"), source("client_discovery", "03:41")],
    ["pricing", "price", "budget", "cost", "client"],
  ),
  canned(
    "ans_cd_next",
    "client_discovery",
    "What are the next steps?",
    "Waleed will send a revised proposal tomorrow with phased pricing and a security overview. Ali will send an invite for a finance walkthrough on Friday, October 9.",
    [source("client_discovery", "12:50"), source("client_discovery", "31:00")],
    ["next", "steps", "proposal", "follow"],
  ),
]

/** Used when no canned answer matches. Never invents a source. */
export const assistantNotFoundText =
  "I could not find that in this meeting. Try asking about decisions, action items, risks or open questions."
