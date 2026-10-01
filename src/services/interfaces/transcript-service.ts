import type { Transcript, TranscriptSearchMatch } from "@/types"

export interface TranscriptService {
  getByMeetingId(meetingId: string): Promise<Transcript>
  /** In-transcript search for the transcript panel. */
  search(meetingId: string, query: string): Promise<TranscriptSearchMatch[]>
}
