import { beforeEach, describe, expect, it } from "vitest"

import { assertMockIntegrity } from "@/mock-data"
import type { Meeting } from "@/types"

import type { MockDb } from "./db"
import { MockMeetingService } from "./meeting-service"
import { MockPlaylistService } from "./playlist-service"
import { mockControls } from "./controls"
import { expectAppError, expectTraceable, resetMockWorld } from "./test-helpers"
import { MockTranscriptService } from "./transcript-service"

const meetings = new MockMeetingService()
const transcripts = new MockTranscriptService()
const playlist = new MockPlaylistService()

let db: MockDb

beforeEach(async () => {
  db = await resetMockWorld()
})

function raw(id: string): Meeting {
  const meeting = db.findMeeting(id)
  if (!meeting) throw new Error(`fixture ${id} missing`)
  return meeting
}

describe("fixtures", () => {
  it("pass the integrity check", () => {
    expect(() => assertMockIntegrity()).not.toThrow()
  })
})

describe("MockMeetingService reads", () => {
  it("lists My Calls newest first with viewer-relative flags", async () => {
    const { items, total } = await meetings.list()
    expect(total).toBe(items.length)
    for (let i = 1; i < items.length; i++) {
      expect(Date.parse(items[i - 1].startedAt)).toBeGreaterThanOrEqual(Date.parse(items[i].startedAt))
    }
    const owned = items.find((m) => m.id === "mtg_pp_1001")!
    expect(owned.sharedWithMe).toBe(false)
    expect(items.find((m) => m.id === "mtg_leadership_sync")!.sharedWithMe).toBe(true)
  })

  it("counts only open and in-progress actions in stats", async () => {
    const meeting = await meetings.getById("mtg_pp_0925")
    const open = meeting.summary!.actionItems.filter((a) => a.status === "open" || a.status === "in_progress")
    expect(meeting.stats!.actionItems).toBe(open.length)
    expect(meeting.stats!.actionItems).toBeLessThan(meeting.summary!.actionItems.length)
  })

  it("keeps the PRD Product Planning numbers", async () => {
    const meeting = await meetings.getById("mtg_pp_1001")
    expect(meeting.stats).toMatchObject({ decisions: 3, actionItems: 4, openQuestions: 1 })
  })

  it("searches by prefix and filters by status", async () => {
    const { items } = await meetings.list({ search: "launc" })
    expect(items.map((m) => m.title)).toContain("Product Planning")
    const failed = await meetings.list({ status: "failed" })
    expect(failed.items.every((m) => m.status === "failed")).toBe(true)
    await expectAppError(meetings.list({ status: "bogus" as Meeting["status"] }), "validation_error")
  })

  it("every insight in every ready meeting is traceable to its transcript", async () => {
    const { items } = await meetings.list({ scope: "team" })
    const ready = items.filter((m) => m.status === "ready")
    expect(ready.length).toBeGreaterThan(5)
    for (const meeting of ready) {
      const transcript = await transcripts.getByMeetingId(meeting.id)
      expect(transcript.segments.length).toBeGreaterThan(0)
      const s = meeting.summary!
      for (const insight of [...s.decisions, ...s.actionItems, ...s.questions, ...s.risks, ...s.keyMoments]) {
        expect(insight.meetingId).toBe(meeting.id)
        expectTraceable(db, insight, `${meeting.id}/${"id" in insight ? insight.id : ""}`)
      }
    }
  })

  it("rejects only with AppException, including injected failures", async () => {
    mockControls.fail("meetings.getById", "network_error", { times: 1 })
    const error = await expectAppError(meetings.getById("mtg_pp_1001"), "network_error")
    expect(error.retryable).toBe(true)
    await expect(meetings.getById("mtg_pp_1001")).resolves.toMatchObject({ id: "mtg_pp_1001" })
  })
})

describe("access rules", () => {
  it("hides a private meeting that is not shared, without leaking existence", async () => {
    raw("mtg_eng_sync_next").sharedWithMe = false
    await expectAppError(meetings.getById("mtg_eng_sync_next"), "not_found")
    const { items } = await meetings.list({ scope: "team" })
    expect(items.some((m) => m.id === "mtg_eng_sync_next")).toBe(false)
  })

  it("allows attendees visibility only for participants", async () => {
    const meeting = raw("mtg_sales_demo")
    meeting.sharedWithMe = false
    meeting.participants = meeting.participants.filter((p) => p.id !== db.me.personId)
    await expectAppError(meetings.getById("mtg_sales_demo"), "not_found")
    meeting.visibility = "team"
    await expect(meetings.getById("mtg_sales_demo")).resolves.toMatchObject({ sharedWithMe: true })
  })

  it("lets only the owner update, share or delete", async () => {
    await expectAppError(meetings.update("mtg_leadership_sync", { title: "Renamed" }), "forbidden")
    await expectAppError(meetings.share("mtg_leadership_sync", { visibility: "private" }), "forbidden")
    await expectAppError(meetings.delete("mtg_leadership_sync"), "forbidden")
    const settings = await meetings.getShareSettings("mtg_leadership_sync")
    expect(settings.canManage).toBe(false)
    expect(settings.recipients.every((r) => !r.canRemove)).toBe(true)
  })

  it("does not expose actions or transcripts of inaccessible meetings", async () => {
    raw("mtg_eng_sync_next").sharedWithMe = false
    await expectAppError(transcripts.getByMeetingId("mtg_eng_sync_next"), "not_found")
  })
})

