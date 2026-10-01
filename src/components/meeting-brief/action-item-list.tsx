"use client"

import { Pencil } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { initials } from "@/components/calls/format"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { useToggleAction } from "@/hooks/use-action-items"
import { cn } from "@/lib/utils"
import type { ActionItem, Participant } from "@/types"

import { describeDue } from "./due-date"
import { EditActionDialog } from "./edit-action-dialog"
import { SourceLink } from "./source-link"
import type { AddToPlaylistHandler, JumpHandler } from "./types"

interface ActionItemListProps {
  items: readonly ActionItem[]
  /** Meeting participants; the assignee choices in the Edit action dialog. */
  participants: readonly Participant[]
  meetingTitle: string
  onJumpToSource: JumpHandler
  onAddToPlaylist?: AddToPlaylistHandler
}

/**
 * Action items with an optimistic complete/reopen checkbox (useToggleAction),
 * assignee avatar, relative due date and an Edit action dialog.
 */
export function ActionItemList({
  items,
  participants,
  meetingTitle,
  onJumpToSource,
  onAddToPlaylist,
}: ActionItemListProps) {
  const toggle = useToggleAction()
  const [editingId, setEditingId] = useState<string | null>(null)
  const editing = items.find((i) => i.id === editingId)

  return (
    <>
      <ul className="divide-y divide-border">
        {items.map((item) => {
          const done = item.status === "completed"
          const due = describeDue(item)
          const labelId = `action-${item.id}-title`
          return (
            <li key={item.id} className="grid grid-cols-[auto_1fr_auto] gap-x-3 py-3 first:pt-0 last:pb-0">
              <Checkbox
                checked={done}
                aria-labelledby={labelId}
                onCheckedChange={() =>
                  toggle.mutate(item.id, {
                    onError: () => toast.error("We couldn't update that action. Your change was undone."),
                  })
                }
                className="mt-0.5"
              />
              <div className="min-w-0 space-y-1.5">
                <div className="flex flex-wrap items-start gap-x-2 gap-y-1">
                  <p
                    id={labelId}
                    className={cn("text-sm font-medium text-foreground", (done || item.status === "dismissed") && "text-muted-foreground line-through")}
                  >
                    {item.title}
                  </p>
                  {item.status === "in_progress" ? <Badge variant="info">In progress</Badge> : null}
                  {item.status === "dismissed" ? <Badge variant="muted">Dismissed</Badge> : null}
                </div>
                {item.description ? <p className="text-sm text-muted-foreground">{item.description}</p> : null}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                  {item.assignee ? (
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                      <Avatar size="sm">
                        {item.assignee.avatarUrl ? <AvatarImage src={item.assignee.avatarUrl} alt="" /> : null}
                        <AvatarFallback>{initials(item.assignee.name)}</AvatarFallback>
                      </Avatar>
                      <span className="text-foreground/80">{item.assignee.name}</span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Unassigned</span>
                  )}
                  {due ? (
                    <span className={cn("font-mono tabular-nums", due.overdue ? "font-medium text-destructive" : "text-muted-foreground")}>
                      {due.text}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">No deadline</span>
                  )}
                </div>
                <SourceLink
                  source={item}
                  meetingTitle={meetingTitle}
                  onJump={onJumpToSource}
                  playlist={
                    onAddToPlaylist
                      ? { kind: "commitment", title: item.title, meetingId: item.meetingId, onAdd: onAddToPlaylist }
                      : undefined
                  }
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Edit action: ${item.title}`}
                onClick={() => setEditingId(item.id)}
              >
                <Pencil aria-hidden />
              </Button>
            </li>
          )
        })}
      </ul>
      {editing ? (
        <EditActionDialog
          item={editing}
          participants={participants}
          open
          onOpenChange={(open) => {
            if (!open) setEditingId(null)
          }}
        />
      ) : null}
    </>
  )
}
