import type { Integration } from "@/types"

import { atDay } from "./anchor"

export const integrations: Integration[] = [
  {
    provider: "google",
    category: "identity",
    status: "connected",
    accountLabel: "waleed@wit-demo.com",
    connectedAt: atDay(-34, "10:12"),
    settings: {},
  },
  {
    provider: "google_calendar",
    category: "calendar",
    status: "connected",
    accountLabel: "waleed@wit-demo.com",
    connectedAt: atDay(-34, "10:20"),
    settings: { syncedCalendarIds: ["primary"], showDeclinedEvents: false },
  },
  {
    provider: "zoom",
    category: "conferencing",
    status: "connected",
    accountLabel: "waleed@wit-demo.com",
    connectedAt: atDay(-33, "09:40"),
    settings: { defaultCaptureMode: "audio" },
  },
  { provider: "slack", category: "messaging", status: "coming_soon", settings: null },
  { provider: "microsoft_calendar", category: "calendar", status: "coming_soon", settings: null },
  { provider: "hubspot", category: "crm", status: "coming_soon", settings: null },
  { provider: "salesforce", category: "crm", status: "coming_soon", settings: null },
]

/** Zoom as it looks before connecting, for onboarding and the "Connect" state. */
export const zoomDisconnected: Integration = {
  provider: "zoom",
  category: "conferencing",
  status: "disconnected",
  settings: null,
}
