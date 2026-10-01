import { beforeEach, describe, expect, it } from "vitest"

import { MockAlertService } from "./alert-service"
import type { MockDb } from "./db"
import { MockPlaylistService } from "./playlist-service"
import { expectAppError, expectTraceable, resetMockWorld } from "./test-helpers"

const playlist = new MockPlaylistService()
const alerts = new MockAlertService()

let db: MockDb

beforeEach(async () => {
  db = await resetMockWorld()
})

function segmentOf(meetingId: string, index: number) {
  return db.state.transcripts[meetingId].segments[index]
}

describe("MockPlaylistService", () => {
  it("lists saved moments newest first, all traceable", async () => {
    const { items } = await playlist.list()
    expect(items.length).toBeGreaterThan(0)
    for (let i = 1; i < items.length; i++) {
      expect(Date.parse(items[i - 1].createdAt)).toBeGreaterThanOrEqual(Date.parse(items[i].createdAt))
    }
    for (const item of items) expectTraceable(db, item, item.id)
  })

  it("adds a moment with the segment's quote, idempotently", async () => {
    const segment = segmentOf("mtg_pp_1001", 20)
    const input = {
      kind: "highlight" as const,
      title: "Beta size",
      meetingId: "mtg_pp_1001",
      sourceSegmentId: segment.id,
      sourceTimestamp: segment.startTime,
    }
    const added = await playlist.add(input)
    expect(added.quote).toBe(segment.text)
    expect(added.meeting.id).toBe("mtg_pp_1001")
    expectTraceable(db, added)
    const again = await playlist.add({ ...input, title: "Duplicate" })
    expect(again.id).toBe(added.id)
    expect((await playlist.list()).items.filter((p) => p.sourceSegmentId === segment.id && p.kind === "highlight")).toHaveLength(1)
  })

  it("rejects moments that are not in the transcript", async () => {
    const segment = segmentOf("mtg_pp_1001", 3)
    const base = { kind: "highlight" as const, title: "x", meetingId: "mtg_pp_1001" }
    await expectAppError(playlist.add({ ...base, sourceSegmentId: "seg_nope", sourceTimestamp: 0 }), "validation_error")
    await expectAppError(
      playlist.add({ ...base, sourceSegmentId: segment.id, sourceTimestamp: segment.startTime + 600 }),
      "validation_error",
    )
    await expectAppError(
      playlist.add({ ...base, sourceSegmentId: segment.id, sourceTimestamp: segment.startTime, endTimestamp: segment.startTime }),
      "validation_error",
    )
    await expectAppError(
      playlist.add({ ...base, title: "", sourceSegmentId: segment.id, sourceTimestamp: segment.startTime }),
      "validation_error",
    )
    // A segment from another meeting does not count.
    const other = segmentOf("mtg_client_discovery", 0)
    await expectAppError(playlist.add({ ...base, sourceSegmentId: other.id, sourceTimestamp: other.startTime }), "validation_error")
  })

  it("updates and removes items", async () => {
    const [first] = (await playlist.list()).items
    const updated = await playlist.update(first.id, { title: "Renamed", note: "  " })
    expect(updated.title).toBe("Renamed")
    expect(updated.note).toBeUndefined()
    await playlist.remove(first.id)
    expect((await playlist.list()).items.some((p) => p.id === first.id)).toBe(false)
    await expectAppError(playlist.remove(first.id), "not_found")
    await expectAppError(playlist.update(first.id, { title: "x" }), "not_found")
  })

  it("hides items from meetings the viewer cannot access", async () => {
    const meeting = db.findMeeting("mtg_sales_demo")!
    meeting.sharedWithMe = false
    meeting.participants = meeting.participants.filter((p) => p.id !== db.me.personId)
    expect((await playlist.list()).items.some((p) => p.meetingId === "mtg_sales_demo")).toBe(false)
  })
})

describe("MockAlertService", () => {
  it("counts unread and filters", async () => {
    const all = await alerts.list()
    const unread = await alerts.list({ filter: "unread" })
    expect(await alerts.getUnreadCount()).toBe(unread.items.length)
    expect(unread.items.every((a) => a.readAt === null)).toBe(true)
    expect(all.total).toBeGreaterThan(unread.total)
    await expectAppError(alerts.list({ filter: "bogus" as "all" }), "validation_error")
  })

  it("marks one read idempotently and keeps the first read time", async () => {
    const [target] = (await alerts.list({ filter: "unread" })).items
    const before = await alerts.getUnreadCount()
    const read = await alerts.markRead(target.id)
    expect(read.readAt).toBeTruthy()
    expect(await alerts.getUnreadCount()).toBe(before - 1)
    const again = await alerts.markRead(target.id)
    expect(again.readAt).toBe(read.readAt)
    expect(await alerts.getUnreadCount()).toBe(before - 1)
  })

  it("marks all read", async () => {
    await alerts.markAllRead()
    expect(await alerts.getUnreadCount()).toBe(0)
  })

  it("dismisses alerts", async () => {
    const [target] = (await alerts.list()).items
    await alerts.dismiss(target.id)
    expect((await alerts.list()).items.some((a) => a.id === target.id)).toBe(false)
    await expectAppError(alerts.dismiss(target.id), "not_found")
    await expectAppError(alerts.markRead("alert_missing"), "not_found")
  })
})
