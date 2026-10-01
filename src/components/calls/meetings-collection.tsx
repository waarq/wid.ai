"use client"

import Link from "next/link"
import { SearchX, Users, AudioLines } from "lucide-react"

import { EmptyState } from "@/components/shared/empty-state"
import { ErrorState } from "@/components/shared/error-state"
import { Button } from "@/components/ui/button"
import { useMeetings } from "@/hooks"
import type { MeetingListParams } from "@/types"

import { CaptureMeetingButton } from "./capture-meeting-button"
import { MeetingCardsSkeleton, MeetingRowsSkeleton } from "./calls-skeleton"
import { MeetingCard } from "./meeting-card"
import { MeetingTable } from "./meeting-table"
import { useCollectionView } from "./use-collection-view"

interface MeetingsCollectionProps {
  params: MeetingListParams
  variant: "my" | "team"
  /** True when any filter is applied; switches the empty state to "no matches". */
  filtered: boolean
  /** Href that clears the filters. */
  clearHref: string
}

export function MeetingsCollection({ params, variant, filtered, clearHref }: MeetingsCollectionProps) {
  const [view] = useCollectionView(variant === "my" ? "meetings" : "team")
  const { data, isPending, isError, refetch, isRefetching } = useMeetings(params)
  const team = variant === "team"

  if (isPending) return view === "grid" ? <MeetingCardsSkeleton /> : <MeetingRowsSkeleton />

  if (isError) {
    return (
      <ErrorState
        title="We couldn't load your meetings."
        description="Your meetings are safe. Check your connection and try again."
        onRetry={() => void refetch()}
        retrying={isRefetching}
      />
    )
  }

  const meetings = data.items
  if (meetings.length === 0) {
    if (filtered) {
      return (
        <EmptyState
          icon={SearchX}
          title="No meetings match these filters."
          description="Try a different date range or search term."
          action={
            <Button asChild variant="outline" size="sm">
              <Link href={clearHref}>Clear filters</Link>
            </Button>
          }
        />
      )
    }
    return team ? (
      <EmptyState
        icon={Users}
        title="No shared meetings yet."
        description="Meetings your teammates share with you or the team will appear here."
      />
    ) : (
      <EmptyState
        icon={AudioLines}
        title="No meetings yet."
        description="Capture your first meeting and WIT will turn it into notes, decisions and action items."
        action={<CaptureMeetingButton />}
      />
    )
  }

  return (
    <div>
      {view === "grid" ? (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {meetings.map((m) => (
            <li key={m.id}>
              <MeetingCard meeting={m} showOwner={team} className="h-full" />
            </li>
          ))}
        </ul>
      ) : (
        <>
          <div className="hidden lg:block">
            <MeetingTable meetings={meetings} showOwner={team} />
          </div>
          <ul className="grid gap-3 sm:grid-cols-2 lg:hidden">
            {meetings.map((m) => (
              <li key={m.id}>
                <MeetingCard meeting={m} showOwner={team} />
              </li>
            ))}
          </ul>
        </>
      )}
      <p className="mt-3 font-mono text-xs text-muted-foreground tabular-nums">
        {data.items.length} of {data.total} {data.total === 1 ? "meeting" : "meetings"}
      </p>
    </div>
  )
}
