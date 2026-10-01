"use client"

import Link from "next/link"
import {
  Check,
  Clock,
  Lightbulb,
  ListMusic,
  Play,
  Quote,
  Sparkles,
  Trash2,
  type LucideIcon,
} from "lucide-react"
import { toast } from "sonner"

import { formatTimestamp } from "@/components/calls/format"
import { EmptyState } from "@/components/shared/empty-state"
import { ErrorState } from "@/components/shared/error-state"
import { LoadingState } from "@/components/shared/loading-state"
import { Button } from "@/components/ui/button"
import { isOptimisticPlaylistItem, usePlaylist, useRemoveFromPlaylist } from "@/hooks"
import type { PlaylistItemKind } from "@/types"

const KIND_META: Record<PlaylistItemKind, { label: string; icon: LucideIcon }> = {
  highlight: { label: "Highlight", icon: Sparkles },
  decision: { label: "Decision", icon: Check },
  commitment: { label: "Commitment", icon: Check },
  quote: { label: "Quote", icon: Quote },
  insight: { label: "Insight", icon: Lightbulb },
  timestamp: { label: "Timestamp", icon: Clock },
}

export function PlaylistList() {
  const { data, isPending, isError, refetch, isRefetching } = usePlaylist()
  const remove = useRemoveFromPlaylist()

  if (isPending) return <LoadingState rows={5} label="Loading your playlist" />
  if (isError) {
    return (
      <ErrorState
        title="We couldn't load your playlist."
        description="Your saved moments are safe. Try again in a moment."
        onRetry={() => void refetch()}
        retrying={isRefetching}
      />
    )
  }
  if (data.items.length === 0) {
    return (
      <EmptyState
        icon={ListMusic}
        title="Your important moments will appear here."
        description="Save highlights, decisions and quotes from any meeting and jump back to them in one click."
        action={
          <Button asChild variant="outline" size="sm">
            <Link href="/my-calls">Browse meetings</Link>
          </Button>
        }
      />
    )
  }

  return (
    <ul className="divide-y divide-border border-b border-border">
      {data.items.map((item) => {
        const meta = KIND_META[item.kind]
        const Icon = meta.icon
        const pending = isOptimisticPlaylistItem(item)
        const playHref = `/my-calls/${item.meeting.id}?t=${Math.floor(item.sourceTimestamp)}`
        return (
          <li
            key={item.id}
            className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 py-3 sm:grid-cols-[auto_1fr_auto] sm:items-center"
          >
            <span className="mt-0.5 grid size-8 place-items-center rounded-md bg-muted text-muted-foreground sm:mt-0">
              <Icon className="size-4" aria-hidden />
              <span className="sr-only">{meta.label}</span>
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{item.title}</p>
              <p className="truncate text-xs text-muted-foreground">
                {item.meeting.title} ·{" "}
                <span className="font-mono tabular-nums">{formatTimestamp(item.sourceTimestamp)}</span>
              </p>
              {item.quote ? (
                <p className="mt-1 line-clamp-2 border-l-2 border-border-strong pl-2 text-xs text-muted-foreground">
                  {item.quote}
                </p>
              ) : null}
            </div>
            <div className="col-span-2 flex items-center gap-1 sm:col-span-1">
              <Button asChild variant="outline" size="sm" disabled={pending}>
                <Link href={playHref}>
                  <Play aria-hidden />
                  Play
                </Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href={`/my-calls/${item.meeting.id}`}>Open meeting</Link>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-destructive"
                disabled={pending}
                onClick={() =>
                  remove.mutate(item.id, {
                    onSuccess: () => toast.success("Removed from playlist"),
                    onError: () => toast.error("We couldn't remove that moment. Please try again."),
                  })
                }
              >
                <Trash2 aria-hidden />
                Remove
              </Button>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