describe("mutations", () => {
  it("creates meetings privately by default (privacy default)", async () => {
    const meeting = await meetings.create({ title: "Hiring sync" })
    expect(meeting.visibility).toBe("private")
    expect(meeting.status).toBe("ready_to_capture")
    expect(meeting.participants[0].id).toBe(db.me.personId)
    await expectAppError(meetings.create({ title: "  " }), "validation_error")
  })

  it("renames everywhere the meeting is referenced", async () => {
    await meetings.update("mtg_pp_1001", { title: "Launch Planning" })
    const saved = await playlist.list({ meetingId: "mtg_pp_1001" })
    expect(saved.items.length).toBeGreaterThan(0)
    expect(saved.items.every((p) => p.meeting.title === "Launch Planning")).toBe(true)
    const meeting = await meetings.getById("mtg_pp_1001")
    expect(meeting.summary!.actionItems.every((a) => a.meeting.title === "Launch Planning")).toBe(true)
  })

  it("deletes a meeting and everything that pointed to it", async () => {
    await meetings.delete("mtg_pp_1001")
    await expectAppError(meetings.getById("mtg_pp_1001"), "not_found")
    expect((await playlist.list()).items.some((p) => p.meetingId === "mtg_pp_1001")).toBe(false)
    expect(db.state.alerts.some((a) => "meetingId" in a.target && a.target.meetingId === "mtg_pp_1001")).toBe(false)
  })
})

describe("sharing", () => {
  it("defaults link sharing to unavailable and ignores link requests", async () => {
    const settings = await meetings.share("mtg_pp_1001", { linkEnabled: true })
    expect(settings.linkSharingAvailable).toBe(false)
    expect(settings.link).toBeNull()
  })

  it("creates a link only when link sharing is available", async () => {
    db.state.settings.sharing.linkSharingAvailable = true
    const on = await meetings.share("mtg_pp_1001", { linkEnabled: true })
    expect(on.link?.url).toContain("/my-calls/mtg_pp_1001")
    const off = await meetings.share("mtg_pp_1001", { linkEnabled: false })
    expect(off.link).toBeNull()
  })

  it("changes visibility and reflects it on the meeting", async () => {
    const settings = await meetings.share("mtg_pp_1001", { visibility: "private" })
    expect(settings.visibility).toBe("private")
    expect(settings.recipients).toEqual([])
    expect((await meetings.getById("mtg_pp_1001")).visibility).toBe("private")
  })

  it("invites by email, validates, de-duplicates and can remove", async () => {
    await expectAppError(meetings.share("mtg_weekly_11", { inviteEmails: ["not-an-email"] }), "validation_error")
    const once = await meetings.share("mtg_weekly_11", { inviteEmails: ["guest@example.com", "GUEST@example.com"] })
    const invited = once.recipients.filter((r) => r.source === "invited")
    expect(invited).toHaveLength(1)
    expect(invited[0].canRemove).toBe(true)
    const after = await meetings.unshare("mtg_weekly_11", invited[0].id)
    expect(after.recipients.some((r) => r.email === "guest@example.com")).toBe(false)
  })

  it("removes an attendee and refuses to remove team-wide access", async () => {
    const attendees = await meetings.getShareSettings("mtg_pp_1001")
    const target = attendees.recipients.find((r) => r.source === "attendee")!
    const after = await meetings.unshare("mtg_pp_1001", target.id)
    expect(after.recipients.some((r) => r.id === target.id)).toBe(false)

    const team = await meetings.share("mtg_pp_1001", { visibility: "team" })
    const member = team.recipients.find((r) => r.source === "team")!
    expect(member.canRemove).toBe(false)
    await expectAppError(meetings.unshare("mtg_pp_1001", member.id), "forbidden")
    await expectAppError(meetings.unshare("mtg_pp_1001", "rcp_missing"), "not_found")
  })
})

describe("decisions and follow-up", () => {
  it("walks the decision history across meetings", async () => {
    const history = await meetings.getDecisionHistory("dec_pp_1001_1")
    expect(history.entries.map((e) => e.meeting.id)).toEqual(["mtg_pp_0918", "mtg_pp_0925", "mtg_pp_1001"])
    for (const entry of history.entries) expectTraceable(db, entry, entry.decisionId)
  })

  it("only generates a follow-up for ready meetings", async () => {
    const email = await meetings.generateFollowUp("mtg_pp_1001", { tone: "detailed" })
    expect(email.nextSteps.length).toBeGreaterThan(0)
    expect(email.body).toContain("Best,")
    await expectAppError(meetings.generateFollowUp("mtg_sprint_planning"), "conflict")
  })
})
