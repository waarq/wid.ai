"use client"

import { useState } from "react"
import type { FieldValues, UseFormReturn } from "react-hook-form"
import { toast } from "sonner"

import { useUpdateSettings } from "@/hooks"
import type { UpdateSettingsInput } from "@/types"

/**
 * Save plumbing shared by every settings form: optimistic mutation (with
 * rollback in the hook), form reset to the saved values, toast, and the
 * "Saved" indicator that clears on the next edit.
 */
export function useSectionSave<T extends FieldValues>(form: UseFormReturn<T>, successMessage: string) {
  const update = useUpdateSettings()
  const [wasSaved, setWasSaved] = useState(false)

  function save(input: UpdateSettingsInput, values: T) {
    update.mutate(input, {
      onSuccess: () => {
        form.reset(values)
        setWasSaved(true)
        toast.success(successMessage)
      },
      onError: () => toast.error("We couldn't save your settings. Nothing was changed."),
    })
  }

  return {
    save,
    saving: update.isPending,
    error: update.error,
    saved: wasSaved && !form.formState.isDirty,
  }
}
