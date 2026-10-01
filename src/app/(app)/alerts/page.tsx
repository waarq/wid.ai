import type { Metadata } from "next"

import { AlertsList } from "@/components/alerts/alerts-list"
import { PageHeader } from "@/components/shared/page-header"
import { ALERT_FILTERS, type AlertFilter } from "@/types"

export const metadata: Metadata = { title: "Alerts" }

export default async function AlertsPage(props: PageProps<"/alerts">) {
  const { filter: raw } = await props.searchParams
  const value = Array.isArray(raw) ? raw[0] : raw
  const filter: AlertFilter = ALERT_FILTERS.find((f) => f === value) ?? "all"

  return (
    <div className="space-y-6">
      <PageHeader title="Alerts" description="Action items, mentions and decisions that need you." />
      <AlertsList filter={filter} />
    </div>
  )
}
