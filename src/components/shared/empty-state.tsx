import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  /** Primary action, usually a Button. */
  action?: ReactNode
  className?: string
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 px-4 py-14 text-center",
        className
      )}
    >
      <span className="grid size-10 place-items-center rounded-lg border border-border bg-card text-muted-foreground">
        <Icon className="size-5" aria-hidden />
      </span>
      <div className="max-w-sm space-y-1">
        <h2 className="text-base font-medium text-foreground">{title}</h2>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  )
}
