import { Gavel, Handshake, Lightbulb, TriangleAlert, CircleQuestionMark } from "lucide-react"
import type { LucideIcon } from "lucide-react"

import type { KeyMomentType } from "@/types"

export interface MomentMeta {
  label: string
  icon: LucideIcon
  /** Semantic text color token for the icon. */
  tone: string
}

/** Fixed icon per key-moment type (design-system rule: Lucide only, no emoji). */
export const momentMeta: Record<KeyMomentType, MomentMeta> = {
  decision: { label: "Decision", icon: Gavel, tone: "text-primary-ink" },
  commitment: { label: "Commitment", icon: Handshake, tone: "text-info" },
  risk: { label: "Risk", icon: TriangleAlert, tone: "text-warning" },
  question: { label: "Question", icon: CircleQuestionMark, tone: "text-muted-foreground" },
  insight: { label: "Insight", icon: Lightbulb, tone: "text-foreground" },
}
