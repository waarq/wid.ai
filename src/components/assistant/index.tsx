"use client"

import dynamic from "next/dynamic"

import { Skeleton } from "@/components/ui/skeleton"

export type { AssistantJumpTarget, MeetingAssistantProps } from "./meeting-assistant"

export function MeetingAssistantSkeleton() {
  return (
    <div role="status" aria-busy="true" className="space-y-3">
      <span className="sr-only">Loading assistant</span>
      <Skeleton className="h-4 w-44" />
      <Skeleton className="h-3 w-64 max-w-full" />
      <div className="space-y-1.5 pt-2">
        <Skeleton className="h-7 w-full" />
        <Skeleton className="h-7 w-5/6" />
        <Skeleton className="h-7 w-4/6" />
      </div>
      <Skeleton className="h-16 w-full" />
    </div>
  )
}

/** Code-split: the assistant loads on the client after the page shell. */
export const MeetingAssistant = dynamic(() => import("./meeting-assistant").then((m) => m.MeetingAssistant), {
  ssr: false,
  loading: () => <MeetingAssistantSkeleton />,
})
