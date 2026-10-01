"use client"

import { useCallback } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { cn } from "@/lib/utils"

interface Option {
  value: string
  label: string
}

/**
 * Segmented filter whose single source of truth is one URL search param.
 * The default option removes the param so URLs stay clean.
 */
export function UrlFilterChips({
  param,
  options,
  value,
  label,
  defaultValue = options[0]?.value ?? "",
  resetParams = [],
}: {
  param: string
  options: readonly Option[]
  value: string
  label: string
  defaultValue?: string
  /** Params cleared whenever this one changes (e.g. pagination). */
  resetParams?: string[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const select = useCallback(
    (next: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (next === defaultValue) params.delete(param)
      else params.set(param, next)
      for (const key of resetParams) params.delete(key)
      const query = params.toString()
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
    },
    [defaultValue, param, pathname, resetParams, router, searchParams],
  )

  return (
    <div role="group" aria-label={label} className="flex w-max gap-1 sm:w-auto sm:flex-wrap">
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => select(option.value)}
            className={cn(
              "h-7 rounded-md px-2.5 text-[13px] font-medium outline-none transition-colors",
              "focus-visible:ring-2 focus-visible:ring-ring active:translate-y-px",
              active
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
