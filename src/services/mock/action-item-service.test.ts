import { beforeEach, describe, expect, it } from "vitest"

import { MockActionItemService } from "./action-item-service"
import type { MockDb } from "./db"
import { MockMeetingService } from "./meeting-service"
import { expectAppError, expectTraceable, resetMockWorld } from "./test-helpers"

const actions = new MockActionItemService()
const meetings = new MockMeetingService()

let db: MockDb

beforeEach(async () => {
  db = await resetMockWorld()
})

describe("MockActionItemService", () => {
  it("lists open work first and every item is traceable", async () => {
    const { items } = await actions.list()
    expect(items.length).toBeGreaterThan(10)
    const firstDone = items.findIndex((a) => a.status === "completed")
    expect(items.slice(firstDone).every((a) => a.status === "completed" || a.status === "dismissed")).toBe(true)
    for (const item of items) {
      expectTraceable(db, item, item.id)
      expect(item.meeting.id).toBe(item.meetingId)
    }
  })

  it("filters by meeting, assignee and mine", async () => {
    const { items } = await actions.list({ meetingId: "mtg_pp_1001" })
    expect(items).toHaveLength(4)
    const mine = await actions.list({ mine: true })
    expect(mine.items.every((a) => a.assignee?.id === db.me.personId)).toBe(true)
    await expectAppError(actions.list({ status: "nope" as "open" }), "validation_error")
  })

  it("toggle completes and reopens, and the meeting's counts follow", async () => {
    const before = await meetings.getById("mtg_pp_1001")
    const done = await actions.toggleComplete("act_pp_1001_2")
    expect(done.status).toBe("completed")
    expect(done.completedAt).toBeTruthy()

    const after = await meetings.getById("mtg_pp_1001")
    expect(after.stats!.actionItems).toBe(before.stats!.actionItems - 1)
    expect(after.summary!.actionItems.find((a) => a.id === "act_pp_1001_2")!.status).toBe("completed")

    const reopened = await actions.toggleComplete("act_pp_1001_2")
    expect(reopened.status).toBe("open")
    expect(reopened.completedAt).toBeUndefined()
    expect((await meetings.getById("mtg_pp_1001")).stats!.actionItems).toBe(before.stats!.actionItems)
  })

  it("updates fields with validation", async () => {
    const updated = await actions.update("act_pp_1001_3", {
      title: "  Write the onboarding guide  ",
      dueDate: "2026-10-20",
      assigneeId: db.me.personId,
    })
    expect(updated).toMatchObject({ title: "Write the onboarding guide", dueDate: "2026-10-20" })
    expect(updated.assignee?.id).toBe(db.me.personId)

    const error = await expectAppError(
      actions.update("act_pp_1001_3", { title: "", dueDate: "tomorrow", assigneeId: "per_nobody" }),
      "validation_error",
    )
    expect(Object.keys(error.details?.fieldErrors ?? {}).sort()).toEqual(["assigneeId", "dueDate", "title"])
    // A failed update changes nothing.
    expect((await actions.getById("act_pp_1001_3")).title).toBe("Write the onboarding guide")
  })

  it("hides dismissed items unless asked for", async () => {
    await actions.update("act_pp_1001_4", { status: "dismissed" })
    expect((await actions.list({ meetingId: "mtg_pp_1001" })).items.some((a) => a.id === "act_pp_1001_4")).toBe(false)
    expect((await actions.list({ meetingId: "mtg_pp_1001", status: "dismissed" })).items).toHaveLength(1)
  })

  it("deletes an item and repoints alerts that targeted it", async () => {
    await actions.delete("act_pp_1001_1")
    await expectAppError(actions.getById("act_pp_1001_1"), "not_found")
    const retargeted = db.state.alerts.filter((a) => a.target.kind === "action_item" && a.target.actionItemId === "act_pp_1001_1")
    expect(retargeted).toEqual([])
    const meeting = await meetings.getById("mtg_pp_1001")
    expect(meeting.summary!.keyMoments.every((m) => m.relatedId !== "act_pp_1001_1")).toBe(true)
  })

  it("refuses actions in meetings the viewer cannot access", async () => {
    const meeting = db.findMeeting("mtg_sales_demo")!
    meeting.sharedWithMe = false
    meeting.participants = meeting.participants.filter((p) => p.id !== db.me.personId)
    await expectAppError(actions.toggleComplete("act_sales_demo_1"), "not_found")
    expect((await actions.list()).items.some((a) => a.meetingId === "mtg_sales_demo")).toBe(false)
  })
})
