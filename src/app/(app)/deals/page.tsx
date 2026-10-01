import type { Metadata } from "next"

import { EmptyState } from "@/components/shared/empty-state"
import { PageHeader } from "@/components/shared/page-header"
import { Handshake } from "lucide-react"

export const metadata: Metadata = { title: "Deals" }

/** PHASE 3 PLACEHOLDER: replaced by the real Deals screen. Exists so navigation never 404s. */
export default function Page() {
  return (
    <div className="space-y-6">
      <PageHeader title="Deals" />
      <EmptyState icon={Handshake} title="Deals is coming soon." description="This section is being built." />
    </div>
  )
}
