"use client"

import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query"

import { queryKeys } from "@/lib/query"
import { services } from "@/services"
import type {
  ActionItem,
  ActionItemListParams,
  ActionItemStatus,
  AppError,
  ListResponse,
  Meeting,
  UpdateActionItemInput,
} from "@/types"

import { combineRollbacks, updateEntity, updateListItems, type OptimisticContext } from "./cache-utils"

/** Statuses that count towards a meeting's "N actions" stat. */
const COUNTED: ReadonlySet<ActionItemStatus> = new Set<ActionItemStatus>(["open", "in_progress"])

function toggledStatus(status: ActionItemStatus): ActionItemStatus {
  return status === "completed" ? "open" : "completed"
}

/** Patches one action inside a cached meeting (summary list + card stats). */
function patchMeetingAction(meeting: Meeting, actionItemId: string, patch: (item: ActionItem) => ActionItem | null): Meeting {
  if (!meeting.summary) return meeting
  const actionItems = meeting.summary.actionItems.flatMap((item) => {
    if (item.id !== actionItemId) return [item]
    const next = patch(item)
    return next ? [next] : []
  })
  return {
    ...meeting,
    summary: { ...meeting.summary, actionItems },
    stats: meeting.stats
      ? { ...meeting.stats, actionItems: actionItems.filter((a) => COUNTED.has(a.status)).length }
      : meeting.stats,
  }
}

/** Applies an optimistic action change to every cache that embeds it. */
function optimisticActionChange(
  queryClient: QueryClient,
  actionItemId: string,
  patch: (item: ActionItem) => ActionItem | null,
): OptimisticContext {
  const known =
    queryClient.getQueryData<ActionItem>(queryKeys.actionItems.detail(actionItemId)) ??
    queryClient
      .getQueriesData<ListResponse<ActionItem>>({ queryKey: queryKeys.actionItems.lists() })
      .flatMap(([, data]) => data?.items ?? [])
      .find((item) => item.id === actionItemId)

  const rollbacks = [
    updateListItems<ActionItem>(queryClient, queryKeys.actionItems.lists(), (item) =>
      item.id === actionItemId ? patch(item) : item,
    ),
    updateEntity<ActionItem>(queryClient, queryKeys.actionItems.detail(actionItemId), (item) => patch(item) ?? item),
  ]

  // Meeting detail + meeting list cards carry the same item and its counts.
  const meetingId = known?.meetingId
  if (meetingId) {
    rollbacks.push(
      updateEntity<Meeting>(queryClient, queryKeys.meetings.detail(meetingId), (m) =>
        patchMeetingAction(m, actionItemId, patch),
      ),
      updateListItems<Meeting>(queryClient, queryKeys.meetings.lists(), (m) =>
        m.id === meetingId ? patchMeetingAction(m, actionItemId, patch) : m,
      ),
    )
  } else {
    // Unknown meeting: patch whichever cached meeting contains the item.
    for (const [key, data] of queryClient.getQueriesData<Meeting>({ queryKey: queryKeys.meetings.details() })) {
      if (data && "summary" in data && data.summary?.actionItems.some((a) => a.id === actionItemId)) {
        rollbacks.push(updateEntity<Meeting>(queryClient, key, (m) => patchMeetingAction(m, actionItemId, patch)))
      }
    }
  }

  return { rollback: combineRollbacks(rollbacks) }
}

function settleActionChange(queryClient: QueryClient, item?: ActionItem): void {
  void queryClient.invalidateQueries({ queryKey: queryKeys.actionItems.all })
  if (item) {
    void queryClient.invalidateQueries({ queryKey: queryKeys.meetings.detail(item.meetingId) })
    void queryClient.invalidateQueries({ queryKey: queryKeys.meetings.lists() })
  } else {
    void queryClient.invalidateQueries({ queryKey: queryKeys.meetings.all })
  }
  void queryClient.invalidateQueries({ queryKey: queryKeys.search.all })
  void queryClient.invalidateQueries({ queryKey: queryKeys.deals.all })
}

async function cancelActionQueries(queryClient: QueryClient): Promise<void> {
  await Promise.all([
    queryClient.cancelQueries({ queryKey: queryKeys.actionItems.all }),
    queryClient.cancelQueries({ queryKey: queryKeys.meetings.all }),
  ])
}

/* ---------- queries ---------- */

/** Action items across meetings (or one meeting via `meetingId`). */
export function useActionItems(params: ActionItemListParams = {}, options: { enabled?: boolean } = {}) {
  return useQuery<ListResponse<ActionItem>>({
    queryKey: queryKeys.actionItems.list(params),
    queryFn: () => services.actionItems.list(params),
    placeholderData: keepPreviousData,
    enabled: options.enabled ?? true,
  })
}

export function useActionItem(actionItemId: string | undefined) {
  return useQuery<ActionItem>({
    queryKey: queryKeys.actionItems.detail(actionItemId ?? ""),
    queryFn: () => services.actionItems.getById(actionItemId!),
    enabled: Boolean(actionItemId),
  })
}

/* ---------- mutations (optimistic, with rollback) ---------- */

/** Complete / reopen. Updates lists, meeting summary and card counts instantly. */
export function useToggleAction() {
  const queryClient = useQueryClient()
  return useMutation<ActionItem, AppError, string, OptimisticContext>({
    mutationFn: (actionItemId) => services.actionItems.toggleComplete(actionItemId),
    onMutate: async (actionItemId) => {
      await cancelActionQueries(queryClient)
      const now = new Date().toISOString()
      return optimisticActionChange(queryClient, actionItemId, (item) => {
        const status = toggledStatus(item.status)
        return { ...item, status, completedAt: status === "completed" ? now : undefined, updatedAt: now }
      })
    },
    onError: (_error, _id, context) => context?.rollback(),
    onSettled: (item) => settleActionChange(queryClient, item),
  })
}

/** Edits title, assignee, due date or status. */
export function useUpdateAction() {
  const queryClient = useQueryClient()
  return useMutation<
    ActionItem,
    AppError,
    { actionItemId: string; input: UpdateActionItemInput },
    OptimisticContext
  >({
    mutationFn: ({ actionItemId, input }) => services.actionItems.update(actionItemId, input),
    onMutate: async ({ actionItemId, input }) => {
      await cancelActionQueries(queryClient)
      const now = new Date().toISOString()
      return optimisticActionChange(queryClient, actionItemId, (item) => ({
        ...item,
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.description !== undefined ? { description: input.description ?? undefined } : {}),
        ...(input.dueDate !== undefined ? { dueDate: input.dueDate ?? undefined } : {}),
        ...(input.status !== undefined
          ? { status: input.status, completedAt: input.status === "completed" ? now : undefined }
          : {}),
        // Assignee needs the participant record; the server response fills it in.
        updatedAt: now,
      }))
    },
    onError: (_error, _vars, context) => context?.rollback(),
    onSettled: (item) => settleActionChange(queryClient, item),
  })
}

export function useDeleteAction() {
  const queryClient = useQueryClient()
  return useMutation<void, AppError, string, OptimisticContext>({
    mutationFn: (actionItemId) => services.actionItems.delete(actionItemId),
    onMutate: async (actionItemId) => {
      await cancelActionQueries(queryClient)
      return optimisticActionChange(queryClient, actionItemId, () => null)
    },
    onError: (_error, _id, context) => context?.rollback(),
    onSettled: () => settleActionChange(queryClient),
  })
}
