import { Badge } from "@/components/ui/badge"
import type { DealStage } from "@/types"

import { STAGE_LABEL } from "./deal-meta"

const VARIANT = {
  new: "muted",
  discovery: "info",
  qualified: "info",
  proposal: "warning",
  negotiation: "warning",
  won: "success",
  lost: "danger",
} as const

export function StageBadge({ stage }: { stage: DealStage }) {
  return <Badge variant={VARIANT[stage]}>{STAGE_LABEL[stage]}</Badge>
}
