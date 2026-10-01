import type { JobFunction } from "@/types"

export interface AttentionTotals {
  actionItems: number
  decisions: number
  openQuestions: number
  risks: number
}

export interface AttentionTile {
  key: string
  count: number
  singular: string
  plural: string
}

type Source = keyof AttentionTotals
type Spec = [Source, string, string]

/**
 * Per-role labelling of the same underlying numbers. Mock logic: real
 * personalization would come from the backend. Same counts, role vocabulary.
 */
const BY_FUNCTION: Partial<Record<JobFunction, Spec[]>> = {
  engineering: [
    ["actionItems", "action item", "action items"],
    ["decisions", "decision", "decisions"],
    ["risks", "technical risk", "technical risks"],
  ],
  sales: [
    ["actionItems", "customer commitment", "customer commitments"],
    ["openQuestions", "follow-up", "follow-ups"],
    ["decisions", "decision", "decisions"],
  ],
  management: [
    ["decisions", "decision", "decisions"],
    ["actionItems", "action item", "action items"],
    ["risks", "risk", "risks"],
  ],
  executive: [
    ["decisions", "decision", "decisions"],
    ["actionItems", "action item", "action items"],
    ["risks", "risk", "risks"],
  ],
  product: [
    ["decisions", "decision", "decisions"],
    ["openQuestions", "open question", "open questions"],
    ["actionItems", "action item", "action items"],
  ],
}

const DEFAULT_SPEC: Spec[] = [
  ["actionItems", "action item", "action items"],
  ["decisions", "decision", "decisions"],
  ["openQuestions", "unresolved question", "unresolved questions"],
]

export function buildAttentionTiles(jobFunction: JobFunction | null, totals: AttentionTotals): AttentionTile[] {
  const spec = (jobFunction && BY_FUNCTION[jobFunction]) || DEFAULT_SPEC
  return spec.map(([source, singular, plural]) => ({
    key: `${source}-${singular}`,
    count: totals[source],
    singular,
    plural,
  }))
}

export function greetingFor(date: Date): string {
  const hour = date.getHours()
  if (hour < 12) return "Good morning"
  if (hour < 18) return "Good afternoon"
  return "Good evening"
}
