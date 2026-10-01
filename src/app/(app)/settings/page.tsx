import type { Metadata } from "next"

import { EmptyState } from "@/components/shared/empty-state"
import { PageHeader } from "@/components/shared/page-header"
import { Settings } from "lucide-react"

export const metadata: Metadata = { title: "Settings" }

/** PHASE 3 PLACEHOLDER: replaced by the real Settings screen. Exists so navigation never 404s. */
export default function Page() {
  return (
    <div className="space-y-6">
      <PageHeader title="Settings" />
      <EmptyState icon={Settings} title="Settings is coming soon." description="This section is being built." />
    </div>
  )
}
