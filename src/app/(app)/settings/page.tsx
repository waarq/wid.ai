import type { Metadata } from "next"

import { PageHeader } from "@/components/shared/page-header"
import { parseSection } from "@/components/settings/settings-meta"
import { SettingsNav } from "@/components/settings/settings-nav"
import { SettingsView } from "@/components/settings/settings-view"

export const metadata: Metadata = { title: "Settings" }

export default async function SettingsPage(props: PageProps<"/settings">) {
  const section = parseSection((await props.searchParams).section)
  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Your preferences for capture, sharing, AI and notifications." />
      <div className="grid gap-6 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-10">
        <SettingsNav active={section} />
        <div className="max-w-2xl min-w-0">
          <SettingsView section={section} />
        </div>
      </div>
    </div>
  )
}
