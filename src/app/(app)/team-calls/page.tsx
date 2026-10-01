import type { Metadata } from "next"

import { parseTeamCallsFilters, toTeamCallsParams } from "@/components/calls/filters"
import { MeetingsCollection } from "@/components/calls/meetings-collection"
import { TeamCallsToolbar } from "@/components/calls/team-calls-toolbar"
import { PageHeader } from "@/components/shared/page-header"

export const metadata: Metadata = { title: "Team Calls" }

export default async function TeamCallsPage(props: PageProps<"/team-calls">) {
  const filters = parseTeamCallsFilters(await props.searchParams)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team Calls"
        description="Meetings your teammates have shared with you or the team."
      />
      <TeamCallsToolbar member={filters.member} />
      <MeetingsCollection
        params={toTeamCallsParams(filters)}
        variant="team"
        filtered={filters.member !== "everyone"}
        clearHref="/team-calls"
      />
    </div>
  )
}
