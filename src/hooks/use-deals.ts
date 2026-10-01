"use client"

import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query"

import { queryKeys } from "@/lib/query"
import { services } from "@/services"
import type { CreateDealInput, Deal, DealListParams, ListResponse, UpdateDealInput } from "@/types"

function settleDeal(queryClient: QueryClient, deal?: Deal): void {
  if (deal) queryClient.setQueryData(queryKeys.deals.detail(deal.id), deal)
  void queryClient.invalidateQueries({ queryKey: queryKeys.deals.lists() })
  // Meetings carry dealId, and search indexes deals.
  void queryClient.invalidateQueries({ queryKey: queryKeys.meetings.all })
  void queryClient.invalidateQueries({ queryKey: queryKeys.search.all })
}

/** Deals list. Supports `?stage=` / search / owner via params. */
export function useDeals(params: DealListParams = {}) {
  return useQuery<ListResponse<Deal>>({
    queryKey: queryKeys.deals.list(params),
    queryFn: () => services.deals.list(params),
    placeholderData: keepPreviousData,
  })
}

export function useDeal(dealId: string | undefined) {
  return useQuery<Deal>({
    queryKey: queryKeys.deals.detail(dealId ?? ""),
    queryFn: () => services.deals.getById(dealId!),
    enabled: Boolean(dealId),
  })
}

export function useCreateDeal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateDealInput) => services.deals.create(input),
    onSuccess: (deal) => settleDeal(queryClient, deal),
  })
}

export function useUpdateDeal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ dealId, input }: { dealId: string; input: UpdateDealInput }) => services.deals.update(dealId, input),
    onSuccess: (deal) => settleDeal(queryClient, deal),
  })
}

export function useDeleteDeal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (dealId: string) => services.deals.delete(dealId),
    onSuccess: (_void, dealId) => {
      queryClient.removeQueries({ queryKey: queryKeys.deals.detail(dealId) })
      settleDeal(queryClient)
    },
  })
}

export function useLinkDealMeeting() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ dealId, meetingId }: { dealId: string; meetingId: string }) =>
      services.deals.linkMeeting(dealId, meetingId),
    onSuccess: (deal) => settleDeal(queryClient, deal),
  })
}

export function useUnlinkDealMeeting() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ dealId, meetingId }: { dealId: string; meetingId: string }) =>
      services.deals.unlinkMeeting(dealId, meetingId),
    onSuccess: (deal) => settleDeal(queryClient, deal),
  })
}
