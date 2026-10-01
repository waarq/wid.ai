"use client"

import Link from "next/link"
import { ArrowRight, BellOff, CheckCheck } from "lucide-react"
import { toast } from "sonner"

import { formatRelative } from "@/components/calls/format"
import { EmptyState } from "@/components/shared/empty-state"
import { ErrorState } from "@/components/shared/error-state"
import { LoadingState } from "@/components/shared/loading-state"
import { UrlFilterChips } from "@/components/shared/url-filter-chips"
import { Button } from "@/components/ui/button"
import { useAlerts, useMarkAlertRead, useMarkAllAlertsRead } from "@/hooks"
import { cn } from "@/lib/utils"
import type { AlertFilter } from "@/types"

import { ALERT_TYPE_META, alertActionLabel, alertHref, isUnread } from "./alert-meta"

export const ALERT_FILTER_OPTIONS: ReadonlyArray<{ value: AlertFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "unread", label: "Unread" },
  { value: "actions", label: "Actions" },
  { value: "mentions", label: "Mentions" },
  { value: "decisions", label: "Decisions" },
]

export function AlertsList({ filter }: { filter: AlertFilter }) {
  const { data, isPending, isError, refetch, isRefetching } = useAlerts({ filter, limit: 50 })
  const markRead = useMarkAlertRead()
  const markAll = useMarkAllAlertsRead()
  const hasUnread = data?.items.some(isUnread) ?? false

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[1fr_auto] items-center gap-2">
        <div className="-mx-4 min-w-0 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <UrlFilterChips param="filter" options={ALERT_FILTER_OPTIONS} value={filter} label="Filter alerts" />
        </div>
        <Button
          variant="ghost"
          size="sm"
          disabled={!hasUnread || markAll.isPending}
          onClick={() =>
            markAll.mutate(undefined, {
              onSuccess: () => toast.success("All alerts marked as read"),
              onError: () => toast.error("We couldn't update your alerts. Please try again."),
            })
          }
        >
          <CheckCheck aria-hidden />
          <span className="hidden sm:inline">Mark all read</span>
          <span className="sm:hidden">Read all</span>
        </Button>
      </div>

      {isPending ? (
        <LoadingState rows={5} label="Loading alerts" />
      ) : isError ? (
        <ErrorState
          title="We couldn't load your alerts."
          description="Nothing has been lost. Try again in a moment."
          onRetry={() => void refetch()}
          retrying={isRefetching}
        />
      ) : data.items.length === 0 ? (
        <EmptyState
          icon={BellOff}
          title="You're all caught up."
          description={
            filter === "all"
              ? "New action items, mentions and decision changes will show up here."
              : "Nothing matches this filter right now."
          }
        />
      ) : (
        <ul className="divide-y divide-border border-y border-border">
          {data.items.map((alert) => {
            const meta = ALERT_TYPE_META[alert.type]
            const Icon = meta.icon
            const unread = isUnread(alert)
            return (
              <li key={alert.id} className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 py-3.5 sm:grid-cols-[auto_1fr_auto]">
                <span
                  className={cn(
                    "mt-0.5 grid size-8 place-items-center rounded-md",
                    unread ? "bg-primary-soft text-primary-ink" : "bg-muted text-muted-foreground"
                  )}
                >
                  <Icon className="size-4" aria-hidden />
                </span>
                <div className="min-w-0 space-y-0.5">
                  <p className="flex items-center gap-2 text-sm">
                    <span className={cn("truncate", unread ? "font-medium" : "text-muted-foreground")}>{alert.title}</span>
                    {unread ? (
                      <>
                        <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-primary" />
                        <span className="sr-only">Unread</span>
                      </>
                    ) : null}
                  </p>
                  <p className="text-sm text-muted-foreground">{alert.body}</p>
                  {alert.change ? (
                    <p className="font-mono text-xs text-muted-foreground tabular-nums">
                      {alert.change.from} <ArrowRight className="inline size-3" aria-label="changed to" /> {alert.change.to}
                    </p>
                  ) : null}
                  <p className="text-xs text-muted-foreground">
                    {meta.label}
                    {alert.meeting ? ` · ${alert.meeting.title}` : ""} ·{" "}
                    <span className="font-mono tabular-nums">{formatRelative(alert.createdAt)}</span>
                  </p>
                </div>
                <div className="col-span-2 flex items-center gap-1 sm:col-span-1 sm:self-center">
                  <Button asChild variant="outline" size="sm">
                    <Link href={alertHref(alert.target)} onClick={() => unread && markRead.mutate(alert.id)}>
                      {alertActionLabel(alert.target)}
                    </Link>
                  </Button>
                  {unread ? (
                    <Button variant="ghost" size="sm" onClick={() => markRead.mutate(alert.id)}>
                      Mark read
                    </Button>
                  ) : null}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
