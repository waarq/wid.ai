import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

interface PageHeaderProps {
  title: string
  description?: string
  /** Rendered above the title, e.g. breadcrumbs or a back link. */
  breadcrumb?: ReactNode
  /** Right-aligned actions, e.g. primary button. */
  actions?: ReactNode
  className?: string
}

export function PageHeader({
  title,
  description,
  breadcrumb,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn("space-y-3 border-b border-border pb-5", className)}>
      {breadcrumb ? <div className="text-sm">{breadcrumb}</div> : null}
      <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-[1fr_auto]">
        <div className="min-w-0 space-y-1">
          <h1 className="truncate text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            {title}
          </h1>
          {description ? (
            <p className="text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>
    </header>
  )
}
