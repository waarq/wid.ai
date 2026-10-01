"use client"

import { useMutation, useQuery, useQueryClient, type QueryKey } from "@tanstack/react-query"

import { queryKeys } from "@/lib/query"
import { services } from "@/services"
import type {
  AddPlaylistItemInput,
  AppError,
  ListResponse,
  Meeting,
  PlaylistItem,
  PlaylistListParams,
  UpdatePlaylistItemInput,
} from "@/types"

import { prependListItem, updateListItems, type OptimisticContext } from "./cache-utils"

const OPTIMISTIC_PREFIX = "optimistic_"

/** True for the placeholder row shown while an add is in flight. */
export function isOptimisticPlaylistItem(item: PlaylistItem): boolean {
  return item.id.startsWith(OPTIMISTIC_PREFIX)
}

export function usePlaylist(params: PlaylistListParams = {}) {
  return useQuery<ListResponse<PlaylistItem>>({
    queryKey: queryKeys.playlist.list(params),
    queryFn: () => services.playlist.list(params),
  })
}

/** Saves a moment. The row appears immediately and rolls back on failure. */
export function useAddToPlaylist() {
  const queryClient = useQueryClient()
  return useMutation<PlaylistItem, AppError, AddPlaylistItemInput, OptimisticContext>({
    mutationFn: (input) => services.playlist.add(input),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.playlist.all })
      const meeting = queryClient.getQueryData<Meeting>(queryKeys.meetings.detail(input.meetingId))
      const placeholder: PlaylistItem = {
        id: `${OPTIMISTIC_PREFIX}${Date.now()}`,
        kind: input.kind,
        title: input.title,
        note: input.note,
        meetingId: input.meetingId,
        sourceSegmentId: input.sourceSegmentId,
        sourceTimestamp: input.sourceTimestamp,
        endTimestamp: input.endTimestamp,
        meeting: meeting
          ? { id: meeting.id, title: meeting.title, startedAt: meeting.startedAt }
          : { id: input.meetingId, title: "", startedAt: new Date().toISOString() },
        createdAt: new Date().toISOString(),
      }
      // Only lists whose filters the new item matches (kind / meetingId).
      const accepts = (key: QueryKey) => {
        const params = key[queryKeys.playlist.lists().length] as PlaylistListParams | undefined
        return (!params?.kind || params.kind === input.kind) && (!params?.meetingId || params.meetingId === input.meetingId)
      }
      return { rollback: prependListItem(queryClient, queryKeys.playlist.lists(), placeholder, accepts) }
    },
    onError: (_error, _input, context) => context?.rollback(),
    onSettled: () => void queryClient.invalidateQueries({ queryKey: queryKeys.playlist.all }),
  })
}

export function useRemoveFromPlaylist() {
  const queryClient = useQueryClient()
  return useMutation<void, AppError, string, OptimisticContext>({
    mutationFn: (itemId) => services.playlist.remove(itemId),
    onMutate: async (itemId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.playlist.all })
      return {
        rollback: updateListItems<PlaylistItem>(queryClient, queryKeys.playlist.lists(), (item) =>
          item.id === itemId ? null : item,
        ),
      }
    },
    onError: (_error, _id, context) => context?.rollback(),
    onSettled: () => void queryClient.invalidateQueries({ queryKey: queryKeys.playlist.all }),
  })
}

export function useUpdatePlaylistItem() {
  const queryClient = useQueryClient()
  return useMutation<PlaylistItem, AppError, { itemId: string; input: UpdatePlaylistItemInput }, OptimisticContext>({
    mutationFn: ({ itemId, input }) => services.playlist.update(itemId, input),
    onMutate: async ({ itemId, input }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.playlist.all })
      return {
        rollback: updateListItems<PlaylistItem>(queryClient, queryKeys.playlist.lists(), (item) =>
          item.id === itemId
            ? {
                ...item,
                ...(input.title !== undefined ? { title: input.title } : {}),
                ...(input.note !== undefined ? { note: input.note ?? undefined } : {}),
              }
            : item,
        ),
      }
    },
    onError: (_error, _vars, context) => context?.rollback(),
    onSettled: () => void queryClient.invalidateQueries({ queryKey: queryKeys.playlist.all }),
  })
}
