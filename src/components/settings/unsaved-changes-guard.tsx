"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

import { ConfirmDialog } from "@/components/shared/confirm-dialog"

/*
 * Warns before unsaved edits are lost.
 * - Tab close / reload / external navigation: native beforeunload prompt.
 * - In-app navigation: link clicks are intercepted (capture phase, before
 *   Next's Link handler) and routed through a confirm dialog.
 * Browser back/forward is covered only by beforeunload when it leaves the app.
 */
export function UnsavedChangesGuard({ dirty }: { dirty: boolean }) {
  const router = useRouter()
  const [pendingHref, setPendingHref] = useState<string | null>(null)

  useEffect(() => {
    if (!dirty) return

    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault()
      event.returnValue = ""
    }

    function onClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0) return
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const target = event.target instanceof Element ? event.target : null
      const anchor = target?.closest<HTMLAnchorElement>("a[href]")
      if (!anchor) return
      if ((anchor.target && anchor.target !== "_self") || anchor.hasAttribute("download")) return
      const url = new URL(anchor.href, window.location.href)
      if (url.origin !== window.location.origin) return
      const next = `${url.pathname}${url.search}`
      if (next === `${window.location.pathname}${window.location.search}`) return
      event.preventDefault()
      event.stopPropagation()
      setPendingHref(`${next}${url.hash}`)
    }

    window.addEventListener("beforeunload", onBeforeUnload)
    document.addEventListener("click", onClick, true)
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload)
      document.removeEventListener("click", onClick, true)
    }
  }, [dirty])

  return (
    <ConfirmDialog
      open={pendingHref !== null}
      onOpenChange={(open) => {
        if (!open) setPendingHref(null)
      }}
      title="Leave without saving?"
      description="You have unsaved changes on this page. If you leave now they will be discarded."
      confirmLabel="Discard and leave"
      cancelLabel="Keep editing"
      variant="destructive"
      onConfirm={() => {
        const href = pendingHref
        setPendingHref(null)
        if (href) router.push(href)
      }}
    />
  )
}
