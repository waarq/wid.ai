import { AppException } from "@/lib/utils/errors"
import type { PlaylistService } from "@/services/interfaces"
import {
  PLAYLIST_ITEM_KINDS,
  type AddPlaylistItemInput,
  type ListResponse,
  type PlaylistItem,
  type PlaylistListParams,
  type UpdatePlaylistItemInput,
} from "@/types"

import { mockCall, mockWrite } from "./runtime"
import { createId, nowIso, paginate } from "./utils"

function validateTitle(title: string | undefined): string {
  const value = (title ?? "").trim()
  if (!value || value.length > 120) {
    throw new AppException("validation_error", { details: { fieldErrors: { title: ["Add a short title (under 120 characters)."] } } })
  }
  return value
}

export class MockPlaylistService implements PlaylistService {
  list(params: PlaylistListParams = {}): Promise<ListResponse<PlaylistItem>> {
    return mockCall("playlist.list", (db) => {
      const accessible = new Set(db.accessibleMeetings().map((m) => m.id))
      const items = db.state.playlist
        .filter(
          (p) =>
            accessible.has(p.meetingId) &&
            (!params.kind || p.kind === params.kind) &&
            (!params.meetingId || p.meetingId === params.meetingId),
        )
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      return paginate(items, params)
    })
  }

  /** Idempotent: saving the same moment twice returns the existing item. */
  add(input: AddPlaylistItemInput): Promise<PlaylistItem> {
    return mockWrite("playlist.add", (db) => {
      if (!(PLAYLIST_ITEM_KINDS as readonly string[]).includes(input.kind)) {
        throw new AppException("validation_error", { details: { fieldErrors: { kind: ["Unknown kind."] } } })
      }
      const title = validateTitle(input.title)
      const meeting = db.requireMeeting(input.meetingId)
      const segment = db.state.transcripts[meeting.id]?.segments.find((s) => s.id === input.sourceSegmentId)
      if (!segment) {
        throw new AppException("validation_error", { details: { fieldErrors: { sourceSegmentId: ["That moment isn't in this transcript."] } } })
      }
      if (input.sourceTimestamp < segment.startTime - 0.5 || input.sourceTimestamp > segment.endTime + 0.5) {
        throw new AppException("validation_error", { details: { fieldErrors: { sourceTimestamp: ["Timestamp is outside the segment."] } } })
      }
      if (input.endTimestamp !== undefined && input.endTimestamp <= input.sourceTimestamp) {
        throw new AppException("validation_error", { details: { fieldErrors: { endTimestamp: ["The clip must end after it starts."] } } })
      }
      const existing = db.state.playlist.find(
        (p) => p.sourceSegmentId === input.sourceSegmentId && p.kind === input.kind && p.meetingId === input.meetingId,
      )
      if (existing) return existing

      const item: PlaylistItem = {
        id: createId("pl"),
        kind: input.kind,
        title,
        note: input.note?.trim() || undefined,
        quote: segment.text,
        endTimestamp: input.endTimestamp,
        meeting: { id: meeting.id, title: meeting.title, startedAt: meeting.startedAt },
        createdAt: nowIso(),
        meetingId: meeting.id,
        sourceSegmentId: segment.id,
        sourceTimestamp: input.sourceTimestamp,
      }
      db.state.playlist.unshift(item)
      return item
    })
  }

  update(id: string, input: UpdatePlaylistItemInput): Promise<PlaylistItem> {
    return mockWrite("playlist.update", (db) => {
      const item = db.state.playlist.find((p) => p.id === id)
      if (!item) throw new AppException("not_found", { cause: new Error(`playlist ${id}`) })
      if (input.title !== undefined) item.title = validateTitle(input.title)
      if (input.note !== undefined) {
        if (input.note && input.note.length > 500) {
          throw new AppException("validation_error", { details: { fieldErrors: { note: ["Keep notes under 500 characters."] } } })
        }
        item.note = input.note?.trim() || undefined
      }
      return item
    })
  }

  remove(id: string): Promise<void> {
    return mockWrite("playlist.remove", (db) => {
      const before = db.state.playlist.length
      db.state.playlist = db.state.playlist.filter((p) => p.id !== id)
      if (db.state.playlist.length === before) throw new AppException("not_found", { cause: new Error(`playlist ${id}`) })
    })
  }
}
