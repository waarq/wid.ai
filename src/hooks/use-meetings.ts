"use client"

import {
  keepPreviousData,
  queryOptions,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
  type QueryKey,
} from "@tanstack/react-query"

import { queryKeys } from "@/lib/query"
import { services } from "@/services"
import {
  isProcessingStatus,
  type CreateMeetingInput,
  type MeetingStatus,
  type Decision,
  type DecisionHistory,
  type FollowUpEmail,
  type GenerateFollowUpInput,
  type ListResponse,
  type Meeting,
  type MeetingListParams,
  type ProcessingProgress,
  type ShareMeetingInput,
  type ShareSettings,
  type UpdateMeetingInput,
} from "@/types"

import { isKeyPrefix } from "./cache-utils"

/** How often a meeting that is still processing is re-read. */
export const PROCESSING_POLL_MS = 1500

/** Everything that embeds meeting data and must refresh when a meeting changes. */
export function invalidateMeetingDependents(queryClient: QueryClient, meetingId?: string): void {
  void queryClient.invalidateQueries({ queryKey: queryKeys.meetings.lists() })
  if (meetingId) void queryClient.invalidateQueries({ queryKey: queryKeys.meetings.detail(meetingId) })
  void queryClient.invalidateQueries({ queryKey: queryKeys.search.all })
}

/**
 * A meeting finished processing (ready or failed): its transcript, summary,
 * actions, alerts, search entries and suggestions all changed server-side.
 *
 * Called from inside a queryFn, so it must never invalidate the query that is
 * currently fetching (`except`). Doing so cancels that fetch and starts it
 * again, forever, and the new status never lands in the cache.
 */
export function invalidateProcessedMeeting(queryClient: QueryClient, meetingId: string, except: QueryKey): void {
  const prefixes: QueryKey[] = [
    queryKeys.meetings.detail(meetingId),
    queryKeys.meetings.lists(),
    queryKeys.transcripts.detail(meetingId),
    queryKeys.actionItems.all,
    queryKeys.alerts.all,
    queryKeys.search.all,
    queryKeys.assistant.suggestions(meetingId),
    queryKeys.playlist.all,
  ]
  void queryClient.invalidateQueries({
    predicate: (query) =>
      !isKeyPrefix(except, query.queryKey) && prefixes.some((prefix) => isKeyPrefix(prefix, query.queryKey)),
  })
}

/** processing/transcribing/understanding -> ready/failed. */
function finishedProcessing(previous: MeetingStatus | undefined, next: MeetingStatus): boolean {
  return previous !== undefined && isProcessingStatus(previous) && !isProcessingStatus(next)
}

/* ---------- queries ---------- */

/*
 * Query option factories. The hooks below are thin wrappers; the factories are
 * exported for prefetching and for tests (they run without React).
 */

/** Meeting library page. Detects cards that just finished processing. */
export function meetingsQueryOptions(queryClient: QueryClient, params: MeetingListParams = {}) {
  const queryKey = queryKeys.meetings.list(params)
  return queryOptions<ListResponse<Meeting>>({
    queryKey,
    queryFn: async () => {
      const previous = queryClient.getQueryData<ListResponse<Meeting>>(queryKey)
      const result = await services.meetings.list(params)
      // A card moved from Processing to Ready/Failed: refresh what depends on it.
      if (previous) {
        const before = new Map(previous.items.map((m) => [m.id, m.status]))
        for (const meeting of result.items) {
          if (finishedProcessing(before.get(meeting.id), meeting.status)) {
            invalidateProcessedMeeting(queryClient, meeting.id, queryKey)
          }
        }
      }
      return result
    },
    refetchInterval: (query) =>
      query.state.data?.items.some((m) => isProcessingStatus(m.status)) ? PROCESSING_POLL_MS * 2 : false,
  })
}

