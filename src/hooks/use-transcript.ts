"use client"

import { keepPreviousData, queryOptions, useQuery } from "@tanstack/react-query"

import { queryKeys } from "@/lib/query"
import { services } from "@/services"
import type { Transcript, TranscriptSearchMatch } from "@/types"

/** Transcript query options (exported for prefetching and tests). */
export function transcriptQueryOptions(meetingId: string) {
  return queryOptions<Transcript>({
    queryKey: queryKeys.transcripts.detail(meetingId),
    queryFn: () => services.transcripts.getByMeetingId(meetingId),
    // Immutable once ready. A pending/failed transcript is always stale, so it
    // refetches on the next mount after processing finishes.
    staleTime: (query) => (query.state.data?.status === "ready" ? 10 * 60_000 : 0),
  })
}

export function useTranscript(meetingId: string | undefined, options: { enabled?: boolean } = {}) {
  return useQuery({
    ...transcriptQueryOptions(meetingId ?? ""),
    enabled: Boolean(meetingId) && (options.enabled ?? true),
  })
}

/** In-transcript search. Disabled until the query has 2+ characters. */
export function useTranscriptSearch(meetingId: string | undefined, query: string) {
  const trimmed = query.trim()
  return useQuery<TranscriptSearchMatch[]>({
    queryKey: queryKeys.transcripts.search(meetingId ?? "", trimmed),
    queryFn: () => services.transcripts.search(meetingId!, trimmed),
    enabled: Boolean(meetingId) && trimmed.length >= 2,
    placeholderData: keepPreviousData,
  })
}
