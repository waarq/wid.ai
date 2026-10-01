"use client"

import { Check } from "lucide-react"
import { Checkbox as CheckboxPrimitive, RadioGroup as RadioGroupPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

import type { OptionCopy } from "./options"

/*
 * Selectable rows used by every onboarding selector. Hairline-separated rows
 * with a clear selected state instead of heavy cards. The whole row is the
 * control: radios get roving focus + arrow keys from Radix, checkboxes toggle
 * with Space. Enter is handled by the step form (continue).
 */

const rowBase =
  "group/option relative grid w-full grid-cols-[auto_1fr] items-start gap-x-3 border-b border-border px-3 py-3.5 text-left outline-none transition-[background-color,transform] duration-150 ease-out hover:bg-accent/50 active:scale-[0.995] focus-visible:z-10 focus-visible:rounded-md focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-60 data-[state=checked]:bg-primary-soft/60 dark:data-[state=checked]:bg-primary-soft"

const listBase = "grid border-t border-border"

function RowText<V extends string>({ option }: { option: OptionCopy<V> }) {
  const Icon = option.icon
  return (
    <span className="grid min-w-0 gap-0.5">
      <span className="flex items-center gap-2 text-sm font-medium text-foreground">
        {Icon ? (
          <Icon
            aria-hidden
            className="size-4 text-muted-foreground group-data-[state=checked]/option:text-primary-ink"
          />
        ) : null}
        {option.label}
      </span>
      {option.description ? (
        <span className="text-sm text-muted-foreground">{option.description}</span>
      ) : null}
    </span>
  )
}

interface OptionRadioGroupProps<V extends string> {
  options: OptionCopy<V>[]
  value: V | undefined
  onValueChange: (value: V) => void
  /** id of the visible question heading. */
  labelledBy?: string
  describedBy?: string
  columns?: 1 | 2
  disabled?: boolean
  invalid?: boolean
  className?: string
}

export function OptionRadioGroup<V extends string>({
  options,
  value,
  onValueChange,
  labelledBy,
  describedBy,
  columns = 1,
  disabled,
  invalid,
  className,
}: OptionRadioGroupProps<V>) {
  return (
    <RadioGroupPrimitive.Root
      value={value ?? ""}
      onValueChange={(next) => onValueChange(next as V)}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      aria-invalid={invalid || undefined}
      disabled={disabled}
      className={cn(listBase, columns === 2 && "sm:grid-cols-2 sm:gap-x-6", className)}
    >
      {options.map((option) => (
        <RadioGroupPrimitive.Item key={option.value} value={option.value} className={rowBase}>
          <span
            aria-hidden
            className="mt-0.5 grid size-4 place-items-center rounded-full border border-input bg-background transition-colors group-data-[state=checked]/option:border-primary group-data-[state=checked]/option:bg-primary"
          >
            <span className="size-1.5 scale-0 rounded-full bg-primary-foreground transition-transform group-data-[state=checked]/option:scale-100" />
          </span>
          <RowText option={option} />
        </RadioGroupPrimitive.Item>
      ))}
    </RadioGroupPrimitive.Root>
  )
}

interface OptionCheckboxListProps<V extends string> {
  options: OptionCopy<V>[]
  value: readonly V[]
  onValueChange: (value: V[]) => void
  labelledBy?: string
  describedBy?: string
  columns?: 1 | 2
  disabled?: boolean
  invalid?: boolean
  className?: string
}

export function OptionCheckboxList<V extends string>({
  options,
  value,
  onValueChange,
  labelledBy,
  describedBy,
  columns = 1,
  disabled,
  invalid,
  className,
}: OptionCheckboxListProps<V>) {
  function toggle(option: V, checked: boolean) {
    const next = checked ? [...value, option] : value.filter((item) => item !== option)
    // Keep the canonical option order so payloads are stable.
    onValueChange(options.map((o) => o.value).filter((v) => next.includes(v)))
  }

  return (
    <div
      role="group"
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      data-invalid={invalid || undefined}
      className={cn(listBase, columns === 2 && "sm:grid-cols-2 sm:gap-x-6", className)}
    >
      {options.map((option) => (
        <CheckboxPrimitive.Root
          key={option.value}
          checked={value.includes(option.value)}
          onCheckedChange={(checked) => toggle(option.value, checked === true)}
          disabled={disabled}
          className={rowBase}
        >
          <span
            aria-hidden
            className="mt-0.5 grid size-4 place-items-center rounded-[4px] border border-input bg-background text-primary-foreground transition-colors group-data-[state=checked]/option:border-primary group-data-[state=checked]/option:bg-primary"
          >
            <Check className="size-3 scale-0 transition-transform group-data-[state=checked]/option:scale-100" strokeWidth={3} />
          </span>
          <RowText option={option} />
        </CheckboxPrimitive.Root>
      ))}
    </div>
  )
}
