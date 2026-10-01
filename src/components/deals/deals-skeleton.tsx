import { Skeleton } from "@/components/ui/skeleton"

export function DealsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div role="status" aria-busy="true" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <span className="sr-only">Loading deals</span>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="grid gap-3 rounded-lg border border-border bg-card p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="w-3/5 space-y-1.5">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3.5 w-1/3" />
            </div>
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-3 w-2/3" />
          <Skeleton className="h-3 w-4/5" />
          <div className="flex gap-1.5">
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-24 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function DealDetailSkeleton() {
  return (
    <div role="status" aria-busy="true" className="space-y-6">
      <span className="sr-only">Loading deal</span>
      <div className="space-y-2 border-b border-border pb-5">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  )
}
