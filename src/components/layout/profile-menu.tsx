"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CircleUser, Keyboard, LifeBuoy, LogOut, Settings } from "lucide-react"
import { toast } from "sonner"

import { initials } from "@/components/calls/format"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { useProfile, useSignOut } from "@/hooks"
import { clearSessionHintCookie } from "@/lib/auth"

import { ShortcutsDialog } from "./shortcuts-dialog"

export function ProfileMenu() {
  const router = useRouter()
  const { data: user, isPending } = useProfile()
  const signOut = useSignOut()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const fullName = user ? `${user.firstName} ${user.lastName}`.trim() : ""

  function handleSignOut() {
    signOut.mutate(undefined, {
      onSuccess: () => {
        clearSessionHintCookie()
        router.replace("/login")
      },
      onError: () => {
        setConfirmOpen(false)
        toast.error("We couldn't sign you out. Please try again.")
      },
    })
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Account menu"
          className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-95"
        >
          {isPending ? (
            <Skeleton className="size-8 rounded-full" />
          ) : (
            <Avatar>
              {user?.avatarUrl ? <AvatarImage src={user.avatarUrl} alt="" /> : null}
              <AvatarFallback>{initials(fullName || "You")}</AvatarFallback>
            </Avatar>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuLabel className="space-y-0.5 py-2">
            <span className="block truncate text-sm font-medium text-foreground">{fullName || "Your account"}</span>
            {user?.email ? <span className="block truncate text-xs font-normal">{user.email}</span> : null}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/profile">
              <CircleUser aria-hidden /> Profile
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/settings">
              <Settings aria-hidden /> Settings
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setShortcutsOpen(true)}>
            <Keyboard aria-hidden /> Keyboard shortcuts
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/help">
              <LifeBuoy aria-hidden /> Help
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => setConfirmOpen(true)}>
            <LogOut aria-hidden /> Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Sign out of WIT?"
        description="Meetings in progress keep recording only while this tab stays open. You can sign back in any time."
        confirmLabel="Sign out"
        variant="destructive"
        loading={signOut.isPending}
        onConfirm={handleSignOut}
      />
    </>
  )
}
