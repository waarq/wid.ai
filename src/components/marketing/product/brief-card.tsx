import Link from "next/link"
import { ArrowRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { getBriefData } from "../data"
import { CheckedLine, FieldLabel } from "./preview-parts"

export function BriefCard() {
  const brief = getBriefData()
  const firstSentence = brief.overview.split(". ")[0] + "."
  return (
    <figure aria-label="Meeting brief" className="rounded-xl border border-border bg-card p-5 shadow-float sm:p-7">
      <FieldLabel>Meeting brief</FieldLabel>
      <p className="text-lg leading-snug font-medium tracking-tight">{firstSentence}</p>

      <div className="mt-6">
        <FieldLabel>Key points</FieldLabel>
        <ul className="space-y-2 text-sm leading-relaxed">
          {brief.keyPoints.map((point) => (
            <li key={point} className="flex gap-2.5">
              <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-muted-foreground" />
              {point}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6">
        <FieldLabel>Decisions</FieldLabel>
        <ul className="space-y-2">
          {brief.decisions.map((decision) => (
            <CheckedLine key={decision}>{decision}</CheckedLine>
          ))}
        </ul>
      </div>

      <div className="mt-7 border-t border-border pt-4">
        <Button asChild size="lg">
          <Link href="/register">
            Open meeting
            <ArrowRight aria-hidden data-icon="inline-end" />
          </Link>
        </Button>
      </div>
    </figure>
  )
}
