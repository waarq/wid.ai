import { Skeleton } from "@/components/ui/skeleton"

/** Loading placeholder shaped like transcript rows. */
export function TranscriptSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Loading transcript" className="divide-y divide-border">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="grid grid-cols-[auto_1fr] gap-3 px-3 py-3">
          <Skeleton className="size-6 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  )
}
