import { describe, expect, it } from "vitest"

import { getPostAuthPath, getSafeNextPath, resolveRouteAccess } from "./routes"
import { parseSessionHint, readSessionHintFromCookieString, serializeSessionHint } from "./session-hint"

describe("resolveRouteAccess", () => {
  it("always allows public routes", () => {
    for (const stage of ["unauthenticated", "onboarding", "ready"] as const) {
      expect(resolveRouteAccess("/", stage)).toEqual({ type: "allow" })
      expect(resolveRouteAccess("/pricing", stage)).toEqual({ type: "allow" })
    }
  })

  it("sends unauthenticated app visits to login with a next param", () => {
    expect(resolveRouteAccess("/my-calls/mtg_1", "unauthenticated", "?tab=transcript")).toEqual({
      type: "redirect",
      pathname: "/login",
      search: `?next=${encodeURIComponent("/my-calls/mtg_1?tab=transcript")}`,
    })
  })

  it("sends onboarding users from the app to onboarding", () => {
    expect(resolveRouteAccess("/deals", "onboarding")).toEqual({ type: "redirect", pathname: "/onboarding" })
  })

  it("allows ready users into the app", () => {
    expect(resolveRouteAccess("/settings/integrations", "ready")).toEqual({ type: "allow" })
  })

  it("guards onboarding by stage", () => {
    expect(resolveRouteAccess("/onboarding", "unauthenticated")).toEqual({
      type: "redirect",
      pathname: "/login",
      search: "?next=%2Fonboarding",
    })
    expect(resolveRouteAccess("/onboarding", "onboarding")).toEqual({ type: "allow" })
    expect(resolveRouteAccess("/onboarding/step", "ready")).toEqual({ type: "redirect", pathname: "/my-calls" })
  })

  it("keeps signed-in users off auth pages, honouring a safe next", () => {
    expect(resolveRouteAccess("/login", "unauthenticated")).toEqual({ type: "allow" })
    expect(resolveRouteAccess("/register", "onboarding")).toEqual({ type: "redirect", pathname: "/onboarding" })
    expect(resolveRouteAccess("/login", "ready")).toEqual({ type: "redirect", pathname: "/my-calls" })
    expect(resolveRouteAccess("/login", "ready", "?next=%2Fdeals%3Fstage%3Dproposal")).toEqual({
      type: "redirect",
      pathname: "/deals",
      search: "?stage=proposal",
    })
    // Unsafe or non-app next values fall back to home.
    expect(resolveRouteAccess("/login", "ready", "?next=%2F%2Fevil.com")).toEqual({ type: "redirect", pathname: "/my-calls" })
    expect(resolveRouteAccess("/login", "ready", "?next=%2Fpricing")).toEqual({ type: "redirect", pathname: "/my-calls" })
  })

  it("redirects legacy /dashboard paths, keeping the query", () => {
    expect(resolveRouteAccess("/dashboard", "ready")).toEqual({ type: "redirect", pathname: "/my-calls" })
    expect(resolveRouteAccess("/dashboard/deals", "unauthenticated", "?stage=won")).toEqual({
      type: "redirect",
      pathname: "/deals",
      search: "?stage=won",
    })
  })

  it("does not treat lookalike prefixes as app routes", () => {
    expect(resolveRouteAccess("/my-callsx", "unauthenticated")).toEqual({ type: "allow" })
  })
})

describe("getSafeNextPath", () => {
  it("accepts same-origin absolute paths", () => {
    expect(getSafeNextPath("/my-calls?x=1#y")).toBe("/my-calls?x=1#y")
    expect(getSafeNextPath("/pricing")).toBe("/pricing")
  })

  it.each([
    [null],
    [undefined],
    [""],
    ["my-calls"],
    ["//evil.com"],
    ["/\\evil.com"],
    ["https://evil.com"],
    ["javascript:alert(1)"],
    ["/my-calls\n"],
    ["/login"],
    ["/register"],
    ["/dashboard/deals"],
    [`/${"a".repeat(600)}`],
  ])("rejects %j", (value) => {
    expect(getSafeNextPath(value)).toBeNull()
  })
})

describe("getPostAuthPath", () => {
  it("routes by stage and only honours app next paths", () => {
    expect(getPostAuthPath("onboarding", "/deals")).toBe("/onboarding")
    expect(getPostAuthPath("unauthenticated")).toBe("/login")
    expect(getPostAuthPath("ready", "/deals")).toBe("/deals")
    expect(getPostAuthPath("ready", "/pricing")).toBe("/my-calls")
    expect(getPostAuthPath("ready", null)).toBe("/my-calls")
  })
})

describe("session hint", () => {
  it("round-trips and rejects anything malformed", () => {
    expect(parseSessionHint(serializeSessionHint("ready"))).toBe("ready")
    expect(parseSessionHint("v1.onboarding")).toBe("onboarding")
    expect(parseSessionHint("v2.ready")).toBe("unauthenticated")
    expect(parseSessionHint("v1.admin")).toBe("unauthenticated")
    expect(parseSessionHint("%E0%A4%A")).toBe("unauthenticated")
    expect(readSessionHintFromCookieString("a=1; wid_session_hint=v1.ready; b=2")).toBe("ready")
    expect(readSessionHintFromCookieString("a=1")).toBe("unauthenticated")
  })
})
