import type { ISODateString, ListParams, MeetingRef, Seconds, Traceable } from "./common"

export const PLAYLIST_ITEM_KINDS = [
  "highlight",
  "decision",
  "commitment",
  "quote",
  "insight",
  "timestamp",
] as const
export type PlaylistItemKind = (typeof PLAYLIST_ITEM_KINDS)[number]

/** A saved meeting moment. Always anchored to a segment and timestamp. */
export interface PlaylistItem extends Traceable {
  id: string
  kind: PlaylistItemKind
  title: string
  note?: string
  /** Verbatim excerpt from the source segment. */
  quote?: string
  /** End of the clip, when a range was saved. */
  endTimestamp?: Seconds
  meeting: MeetingRef
  createdAt: ISODateString
}

export interface PlaylistListParams extends ListParams {
  kind?: PlaylistItemKind
  meetingId?: string
}

export interface AddPlaylistItemInput extends Traceable {
  kind: PlaylistItemKind
  title: string
  note?: string
  endTimestamp?: Seconds
}

export interface UpdatePlaylistItemInput {
  title?: string
  note?: string | null
}
