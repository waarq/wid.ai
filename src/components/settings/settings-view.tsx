"use client"

import { ErrorState } from "@/components/shared/error-state"
import { Skeleton } from "@/components/ui/skeleton"
import { useSettings } from "@/hooks"
import type { SettingsSectionId } from "@/types"

import { AiSection } from "./ai-section"
import { AppearanceSection } from "./appearance-section"
import { CaptureSection } from "./capture-section"
import { GeneralSection } from "./general-section"
import { IntegrationsSection } from "./integrations-section"
import { MeetingsSection } from "./meetings-section"
import { NotificationsSection } from "./notifications-section"
import { SecuritySection } from "./security-section"
import { SharingSection } from "./sharing-section"

function SectionSkeleton() {
  return (
    <div role="status" aria-busy="true" className="grid max-w-2xl gap-6">
      <span className="sr-only">Loading settings</span>
      <div className="space-y-2">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <Skeleton className="h-9" />
      <Skeleton className="h-9 w-2/3" />
      <Skeleton className="h-24" />
      <Skeleton className="h-24" />
    </div>
  )
}

export function SettingsView({ section }: { section: SettingsSectionId }) {
  const settings = useSettings()

  // Integrations are owned by IntegrationService, so they don't wait on settings.
  if (section === "integrations") return <IntegrationsSection />

  if (settings.isPending) return <SectionSkeleton />
  if (settings.isError) {
    return (
      <ErrorState
        title="We couldn't load your settings."
        description="Your settings haven't changed. Try again in a moment."
        onRetry={() => void settings.refetch()}
        retrying={settings.isRefetching}
      />
    )
  }

  const data = settings.data
  switch (section) {
    case "general":
      return <GeneralSection key="general" general={data.general} />
    case "meetings":
      return <MeetingsSection key="meetings" meetings={data.meetings} />
    case "capture":
      return <CaptureSection key="capture" capture={data.capture} />
    case "sharing":
      return <SharingSection key="sharing" sharing={data.sharing} />
    case "ai":
      return <AiSection key="ai" ai={data.ai} />
    case "notifications":
      return <NotificationsSection key="notifications" notifications={data.notifications} />
    case "security":
      return <SecuritySection key="security" security={data.security} />
    case "appearance":
      return <AppearanceSection key="appearance" appearance={data.appearance} />
  }
}
