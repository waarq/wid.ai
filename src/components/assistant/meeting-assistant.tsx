"use client"

import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react"
import { ArrowUp, MessageSquareText, RotateCcw } from "lucide-react"

import { SourceLink } from "@/components/meeting-brief/source-link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { useAssistant, useAssistantHistory, useSuggestedQuestions } from "@/hooks"
import { cn } from "@/lib/utils"
import { getUserMessage } from "@/lib/utils/errors"
import type { MeetingAnswer } from "@/types"

const MAX_LENGTH = 500

export interface AssistantJumpTarget {
  sourceTimestamp: number
  sourceSegmentId?: string
}

export interface MeetingAssistantProps {
  meetingId: string
  meetingTitle: string
  onJumpToSource: (target: AssistantJumpTarget) => void
  className?: string
}

/**
 * "Ask about this meeting". Every answer cites its source segments through
 * the shared SourceLink, so "Jump to source" seeks the player and scrolls
 * the transcript. Enter sends, Shift+Enter adds a line.
 */
export function MeetingAssistant({ meetingId, meetingTitle, onJumpToSource, className }: MeetingAssistantProps) {
  const ask = useAssistant(meetingId)
  const history = useAssistantHistory(meetingId)
  const suggestions = useSuggestedQuestions(meetingId)
  const [question, setQuestion] = useState("")
  const uid = useId()
  const titleId = `${uid}-title`
  const inputId = `${uid}-input`
  const hintId = `${uid}-hint`
  const threadRef = useRef<HTMLOListElement>(null)

  const answers = history.data ?? []
  const pendingQuestion = ask.isPending ? ask.variables : undefined
  const failedQuestion = ask.isError ? ask.variables : undefined

  // Keep the newest exchange in view.
  useEffect(() => {
    const thread = threadRef.current
    if (!thread) return
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    thread.scrollTo({ top: thread.scrollHeight, behavior: reduce ? "auto" : "smooth" })
  }, [answers.length, pendingQuestion, failedQuestion])

  function submit(text: string) {
    const trimmed = text.trim()
    if (!trimmed || ask.isPending) return
    ask.mutate(trimmed, { onSuccess: () => setQuestion("") })
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    submit(question)
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      submit(question)
    }
  }

  const hasThread = answers.length > 0 || Boolean(pendingQuestion) || Boolean(failedQuestion)

  return (
    <section aria-labelledby={titleId} className={cn("flex min-h-0 flex-col gap-3", className)}>
      <header className="space-y-0.5">
        <h2 id={titleId} className="text-sm font-semibold tracking-tight">
          Ask about this meeting
        </h2>
        <p className="text-xs text-muted-foreground">Answers come only from this meeting and link to the moment they cite.</p>
      </header>

      {history.isPending ? (
        <ThreadSkeleton />
      ) : history.isError ? (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-xs">
          <span className="text-muted-foreground">Earlier questions didn&apos;t load.</span>
          <Button variant="ghost" size="xs" onClick={() => void history.refetch()}>
            Retry
          </Button>
        </div>
      ) : null}

      {hasThread ? (
        <ol ref={threadRef} aria-label="Questions and answers" className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
          {answers.map((answer) => (
            <li key={answer.id}>
              <Exchange answer={answer} meetingTitle={meetingTitle} onJumpToSource={onJumpToSource} />
            </li>
          ))}
          {pendingQuestion ? (
            <li aria-busy="true">
              <QuestionBubble text={pendingQuestion} />
              <div role="status" className="mt-2 space-y-1.5">
                <span className="sr-only">Finding the answer in this meeting</span>
                <Skeleton className="h-3 w-11/12" />
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </li>
          ) : null}
          {failedQuestion ? (
            <li>
              <QuestionBubble text={failedQuestion} />
              <div role="alert" className="mt-2 grid gap-2 text-sm">
                <p className="text-muted-foreground">
                  {getUserMessage(ask.error)} Your question wasn&apos;t lost.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="justify-self-start"
                  onClick={() => submit(failedQuestion)}
                >
                  <RotateCcw data-icon="inline-start" aria-hidden />
                  Try again
                </Button>
              </div>
            </li>
          ) : null}
        </ol>
      ) : null}

      <Suggestions
        loading={suggestions.isPending}
        questions={suggestions.data?.map((s) => s.text) ?? []}
        compact={hasThread}
        disabled={ask.isPending}
        onPick={(text) => {
          setQuestion(text)
          submit(text)
        }}
      />

      <form onSubmit={onSubmit} className="relative">
        <label htmlFor={inputId} className="sr-only">
          Ask a question about this meeting
        </label>
        <Textarea
          id={inputId}
          value={question}
          onChange={(e) => setQuestion(e.target.value.slice(0, MAX_LENGTH))}
          onKeyDown={onKeyDown}
          placeholder="What did we decide about the launch?"
          rows={2}
          maxLength={MAX_LENGTH}
          aria-describedby={hintId}
          className="min-h-16 resize-none pr-11 text-sm"
        />
        <Button
          type="submit"
          size="icon-sm"
          disabled={question.trim() === "" || ask.isPending}
          aria-label="Ask"
          className="absolute right-2 bottom-2 rounded-full"
        >
          <ArrowUp aria-hidden />
        </Button>
        <p id={hintId} className="mt-1 text-[11px] text-muted-foreground">
          Enter to ask, Shift+Enter for a new line.
        </p>
      </form>
    </section>
  )
}

