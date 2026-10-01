import { Skeleton } from "@/components/ui/skeleton"

/** Mirrors the meeting page layout so nothing jumps when data arrives. */
export function MeetingDetailSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-live="polite" className="space-y-6">
      <span className="sr-only">Loading meeting</span>
      <div className="space-y-3 border-b border-border pb-5">
        <Skeleton className="h-4 w-20" />
        <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-[1fr_auto]">
          <div className="space-y-2">
            <Skeleton className="h-7 w-72 max-w-full" />
            <Skeleton className="h-4 w-60 max-w-full" />
            <Skeleton className="h-5 w-32" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="size-8" />
          </div>
        </div>
      </div>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-8">
          <div className="space-y-3 border-b border-border pb-3">
            <Skeleton className="h-1.5 w-full" />
            <div className="flex gap-2">
              <Skeleton className="size-7" />
              <Skeleton className="size-8 rounded-full" />
              <Skeleton className="size-7" />
            </div>
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-4/6" />
          </div>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="space-y-2 border-t border-border pt-3">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3.5 w-3/4" />
            </div>
          ))}
        </div>
        <div className="hidden space-y-4 lg:block">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-7 w-full" />
          <Skeleton className="h-7 w-5/6" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="mt-6 h-4 w-28" />
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
      </div>
    </div>
  )
}
