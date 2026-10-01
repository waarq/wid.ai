import { CircleQuestionMark } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import type { DealSignal } from "@/types"

import { SIGNAL_META } from "./deal-meta"

/** Icon plus text, so meaning never depends on color alone. */
export function SignalChip({ signal }: { signal: DealSignal }) {
  const Icon = signal.kind === "question" ? CircleQuestionMark : SIGNAL_META[signal.sentiment].icon
  return (
    <Badge variant={SIGNAL_META[signal.sentiment].variant} className="max-w-full gap-1">
      <Icon className="size-3" aria-hidden />
      <span className="truncate">{signal.label}</span>
    </Badge>
  )
}

export function SignalChips({ signals, max = 3 }: { signals: DealSignal[]; max?: number }) {
  if (signals.length === 0) return <span className="text-xs text-muted-foreground">No signals yet</span>
  const shown = signals.slice(0, max)
  const rest = signals.length - shown.length
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Conversation signals">
      {shown.map((signal) => (
        <li key={signal.id} className="max-w-full">
          <SignalChip signal={signal} />
        </li>
      ))}
      {rest > 0 ? (
        <li>
          <Badge variant="outline" className="font-mono tabular-nums">
            +{rest}
          </Badge>
        </li>
      ) : null}
    </ul>
  )
}
