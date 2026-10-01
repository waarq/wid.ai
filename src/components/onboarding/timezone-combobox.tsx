"use client"

import { ChevronsUpDown } from "lucide-react"
import { useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

/** Used when the runtime lacks Intl.supportedValuesOf. */
const FALLBACK_TIMEZONES = [
  "Pacific/Honolulu",
  "America/Anchorage",
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "America/Sao_Paulo",
  "UTC",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Paris",
  "Africa/Cairo",
  "Europe/Istanbul",
  "Asia/Dubai",
  "Asia/Karachi",
  "Asia/Kolkata",
  "Asia/Dhaka",
  "Asia/Bangkok",
  "Asia/Singapore",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Pacific/Auckland",
]

export function getTimeZones(): string[] {
  const intl = Intl as typeof Intl & { supportedValuesOf?: (key: "timeZone") => string[] }
  try {
    const zones = intl.supportedValuesOf?.("timeZone")
    if (zones && zones.length > 0) return zones.includes("UTC") ? zones : ["UTC", ...zones]
  } catch {
    // fall through
  }
  return FALLBACK_TIMEZONES
}

function offsetLabel(timeZone: string): string {
  try {
    const part = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "shortOffset" })
      .formatToParts(new Date())
      .find((p) => p.type === "timeZoneName")
    return part?.value ?? ""
  } catch {
    return ""
  }
}

function readable(timeZone: string): string {
  return timeZone.replaceAll("_", " ")
}

interface TimezoneComboboxProps {
  id?: string
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  disabled?: boolean
  invalid?: boolean
  describedBy?: string
}

/** Searchable IANA timezone picker (Popover + Command). */
export function TimezoneCombobox({ id, value, onChange, onBlur, disabled, invalid, describedBy }: TimezoneComboboxProps) {
  const [open, setOpen] = useState(false)
  const zones = useMemo(
    () => (open ? getTimeZones().map((zone) => ({ zone, offset: offsetLabel(zone) })) : []),
    [open],
  )

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) onBlur?.()
      }}
    >
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          disabled={disabled}
          className="h-9 w-full justify-between px-2.5 font-normal"
        >
          <span className={cn("truncate", !value && "text-muted-foreground")}>
            {value ? readable(value) : "Choose a timezone"}
          </span>
          <span className="flex items-center gap-2">
            {value ? <span className="num text-xs text-muted-foreground">{offsetLabel(value)}</span> : null}
            <ChevronsUpDown aria-hidden className="size-4 text-muted-foreground" />
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-(--radix-popover-trigger-width) min-w-72 p-0">
        <Command>
          <CommandInput placeholder="Search city or region" aria-label="Search timezones" />
          <CommandList>
            <CommandEmpty>No timezone found.</CommandEmpty>
            {zones.map(({ zone, offset }) => (
              <CommandItem
                key={zone}
                value={zone}
                keywords={[readable(zone), offset]}
                data-checked={zone === value}
                onSelect={() => {
                  onChange(zone)
                  setOpen(false)
                }}
              >
                <span className="truncate">{readable(zone)}</span>
                <span className="num ml-auto text-xs text-muted-foreground">{offset}</span>
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
