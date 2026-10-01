import type { ShareRecipient, ShareSettings } from "@/types"

import { workspaceMembers } from "./people"
import { meetings } from "./meetings"

/**
 * Share settings for each captured meeting, derived from visibility. The demo
 * workspace has link sharing turned off, so "Anyone with the link" is never offered.
 */
export const shareSettingsByMeetingId: Record<string, ShareSettings> = Object.fromEntries(
  meetings
    .filter((m) => m.status !== "upcoming" && m.status !== "ready_to_capture")
    .map((m) => {
      const attendeeRecipients: ShareRecipient[] =
        m.visibility === "private"
          ? []
          : m.participants
              .filter((p) => p.id !== m.owner.id)
              .map((p) => ({
                id: `rcp_${m.id}_${p.id}`,
                name: p.name,
                email: p.email ?? "",
                source: "attendee",
                addedAt: m.updatedAt,
                canRemove: !m.sharedWithMe,
              }))
      const teamRecipients: ShareRecipient[] =
        m.visibility === "team"
          ? workspaceMembers
              .filter(
                (w) => w.id !== m.owner.id && !m.participants.some((p) => p.id === w.id),
              )
              .map((w) => ({
                id: `rcp_${m.id}_${w.id}`,
                name: w.name,
                email: w.email,
                source: "team",
                addedAt: m.updatedAt,
                canRemove: false,
              }))
          : []
      const settings: ShareSettings = {
        meetingId: m.id,
        visibility: m.visibility,
        recipients: [...attendeeRecipients, ...teamRecipients],
        linkSharingAvailable: false,
        link: null,
        canManage: !m.sharedWithMe,
      }
      return [m.id, settings]
    }),
)
