import type { Meeting, MeetingVisibility, ProcessingStepId } from "@/types"

export const VISIBILITY_LABEL: Record<MeetingVisibility, string> = {
  private: "Private",
  attendees: "Shared with attendees",
  team: "Shared with team",
}

const STEP_LABEL: Record<ProcessingStepId, string> = {
  upload: "Uploading audio",
  transcribe: "Transcribing",
  understand: "Understanding the conversation",
  extract_decisions: "Finding decisions",
  extract_actions: "Finding action items",
}

/** Human description of where processing currently is. */
export function processingStageLabel(meeting: Meeting): string {
  const active = meeting.processing?.steps.find((s) => s.status === "active")
  if (active) return STEP_LABEL[active.id]
  switch (meeting.status) {
    case "transcribing":
      return "Transcribing"
    case "understanding":
      return "Understanding the conversation"
    default:
      return "Getting your meeting ready"
  }
}

/** Fraction 0..1 of completed processing steps, or null when unknown. */
export function processingFraction(meeting: Meeting): number | null {
  const steps = meeting.processing?.steps
  if (!steps || steps.length === 0) return null
  return steps.filter((s) => s.status === "complete").length / steps.length
}

export function isInFlight(meeting: Meeting): boolean {
  return ["processing", "transcribing", "understanding"].includes(meeting.status)
}

export function meetingHref(meeting: Pick<Meeting, "id">): string {
  return `/my-calls/${meeting.id}`
}
