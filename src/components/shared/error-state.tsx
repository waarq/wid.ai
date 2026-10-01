import { TriangleAlert } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface ErrorStateProps {
  /** What happened, in plain language. Never a raw backend message. */
  title: string
  /** Why it matters / what the user's data status is. */
  description?: string
  onRetry?: () => void
  retryLabel?: string
  retrying?: boolean
  className?: string
}

export function ErrorState({
  title,
  description,
  onRetry,
  retryLabel = "Try again",
  retrying = false,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center gap-3 px-4 py-14 text-center",
        className
      )}
    >
      <span className="grid size-10 place-items-center rounded-lg bg-destructive-soft text-destructive">
        <TriangleAlert className="size-5" aria-hidden />
      </span>
      <div className="max-w-sm space-y-1">
        <h2 className="text-base font-medium text-foreground">{title}</h2>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {onRetry ? (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          disabled={retrying}
          className="mt-1"
        >
          {retrying ? "Retrying…" : retryLabel}
        </Button>
      ) : null}
    </div>
  )
}
