import type { MeetingSpec } from "./spec"

/** Calendar meetings the user can choose to capture. Nothing here records automatically. */
export const designReviewUpcoming: MeetingSpec = {
  slug: "design_review_next",
  title: "Design Review",
  day: 0,
  time: "14:00",
  durationSec: 2700,
  status: "ready_to_capture",
  visibility: "private",
  platform: "zoom",
  captureMode: "audio",
  owner: "sara",
  participants: [["sara"], ["waleed"], ["ayesha"], ["hamza"]],
  tags: ["design"],
  sharedWithMe: true,
  calendarEventId: "evt_design_review",
}

export const engineeringSyncUpcoming: MeetingSpec = {
  slug: "eng_sync_next",
  title: "Engineering Sync",
  day: 1,
  time: "10:00",
  durationSec: 1800,
  status: "upcoming",
  visibility: "private",
  platform: "google_meet",
  captureMode: "audio",
  owner: "ahmed",
  participants: [["ahmed"], ["waleed"], ["hamza"], ["sara"]],
  tags: ["engineering"],
  sharedWithMe: true,
  calendarEventId: "evt_engineering_sync",
}
