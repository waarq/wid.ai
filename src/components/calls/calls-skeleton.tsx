import { Skeleton } from "@/components/ui/skeleton"

export function MeetingCardsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div role="status" aria-busy="true" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <span className="sr-only">Loading meetings</span>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="grid gap-3 rounded-lg border border-border bg-card p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="w-3/5 space-y-1.5">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
          <div className="space-y-1.5">
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-4/5" />
          </div>
          <Skeleton className="h-6 w-28" />
          <div className="border-t border-border pt-3">
            <Skeleton className="h-3 w-40" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function MeetingRowsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div role="status" aria-busy="true" className="divide-y divide-border border-y border-border">
      <span className="sr-only">Loading meetings</span>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="grid grid-cols-[1fr_7rem_6rem_8rem_9rem] items-center gap-3 px-3 py-3.5 max-lg:hidden">
          <div className="space-y-1.5">
            <Skeleton className="h-3.5 w-2/5" />
            <Skeleton className="h-3 w-3/5" />
          </div>
          <Skeleton className="h-3.5 w-16" />
          <Skeleton className="h-3.5 w-12" />
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      ))}
      <div className="lg:hidden">
        <MeetingCardsSkeleton count={4} />
      </div>
    </div>
  )
}

export function GreetingSkeleton() {
  return (
    <div className="space-y-2" role="status" aria-busy="true">
      <span className="sr-only">Loading your overview</span>
      <Skeleton className="h-6 w-56" />
      <Skeleton className="h-4 w-48" />
    </div>
  )
}
