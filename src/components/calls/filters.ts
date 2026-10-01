import type { MeetingDateRange, MeetingListParams, MeetingScope, MeetingStatus } from "@/types"


type RawParams = Record<string, string | string[] | undefined>

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

/* ---------- My Calls ---------- */

export const MY_CALLS_RANGES = [
  { value: "all", label: "All" },
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "shared", label: "Shared with me" },
] as const
export type MyCallsRange = (typeof MY_CALLS_RANGES)[number]["value"]

/** Status filter options in the UI (groups processing sub-states). */
export const STATUS_FILTERS = [
  { value: "all", label: "Any status" },
  { value: "ready", label: "Ready" },
  { value: "processing", label: "Processing" },
  { value: "failed", label: "Failed" },
  { value: "upcoming", label: "Upcoming" },
] as const
export type StatusFilter = (typeof STATUS_FILTERS)[number]["value"]

export interface MyCallsFilters {
  range: MyCallsRange
  status: StatusFilter
  q: string
}

export function parseMyCallsFilters(raw: RawParams): MyCallsFilters {
  const range = first(raw.range)
  const status = first(raw.status)
  return {
    range: MY_CALLS_RANGES.some((r) => r.value === range) ? (range as MyCallsRange) : "all",
    status: STATUS_FILTERS.some((s) => s.value === status) ? (status as StatusFilter) : "all",
    q: (first(raw.q) ?? "").slice(0, 120),
  }
}

function statusParam(status: StatusFilter): MeetingStatus | MeetingStatus[] | undefined {
  if (status === "all") return undefined
  if (status === "processing") return ["processing", "transcribing", "understanding"]
  return status
}

export function toMyCallsParams(filters: MyCallsFilters): MeetingListParams {
  const rangeMap: Record<Exclude<MyCallsRange, "shared">, MeetingDateRange> = {
    all: "all",
    today: "today",
    week: "this_week",
    month: "this_month",
  }
  const scope: MeetingScope = filters.range === "shared" ? "shared_with_me" : "my_calls"
  return {
    scope,
    range: filters.range === "shared" ? "all" : rangeMap[filters.range],
    status: statusParam(filters.status),
    search: filters.q.trim() || undefined,
    sort: "recent",
    limit: 50,
  }
}

export function hasActiveMyCallsFilters(f: MyCallsFilters): boolean {
  return f.range !== "all" || f.status !== "all" || f.q.trim() !== ""
}

/* ---------- Team Calls ---------- */

export const TEAM_MEMBERS = [
  { value: "everyone", label: "Everyone" },
  { value: "team", label: "My team" },
  { value: "shared", label: "Shared with me" },
] as const
export type TeamMember = (typeof TEAM_MEMBERS)[number]["value"]

export interface TeamCallsFilters {
  member: TeamMember
}

export function parseTeamCallsFilters(raw: RawParams): TeamCallsFilters {
  const member = first(raw.member)
  return { member: TEAM_MEMBERS.some((m) => m.value === member) ? (member as TeamMember) : "everyone" }
}

export function toTeamCallsParams(filters: TeamCallsFilters): MeetingListParams {
  const scope: MeetingScope =
    filters.member === "team" ? "my_team" : filters.member === "shared" ? "shared_with_me" : "team"
  return { scope, status: "ready", sort: "recent", limit: 50 }
}

