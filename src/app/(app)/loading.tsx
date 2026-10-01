import { LoadingState } from "@/components/shared/loading-state"
import { Skeleton } from "@/components/ui/skeleton"

export default function AppLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2 border-b border-border pb-5">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-64" />
      </div>
      <LoadingState rows={6} label="Loading" />
    </div>
  )
}
