import { AppException } from "@/lib/utils/errors"
import type { TranscriptService } from "@/services/interfaces"
import type { Transcript, TranscriptSearchMatch } from "@/types"

import { mockCall } from "./runtime"
import { findHighlights, normalize, rawTokens } from "./utils"

export class MockTranscriptService implements TranscriptService {
  getByMeetingId(meetingId: string): Promise<Transcript> {
    return mockCall("transcripts.getByMeetingId", (db) => {
      const meeting = db.requireMeeting(meetingId)
      if (meeting.status === "upcoming" || meeting.status === "ready_to_capture") {
        throw new AppException("not_found", { message: "This meeting hasn't been captured yet." })
      }
      return (
        db.state.transcripts[meetingId] ?? {
          meetingId,
          status: meeting.status === "failed" ? "failed" : "pending",
          language: "en",
          duration: meeting.duration,
          segments: [],
        }
      )
    })
  }

  search(meetingId: string, query: string): Promise<TranscriptSearchMatch[]> {
    return mockCall("transcripts.search", (db) => {
      db.requireMeeting(meetingId)
      const trimmed = query.trim()
      if (!trimmed) return []
      const tokens = rawTokens(trimmed)
      const segments = db.state.transcripts[meetingId]?.segments ?? []
      return segments.flatMap((segment) => {
        const text = normalize(segment.text)
        const phrase = text.includes(normalize(trimmed))
        const allTokens = tokens.length > 0 && tokens.every((t) => text.includes(t))
        if (!phrase && !allTokens) return []
        return [
          {
            segmentId: segment.id,
            startTime: segment.startTime,
            speakerName: segment.speakerName,
            text: segment.text,
            highlights: findHighlights(segment.text, trimmed),
          },
        ]
      })
    })
  }
}
