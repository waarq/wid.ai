import { describe, expect, it } from "vitest"

import { oauthErrorMessage, parseOAuthReturn, stripOAuthReturn } from "./oauth-return"

describe("parseOAuthReturn", () => {
  it("parses success", () => {
    expect(parseOAuthReturn("?integration=zoom&result=connected")).toEqual({ provider: "zoom", result: "connected" })
  })

  it("parses error with reason", () => {
    expect(parseOAuthReturn("?integration=google_calendar&result=error&reason=access_denied")).toEqual({
      provider: "google_calendar",
      result: "error",
      reason: "access_denied",
    })
  })

  it("ignores unknown providers, results and missing params", () => {
    expect(parseOAuthReturn("?integration=nope&result=connected")).toBeNull()
    expect(parseOAuthReturn("?integration=zoom&result=weird")).toBeNull()
    expect(parseOAuthReturn("")).toBeNull()
  })
})

describe("stripOAuthReturn", () => {
  it("removes only OAuth params", () => {
    expect(stripOAuthReturn("/settings", "?tab=integrations&integration=zoom&result=connected", "#x")).toBe(
      "/settings?tab=integrations#x",
    )
    expect(stripOAuthReturn("/onboarding", "?integration=zoom&result=error&reason=x")).toBe("/onboarding")
  })
})

describe("oauthErrorMessage", () => {
  it("never echoes the reason", () => {
    expect(oauthErrorMessage("<script>")).not.toContain("script")
  })
})
