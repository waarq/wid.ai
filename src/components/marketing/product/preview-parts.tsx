import { Check } from "lucide-react"

import { cn } from "@/lib/utils"
import { Eyebrow } from "../layout/section"
import type { ActionRow, TimelineMoment } from "../data"

export function StatRow({ stats }: { stats: { decisions: number; actions: number; questions: number } }) {
  const items = [
    { value: stats.decisions, label: stats.decisions === 1 ? "decision" : "decisions" },
    { value: stats.actions, label: stats.actions === 1 ? "action" : "actions" },
    { value: stats.questions, label: stats.questions === 1 ? "unresolved question" : "unresolved questions" },
  ]
  return (
    <dl className="grid grid-cols-3 divide-x divide-border border-y border-border">
      {items.map((item) => (
        <div key={item.label} className="flex flex-col-reverse justify-end gap-1.5 px-3 py-3 first:pl-0 sm:px-4 sm:first:pl-0">
          <dt className="text-xs leading-snug text-muted-foreground">{item.label}</dt>
          <dd className="num text-2xl leading-none font-medium tracking-tight">{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}

/** Hairline timeline of key moments. Purely decorative in the hero. */
export function MiniTimeline({
  moments,
  durationLabel,
}: {
  moments: TimelineMoment[]
  durationLabel: string
}) {
  return (
    <div aria-hidden className="select-none">
      <div className="relative h-4">
        <div className="absolute inset-x-0 top-1/2 h-px bg-border-strong" />
        {moments.map((m) => (
          <span
            key={m.id}
            className={cn(
              "absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-background",
              m.type === "risk" ? "bg-warning" : m.type === "question" ? "bg-muted-foreground" : "bg-primary",
            )}
            style={{ left: `${m.position}%` }}
          />
        ))}
      </div>
      <div className="mt-1 flex justify-between font-mono text-[10px] text-muted-foreground">
        <span>00:00</span>
        <span>{durationLabel}</span>
      </div>
    </div>
  )
}

export function ActionLine({ row, showSource = false }: { row: ActionRow; showSource?: boolean }) {
  return (
    <li className="flex items-start gap-3 py-2.5">
      <span
        aria-hidden
        className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-sm border border-input bg-background"
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-snug font-medium">{row.title}</p>
        {showSource ? (
          <p className="mt-0.5 text-xs text-muted-foreground">
            {row.meetingTitle} <span className="font-mono">{row.source}</span>
          </p>
        ) : null}
      </div>
      <p className="shrink-0 text-xs text-muted-foreground">
        <span className="sr-only">Due </span>
        {row.due === "No deadline" ? row.due : row.due[0].toUpperCase() + row.due.slice(1)}
      </p>
    </li>
  )
}

export function CheckedLine({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 text-sm leading-snug">
      <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
      <span>{children}</span>
    </li>
  )
}

export function FieldLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <Eyebrow className={cn("mb-2", className)}>{children}</Eyebrow>
}
