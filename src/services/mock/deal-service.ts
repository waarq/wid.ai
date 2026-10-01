import { AppException } from "@/lib/utils/errors"
import type { DealService } from "@/services/interfaces"
import {
  DEAL_STAGES,
  type CreateDealInput,
  type CurrencyCode,
  type Deal,
  type DealListParams,
  type DealStage,
  type ListResponse,
  type Money,
  type UpdateDealInput,
} from "@/types"

import type { MockDb } from "./db"
import { linkMeetingToDeal, recomputeDealMeetings, unlinkMeetingFromDeal } from "./meeting-ops"
import { mockCall, mockWrite } from "./runtime"
import { createId, normalize, nowIso, paginate, rawTokens } from "./utils"

const CURRENCIES: readonly CurrencyCode[] = ["USD", "EUR", "GBP", "PKR", "AED"]
const STAGE_LABEL: Record<DealStage, string> = {
  new: "New",
  discovery: "Discovery",
  qualified: "Qualified",
  proposal: "Proposal",
  negotiation: "Negotiation",
  won: "Won",
  lost: "Lost",
}

function validateStage(stage: unknown): DealStage {
  if (!(DEAL_STAGES as readonly unknown[]).includes(stage)) {
    throw new AppException("validation_error", { details: { fieldErrors: { stage: ["Choose a stage."] } } })
  }
  return stage as DealStage
}

function validateMoney(value: Money | null | undefined): Money | null | undefined {
  if (value === undefined || value === null) return value
  if (!Number.isFinite(value.amount) || value.amount < 0 || !CURRENCIES.includes(value.currency)) {
    throw new AppException("validation_error", { details: { fieldErrors: { value: ["Enter a valid amount."] } } })
  }
  return { amount: Math.round(value.amount * 100) / 100, currency: value.currency }
}

function validateCompany(company: string | undefined): string {
  const value = (company ?? "").trim()
  if (!value || value.length > 120) {
    throw new AppException("validation_error", { details: { fieldErrors: { company: ["Add the company name."] } } })
  }
  return value
}

function requireDeal(db: MockDb, id: string): Deal {
  const deal = db.state.deals.find((d) => d.id === id)
  if (!deal) throw new AppException("not_found", { cause: new Error(`deal ${id}`) })
  return deal
}

function present(db: MockDb, deal: Deal): Deal {
  recomputeDealMeetings(deal, db)
  return deal
}

function matchesSearch(deal: Deal, search: string | undefined): boolean {
  if (!search?.trim()) return true
  const haystack = normalize(
    [deal.company, deal.name, deal.nextAction?.title ?? "", ...deal.signals.map((s) => s.label), STAGE_LABEL[deal.stage]].join(" "),
  )
  return rawTokens(search).every((token) => haystack.includes(token))
}

export class MockDealService implements DealService {
  list(params: DealListParams = {}): Promise<ListResponse<Deal>> {
    return mockCall("deals.list", (db) => {
      if (params.stage) validateStage(params.stage)
      const items = db.state.deals
        .filter(
          (d) =>
            (!params.stage || d.stage === params.stage) &&
            (!params.ownerId || d.owner.id === params.ownerId) &&
            matchesSearch(d, params.search),
        )
        .map((d) => present(db, d))
        .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
      return paginate(items, params)
    })
  }

  getById(id: string): Promise<Deal> {
    return mockCall("deals.getById", (db) => present(db, requireDeal(db, id)))
  }

  create(input: CreateDealInput): Promise<Deal> {
    return mockWrite("deals.create", (db) => {
      const company = validateCompany(input.company)
      const stage = validateStage(input.stage)
      const value = validateMoney(input.value) ?? null
      const meetings = (input.meetingIds ?? []).map((id) => {
        const meeting = db.findMeeting(id)
        if (!meeting || !db.canAccess(meeting)) {
          throw new AppException("validation_error", { details: { fieldErrors: { meetingIds: ["One of the meetings isn't available."] } } })
        }
        return meeting
      })
      const now = nowIso()
      const me = db.me
      const deal: Deal = {
        id: createId("deal"),
        company,
        name: input.name?.trim() || `${company}, new opportunity`,
        value,
        stage,
        owner: { id: me.personId, name: me.name, email: me.email },
        signals: [],
        meetings: [],
        createdAt: now,
        updatedAt: now,
      }
      db.state.deals.unshift(deal)
      for (const meeting of meetings) linkMeetingToDeal(db, deal, meeting)
      return present(db, deal)
    })
  }

  update(id: string, input: UpdateDealInput): Promise<Deal> {
    return mockWrite("deals.update", (db) => {
      const deal = requireDeal(db, id)
      const previousStage = deal.stage
      if (input.company !== undefined) deal.company = validateCompany(input.company)
      if (input.name !== undefined) deal.name = input.name.trim() || deal.company
      if (input.value !== undefined) deal.value = validateMoney(input.value) ?? null
      if (input.stage !== undefined) deal.stage = validateStage(input.stage)
      if (input.nextAction !== undefined) {
        if (input.nextAction && !input.nextAction.title.trim()) {
          throw new AppException("validation_error", { details: { fieldErrors: { nextAction: ["Describe the next action."] } } })
        }
        deal.nextAction = input.nextAction ?? undefined
      }
      deal.updatedAt = nowIso()
      if (deal.stage !== previousStage && db.state.settings.notifications.dealUpdates) {
        db.addAlert({
          type: "deal_update",
          title: `Deal moved to ${STAGE_LABEL[deal.stage]}`,
          body: `${deal.company} moved from ${STAGE_LABEL[previousStage]} to ${STAGE_LABEL[deal.stage]}.`,
          target: { kind: "deal", dealId: deal.id },
        })
      }
      return present(db, deal)
    })
  }

  delete(id: string): Promise<void> {
    return mockWrite("deals.delete", (db) => {
      const deal = requireDeal(db, id)
      for (const meeting of db.state.meetings) if (meeting.dealId === deal.id) meeting.dealId = undefined
      db.state.deals = db.state.deals.filter((d) => d.id !== id)
      db.state.alerts = db.state.alerts.filter((a) => !(a.target.kind === "deal" && a.target.dealId === id))
    })
  }

  linkMeeting(dealId: string, meetingId: string): Promise<Deal> {
    return mockWrite("deals.linkMeeting", (db) => {
      const deal = requireDeal(db, dealId)
      linkMeetingToDeal(db, deal, db.requireMeeting(meetingId))
      return present(db, deal)
    })
  }

  unlinkMeeting(dealId: string, meetingId: string): Promise<Deal> {
    return mockWrite("deals.unlinkMeeting", (db) => {
      const deal = requireDeal(db, dealId)
      if (!deal.meetings.some((r) => r.id === meetingId)) {
        throw new AppException("not_found", { message: "That meeting isn't linked to this deal." })
      }
      unlinkMeetingFromDeal(db, deal, meetingId)
      return present(db, deal)
    })
  }
}
