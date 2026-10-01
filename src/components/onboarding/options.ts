import {
  Building2,
  CalendarClock,
  CircleQuestionMark,
  ClipboardList,
  Gavel,
  Handshake,
  ListChecks,
  Quote,
  TrendingUp,
  TriangleAlert,
  UserRound,
  type LucideIcon,
} from "lucide-react"

import type {
  CapturePreference,
  EmailType,
  JobFunction,
  MeetingCategory,
  MeetingFocus,
  OnboardingGoal,
  SharingPreference,
} from "@/types"

/*
 * User-facing copy for every onboarding enum. Shared by the onboarding
 * selectors, the completion summary and (later) Settings, so labels never drift.
 */

export interface OptionCopy<V extends string> {
  value: V
  label: string
  description?: string
  icon?: LucideIcon
}

export const EMAIL_TYPE_OPTIONS: OptionCopy<EmailType>[] = [
  {
    value: "company",
    label: "My company's email",
    description: "I'm using WIT for work and team meetings.",
    icon: Building2,
  },
  {
    value: "personal",
    label: "My personal email",
    description: "I'm using WIT for my own meetings and projects.",
    icon: UserRound,
  },
]

export const CAPTURE_PREFERENCE_OPTIONS: OptionCopy<CapturePreference>[] = [
  {
    value: "all_calendar_meetings",
    label: "All calendar meetings",
    description: "WIT will make every meeting available for manual capture.",
  },
  {
    value: "selected_meetings",
    label: "Selected meetings",
    description: "Choose which types of meetings you want to capture.",
  },
  {
    value: "manual",
    label: "I'll choose manually",
    description: "WIT will never automatically capture. I'll start each meeting myself.",
  },
]

export const CAPTURE_PREFERENCE_SHORT: Record<CapturePreference, string> = {
  all_calendar_meetings: "All calendar meetings, started by you",
  selected_meetings: "Selected meetings, started by you",
  manual: "Manual",
}

export const MEETING_CATEGORY_OPTIONS: OptionCopy<MeetingCategory>[] = [
  { value: "internal", label: "Internal meetings", description: "Only people from your organisation." },
  { value: "external", label: "External meetings", description: "At least one guest from outside." },
  { value: "one_on_one", label: "One-on-ones", description: "Just you and one other person." },
  { value: "recurring", label: "Recurring meetings", description: "Standups, syncs and weekly reviews." },
  { value: "customer", label: "Customer calls", description: "Discovery, demos and check-ins." },
]

export const SHARING_OPTIONS: OptionCopy<SharingPreference>[] = [
  {
    value: "all_attendees",
    label: "All attendees",
    description: "Meeting notes can be shared with everyone invited to the meeting.",
  },
  {
    value: "only_me",
    label: "Only me",
    description: "Keep meeting notes private unless you choose to share them.",
  },
]

export const SHARING_SHORT: Record<SharingPreference, string> = {
  all_attendees: "All attendees",
  only_me: "Only me",
}

export const MEETING_FOCUS_COPY: OptionCopy<MeetingFocus>[] = [
  { value: "decisions", label: "Decisions", icon: Gavel },
  { value: "action_items", label: "Action items", icon: ListChecks },
  { value: "questions", label: "Questions", icon: CircleQuestionMark },
  { value: "risks", label: "Risks & blockers", icon: TriangleAlert },
  { value: "customer_requirements", label: "Customer requirements", icon: ClipboardList },
  { value: "commitments", label: "Follow-up commitments", icon: Handshake },
  { value: "deadlines", label: "Deadlines", icon: CalendarClock },
  { value: "quotes", label: "Important quotes", icon: Quote },
  { value: "sales_opportunities", label: "Sales opportunities", icon: TrendingUp },
]

/** Compact labels for the completion summary ("Decisions · Actions · Questions"). */
export const MEETING_FOCUS_SHORT: Record<MeetingFocus, string> = {
  decisions: "Decisions",
  action_items: "Actions",
  questions: "Questions",
  risks: "Risks",
  customer_requirements: "Requirements",
  commitments: "Commitments",
  deadlines: "Deadlines",
  quotes: "Quotes",
  sales_opportunities: "Opportunities",
}

export const JOB_FUNCTION_OPTIONS: OptionCopy<JobFunction>[] = [
  { value: "sales", label: "Sales" },
  { value: "engineering", label: "Engineering" },
  { value: "product", label: "Product" },
  { value: "marketing", label: "Marketing" },
  { value: "customer_success", label: "Customer Success" },
  { value: "operations", label: "Operations" },
  { value: "management", label: "Management" },
  { value: "consulting", label: "Consulting" },
  { value: "recruiting", label: "Recruiting" },
  { value: "executive", label: "Founder / Executive" },
  { value: "other", label: "Other" },
]

export const GOAL_OPTIONS: OptionCopy<OnboardingGoal>[] = [
  { value: "remember_decisions", label: "Remember decisions" },
  { value: "track_action_items", label: "Track action items" },
  { value: "prepare_follow_ups", label: "Prepare follow-ups" },
  { value: "understand_customer_conversations", label: "Understand customer conversations" },
  { value: "search_past_meetings", label: "Search past meetings" },
  { value: "keep_team_aligned", label: "Keep my team aligned" },
]
