"use client"

import { useId } from "react"
import { toast } from "sonner"

import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useUpdateDeal } from "@/hooks"
import type { Deal, DealStage } from "@/types"

import { STAGE_LABEL, STAGE_OPTIONS } from "./deal-meta"

export function DealStageSelect({ deal }: { deal: Deal }) {
  const id = useId()
  const update = useUpdateDeal()

  function change(next: string) {
    const stage = next as DealStage
    if (stage === deal.stage) return
    update.mutate(
      { dealId: deal.id, input: { stage } },
      {
        onSuccess: () => toast.success(`Moved to ${STAGE_LABEL[stage]}`),
        onError: () => toast.error("We couldn't change the stage. The deal is unchanged."),
      },
    )
  }

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        Stage
      </Label>
      <Select value={deal.stage} onValueChange={change} disabled={update.isPending}>
        <SelectTrigger id={id} className="w-44" aria-busy={update.isPending}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STAGE_OPTIONS.map((s) => (
            <SelectItem key={s.value} value={s.value}>
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