/** One meeting. Polls while processing; refreshes dependents when it finishes. */
export function meetingQueryOptions(queryClient: QueryClient, meetingId: string) {
  const queryKey = queryKeys.meetings.detail(meetingId)
  return queryOptions<Meeting>({
    queryKey,
    queryFn: async () => {
      const previous = queryClient.getQueryData<Meeting>(queryKey)?.status
      const meeting = await services.meetings.getById(meetingId)
      if (finishedProcessing(previous, meeting.status)) {
        invalidateProcessedMeeting(queryClient, meeting.id, queryKey)
        // The detail's own sub-queries (processing, share, decisions, ...) were
        // excluded above together with this query; refresh them separately.
        void queryClient.invalidateQueries({
          predicate: (query) => query.queryKey.length > queryKey.length && isKeyPrefix(queryKey, query.queryKey),
        })
      }
      return meeting
    },
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return status && isProcessingStatus(status) ? PROCESSING_POLL_MS : false
    },
  })
}

/** Processing progress. Polls until ready/failed; refreshes dependents once at the end. */
export function processingStatusQueryOptions(queryClient: QueryClient, meetingId: string) {
  const queryKey = queryKeys.meetings.processing(meetingId)
  return queryOptions<ProcessingProgress>({
    queryKey,
    queryFn: async () => {
      const previous = queryClient.getQueryData<ProcessingProgress>(queryKey)?.status
      const progress = await services.meetings.getProcessingStatus(meetingId)
      const terminal = progress.status === "ready" || progress.status === "failed"
      // On the transition (or the first terminal read), never on every later read.
      if (terminal && previous !== progress.status) {
        invalidateProcessedMeeting(queryClient, progress.meetingId, queryKey)
      }
      return progress
    },
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return status === "ready" || status === "failed" ? false : PROCESSING_POLL_MS
    },
    staleTime: 0,
  })
}

/**
 * Meeting library (My Calls / Team Calls). Previous results stay visible
 * while filters change. Lists containing processing meetings poll so cards
 * move from Processing to Ready on their own.
 */
export function useMeetings(params: MeetingListParams = {}, options: { enabled?: boolean } = {}) {
  const queryClient = useQueryClient()
  return useQuery({
    ...meetingsQueryOptions(queryClient, params),
    placeholderData: keepPreviousData,
    enabled: options.enabled ?? true,
  })
}

/** Cursor-paginated variant for "Load more". */
export function useInfiniteMeetings(params: Omit<MeetingListParams, "cursor"> = {}) {
  return useInfiniteQuery({
    queryKey: [...queryKeys.meetings.list(params), "infinite"] as const,
    queryFn: ({ pageParam }) => services.meetings.list({ ...params, cursor: pageParam ?? undefined }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
  })
}

/** One meeting. Polls while it is processing so the detail page advances to Ready. */
export function useMeeting(meetingId: string | undefined) {
  const queryClient = useQueryClient()
  return useQuery({
    ...meetingQueryOptions(queryClient, meetingId ?? ""),
    enabled: Boolean(meetingId),
  })
}

/** Step-by-step processing progress. Polls until ready/failed. */
export function useProcessingStatus(meetingId: string | undefined, options: { enabled?: boolean } = {}) {
  const queryClient = useQueryClient()
  return useQuery({
    ...processingStatusQueryOptions(queryClient, meetingId ?? ""),
    enabled: Boolean(meetingId) && (options.enabled ?? true),
  })
}

export function useShareSettings(meetingId: string | undefined) {
  return useQuery<ShareSettings>({
    queryKey: queryKeys.meetings.share(meetingId ?? ""),
    queryFn: () => services.meetings.getShareSettings(meetingId!),
    enabled: Boolean(meetingId),
  })
}

export function useDecisions(meetingId: string | undefined) {
  return useQuery<Decision[]>({
    queryKey: queryKeys.meetings.decisions(meetingId ?? ""),
    queryFn: () => services.meetings.listDecisions(meetingId!),
    enabled: Boolean(meetingId),
  })
}

/** "Launch -> Oct 5 -> Oct 12 -> Oct 15". */
export function useDecisionHistory(decisionId: string | undefined) {
  return useQuery<DecisionHistory>({
    queryKey: queryKeys.meetings.decisionHistory(decisionId ?? ""),
    queryFn: () => services.meetings.getDecisionHistory(decisionId!),
    enabled: Boolean(decisionId),
  })
}

/* ---------- mutations ---------- */

export function useCreateMeeting() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateMeetingInput) => services.meetings.create(input),
    onSuccess: (meeting) => {
      queryClient.setQueryData(queryKeys.meetings.detail(meeting.id), meeting)
      invalidateMeetingDependents(queryClient)
      void queryClient.invalidateQueries({ queryKey: queryKeys.calendar.all })
    },
  })
}

