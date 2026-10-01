"use client"

import { useState } from "react"
import Link from "next/link"
import { Bell, CheckCheck } from "lucide-react"

import { ALERT_TYPE_META, alertHref, isUnread } from "@/components/alerts/alert-meta"
import { formatRelative } from "@/components/calls/format"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Skeleton } from "@/components/ui/skeleton"
import { useAlerts, useMarkAlertRead, useMarkAllAlertsRead, useUnreadAlertCount } from "@/hooks"
import { cn } from "@/lib/utils"
import type { Alert } from "@/types"

export function NotificationMenu() {
  const [open, setOpen] = useState(false)
  const { data: unread = 0 } = useUnreadAlertCount()
  const alerts = useAlerts({ limit: 6 })
  const markRead = useMarkAlertRead()
  const markAll = useMarkAllAlertsRead()
  const items = alerts.data?.items ?? []

  function handleOpen(alert: Alert) {
    if (isUnread(alert)) markRead.mutate(alert.id)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative text-muted-foreground"
          aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
        >
          <Bell aria-hidden />
          {unread > 0 ? (
            <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-primary ring-2 ring-background" />
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(22rem,calc(100vw-1.5rem))] gap-0 p-0">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <h2 className="text-sm font-medium">Notifications</h2>
          <Button
            variant="ghost"
            size="xs"
            disabled={unread === 0 || markAll.isPending}
            onClick={() => markAll.mutate()}
          >
            <CheckCheck aria-hidden />
            Mark all read
          </Button>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {alerts.isPending ? (
            <div className="space-y-3 p-3" role="status" aria-busy="true">
              <span className="sr-only">Loading notifications</span>
              {[0, 1, 2].map((i) => (
                <div key={i} className="space-y-1.5">
                  <Skeleton className="h-3.5 w-1/2" />
                  <Skeleton className="h-3 w-4/5" />
                </div>
              ))}
            </div>
          ) : alerts.isError ? (
            <div className="space-y-2 p-4 text-center text-sm">
              <p className="text-muted-foreground">We couldn&apos;t load your notifications.</p>
              <Button variant="outline" size="sm" onClick={() => void alerts.refetch()}>
                Try again
              </Button>
            </div>
          ) : items.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">You&apos;re all caught up.</p>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((alert) => {
                const meta = ALERT_TYPE_META[alert.type]
                const Icon = meta.icon
                const unreadItem = isUnread(alert)
                return (
                  <li key={alert.id}>
                    <Link
                      href={alertHref(alert.target)}
                      onClick={() => handleOpen(alert)}
                      className="grid grid-cols-[auto_1fr_auto] gap-x-2.5 px-3 py-2.5 outline-none transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                    >
                      <Icon className="mt-0.5 size-4 text-muted-foreground" aria-hidden />
                      <span className="min-w-0">
                        <span className={cn("block truncate text-sm", unreadItem ? "font-medium" : "text-muted-foreground")}>
                          {alert.title}
                        </span>
                        <span className="line-clamp-2 text-xs text-muted-foreground">{alert.body}</span>
                        <span className="mt-0.5 block font-mono text-[11px] text-muted-foreground">
                          {formatRelative(alert.createdAt)}
                        </span>
                      </span>
                      {unreadItem ? (
                        <>
                          <span aria-hidden className="mt-1.5 size-2 rounded-full bg-primary" />
                          <span className="sr-only">Unread</span>
                        </>
                      ) : null}
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className="border-t border-border p-1.5">
          <Button asChild variant="ghost" size="sm" className="w-full" onClick={() => setOpen(false)}>
            <Link href="/alerts">View all alerts</Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
