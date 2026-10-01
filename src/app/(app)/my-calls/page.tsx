import type { Metadata } from "next"

import { CaptureMeetingButton } from "@/components/calls/capture-meeting-button"
import {
  hasActiveMyCallsFilters,
  parseMyCallsFilters,
  toMyCallsParams,
} from "@/components/calls/filters"
import { MeetingFilters } from "@/components/calls/meeting-filters"
import { MeetingsCollection } from "@/components/calls/meetings-collection"
import { MyCallsOverview } from "@/components/calls/my-calls-overview"
import { PageHeader } from "@/components/shared/page-header"

export const metadata: Metadata = { title: "My Calls" }

export default async function MyCallsPage(props: PageProps<"/my-calls">) {
  const filters = parseMyCallsFilters(await props.searchParams)

  return (
    <div className="space-y-6">
      <MyCallsOverview />
      <PageHeader
        title="My Calls"
        description="Meetings you've captured or have access to."
        actions={<CaptureMeetingButton />}
      />
      <MeetingFilters filters={filters} />
      <MeetingsCollection
        params={toMyCallsParams(filters)}
        variant="my"
        filtered={hasActiveMyCallsFilters(filters)}
        clearHref="/my-calls"
      />
    </div>
  )
}