function QuestionBubble({ text }: { text: string }) {
  return (
    <p className="ml-6 rounded-lg bg-muted px-3 py-2 text-sm text-foreground">
      <span className="sr-only">You asked: </span>
      {text}
    </p>
  )
}

function Exchange({
  answer,
  meetingTitle,
  onJumpToSource,
}: {
  answer: MeetingAnswer
  meetingTitle: string
  onJumpToSource: (target: AssistantJumpTarget) => void
}) {
  const notFound = answer.status === "not_found" || answer.sources.length === 0
  return (
    <article className="space-y-2">
      <QuestionBubble text={answer.question} />
      <div className="space-y-2">
        <p className={cn("text-sm leading-relaxed", notFound && "text-muted-foreground")}>{answer.answer}</p>
        {answer.confidence === "low" && !notFound ? (
          <Badge variant="warning">Low confidence. Check the source.</Badge>
        ) : null}
        {!notFound ? (
          <ul className="space-y-2 border-l border-border pl-3" aria-label="Sources">
            {answer.sources.map((source) => (
              <li key={`${source.sourceSegmentId}-${source.sourceTimestamp}`} className="space-y-1">
                {source.quote ? (
                  <blockquote className="text-xs text-muted-foreground">
                    {source.speakerName ? <span className="font-medium text-foreground">{source.speakerName}: </span> : null}
                    &ldquo;{source.quote}&rdquo;
                  </blockquote>
                ) : null}
                <SourceLink source={source} meetingTitle={meetingTitle} onJump={onJumpToSource} />
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </article>
  )
}

function Suggestions({
  loading,
  questions,
  compact,
  disabled,
  onPick,
}: {
  loading: boolean
  questions: string[]
  compact: boolean
  disabled: boolean
  onPick: (text: string) => void
}) {
  if (loading) {
    return (
      <div className="flex flex-wrap gap-1.5" role="status" aria-busy="true">
        <span className="sr-only">Loading suggested questions</span>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-7 w-36 rounded-md" />
        ))}
      </div>
    )
  }
  if (questions.length === 0) {
    if (compact) return null
    return (
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <MessageSquareText className="size-3.5" aria-hidden />
        Ask anything about what was said, decided or left open.
      </p>
    )
  }
  const shown = compact ? questions.slice(0, 2) : questions
  return (
    <div className="space-y-1.5">
      {!compact ? <p className="text-xs font-medium text-muted-foreground">Suggested questions</p> : null}
      <ul className={cn(compact ? "flex flex-wrap gap-1.5" : "grid gap-1")}>
        {shown.map((text) => (
          <li key={text}>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onPick(text)}
              className={cn(
                "rounded-md text-left text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98] disabled:opacity-50",
                compact
                  ? "border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                  : "w-full px-2 py-1.5 text-foreground hover:bg-muted",
              )}
            >
              {text}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

function ThreadSkeleton() {
  return (
    <div role="status" aria-busy="true" className="space-y-2">
      <span className="sr-only">Loading earlier questions</span>
      <Skeleton className="ml-6 h-8" />
      <Skeleton className="h-3 w-5/6" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  )
}

export default MeetingAssistant
