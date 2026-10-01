import { ArrowRight } from "lucide-react"

import { getDecisionHistoryData } from "../data"
import { Eyebrow } from "../layout/section"

/** Launch Oct 5 -> Oct 12 -> Oct 15, derived from the decision chain in the fixtures. */
export function DecisionHistory() {
  const history = getDecisionHistoryData()
  return (
    <figure aria-label={`${history.meetingTitle}: how the ${history.subject.toLowerCase()} changed`}>
      <div className="flex items-baseline justify-between gap-4 border-b border-border pb-3">
        <p className="text-lg font-semibold tracking-tight">{history.meetingTitle}</p>
        <Eyebrow>{history.subject}</Eyebrow>
      </div>
      <ol className="grid divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {history.steps.map((step, index) => {
          const latest = index === history.steps.length - 1
          return (
            <li key={step.id} className="py-6 sm:px-6 sm:first:pl-0 sm:last:pr-0">
              <p className="font-mono text-xs text-muted-foreground">{step.date}</p>
              <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                Launch
                <ArrowRight aria-hidden className="size-3.5" />
              </p>
              <p
                className={
                  latest
                    ? "num mt-1 text-4xl font-medium tracking-tight text-primary-ink"
                    : "num mt-1 text-4xl font-medium tracking-tight text-foreground/70"
                }
              >
                {step.value}
              </p>
              <p className="mt-3 text-xs text-muted-foreground">
                {latest ? "Current" : "Superseded"} · source <span className="font-mono">{step.time}</span>
              </p>
            </li>
          )
        })}
      </ol>
    </figure>
  )
}
