"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { formatTimestamp } from "@/components/calls/format"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useAddToPlaylist } from "@/hooks"
import { cn } from "@/lib/utils"
import { getUserMessage } from "@/lib/utils/errors"
import { PLAYLIST_ITEM_KINDS, type PlaylistItemKind, type Traceable } from "@/types"

export interface PlaylistDraft extends Traceable {
  kind: PlaylistItemKind
  title: string
  /** Verbatim excerpt shown for context (not sent; the backend derives it from the segment). */
  quote?: string
  speakerName?: string
}

const KIND_LABEL: Record<PlaylistItemKind, string> = {
  highlight: "Highlight",
  decision: "Decision",
  commitment: "Commitment",
  quote: "Quote",
  insight: "Insight",
  timestamp: "Timestamp",
}

const TITLE_MAX = 140
const NOTE_MAX = 500

/** Save a decision, moment or transcript line to the playlist, with an optional note. */
export function AddToPlaylistDialog({
  draft,
  onOpenChange,
}: {
  draft: PlaylistDraft | null
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={draft !== null} onOpenChange={onOpenChange}>
      <DialogContent className="gap-5 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add to playlist</DialogTitle>
          <DialogDescription>Saved moments keep their link back to this point in the conversation.</DialogDescription>
        </DialogHeader>
        {draft ? (
          <AddToPlaylistForm key={`${draft.sourceSegmentId}-${draft.kind}`} draft={draft} onDone={() => onOpenChange(false)} />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function AddToPlaylistForm({ draft, onDone }: { draft: PlaylistDraft; onDone: () => void }) {
  const router = useRouter()
  const add = useAddToPlaylist()
  const [title, setTitle] = useState(draft.title.slice(0, TITLE_MAX))
  const [kind, setKind] = useState<PlaylistItemKind>(draft.kind)
  const [note, setNote] = useState("")
  const [error, setError] = useState<string | null>(null)

  function submit(event: FormEvent) {
    event.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) {
      setError("Give this moment a title.")
      return
    }
    setError(null)
    add.mutate(
      {
        kind,
        title: trimmed,
        note: note.trim() || undefined,
        meetingId: draft.meetingId,
        sourceSegmentId: draft.sourceSegmentId,
        sourceTimestamp: draft.sourceTimestamp,
      },
      {
        onSuccess: () => {
          onDone()
          toast.success("Saved to playlist", {
            description: trimmed,
            action: { label: "View playlist", onClick: () => router.push("/playlist") },
          })
        },
        onError: (err) => toast.error("Couldn't save to playlist", { description: getUserMessage(err) }),
      },
    )
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div className="rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground">
        <span className="font-mono text-foreground tabular-nums">{formatTimestamp(draft.sourceTimestamp)}</span>
        {draft.speakerName ? <> · {draft.speakerName}</> : null}
        {draft.quote ? <p className="mt-1 line-clamp-3 text-sm text-foreground">&ldquo;{draft.quote}&rdquo;</p> : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="playlist-title">Title</Label>
        <Input
          id="playlist-title"
          value={title}
          maxLength={TITLE_MAX}
          onChange={(e) => setTitle(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "playlist-title-error" : undefined}
        />
        {error ? (
          <p id="playlist-title-error" className="text-xs text-destructive">
            {error}
          </p>
        ) : null}
      </div>

      <fieldset>
        <legend className="mb-1.5 text-sm font-medium">Type</legend>
        <div className="flex flex-wrap gap-1.5">
          {PLAYLIST_ITEM_KINDS.map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={kind === value}
              onClick={() => setKind(value)}
              className={cn(
                "h-7 rounded-md border px-2.5 text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98]",
                kind === value
                  ? "border-primary bg-primary-soft text-primary-ink"
                  : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {KIND_LABEL[value]}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="space-y-1.5">
        <Label htmlFor="playlist-note">Note (optional)</Label>
        <Textarea
          id="playlist-note"
          value={note}
          maxLength={NOTE_MAX}
          rows={2}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Why this moment matters"
          className="resize-none"
        />
      </div>

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={add.isPending}>
          {add.isPending ? "Saving…" : "Save to playlist"}
        </Button>
      </DialogFooter>
    </form>
  )
}
