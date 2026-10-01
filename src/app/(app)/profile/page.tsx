import type { Metadata } from "next"

import { PageHeader } from "@/components/shared/page-header"
import { ProfileView } from "@/components/profile/profile-view"

export const metadata: Metadata = { title: "Profile" }

export default function ProfilePage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Profile" description="How you appear in WID, and the timezone your meetings use." />
      <ProfileView />
    </div>
  )
}