export function useUpdateMeeting() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ meetingId, input }: { meetingId: string; input: UpdateMeetingInput }) =>
      services.meetings.update(meetingId, input),
    onSuccess: (meeting, { input }) => {
      queryClient.setQueryData(queryKeys.meetings.detail(meeting.id), meeting)
      invalidateMeetingDependents(queryClient)
      if (input.visibility) void queryClient.invalidateQueries({ queryKey: queryKeys.meetings.share(meeting.id) })
      if (input.dealId !== undefined) void queryClient.invalidateQueries({ queryKey: queryKeys.deals.all })
    },
  })
}

export function useDeleteMeeting() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (meetingId: string) => services.meetings.delete(meetingId),
    onSuccess: (_void, meetingId) => {
      for (const queryKey of [queryKeys.meetings.detail(meetingId), queryKeys.transcripts.detail(meetingId)]) {
        // Drop unused copies now. The page still showing the meeting keeps its
        // data (no not-found flash while it navigates away), but is marked stale
        // without refetching, so coming back never shows the deleted meeting.
        queryClient.removeQueries({ queryKey, type: "inactive" })
        void queryClient.invalidateQueries({ queryKey, refetchType: "none" })
      }
      invalidateMeetingDependents(queryClient)
      for (const key of [queryKeys.actionItems.all, queryKeys.playlist.all, queryKeys.alerts.all, queryKeys.deals.all]) {
        void queryClient.invalidateQueries({ queryKey: key })
      }
    },
  })
}

/** Changes visibility / invites people / toggles the link. Visibility shows everywhere after this. */
export function useShareMeeting() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ meetingId, input }: { meetingId: string; input: ShareMeetingInput }) =>
      services.meetings.share(meetingId, input),
    onSuccess: (settings) => {
      queryClient.setQueryData(queryKeys.meetings.share(settings.meetingId), settings)
      queryClient.setQueryData<Meeting>(queryKeys.meetings.detail(settings.meetingId), (meeting) =>
        meeting ? { ...meeting, visibility: settings.visibility } : meeting,
      )
      invalidateMeetingDependents(queryClient, settings.meetingId)
    },
  })
}

export function useUnshareMeeting() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ meetingId, recipientId }: { meetingId: string; recipientId: string }) =>
      services.meetings.unshare(meetingId, recipientId),
    onSuccess: (settings) => {
      queryClient.setQueryData(queryKeys.meetings.share(settings.meetingId), settings)
      invalidateMeetingDependents(queryClient, settings.meetingId)
    },
  })
}

export function useRetryProcessing() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (meetingId: string) => services.meetings.retryProcessing(meetingId),
    onSuccess: (progress) => {
      queryClient.setQueryData(queryKeys.meetings.processing(progress.meetingId), progress)
      invalidateMeetingDependents(queryClient, progress.meetingId)
    },
  })
}

/** Generates the follow-up email draft and caches it under the meeting. */
export function useGenerateFollowUp() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ meetingId, input }: { meetingId: string; input?: GenerateFollowUpInput }): Promise<FollowUpEmail> =>
      services.meetings.generateFollowUp(meetingId, input),
    onSuccess: (email) => queryClient.setQueryData(queryKeys.meetings.followUp(email.meetingId), email),
  })
}

/**
 * Last generated follow-up for a meeting (populated by useGenerateFollowUp).
 * When the meeting changes (an action is completed, ...) it regenerates with
 * the tone last chosen, so a refresh never silently resets the user's tone.
 * Pass `enabled: false` until the meeting is ready (otherwise it is a conflict).
 */
export function useFollowUp(
  meetingId: string | undefined,
  input?: GenerateFollowUpInput,
  options: { enabled?: boolean } = {},
) {
  const queryClient = useQueryClient()
  const queryKey = queryKeys.meetings.followUp(meetingId ?? "")
  return useQuery<FollowUpEmail>({
    queryKey,
    queryFn: () => {
      const cached = queryClient.getQueryData<FollowUpEmail>(queryKey)
      return services.meetings.generateFollowUp(meetingId!, input ?? (cached ? { tone: cached.tone } : undefined))
    },
    enabled: Boolean(meetingId) && (options.enabled ?? true),
    staleTime: Infinity,
  })
}
