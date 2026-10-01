import type { Metadata } from "next"

import { DealDetail } from "@/components/deals/deal-detail"

export const metadata: Metadata = { title: "Deal" }

export default async function DealPage(props: PageProps<"/deals/[dealId]">) {
  const { dealId } = await props.params
  return <DealDetail dealId={dealId} />
}
