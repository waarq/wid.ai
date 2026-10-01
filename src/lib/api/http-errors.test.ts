import { afterEach, describe, expect, it, vi } from "vitest"

import type { JsonValue } from "@/types"

import { httpErrorFromResponse } from "./http-errors"

function response(status: number, data: JsonValue | null = null, headers: Record<string, string> = {}) {
  return { status, data, headers }
}

describe("httpErrorFromResponse", () => {
  afterEach(() => vi.useRealTimers())

  it.each([
    [400, "validation_error"],
    [401, "unauthorized"],
    [403, "forbidden"],
    [404, "not_found"],
    [408, "timeout"],
    [409, "conflict"],
    [412, "conflict"],
    [422, "validation_error"],
    [429, "rate_limited"],
    [500, "server_error"],
    [502, "server_error"],
    [503, "service_unavailable"],
    [504, "server_error"],
    [418, "unknown"],
  ])("maps status %i to %s without a body code", (status, code) => {
    const error = httpErrorFromResponse(response(status), "req_1")
    expect(error.code).toBe(code)
    expect(error.details).toMatchObject({ status, requestId: "req_1" })
  })

  it("prefers a valid data.code over the status mapping", () => {
    const error = httpErrorFromResponse(
      response(502, { code: "calendar_connection_failed", message: "Google said no", requestId: "r", retryable: false }),
      "req_1",
    )
    expect(error.code).toBe("calendar_connection_failed")
    // Backend messages are never surfaced.
    expect(error.message).not.toContain("Google said no")
  })

  it("ignores unknown or non-string body codes", () => {
    expect(httpErrorFromResponse(response(503, { code: "coming_soon" }), "r").code).toBe("service_unavailable")
    expect(httpErrorFromResponse(response(404, { code: 42 }), "r").code).toBe("not_found")
    expect(httpErrorFromResponse(response(500, ["server_error"]), "r").code).toBe("server_error")
  })

  it("keeps top-level fieldErrors from the backend envelope", () => {
    const error = httpErrorFromResponse(
      response(422, {
        code: "validation_error",
        message: "Request validation failed.",
        requestId: "r",
        retryable: false,
        fieldErrors: { title: ["Add a title."], ignored: [3] },
      }),
      "r",
    )
    expect(error.code).toBe("validation_error")
    expect(error.details?.fieldErrors).toEqual({ title: ["Add a title."] })
  })

  it("accepts the { errors } shape and single-string messages on 400", () => {
    const error = httpErrorFromResponse(response(400, { errors: { cursor: "Invalid cursor." } }), "r")
    expect(error.details?.fieldErrors).toEqual({ cursor: ["Invalid cursor."] })
  })

  it("does not attach fieldErrors to non-validation errors", () => {
    const error = httpErrorFromResponse(response(409, { code: "conflict", fieldErrors: { x: ["y"] } }), "r")
    expect(error.details?.fieldErrors).toBeUndefined()
  })

  it("reads Retry-After seconds and HTTP dates", () => {
    expect(httpErrorFromResponse(response(429, null, { "retry-after": "12" }), "r").details?.retryAfterSeconds).toBe(12)

    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-10-01T10:00:00Z"))
    const dated = httpErrorFromResponse(
      response(503, { code: "service_unavailable" }, { "retry-after": "Thu, 01 Oct 2026 10:00:30 GMT" }),
      "r",
    )
    expect(dated.code).toBe("service_unavailable")
    expect(dated.details?.retryAfterSeconds).toBe(30)
    expect(httpErrorFromResponse(response(429, null, { "retry-after": "soon" }), "r").details?.retryAfterSeconds).toBeUndefined()
  })

  it("marks transient codes retryable", () => {
    expect(httpErrorFromResponse(response(429), "r").retryable).toBe(true)
    expect(httpErrorFromResponse(response(502), "r").retryable).toBe(true)
    expect(httpErrorFromResponse(response(401), "r").retryable).toBe(false)
  })
})
