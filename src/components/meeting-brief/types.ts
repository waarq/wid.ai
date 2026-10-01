import type { PlaylistItemKind, Seconds, Traceable } from "@/types"

/** Where a "Jump to conversation" click should land. */
export interface JumpTarget {
  sourceTimestamp: Seconds
  sourceSegmentId?: string
}

/** Payload emitted when a user saves an insight to their playlist. */
export interface AddToPlaylistRequest extends Traceable {
  kind: PlaylistItemKind
  title: string
}

export type JumpHandler = (target: JumpTarget) => void
export type AddToPlaylistHandler = (request: AddToPlaylistRequest) => void
