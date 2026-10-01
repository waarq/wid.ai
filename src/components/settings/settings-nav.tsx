import Link from "next/link"

import { cn } from "@/lib/utils"
import { SETTINGS_SECTIONS, type SettingsSectionId } from "@/types"

import { SECTION_META, sectionHref } from "./settings-meta"

/**
 * Section navigation: a vertical list on desktop, a horizontally scrolling
 * row on mobile. Plain links, so ?section= is the single source of truth and
 * the unsaved-changes guard sees every section switch.
 */
export function SettingsNav({ active }: { active: SettingsSectionId }) {
  return (
    <nav aria-label="Settings sections" className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:overflow-visible lg:px-0">
      <ul className="flex w-max gap-1 lg:w-auto lg:flex-col">
        {SETTINGS_SECTIONS.map((id) => {
          const { label, icon: Icon } = SECTION_META[id]
          const isActive = id === active
          return (
            <li key={id}>
              <Link
                href={sectionHref(id)}
                scroll={false}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex h-8 items-center gap-2 rounded-md px-2.5 text-[13px] font-medium whitespace-nowrap outline-none transition-colors",
                  "focus-visible:ring-2 focus-visible:ring-ring active:translate-y-px",
                  isActive ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="size-4" aria-hidden />
                {label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
