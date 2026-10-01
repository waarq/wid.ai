"use client"

import { ChevronDown, FileText } from "lucide-react"
import { useId, useState, type ReactNode } from "react"

import { EmptyState } from "@/components/shared/empty-state"
import { cn } from "@/lib/utils"
import type { Meeting } from "@/types"

import { ActionItemList } from "./action-item-list"
import { DecisionList } from "./decision-list"
import { KeyMomentsTimeline } from "./key-moments-timeline"
import { QuestionList } from "./question-list"
import { RiskList } from "./risk-list"
import { TopicList } from "./topic-list"
import type { AddToPlaylistHandler, JumpHandler } from "./types"

interface BriefSectionProps {
  title: string
  count: number
  defaultOpen: boolean
  emptyText: string
  children: ReactNode
}

function BriefSection({ title, count, defaultOpen, emptyText, children }: BriefSectionProps) {
  const [open, setOpen] = useState(defaultOpen)
  const uid = useId()
  const panelId = `${uid}-panel`
  return (
    <section className="border-t border-border">
      <h3>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-3 rounded-sm py-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.995]"
        >
          <span className="text-sm font-semibold tracking-tight text-foreground">
            {title} <span className="ml-1 font-mono text-xs font-normal tabular-nums text-muted-foreground">{count}</span>
          </span>
          <ChevronDown
            aria-hidden
            className={cn("size-4 text-muted-foreground transition-transform motion-reduce:transition-none", open && "rotate-180")}
          />
        </button>
      </h3>
      <div id={panelId} hidden={!open} className="pb-4">
        {count === 0 ? <p className="text-sm text-muted-foreground">{emptyText}</p> : children}
      </div>
    </section>
  )
}

interface MeetingBriefProps {
  meeting: Meeting
  /** Called with the insight's timestamp and segment; the page seeks and scrolls. */
  onJumpToSource: JumpHandler
  /** When provided, insights show a save-to-playlist button. */
  onAddToPlaylist?: AddToPlaylistHandler
}

/**
 * The meeting brief: overview, key points, then collapsible insight sections.
 * Every insight renders the shared SourceLink. Tolerates a missing summary.
 */
export function MeetingBrief({ meeting, onJumpToSource, onAddToPlaylist }: MeetingBriefProps) {
  const summary = meeting.summary
  if (!summary) {
    return (
      <EmptyState
        icon={FileText}
        title="No brief yet"
        description="The brief appears here once WIT has finished understanding this meeting."
      />
    )
  }

  const keyPoints = summary.keyPoints ?? []
  const decisions = summary.decisions ?? []
  const actionItems = summary.actionItems ?? []
  const questions = summary.questions ?? []
  const risks = summary.risks ?? []
  const keyMoments = summary.keyMoments ?? []
  const topics = summary.topics ?? []
  const title = meeting.title
  const common = { meetingTitle: title, onJumpToSource, onAddToPlaylist }

  return (
    <div className="space-y-6">
      <section aria-labelledby="brief-overview">
        <h2 id="brief-overview" className="mb-2 text-sm font-semibold tracking-tight text-foreground">Overview</h2>
        {summary.overview ? (
          <p className="max-w-prose text-base leading-relaxed text-foreground">{summary.overview}</p>
        ) : (
          <p className="text-sm text-muted-foreground">No overview was generated for this meeting.</p>
        )}
      </section>

      {keyPoints.length > 0 ? (
        <section aria-labelledby="brief-key-points">
          <h2 id="brief-key-points" className="mb-2 text-sm font-semibold tracking-tight text-foreground">Key points</h2>
          <ul className="max-w-prose list-disc space-y-1.5 pl-5 text-sm leading-relaxed marker:text-muted-foreground">
            {keyPoints.map((point, i) => (
              <li key={i}>{point}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="border-b border-border">
        <BriefSection title="Decisions" count={decisions.length} defaultOpen={decisions.length > 0} emptyText="No decisions were identified.">
          <DecisionList items={decisions} {...common} />
        </BriefSection>
        <BriefSection title="Action items" count={actionItems.length} defaultOpen={actionItems.length > 0} emptyText="No action items were identified.">
          <ActionItemList items={actionItems} participants={meeting.participants} {...common} />
        </BriefSection>
        <BriefSection
          title="Questions"
          count={questions.length}
          defaultOpen={questions.some((q) => q.status === "open")}
          emptyText="No questions were raised."
        >
          <QuestionList items={questions} {...common} />
        </BriefSection>
        <BriefSection
          title="Risks"
          count={risks.length}
          defaultOpen={risks.some((r) => r.severity === "high")}
          emptyText="No risks were raised."
        >
          <RiskList items={risks} {...common} />
        </BriefSection>
        <BriefSection title="Key moments" count={keyMoments.length} defaultOpen={false} emptyText="No key moments were detected.">
          <KeyMomentsTimeline moments={keyMoments} duration={meeting.duration} {...common} />
        </BriefSection>
        <BriefSection title="Topics" count={topics.length} defaultOpen={false} emptyText="No topics were detected.">
          <TopicList items={topics} onJumpToSource={onJumpToSource} />
        </BriefSection>
      </div>
    </div>
  )
}
