import type { Metadata } from "next"

import { CreateDealDialog } from "@/components/deals/create-deal-dialog"
import { parseQuery, parseStage } from "@/components/deals/deal-meta"
import { DealsView } from "@/components/deals/deals-view"
import { PageHeader } from "@/components/shared/page-header"

export const metadata: Metadata = { title: "Deals" }

export default async function DealsPage(props: PageProps<"/deals">) {
  const searchParams = await props.searchParams
  return (
    <div className="space-y-6">
      <PageHeader
        title="Deals"
        description="Customer conversations, organized by where each deal stands."
        actions={<CreateDealDialog />}
      />
      <DealsView stage={parseStage(searchParams.stage)} query={parseQuery(searchParams.q)} />
    </div>
  )
}
