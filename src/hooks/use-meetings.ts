"use client"

import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query"

import { queryKeys } from "@/lib/query"
import { services } from "@/services"
import {
  isProcessingStatus,
  type CreateMeetingInput,
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

/** How often a meeting that is still processing is re-read. */
export const PROCESSING_POLL_MS = 1500

/** Everything that embeds meeting data and must refresh when a meeting changes. */
export function invalidateMeetingDependents(queryClient: QueryClient, meetingId?: string): void {
  void queryClient.invalidateQueries({ queryKey: queryKeys.meetings.lists() })
  if (meetingId) void queryClient.invalidateQueries({ queryKey: queryKeys.meetings.detail(meetingId) })
  void queryClient.invalidateQueries({ queryKey: queryKeys.search.all })
}

/* ---------- queries ---------- */

/**
 * Meeting library (My Calls / Team Calls). Previous results stay visible
 * while filters change. Lists containing processing meetings poll so cards
 * move from Processing to Ready on their own.
 */
export function useMeetings(params: MeetingListParams = {}, options: { enabled?: boolean } = {}) {
  return useQuery<ListResponse<Meeting>>({
    queryKey: queryKeys.meetings.list(params),
    queryFn: () => services.meetings.list(params),
    placeholderData: keepPreviousData,
    enabled: options.enabled ?? true,
    refetchInterval: (query) =>
      query.state.data?.items.some((m) => isProcessingStatus(m.status)) ? PROCESSING_POLL_MS * 2 : false,
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
  return useQuery<Meeting>({
    queryKey: queryKeys.meetings.detail(meetingId ?? ""),
    queryFn: () => services.meetings.getById(meetingId!),
    enabled: Boolean(meetingId),
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return status && isProcessingStatus(status) ? PROCESSING_POLL_MS : false
    },
  })
}

/** Step-by-step processing progress. Polls until ready/failed. */
export function useProcessingStatus(meetingId: string | undefined, options: { enabled?: boolean } = {}) {
  const queryClient = useQueryClient()
  return useQuery<ProcessingProgress>({
    queryKey: queryKeys.meetings.processing(meetingId ?? ""),
    queryFn: async () => {
      const progress = await services.meetings.getProcessingStatus(meetingId!)
      if (progress.status === "ready" || progress.status === "failed") {
        // The meeting record, transcript, actions and alerts all changed.
        invalidateMeetingDependents(queryClient, meetingId)
        void queryClient.invalidateQueries({ queryKey: queryKeys.transcripts.detail(meetingId!) })
        void queryClient.invalidateQueries({ queryKey: queryKeys.actionItems.all })
        void queryClient.invalidateQueries({ queryKey: queryKeys.alerts.all })
      }
      return progress
    },
    enabled: Boolean(meetingId) && (options.enabled ?? true),
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return status === "ready" || status === "failed" ? false : PROCESSING_POLL_MS
    },
    staleTime: 0,
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
      queryClient.removeQueries({ queryKey: queryKeys.meetings.detail(meetingId) })
      queryClient.removeQueries({ queryKey: queryKeys.transcripts.detail(meetingId) })
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

/** Last generated follow-up for a meeting, if any (populated by useGenerateFollowUp). */
export function useFollowUp(meetingId: string | undefined, input?: GenerateFollowUpInput) {
  return useQuery<FollowUpEmail>({
    queryKey: queryKeys.meetings.followUp(meetingId ?? ""),
    queryFn: () => services.meetings.generateFollowUp(meetingId!, input),
    enabled: Boolean(meetingId),
    staleTime: Infinity,
  })
}
