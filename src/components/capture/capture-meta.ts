import { FileText, Mic, Video, type LucideIcon } from "lucide-react"

import type { CaptureMode, ProcessingStepId } from "@/types"

export interface CaptureModeMeta {
  value: CaptureMode
  label: string
  description: string
  icon: LucideIcon
}

export const CAPTURE_MODE_OPTIONS: readonly CaptureModeMeta[] = [
  { value: "audio", label: "Audio", description: "Record the conversation. Best for most meetings.", icon: Mic },
  { value: "video", label: "Video", description: "Record audio and the shared screen.", icon: Video },
  {
    value: "transcript_only",
    label: "Transcript only",
    description: "Keep the transcript and notes. No recording is stored.",
    icon: FileText,
  },
]

export const CAPTURE_MODE_LABEL: Record<CaptureMode, string> = {
  audio: "Audio",
  video: "Video",
  transcript_only: "Transcript only",
}

/** PRD copy for the processing screen, in order. */
export const PROCESSING_STEPS: readonly { id: ProcessingStepId; label: string }[] = [
  { id: "upload", label: "Recording uploaded" },
  { id: "transcribe", label: "Transcript generated" },
  { id: "understand", label: "Understanding conversation" },
  { id: "extract_decisions", label: "Extracting decisions" },
  { id: "extract_actions", label: "Finding action items" },
]

export const MANUAL_CAPTURE_COPY =
  "Nothing is recorded automatically. WIT starts only when you press Start capture, and you can pause or stop at any time."
