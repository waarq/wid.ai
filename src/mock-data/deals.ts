import type { Deal, DealSignal, DealSignalKind, DealSignalSentiment } from "@/types"

import { atDay, dateOnly } from "./anchor"
import { meetingIdOf, meetingRef, meetings, traceAt } from "./meetings"
import { personRefOf } from "./people"

function signal(
  id: string,
  kind: DealSignalKind,
  sentiment: DealSignalSentiment,
  label: string,
  slug: string,
  at: string,
): DealSignal {
  return { id, kind, sentiment, label, ...traceAt(slug, at) }
}

function lastMeetingAt(ids: string[]): string | undefined {
  const times = meetings.filter((m) => ids.includes(m.id)).map((m) => m.startedAt)
  return times.sort((a, b) => Date.parse(b) - Date.parse(a))[0]
}

const meridianMeetings = [meetingIdOf("leadership_sync"), meetingIdOf("client_discovery")]
const northstarMeetings = [meetingIdOf("sales_demo")]
const vertexMeetings = [meetingIdOf("leadership_sync")]
const atlasMeetings = [meetingIdOf("leadership_sync"), meetingIdOf("customer_research")]
const crescentMeetings = [meetingIdOf("leadership_sync")]

/** Demo companies only. None of these are real WIT customers. */
export const deals: Deal[] = [
  {
    id: "deal_meridian_freight",
    company: "Meridian Freight",
    name: "Meridian Freight, dispatcher call notes",
    value: { amount: 24800, currency: "USD" },
    stage: "proposal",
    owner: personRefOf("ali"),
    nextAction: {
      title: "Send revised proposal",
      dueDate: dateOnly(1),
      actionItemId: "act_client_discovery_1",
    },
    signals: [
      signal("sig_mf_1", "interest", "positive", "Interested", "client_discovery", "02:05"),
      signal("sig_mf_2", "concern", "negative", "Pricing concern", "client_discovery", "03:41"),
      signal("sig_mf_3", "decision_maker", "positive", "Decision maker present", "client_discovery", "00:28"),
      signal("sig_mf_4", "timeline", "neutral", "Decision needed within two weeks", "client_discovery", "11:00"),
      signal("sig_mf_5", "question", "neutral", "Asked about data location", "client_discovery", "09:10"),
    ],
    meetings: meridianMeetings.map(meetingRef),
    lastMeetingAt: lastMeetingAt(meridianMeetings),
    createdAt: atDay(-16, "10:00"),
    updatedAt: atDay(-1, "16:00"),
  },
  {
    id: "deal_northstar_labs",
    company: "Northstar Labs",
    name: "Northstar Labs, customer operations notes",
    value: { amount: 12500, currency: "USD" },
    stage: "discovery",
    owner: personRefOf("ali"),
    nextAction: {
      title: "Send invite for the October 7 pricing walkthrough",
      dueDate: dateOnly(1),
      actionItemId: "act_sales_demo_1",
    },
    signals: [
      signal("sig_nl_1", "interest", "positive", "Interested", "sales_demo", "02:20"),
      signal("sig_nl_2", "budget", "positive", "Pricing in a workable range", "sales_demo", "16:45"),
      signal("sig_nl_3", "decision_maker", "neutral", "Director joining the next call", "sales_demo", "18:05"),
      signal("sig_nl_4", "concern", "negative", "Requires CRM export", "sales_demo", "20:30"),
    ],
    meetings: northstarMeetings.map(meetingRef),
    lastMeetingAt: lastMeetingAt(northstarMeetings),
    createdAt: atDay(-12, "11:00"),
    updatedAt: atDay(-2, "15:00"),
  },
  {
    id: "deal_vertex_digital",
    company: "Vertex Digital",
    name: "Vertex Digital, annual plan",
    value: { amount: 40000, currency: "USD" },
    stage: "negotiation",
    owner: personRefOf("ali"),
    nextAction: {
      title: "Send revised terms with quarterly billing",
      dueDate: dateOnly(5),
      actionItemId: "act_leadership_sync_1",
    },
    signals: [
      signal("sig_vd_1", "timeline", "positive", "Requested a 12-month term", "leadership_sync", "03:40"),
      signal("sig_vd_2", "budget", "neutral", "Asked for a ten percent discount", "leadership_sync", "03:40"),
      signal("sig_vd_3", "concern", "negative", "SSO is the sticking point", "leadership_sync", "04:50"),
    ],
    meetings: vertexMeetings.map(meetingRef),
    lastMeetingAt: lastMeetingAt(vertexMeetings),
    createdAt: atDay(-30, "09:30"),
    updatedAt: atDay(-1, "17:10"),
  },
  {
    id: "deal_atlas_properties",
    company: "Atlas Properties",
    name: "Atlas Properties, building operations",
    value: { amount: 31200, currency: "USD" },
    stage: "won",
    owner: personRefOf("ali"),
    nextAction: { title: "Schedule onboarding kickoff", dueDate: dateOnly(3) },
    signals: [
      signal("sig_ap_1", "interest", "positive", "Wants commitment tracking", "customer_research", "21:05"),
      signal("sig_ap_2", "objection", "neutral", "Will not use automatic recording", "customer_research", "13:30"),
      signal("sig_ap_3", "budget", "neutral", "Sensitive to per-seat pricing", "customer_research", "38:10"),
    ],
    meetings: atlasMeetings.map(meetingRef),
    lastMeetingAt: lastMeetingAt(atlasMeetings),
    createdAt: atDay(-40, "10:00"),
    updatedAt: atDay(-3, "12:00"),
  },
  {
    id: "deal_crescent_health",
    company: "Crescent Health",
    name: "Crescent Health, clinical team notes",
    value: { amount: 22000, currency: "USD" },
    stage: "lost",
    owner: personRefOf("ali"),
    signals: [
      signal("sig_ch_1", "competitor", "negative", "Chose a bundled competitor", "leadership_sync", "01:20"),
      signal("sig_ch_2", "objection", "negative", "Wanted one vendor for scheduling and notes", "leadership_sync", "02:25"),
    ],
    meetings: crescentMeetings.map(meetingRef),
    lastMeetingAt: lastMeetingAt(crescentMeetings),
    createdAt: atDay(-45, "10:00"),
    updatedAt: atDay(-1, "16:50"),
  },
]
