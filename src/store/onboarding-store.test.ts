import { describe, expect, it } from "vitest"

import { ONBOARDING_DEFAULTS, ONBOARDING_STEPS } from "@/types"

import {
  ONBOARDING_DRAFT_DEFAULTS,
  getMissingOnboardingFields,
  getNextStep,
  getPreviousStep,
  sanitizeDraft,
  toOnboardingData,
} from "./onboarding-store"

describe("sanitizeDraft", () => {
  it("falls back to privacy-first defaults for non-objects", () => {
    for (const value of [null, undefined, "x", 42, true]) {
      const draft = sanitizeDraft(value)
      expect(draft).toEqual(ONBOARDING_DRAFT_DEFAULTS)
      expect(draft.sharingPreference).toBe("only_me")
      expect(draft.capturePreference).toBe("manual")
    }
  })

  it("does not share array references with the defaults", () => {
    const draft = sanitizeDraft({})
    expect(draft.meetingFocus).not.toBe(ONBOARDING_DEFAULTS.meetingFocus)
    draft.meetingFocus?.push("risks")
    expect(sanitizeDraft({}).meetingFocus).toEqual([...ONBOARDING_DEFAULTS.meetingFocus])
  })

  it("keeps valid answers", () => {
    const draft = sanitizeDraft({
      emailType: "company",
      capturePreference: "manual",
      sharingPreference: "all_attendees",
      jobFunction: "engineering",
      selectedMeetingCategories: ["internal"],
      meetingFocus: ["risks"],
      goals: [],
      timezone: "Asia/Karachi",
      calendarConnected: true,
      zoomConnected: false,
    })
    expect(draft).toMatchObject({
      emailType: "company",
      sharingPreference: "all_attendees",
      jobFunction: "engineering",
      meetingFocus: ["risks"],
      timezone: "Asia/Karachi",
      calendarConnected: true,
      zoomConnected: false,
    })
  })

  it("drops unknown or tampered values field by field", () => {
    const draft = sanitizeDraft({
      emailType: "hacker",
      sharingPreference: "everyone",
      capturePreference: "always_on",
      jobFunction: 7,
      meetingFocus: ["risks", "<script>", 3],
      selectedMeetingCategories: "internal",
      timezone: "x".repeat(65),
      calendarConnected: "yes",
      firstName: "Waleed",
      token: "secret",
    })
    expect(draft.emailType).toBeUndefined()
    expect(draft.sharingPreference).toBe("only_me")
    expect(draft.capturePreference).toBe("manual")
    expect(draft.jobFunction).toBeUndefined()
    expect(draft.meetingFocus).toEqual(["risks"])
    expect(draft.selectedMeetingCategories).toEqual([])
    expect(draft.timezone).toBeUndefined()
    expect(draft.calendarConnected).toBe(false)
    // Names and unknown keys never come from storage.
    expect(draft.firstName).toBeUndefined()
    expect(draft).not.toHaveProperty("token")
  })
})

describe("onboarding step helpers", () => {
  it("moves through steps in order", () => {
    const [first, second] = ONBOARDING_STEPS
    expect(getNextStep(first)).toBe(second)
    expect(getPreviousStep(first)).toBeNull()
    expect(getNextStep(ONBOARDING_STEPS[ONBOARDING_STEPS.length - 1])).toBeNull()
  })

  it("requires every answer before building the payload", () => {
    expect(toOnboardingData(ONBOARDING_DRAFT_DEFAULTS)).toBeNull()
    expect(getMissingOnboardingFields({ ...ONBOARDING_DRAFT_DEFAULTS, firstName: "  " })).toContain("firstName")
    const data = toOnboardingData({
      ...ONBOARDING_DRAFT_DEFAULTS,
      emailType: "company",
      jobFunction: "engineering",
      firstName: " Waleed ",
      lastName: "Ahmed",
      timezone: "Asia/Karachi",
    })
    expect(data).toMatchObject({ firstName: "Waleed", sharingPreference: "only_me", capturePreference: "manual" })
  })
})
