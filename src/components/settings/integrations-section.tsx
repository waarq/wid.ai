"use client"

import { ErrorState } from "@/components/shared/error-state"
import { IntegrationCard } from "@/components/integrations/integration-card"
import { Skeleton } from "@/components/ui/skeleton"
import { useIntegrations } from "@/hooks"
import type { Integration } from "@/types"

import { SectionHeading } from "./settings-form"

function Group({ title, items }: { title: string; items: Integration[] }) {
  if (items.length === 0) return null
  return (
    <section className="grid gap-1">
      <h3 className="text-sm font-medium">{title}</h3>
      <ul className="divide-y divide-border border-y border-border">
        {items.map((integration) => (
          <IntegrationCard key={integration.provider} integration={integration} />
        ))}
      </ul>
    </section>
  )
}

export function IntegrationsSection() {
  const integrations = useIntegrations()

  return (
    <div className="grid gap-6">
      <SectionHeading title="Integrations" description="Connect the tools WID works with. Connecting never starts a recording." />
      {integrations.isPending ? (
        <div role="status" aria-busy="true" className="grid gap-4">
          <span className="sr-only">Loading integrations</span>
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
              <Skeleton className="size-9" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3.5 w-64 max-w-full" />
              </div>
              <Skeleton className="h-7 w-20" />
            </div>
          ))}
        </div>
      ) : integrations.isError ? (
        <ErrorState
          title="We couldn't load your integrations."
          description="Your connections haven't changed. Try again in a moment."
          onRetry={() => void integrations.refetch()}
          retrying={integrations.isRefetching}
        />
      ) : (
        <>
          <Group title="Connected and available" items={integrations.data.filter((i) => i.status !== "coming_soon")} />
          <Group title="Coming later" items={integrations.data.filter((i) => i.status === "coming_soon")} />
        </>
      )}
    </div>
  )
}
