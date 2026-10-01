import type { Metadata } from "next"
import Link from "next/link"
import { FileText } from "lucide-react"

import { EmptyState } from "@/components/shared/empty-state"
import { PageHeader } from "@/components/shared/page-header"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = { title: "Meeting" }

/** PHASE 3 PLACEHOLDER: replaced by the real meeting detail screen. Exists so links never 404. */
export default async function MeetingPlaceholderPage(props: PageProps<"/my-calls/[meetingId]">) {
  const { meetingId } = await props.params
  return (
    <div className="space-y-6">
      <PageHeader title="Meeting" description={meetingId} />
      <EmptyState
        icon={FileText}
        title="Meeting details are coming soon."
        action={
          <Button asChild variant="outline" size="sm">
            <Link href="/my-calls">Back to My Calls</Link>
          </Button>
        }
      />
    </div>
  )
}
