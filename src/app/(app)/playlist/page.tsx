import type { Metadata } from "next"

import { PlaylistList } from "@/components/playlist/playlist-list"
import { PageHeader } from "@/components/shared/page-header"

export const metadata: Metadata = { title: "Playlist" }

export default function PlaylistPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="My Playlist" description="Important moments you've saved from your meetings." />
      <PlaylistList />
    </div>
  )
}
