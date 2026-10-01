"use client"

import { CircleCheck, CircleQuestionMark } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import type { Question } from "@/types"

import { SourceLink } from "./source-link"
import type { AddToPlaylistHandler, JumpHandler } from "./types"

interface QuestionListProps {
  items: readonly Question[]
  meetingTitle: string
  onJumpToSource: JumpHandler
  onAddToPlaylist?: AddToPlaylistHandler
}

/** Questions raised, split visually into unresolved and answered. */
export function QuestionList({ items, meetingTitle, onJumpToSource, onAddToPlaylist }: QuestionListProps) {
  return (
    <ul className="divide-y divide-border">
      {items.map((q) => {
        const answered = q.status === "answered"
        return (
          <li key={q.id} className="grid grid-cols-[auto_1fr] gap-x-3 py-3 first:pt-0 last:pb-0">
            {answered ? (
              <CircleCheck aria-hidden className="mt-0.5 size-4 text-primary-ink" />
            ) : (
              <CircleQuestionMark aria-hidden className="mt-0.5 size-4 text-warning" />
            )}
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-start gap-x-2 gap-y-1">
                <p className="text-sm font-medium text-foreground">{q.text}</p>
                <Badge variant={answered ? "success" : "warning"}>{answered ? "Answered" : "Unresolved"}</Badge>
              </div>
              {q.answer ? <p className="text-sm text-muted-foreground">{q.answer}</p> : null}
              {q.askedBy ? (
                <p className="text-xs text-muted-foreground">
                  Asked by <span className="text-foreground/80">{q.askedBy.name}</span>
                </p>
              ) : null}
              <SourceLink
                source={q}
                meetingTitle={meetingTitle}
                onJump={onJumpToSource}
                playlist={
                  onAddToPlaylist
                    ? { kind: "insight", title: q.text, meetingId: q.meetingId, onAdd: onAddToPlaylist }
                    : undefined
                }
              />
            </div>
          </li>
        )
      })}
    </ul>
  )
}
