import type { PlaylistItem } from "@/types"

import { atDay, clock } from "./anchor"
import { meetingIdOf, meetingRef, segmentTextAt, traceAt } from "./meetings"

/** Newest first. Every item points at a real transcript segment. */
export const playlistItems: PlaylistItem[] = [
  {
    id: "pl_1",
    kind: "quote",
    title: "Customer objection",
    note: "Price is well above Meridian's budget.",
    quote: segmentTextAt("client_discovery", "03:41"),
    meeting: meetingRef(meetingIdOf("client_discovery")),
    createdAt: atDay(-1, "15:50"),
    ...traceAt("client_discovery", "03:41"),
  },
  {
    id: "pl_2",
    kind: "decision",
    title: "Pricing decision",
    note: "Beta is free and limited to 50 users.",
    quote: segmentTextAt("pp_1001", "17:22"),
    meeting: meetingRef(meetingIdOf("pp_1001")),
    createdAt: atDay(0, "09:05"),
    ...traceAt("pp_1001", "17:22"),
  },
  {
    id: "pl_3",
    kind: "insight",
    title: "Product insight",
    note: "Track promises made to tenants, not transcripts.",
    quote: segmentTextAt("customer_research", "21:05"),
    meeting: meetingRef(meetingIdOf("customer_research")),
    createdAt: atDay(-6, "14:10"),
    ...traceAt("customer_research", "21:05"),
  },
  {
    id: "pl_4",
    kind: "decision",
    title: "Launch decision",
    quote: segmentTextAt("pp_1001", "01:38"),
    meeting: meetingRef(meetingIdOf("pp_1001")),
    createdAt: atDay(0, "09:02"),
    ...traceAt("pp_1001", "01:38"),
  },
  {
    id: "pl_5",
    kind: "commitment",
    title: "Important commitment",
    note: "Revised proposal promised for tomorrow.",
    quote: segmentTextAt("client_discovery", "12:50"),
    meeting: meetingRef(meetingIdOf("client_discovery")),
    createdAt: atDay(-1, "15:55"),
    ...traceAt("client_discovery", "12:50"),
  },
  {
    id: "pl_6",
    kind: "highlight",
    title: "Pricing discussion",
    note: "Twelve-seat annual plan quoted for Northstar Labs.",
    endTimestamp: clock("18:05"),
    meeting: meetingRef(meetingIdOf("sales_demo")),
    createdAt: atDay(-2, "14:40"),
    ...traceAt("sales_demo", "15:30"),
  },
]
