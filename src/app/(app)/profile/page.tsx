import type { Metadata } from "next"

import { EmptyState } from "@/components/shared/empty-state"
import { PageHeader } from "@/components/shared/page-header"
import { CircleUser } from "lucide-react"

export const metadata: Metadata = { title: "Profile" }

/** PHASE 3 PLACEHOLDER: replaced by the real Profile screen. Exists so navigation never 404s. */
export default function Page() {
  return (
    <div className="space-y-6">
      <PageHeader title="Profile" />
      <EmptyState icon={CircleUser} title="Profile is coming soon." description="This section is being built." />
    </div>
  )
}
