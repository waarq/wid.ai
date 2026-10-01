export interface FeatureCopy {
  id: string
  eyebrow: string
  title: string
  description: string
  points?: string[]
}

export const featureCopy = {
  brief: {
    id: "meeting-brief",
    eyebrow: "Meeting brief",
    title: "Know what happened without reading the transcript.",
    description:
      "Every meeting opens with a brief: what was decided, what needs to happen next and what is still open. The transcript stays underneath as evidence.",
    points: ["Overview, key points and decisions first", "Questions and risks called out", "Transcript last, never first"],
  },
  actions: {
    id: "action-items",
    eyebrow: "Action items",
    title: "Every action knows where it came from.",
    description:
      "Actions are assigned, dated and linked to the meeting and the moment they were agreed in. When someone asks where an action came from, the answer is one click away.",
    points: ["Owner and due date, or an honest “No deadline”", "Edit, complete or dismiss", "Source meeting and timestamp on every item"],
  },
  moments: {
    id: "smart-moments",
    eyebrow: "Smart moments",
    title: "The moments that mattered, in order.",
    description:
      "Decisions, commitments, risks, questions and insights are placed on a timeline of the meeting. Select one to read the conversation around it.",
  },
  ask: {
    id: "ask-the-meeting",
    eyebrow: "Ask the meeting",
    title: "Get the moment, not just an answer.",
    description:
      "Ask a question about a meeting and WID answers with the exact timestamps it used, so you can check instead of trust. The demo answers below are pre-written.",
  },
  search: {
    id: "meeting-memory",
    eyebrow: "Searchable meeting memory",
    title: "Search everything that was said.",
    description:
      "Search by what someone said, not just by title. Results come from meeting titles, participants, transcripts, action items, decisions, topics, tags and deals, and each one jumps to the moment.",
  },
  history: {
    id: "meeting-history",
    eyebrow: "Meeting history",
    title: "See how a decision changed.",
    description:
      "When a decision moves from one meeting to the next, WID keeps the whole trail: when it changed, what it changed to, and the conversation behind each step.",
  },
  followUp: {
    id: "follow-up",
    eyebrow: "Follow-up",
    title: "Draft the follow-up while it is fresh.",
    description:
      "WID drafts a follow-up from the decisions and next steps. Copy it, edit it and send it from your own email. Nothing is sent for you.",
  },
} satisfies Record<string, FeatureCopy>
