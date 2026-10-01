import { Skeleton } from "@/components/ui/skeleton"

/** Reserves the form's space while its chunk loads, so there is no layout shift. */
export function ContactFormSkeleton() {
  return (
    <div aria-hidden className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <Skeleton className="h-[4.5rem]" />
        <Skeleton className="h-[4.5rem]" />
      </div>
      <Skeleton className="h-[4.5rem]" />
      <Skeleton className="h-44" />
      <Skeleton className="h-10 w-36" />
    </div>
  )
}
