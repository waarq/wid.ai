import type { Alert } from "@/types"

import { atDay, minutesBeforeNow } from "./anchor"
import { meetingIdOf, meetingRef } from "./meetings"
import { personRefOf } from "./people"

const clientDiscoveryId = meetingIdOf("client_discovery")
const ppId = meetingIdOf("pp_1001")
const engSyncId = meetingIdOf("eng_sync")

/** Newest first. Doubles as the global notification feed. */
export const alerts: Alert[] = [
  {
    id: "alert_1",
    type: "action_due",
    title: "Action item due tomorrow",
    body: "You committed to send the proposal during Client Discovery.",
    target: { kind: "action_item", meetingId: clientDiscoveryId, actionItemId: "act_client_discovery_1" },
    meeting: meetingRef(clientDiscoveryId),
    readAt: null,
    createdAt: minutesBeforeNow(20),
  },
  {
    id: "alert_2",
    type: "mention",
    title: "You were mentioned",
    body: "Ayesha assigned you the API integration in Product Planning.",
    target: { kind: "action_item", meetingId: ppId, actionItemId: "act_pp_1001_1" },
    meeting: meetingRef(ppId),
    actor: personRefOf("ayesha"),
    readAt: null,
    createdAt: minutesBeforeNow(33),
  },
  {
    id: "alert_3",
    type: "decision_changed",
    title: "Decision changed",
    body: "The launch date changed from Oct 12 to Oct 15 in Product Planning.",
    target: { kind: "meetings", meetingIds: ["mtg_pp_0925", ppId] },
    meeting: meetingRef(ppId),
    change: { from: "Oct 12", to: "Oct 15" },
    readAt: null,
    createdAt: minutesBeforeNow(34),
  },
  {
    id: "alert_4",
    type: "meeting_ready",
    title: "Meeting ready",
    body: "Your Product Planning meeting is ready.",
    target: { kind: "meeting", meetingId: ppId },
    meeting: meetingRef(ppId),
    readAt: null,
    createdAt: minutesBeforeNow(35),
  },
  {
    id: "alert_5",
    type: "mention",
    title: "You were mentioned",
    body: "Sara mentioned you in Engineering Sync.",
    target: { kind: "meeting", meetingId: engSyncId },
    meeting: meetingRef(engSyncId),
    actor: personRefOf("sara"),
    readAt: atDay(-1, "11:20"),
    createdAt: atDay(-1, "10:41"),
  },
  {
    id: "alert_6",
    type: "meeting_shared",
    title: "Meeting shared with you",
    body: "Ahmed shared Engineering Sync with the team.",
    target: { kind: "meeting", meetingId: engSyncId },
    meeting: meetingRef(engSyncId),
    actor: personRefOf("ahmed"),
    readAt: atDay(-1, "11:20"),
    createdAt: atDay(-1, "10:36"),
  },
  {
    id: "alert_7",
    type: "processing_failed",
    title: "Processing failed",
    body: "We couldn't transcribe Design Review. Your recording is safe, and you can try again.",
    target: { kind: "meeting", meetingId: meetingIdOf("design_review") },
    meeting: meetingRef(meetingIdOf("design_review")),
    readAt: atDay(-2, "12:30"),
    createdAt: atDay(-2, "11:44"),
  },
  {
    id: "alert_8",
    type: "deal_update",
    title: "Deal moved to Negotiation",
    body: "Vertex Digital moved from Proposal to Negotiation.",
    target: { kind: "deal", dealId: "deal_vertex_digital" },
    actor: personRefOf("ali"),
    readAt: atDay(-3, "09:10"),
    createdAt: atDay(-3, "08:55"),
  },
]
