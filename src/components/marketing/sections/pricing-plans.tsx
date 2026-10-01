import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Check } from "lucide-react"
import { plans, pricingDisclaimer } from "../content/pricing"
import { Eyebrow, Section } from "../layout/section"

export function PricingPlans() {
  return (
    <Section id="plans" aria-label="Plans" rule={false} space="tight" className="scroll-mt-16">
      <div className="grid divide-y divide-border border-y border-border md:grid-cols-2 md:divide-x md:divide-y-0 lg:grid-cols-4">
        {plans.map((plan, index) => (
          <article
            key={plan.id}
            aria-labelledby={`plan-${plan.id}`}
            className="flex flex-col px-0 py-8 md:px-6 md:first:pl-0 md:last:pr-0 lg:py-10"
          >
            <Eyebrow>{plan.audience}</Eyebrow>
            <h2 id={`plan-${plan.id}`} className="mt-3 text-2xl font-semibold tracking-tight">
              {plan.name}
            </h2>
            <p className="mt-2 min-h-12 text-sm leading-relaxed text-muted-foreground">{plan.summary}</p>
            <p className="mt-6 font-mono text-xs text-muted-foreground">Price to be announced</p>
            <ul className="mt-6 flex-1 space-y-2.5 border-t border-border pt-6">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2.5 text-sm leading-snug">
                  <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
                  {feature}
                </li>
              ))}
            </ul>
            <Button asChild variant={index === 2 ? "default" : "outline"} size="lg" className="mt-8 h-10 w-full text-sm">
              <Link href={plan.cta.href}>{plan.cta.label}</Link>
            </Button>
          </article>
        ))}
      </div>
      <p className="mt-6 font-mono text-xs text-muted-foreground">{pricingDisclaimer}</p>
    </Section>
  )
}
