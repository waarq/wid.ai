"use client"

import { keepPreviousData, useQuery } from "@tanstack/react-query"

import { queryKeys } from "@/lib/query"
import { services } from "@/services"
import type { Transcript, TranscriptSearchMatch } from "@/types"

export function useTranscript(meetingId: string | undefined, options: { enabled?: boolean } = {}) {
  return useQuery<Transcript>({
    queryKey: queryKeys.transcripts.detail(meetingId ?? ""),
    queryFn: () => services.transcripts.getByMeetingId(meetingId!),
    enabled: Boolean(meetingId) && (options.enabled ?? true),
    // Transcripts are immutable once ready.
    staleTime: 10 * 60_000,
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
