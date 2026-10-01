import { describe, expect, it } from "vitest"

import type { AdapterRequest, ApiAdapter } from "@/lib/api/types"
import { isAppError } from "@/lib/utils/errors"

import { bootstrapAccount } from "./bootstrap"
import {
  buildAuthCallbackUrl,
  callbackErrorFromProvider,
  getCallbackErrorPath,
  getCallbackSuccessPath,
  parseAuthCallbackError,
  parseIntent,
  resolveApiBaseUrl,
} from "./callback"
import { stageFromClaims } from "./claims"
import { resolveRouteAccess } from "./routes"

describe("stageFromClaims", () => {
  it("is unauthenticated without verified claims", () => {
    expect(stageFromClaims(null)).toBe("unauthenticated")
    expect(stageFromClaims(undefined)).toBe("unauthenticated")
    expect(stageFromClaims({})).toBe("unauthenticated")
    expect(stageFromClaims({ sub: "" , app_stage: "ready" })).toBe("unauthenticated")
    expect(stageFromClaims({ sub: "u1", role: "anon", app_stage: "ready" })).toBe("unauthenticated")
  })

  it("reads app_stage for authenticated users", () => {
    expect(stageFromClaims({ sub: "u1", role: "authenticated", app_stage: "ready" })).toBe("ready")
    expect(stageFromClaims({ sub: "u1", role: "authenticated", app_stage: "onboarding" })).toBe("onboarding")
  })

  it("falls back to onboarding when the hook claim is missing or unknown", () => {
    expect(stageFromClaims({ sub: "u1", role: "authenticated" })).toBe("onboarding")
    expect(stageFromClaims({ sub: "u1", role: "authenticated", app_stage: "admin" })).toBe("onboarding")
  })

  it("feeds resolveRouteAccess unchanged", () => {
    const ready = stageFromClaims({ sub: "u1", role: "authenticated", app_stage: "ready" })
    expect(resolveRouteAccess("/deals", ready)).toEqual({ type: "allow" })
    expect(resolveRouteAccess("/deals", stageFromClaims(null))).toEqual({
      type: "redirect",
      pathname: "/login",
      search: "?next=%2Fdeals",
    })
  })
})

describe("auth callback targets", () => {
  it("builds the redirectTo with a safe next and the register intent", () => {
    expect(buildAuthCallbackUrl("http://localhost:3000")).toBe("http://localhost:3000/auth/callback")
    expect(buildAuthCallbackUrl("http://localhost:3000", { next: "/deals?stage=won", intent: "register" })).toBe(
      "http://localhost:3000/auth/callback?next=%2Fdeals%3Fstage%3Dwon&intent=register",
    )
    expect(buildAuthCallbackUrl("https://app.wid.test/", { next: "//evil.com", intent: "sign_in" })).toBe(
      "https://app.wid.test/auth/callback",
    )
  })

  it("routes success by stage, honouring only safe app next paths", () => {
    expect(getCallbackSuccessPath("onboarding", "/deals")).toBe("/onboarding")
    expect(getCallbackSuccessPath("ready", "/deals?x=1")).toBe("/deals?x=1")
    expect(getCallbackSuccessPath("ready", "https://evil.com")).toBe("/my-calls")
    expect(getCallbackSuccessPath("ready", "/pricing")).toBe("/my-calls")
    expect(getCallbackSuccessPath("ready", null)).toBe("/my-calls")
  })

  it("sends failures to the right auth page with a closed error flag", () => {
    expect(getCallbackErrorPath("oauth_failed")).toBe("/login?error=oauth_failed")
    expect(getCallbackErrorPath("bootstrap_failed", { next: "/deals", intent: "register" })).toBe(
      "/register?error=bootstrap_failed&next=%2Fdeals",
    )
    expect(getCallbackErrorPath("oauth_cancelled", { next: "//evil.com" })).toBe("/login?error=oauth_cancelled")
  })

  it("parses only known flags and intents", () => {
    expect(parseAuthCallbackError("bootstrap_failed")).toBe("bootstrap_failed")
    expect(parseAuthCallbackError(["oauth_failed", "x"])).toBe("oauth_failed")
    expect(parseAuthCallbackError("<script>")).toBeNull()
    expect(parseAuthCallbackError(undefined)).toBeNull()
    expect(parseIntent("register")).toBe("register")
    expect(parseIntent("admin")).toBe("sign_in")
    expect(callbackErrorFromProvider("access_denied")).toBe("oauth_cancelled")
    expect(callbackErrorFromProvider("server_error")).toBe("oauth_failed")
    expect(callbackErrorFromProvider(null)).toBeNull()
  })

  it("resolves relative API base URLs against the request origin", () => {
    expect(resolveApiBaseUrl("/api", "http://localhost:3000")).toBe("http://localhost:3000/api")
    expect(resolveApiBaseUrl("http://localhost:4000/api/", "http://localhost:3000")).toBe("http://localhost:4000/api")
  })
})

describe("bootstrapAccount", () => {
  function adapterReturning(status: number, data: unknown, seen: AdapterRequest[] = []): ApiAdapter {
    return {
      async send(request) {
        seen.push(request)
        return { status, headers: { "content-type": "application/json" }, data: data as never }
      },
    }
  }

  it("posts the intent with the bearer token and returns the stage", async () => {
    const seen: AdapterRequest[] = []
    const result = await bootstrapAccount({
      apiBaseUrl: "http://api.test/api",
      accessToken: "tok",
      intent: "register",
      adapter: adapterReturning(200, { session: { stage: "onboarding", user: {}, expiresAt: "x" }, isNewUser: true }, seen),
    })
    expect(result).toEqual({ stage: "onboarding", isNewUser: true })
    expect(seen[0]).toMatchObject({
      method: "POST",
      url: "http://api.test/api/v1/auth/bootstrap",
      body: { intent: "register" },
    })
    expect(seen[0].headers.authorization).toBe("Bearer tok")
  })

  it("rejects with an AppError on HTTP errors and contract drift", async () => {
    const failing = bootstrapAccount({
      apiBaseUrl: "http://api.test/api",
      accessToken: "tok",
      intent: "sign_in",
      adapter: adapterReturning(401, { code: "unauthorized" }),
    })
    await expect(failing).rejects.toMatchObject({ code: "unauthorized" })

    const drift = await bootstrapAccount({
      apiBaseUrl: "http://api.test/api",
      accessToken: "tok",
      intent: "sign_in",
      adapter: adapterReturning(200, { session: { stage: "admin" }, isNewUser: false }),
    }).catch((error: unknown) => error)
    expect(isAppError(drift) && drift.code).toBe("server_error")
  })
})
