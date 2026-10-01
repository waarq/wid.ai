import type { MeetingSpec } from "./spec"

/** Processing failed during transcription: there is a meeting record but no transcript or summary. */
export const designReview: MeetingSpec = {
  slug: "design_review",
  title: "Design Review",
  day: -2,
  time: "11:00",
  durationSec: 2400,
  status: "failed",
  visibility: "attendees",
  platform: "google_meet",
  captureMode: "audio",
  owner: "sara",
  participants: [["sara"], ["waleed"], ["ayesha"]],
  tags: ["design"],
  sharedWithMe: true,
  processing: {
    status: "failed",
    steps: [
      { id: "upload", status: "complete" },
      { id: "transcribe", status: "failed" },
      { id: "understand", status: "pending" },
      { id: "extract_decisions", status: "pending" },
      { id: "extract_actions", status: "pending" },
    ],
    startedAt: "2026-09-29T11:42:00+05:00",
    error: {
      code: "processing_failed",
      message: "We couldn't transcribe this recording. The audio was uploaded safely, so you can try again.",
      retryable: true,
    },
  },
}
