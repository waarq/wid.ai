import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

interface LoadingStateProps {
  /** Number of placeholder rows. */
  rows?: number
  /** Accessible description of what is loading. */
  label?: string
  className?: string
}

export function LoadingState({
  rows = 5,
  label = "Loading",
  className,
}: LoadingStateProps) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      className={cn("divide-y divide-border", className)}
    >
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4 py-3.5">
          <Skeleton className="size-8 rounded-md" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-2/5" />
            <Skeleton className="h-3 w-3/5" />
          </div>
          <Skeleton className="hidden h-3.5 w-16 sm:block" />
        </div>
      ))}
    </div>
  )
}
