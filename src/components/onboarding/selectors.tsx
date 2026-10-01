"use client"

import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { useId } from "react"

import type {
  CapturePreference,
  EmailType,
  JobFunction,
  MeetingCategory,
  MeetingFocus,
  SharingPreference,
} from "@/types"

import { OptionCheckboxList, OptionRadioGroup } from "./option-list"
import {
  CAPTURE_PREFERENCE_OPTIONS,
  EMAIL_TYPE_OPTIONS,
  JOB_FUNCTION_OPTIONS,
  MEETING_CATEGORY_OPTIONS,
  MEETING_FOCUS_COPY,
  SHARING_OPTIONS,
} from "./options"

/*
 * Controlled, presentational selectors. They hold no state and know nothing
 * about the store or services, so Settings can reuse them as-is.
 */

interface SelectorA11y {
  labelledBy?: string
  describedBy?: string
  disabled?: boolean
  invalid?: boolean
}

export function EmailTypeSelector({
  value,
  onChange,
  ...a11y
}: SelectorA11y & { value: EmailType | undefined; onChange: (value: EmailType) => void }) {
  return <OptionRadioGroup options={EMAIL_TYPE_OPTIONS} value={value} onValueChange={onChange} {...a11y} />
}

export function SharingSelector({
  value,
  onChange,
  ...a11y
}: SelectorA11y & { value: SharingPreference | undefined; onChange: (value: SharingPreference) => void }) {
  return <OptionRadioGroup options={SHARING_OPTIONS} value={value} onValueChange={onChange} {...a11y} />
}

export function JobFunctionSelector({
  value,
  onChange,
  ...a11y
}: SelectorA11y & { value: JobFunction | undefined; onChange: (value: JobFunction) => void }) {
  return (
    <OptionRadioGroup options={JOB_FUNCTION_OPTIONS} value={value} onValueChange={onChange} columns={2} {...a11y} />
  )
}

export function MeetingFocusSelector({
  value,
  onChange,
  ...a11y
}: SelectorA11y & { value: readonly MeetingFocus[]; onChange: (value: MeetingFocus[]) => void }) {
  return (
    <OptionCheckboxList options={MEETING_FOCUS_COPY} value={value} onValueChange={onChange} columns={2} {...a11y} />
  )
}

interface CapturePreferenceSelectorProps extends SelectorA11y {
  value: CapturePreference | undefined
  onChange: (value: CapturePreference) => void
  categories: readonly MeetingCategory[]
  onCategoriesChange: (value: MeetingCategory[]) => void
  /** Inline error for the category list (shown only for "selected_meetings"). */
  categoriesError?: string
}

export function CapturePreferenceSelector({
  value,
  onChange,
  categories,
  onCategoriesChange,
  categoriesError,
  ...a11y
}: CapturePreferenceSelectorProps) {
  const reduceMotion = useReducedMotion()
  const categoriesLabelId = useId()
  const categoriesErrorId = useId()
  const showCategories = value === "selected_meetings"

  return (
    <div className="grid gap-5">
      <OptionRadioGroup options={CAPTURE_PREFERENCE_OPTIONS} value={value} onValueChange={onChange} {...a11y} />
      <AnimatePresence initial={false}>
        {showCategories ? (
          <motion.div
            key="categories"
            initial={{ opacity: 0, y: reduceMotion ? 0 : -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
            className="grid gap-2 sm:pl-7"
          >
            <p id={categoriesLabelId} className="text-sm font-medium text-foreground">
              Which types of meetings?
            </p>
            <OptionCheckboxList
              options={MEETING_CATEGORY_OPTIONS}
              value={categories}
              onValueChange={onCategoriesChange}
              labelledBy={categoriesLabelId}
              describedBy={categoriesError ? categoriesErrorId : undefined}
              invalid={Boolean(categoriesError)}
              disabled={a11y.disabled}
            />
            {categoriesError ? (
              <p id={categoriesErrorId} role="alert" className="text-sm text-destructive">
                {categoriesError}
              </p>
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
