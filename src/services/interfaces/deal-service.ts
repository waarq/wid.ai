import type { CreateDealInput, Deal, DealListParams, ListResponse, UpdateDealInput } from "@/types"

/** Lightweight, meeting-driven deal workspace (not a CRM). */
export interface DealService {
  list(params?: DealListParams): Promise<ListResponse<Deal>>
  getById(id: string): Promise<Deal>
  create(input: CreateDealInput): Promise<Deal>
  update(id: string, input: UpdateDealInput): Promise<Deal>
  delete(id: string): Promise<void>
  linkMeeting(dealId: string, meetingId: string): Promise<Deal>
  unlinkMeeting(dealId: string, meetingId: string): Promise<Deal>
}
