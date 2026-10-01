import { CircleCheck, CircleQuestionMark, TriangleAlert, type LucideIcon } from "lucide-react"

import { formatDay } from "@/components/calls/format"
import { DEAL_STAGES, type DealSignalSentiment, type DealStage, type Money } from "@/types"

export const STAGE_LABEL: Record<DealStage, string> = {
  new: "New",
  discovery: "Discovery",
  qualified: "Qualified",
  proposal: "Proposal",
  negotiation: "Negotiation",
  won: "Won",
  lost: "Lost",
}

export const STAGE_OPTIONS = DEAL_STAGES.map((value) => ({ value, label: STAGE_LABEL[value] }))

export const STAGE_FILTER_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: "all", label: "All" },
  ...STAGE_OPTIONS,
]

export function parseStage(raw: string | string[] | undefined): DealStage | undefined {
  const value = Array.isArray(raw) ? raw[0] : raw
  return DEAL_STAGES.find((stage) => stage === value)
}

export function parseQuery(raw: string | string[] | undefined): string {
  const value = Array.isArray(raw) ? raw[0] : raw
  return (value ?? "").slice(0, 80)
}

export function formatMoney(value: Money | null | undefined): string {
  if (!value) return "No value set"
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: value.currency,
    maximumFractionDigits: 0,
  }).format(value.amount)
}

export function formatDue(isoDate: string): string {
  // Due dates are calendar dates; parse as local noon to avoid timezone day shifts.
  return formatDay(`${isoDate}T12:00:00`)
}

export const SIGNAL_META: Record<
  DealSignalSentiment,
  { icon: LucideIcon; variant: "success" | "warning" | "muted"; word: string }
> = {
  positive: { icon: CircleCheck, variant: "success", word: "Positive" },
  negative: { icon: TriangleAlert, variant: "warning", word: "Concern" },
  neutral: { icon: CircleQuestionMark, variant: "muted", word: "Open" },
}

export function sourceHref(source: { meetingId: string; sourceSegmentId: string; sourceTimestamp: number }): string {
  return `/my-calls/${source.meetingId}?t=${Math.floor(source.sourceTimestamp)}&segment=${encodeURIComponent(source.sourceSegmentId)}`
}
