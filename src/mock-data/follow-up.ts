import type { FollowUpEmail } from "@/types"

import { atDay } from "./anchor"
import { meetingIdOf } from "./meetings"
import { personProfiles } from "./people"

const recipient = (key: "ayesha" | "sara" | "ahmed" | "hamza") => ({
  name: personProfiles[key].name,
  email: personProfiles[key].email,
})

export const productPlanningFollowUp: FollowUpEmail = {
  meetingId: meetingIdOf("pp_1001"),
  subject: "Product Planning: Decisions & Next Steps",
  body: [
    "Hi everyone,",
    "",
    "Thanks for today's discussion.",
    "",
    "We aligned on:",
    "",
    "- October 15 launch",
    "- 50-user beta, free of charge",
    "- New dashboard on the new API",
    "",
    "Next steps:",
    "",
    "- Waleed: finish the API integration (Friday, October 9)",
    "- Waleed: prepare the beta documentation (Monday, October 5)",
    "- Sara: write the beta onboarding guide (Thursday, October 8)",
    "- Ayesha: confirm the invite list for the 50-user beta (Tuesday, October 6)",
    "",
    "Still open: who owns customer onboarding during the beta.",
    "",
    "Best,",
    "Waleed",
  ].join("\n"),
  recipients: [recipient("ayesha"), recipient("sara"), recipient("ahmed"), recipient("hamza")],
  decisions: ["October 15 launch", "50-user beta, free of charge", "New dashboard on the new API"],
  nextSteps: [
    { owner: "Waleed", task: "Finish the API integration", actionItemId: "act_pp_1001_1" },
    { owner: "Waleed", task: "Prepare the beta documentation", actionItemId: "act_pp_1001_2" },
    { owner: "Sara", task: "Write the beta onboarding guide", actionItemId: "act_pp_1001_3" },
    { owner: "Ayesha", task: "Confirm the invite list for the 50-user beta", actionItemId: "act_pp_1001_4" },
  ],
  tone: "concise",
  generatedAt: atDay(0, "08:56"),
}

export const clientDiscoveryFollowUp: FollowUpEmail = {
  meetingId: meetingIdOf("client_discovery"),
  subject: "Meridian Freight: Next steps after today's call",
  body: [
    "Hi Usman,",
    "",
    "Thank you for your time today. It was helpful to hear how your dispatch team works.",
    "",
    "What we agreed:",
    "",
    "- A revised proposal with the first phase priced separately for the roughly 70 active dispatchers",
    "- A short security overview, including options for data location",
    "- A walkthrough with your finance team on Friday, October 9",
    "",
    "I'll send the revised proposal tomorrow.",
    "",
    "Best,",
    "Waleed",
  ].join("\n"),
  recipients: [{ name: personProfiles.usman.name, email: personProfiles.usman.email }],
  decisions: ["Phased first-phase pricing", "Finance walkthrough on October 9"],
  nextSteps: [
    { owner: "Waleed", task: "Send the revised proposal", actionItemId: "act_client_discovery_1" },
    { owner: "Waleed", task: "Confirm data location options", actionItemId: "act_client_discovery_2" },
    { owner: "Ali", task: "Send the finance walkthrough invite", actionItemId: "act_client_discovery_3" },
  ],
  tone: "friendly",
  generatedAt: atDay(-1, "15:50"),
}

/** Keyed by meeting id. A mock generateFollowUp can return the matching entry. */
export const followUpTemplates: Record<string, FollowUpEmail> = {
  [productPlanningFollowUp.meetingId]: productPlanningFollowUp,
  [clientDiscoveryFollowUp.meetingId]: clientDiscoveryFollowUp,
}
