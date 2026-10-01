"use client"

import { ArrowDown, ArrowUp, Plus, X } from "lucide-react"

import { MEETING_FOCUS_COPY } from "@/components/onboarding/options"
import { Button } from "@/components/ui/button"
import { MEETING_FOCUS_OPTIONS, type MeetingFocus } from "@/types"

const LABEL = Object.fromEntries(MEETING_FOCUS_COPY.map((o) => [o.value, o.label])) as Record<MeetingFocus, string>

/** Ordered emphasis list: the first item is weighted highest. */
export function PriorityList({
  value,
  onChange,
  labelledBy,
  describedBy,
}: {
  value: MeetingFocus[]
  onChange: (next: MeetingFocus[]) => void
  labelledBy: string
  describedBy?: string
}) {
  const remaining = MEETING_FOCUS_OPTIONS.filter((o) => !value.includes(o))

  function move(index: number, delta: -1 | 1) {
    const next = [...value]
    const target = index + delta
    const item = next[index]
    const other = next[target]
    if (item === undefined || other === undefined) return
    next[index] = other
    next[target] = item
    onChange(next)
  }

  return (
    <div className="grid gap-3">
      {value.length === 0 ? (
        <p className="border-y border-border py-3 text-sm text-muted-foreground">Nothing selected. Add at least one below.</p>
      ) : (
        <ol aria-labelledby={labelledBy} aria-describedby={describedBy} className="divide-y divide-border border-y border-border">
          {value.map((item, index) => (
            <li key={item} className="grid grid-cols-[1.5rem_1fr_auto] items-center gap-2 py-2">
              <span className="font-mono text-xs text-muted-foreground tabular-nums">{index + 1}</span>
              <span className="truncate text-sm">{LABEL[item]}</span>
              <span className="flex gap-0.5">
                <Button type="button" variant="ghost" size="icon-sm" disabled={index === 0} aria-label={`Move ${LABEL[item]} up`} onClick={() => move(index, -1)}>
                  <ArrowUp aria-hidden />
                </Button>
                <Button type="button" variant="ghost" size="icon-sm" disabled={index === value.length - 1} aria-label={`Move ${LABEL[item]} down`} onClick={() => move(index, 1)}>
                  <ArrowDown aria-hidden />
                </Button>
                <Button type="button" variant="ghost" size="icon-sm" aria-label={`Remove ${LABEL[item]}`} onClick={() => onChange(value.filter((v) => v !== item))}>
                  <X aria-hidden />
                </Button>
              </span>
            </li>
          ))}
        </ol>
      )}
      {remaining.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Add a priority">
          {remaining.map((item) => (
            <Button key={item} type="button" variant="outline" size="sm" onClick={() => onChange([...value, item])}>
              <Plus aria-hidden /> {LABEL[item]}
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
