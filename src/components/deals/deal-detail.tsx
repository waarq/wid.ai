"use client"

import { ArrowLeft, CalendarClock, Handshake, Trash2 } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

import { formatDay } from "@/components/calls/format"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { EmptyState } from "@/components/shared/empty-state"
import { ErrorState } from "@/components/shared/error-state"
import { PageHeader } from "@/components/shared/page-header"
import { Button } from "@/components/ui/button"
import { useDeal, useDeleteDeal } from "@/hooks"
import { isAppError } from "@/lib/utils/errors"
import type { Deal } from "@/types"

import { DealStageSelect } from "./deal-stage-select"
import { DealTimeline } from "./deal-timeline"
import { DealDetailSkeleton } from "./deals-skeleton"
import { formatDue, formatMoney } from "./deal-meta"
import { NextActionEditor } from "./next-action-editor"
import { SignalChip } from "./signal-chip"
import { SourceLink } from "./source-link"

const BACK = (
  <Link
    href="/deals"
    className="inline-flex items-center gap-1 rounded-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
  >
    <ArrowLeft className="size-3.5" aria-hidden /> Deals
  </Link>
)

export function DealDetail({ dealId }: { dealId: string }) {
  const deal = useDeal(dealId)

  if (deal.isPending) return <DealDetailSkeleton />

  if (deal.isError) {
    if (isAppError(deal.error) && deal.error.code === "not_found") {
      return (
        <EmptyState
          icon={Handshake}
          title="We couldn't find this deal."
          description="It may have been deleted. Your meetings are not affected."
          action={
            <Button asChild variant="outline" size="sm">
              <Link href="/deals">Back to Deals</Link>
            </Button>
          }
        />
      )
    }
    return (
      <div className="space-y-4">
        <div className="text-sm">{BACK}</div>
        <ErrorState
          title="We couldn't load this deal."
          description="Nothing has been changed. Try again in a moment."
          onRetry={() => void deal.refetch()}
          retrying={deal.isRefetching}
        />
      </div>
    )
  }

  return <DealBody deal={deal.data} />
}

function DealBody({ deal }: { deal: Deal }) {
  const router = useRouter()
  const remove = useDeleteDeal()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const titleOf = new Map(deal.meetings.map((m) => [m.id, m.title]))

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb={BACK}
        title={deal.company}
        description={deal.name !== deal.company ? deal.name : undefined}
        actions={<DealStageSelect deal={deal} />}
      />

      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
        <div>
          <dt className="text-xs text-muted-foreground">Value</dt>
          <dd className="font-mono text-lg font-semibold tracking-tight tabular-nums">{formatMoney(deal.value)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Owner</dt>
          <dd className="text-sm">{deal.owner.name}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Last meeting</dt>
          <dd className="font-mono text-sm tabular-nums">{deal.lastMeetingAt ? formatDay(deal.lastMeetingAt) : "None yet"}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Meetings linked</dt>
          <dd className="font-mono text-sm tabular-nums">{deal.meetings.length}</dd>
        </div>
      </dl>

      <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
        <div className="min-w-0 divide-y divide-border border-y border-border">
          <section aria-labelledby="next-action" className="grid gap-2 py-5">
            <div className="flex items-center justify-between gap-3">
              <h2 id="next-action" className="text-sm font-medium">
                Next action
              </h2>
              <NextActionEditor deal={deal} />
            </div>
            {deal.nextAction ? (
              <div className="grid gap-1">
                <p className="text-base text-foreground">{deal.nextAction.title}</p>
                {deal.nextAction.dueDate ? (
                  <p className="inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground tabular-nums">
                    <CalendarClock className="size-3.5" aria-hidden /> Due {formatDue(deal.nextAction.dueDate)}
                  </p>
                ) : null}
                {deal.nextAction.actionItemId ? (
                  <p className="text-xs text-muted-foreground">Tracked as an action item from a meeting.</p>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No next action yet. Set one so this deal does not stall.</p>
            )}
          </section>

          <section aria-labelledby="recent-meetings" className="grid gap-2 py-5">
            <h2 id="recent-meetings" className="text-sm font-medium">
              Recent meetings
            </h2>
            {deal.meetings.length === 0 ? (
              <p className="text-sm text-muted-foreground">No meetings linked yet. Linked conversations feed this deal.</p>
            ) : (
              <ul className="divide-y divide-border">
                {deal.meetings.map((meeting) => (
                  <li key={meeting.id}>
                    <Link
                      href={`/my-calls/${meeting.id}`}
                      className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-sm py-2.5 outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.995]"
                    >
                      <span className="truncate text-sm">{meeting.title}</span>
                      <span className="font-mono text-xs text-muted-foreground tabular-nums">{formatDay(meeting.startedAt)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="insights" className="grid gap-3 py-5">
            <h2 id="insights" className="text-sm font-medium">
              Conversation insights
            </h2>
            {deal.signals.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No signals yet. Interest, concerns and decision makers appear here after a linked meeting is processed.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {deal.signals.map((signal) => (
                  <li key={signal.id} className="grid gap-1.5 py-3 first:pt-0 last:pb-0">
                    <div>
                      <SignalChip signal={signal} />
                    </div>
                    <SourceLink source={signal} meetingTitle={titleOf.get(signal.meetingId)} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside aria-labelledby="timeline" className="min-w-0 space-y-4">
          <h2 id="timeline" className="text-sm font-medium">
            Timeline
          </h2>
          <DealTimeline deal={deal} />
          <div className="border-t border-border pt-4">
            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setConfirmOpen(true)}>
              <Trash2 aria-hidden /> Delete deal
            </Button>
          </div>
        </aside>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Delete ${deal.company}?`}
        description="This removes the deal from WID. The meetings linked to it are kept."
        confirmLabel="Delete deal"
        variant="destructive"
        loading={remove.isPending}
        onConfirm={() =>
          remove.mutate(deal.id, {
            onSuccess: () => {
              toast.success(`${deal.company} deleted`)
              router.replace("/deals")
            },
            onError: () => {
              setConfirmOpen(false)
              toast.error("We couldn't delete this deal. Please try again.")
            },
          })
        }
      />
    </div>
  )
}
