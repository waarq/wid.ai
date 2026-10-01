import {
  BookOpenText,
  Gavel,
  ListChecks,
  Mail,
  MessageCircleQuestionMark,
  type LucideIcon,
} from "lucide-react"

export interface RoleUseCase {
  role: string
  line: string
}

/** Conceptual proof only. No customers, logos or statistics. */
export const builtFor: RoleUseCase[] = [
  { role: "Sales", line: "Recall what the buyer said about pricing, who has to approve, and what you promised." },
  { role: "Engineering", line: "Keep technical decisions and dependencies from being lost between standups." },
  { role: "Product", line: "Trace every customer requirement and priority back to the conversation it came from." },
  { role: "Consulting", line: "Hold on to client commitments and turn each session into a clear follow-up." },
  { role: "Customer Success", line: "Know what a customer was told, what they asked for, and what is still open." },
  { role: "Management", line: "Catch up on meetings you did not attend without reading a transcript." },
]

export const problems: string[] = [
  "People forget what was discussed.",
  "Action items disappear into chat.",
  "Decisions become difficult to find.",
  "Someone asks, “What did we agree on?”",
  "Managers need context from meetings they didn’t attend.",
  "Client commitments get lost.",
  "Teams repeat the same conversations.",
  "Meeting recordings become unread archives.",
]

export interface Output {
  label: string
  detail: string
  icon: LucideIcon
}

export const outputs: Output[] = [
  { label: "Decision", detail: "What was settled, and by whom.", icon: Gavel },
  { label: "Action", detail: "Who owns what, and by when.", icon: ListChecks },
  { label: "Question", detail: "What is still unresolved.", icon: MessageCircleQuestionMark },
  { label: "Context", detail: "The summary, risks and topics.", icon: BookOpenText },
  { label: "Follow-up", detail: "A draft you can send.", icon: Mail },
]

export interface Step {
  number: string
  title: string
  body: string
  /** Shown as a highlighted note under steps 1 and 2. */
  note?: string
  list?: string[]
}

export const steps: Step[] = [
  {
    number: "01",
    title: "Connect your calendar",
    body: "Connect Google Calendar so WIT understands your meeting schedule. WIT reads titles, times and attendees, and nothing else.",
    note: "Connecting your calendar does not automatically record meetings.",
  },
  {
    number: "02",
    title: "Capture when you want",
    body: "Choose a meeting and manually start capture. You can pause and stop at any time, and every meeting is private until you share it.",
    note: "No automatic recording by default. WIT never joins a call on its own.",
  },
  {
    number: "03",
    title: "WIT understands the conversation",
    body: "After the meeting, WIT shows its progress and then produces:",
    list: [
      "Transcript",
      "Summary",
      "Decisions",
      "Action items",
      "Questions",
      "Risks",
      "Highlights",
      "Topics",
    ],
  },
  {
    number: "04",
    title: "Find and act on what matters",
    body: "Search your meetings, ask questions about a meeting and jump directly to the source conversation. Every insight shows where it came from.",
  },
]
