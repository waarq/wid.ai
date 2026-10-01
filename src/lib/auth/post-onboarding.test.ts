import { describe, expect, it } from "vitest"

import { shouldAutoRedirect } from "./post-onboarding"

describe("shouldAutoRedirect", () => {
  it("allows the first attempt", () => {
    expect(shouldAutoRedirect(null, 1000)).toBe(true)
  })

  it("blocks a repeat within the guard window", () => {
    expect(shouldAutoRedirect(1000, 5000)).toBe(false)
  })

  it("allows again after the window", () => {
    expect(shouldAutoRedirect(1000, 100_000)).toBe(true)
  })
})
