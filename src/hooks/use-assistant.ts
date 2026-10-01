"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { queryKeys } from "@/lib/query"
import { services } from "@/services"
import type { MeetingAnswer, SuggestedQuestion } from "@/types"

/**
 * "Ask this meeting". A mutation (each question is a new request); the answer
 * is appended to the cached history so the thread survives remounts.
 *
 *   const ask = useAssistant(meetingId)
 *   ask.mutate("What did we decide about the launch?")
 */
export function useAssistant(meetingId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (question: string): Promise<MeetingAnswer> => services.assistant.ask(meetingId, question),
    onSuccess: (answer) => {
      const key = queryKeys.assistant.history(meetingId)
      const loaded = queryClient.getQueryData<MeetingAnswer[]>(key) !== undefined
      queryClient.setQueryData<MeetingAnswer[]>(key, (history) =>
        history ? [...history.filter((a) => a.id !== answer.id), answer] : [answer],
      )
      // History was not loaded yet: the seed above holds only this answer, so
      // fetch the real thread instead of hiding earlier answers until stale.
      if (!loaded) void queryClient.invalidateQueries({ queryKey: key })
    },
  })
}

export function useSuggestedQuestions(meetingId: string | undefined) {
  return useQuery<SuggestedQuestion[]>({
    queryKey: queryKeys.assistant.suggestions(meetingId ?? ""),
    queryFn: () => services.assistant.getSuggestedQuestions(meetingId!),
    enabled: Boolean(meetingId),
    staleTime: 10 * 60_000,
  })
}

/** Previous answers for this meeting, oldest first. */
export function useAssistantHistory(meetingId: string | undefined) {
  return useQuery<MeetingAnswer[]>({
    queryKey: queryKeys.assistant.history(meetingId ?? ""),
    queryFn: () => services.assistant.listHistory(meetingId!),
    enabled: Boolean(meetingId),
  })
}
