export interface LegalSection {
  title: string
  body: string[]
}

export const LEGAL_UPDATED = "October 1, 2026"

export const privacySections: LegalSection[] = [
  {
    title: "About this page",
    body: [
      "WID is currently a product demonstration. This summary describes how the product is designed to treat your information, and what the demo itself does. It is not legal advice and will be replaced by a full policy before any real launch.",
    ],
  },
  {
    title: "What this demo collects",
    body: [
      "Nothing is sent to a server. Sign-in, Google Calendar, Zoom, capture, transcription and AI processing are all simulated, and the meetings you see are fictional demo data. Preferences you set may be stored in your own browser.",
    ],
  },
  {
    title: "What the product is designed to use",
    body: [
      "Your name and email from your Google account. Calendar event titles, times and attendees if you connect a calendar. Recordings and transcripts, but only for meetings you personally choose to capture.",
    ],
  },
  {
    title: "Capture is manual",
    body: [
      "WID does not automatically schedule, join, record or capture your meetings. Connecting a calendar gives WID context only. You are responsible for telling participants that a meeting is being captured and for following the rules that apply to you.",
    ],
  },
  {
    title: "Sharing",
    body: [
      "Meetings are private by default. You can share a meeting with its attendees or your team, and the sharing state is always visible. Sharing by link is only available when a workspace allows it.",
    ],
  },
  {
    title: "Your choices",
    body: [
      "You can disconnect integrations, change capture and sharing preferences, and delete meetings. Contact us through the contact page with any question about your information.",
    ],
  },
]

export const termsSections: LegalSection[] = [
  {
    title: "About these terms",
    body: [
      "These terms apply to this demonstration of WID. They are a short, plain-language placeholder and not legal advice. A complete agreement will replace them before any commercial release.",
    ],
  },
  {
    title: "The demo",
    body: [
      "The demo uses fictional people, companies and meetings. Features that depend on a backend, such as authentication, calendar and Zoom connections, capture, transcription and AI answers, are simulated. Do not rely on the demo for real work.",
    ],
  },
  {
    title: "Recording and consent",
    body: [
      "If you use WID to capture a real meeting in the future, you are responsible for getting any consent that applies and for informing participants. WID never starts a capture on its own.",
    ],
  },
  {
    title: "AI-generated content",
    body: [
      "Summaries, decisions, action items and answers can be wrong. WID links each one to its source so you can check it. Please verify anything important against the conversation.",
    ],
  },
  {
    title: "No warranty",
    body: [
      "The demo is provided as is, without warranties of any kind. It may change or be withdrawn at any time.",
    ],
  },
  {
    title: "Questions",
    body: ["If anything here is unclear, please reach out through the contact page."],
  },
]
