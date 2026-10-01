import { describe, expect, it } from "vitest"

import { isAppError } from "@/lib/utils/errors"

import { SERVICE_NAMES, parseApiServiceList, resolveServiceModes, type ServiceName } from "./modes"
import { createServices, selectServiceFactories, type ServiceFactories } from "./registry"

function apiNames(modes: Record<ServiceName, string>): ServiceName[] {
  return SERVICE_NAMES.filter((name) => modes[name] === "api")
}

describe("parseApiServiceList", () => {
  it("parses a trimmed comma list and drops unknown names", () => {
    expect([...parseApiServiceList(" auth, user ,,nope,Auth")]).toEqual(["auth", "user"])
    expect(parseApiServiceList(undefined).size).toBe(0)
    expect(parseApiServiceList("").size).toBe(0)
  })

  it("treats * as every service", () => {
    expect(parseApiServiceList("*").size).toBe(SERVICE_NAMES.length)
  })
})

describe("resolveServiceModes", () => {
  it("is all mock by default (USE_MOCKS unset or true)", () => {
    expect(apiNames(resolveServiceModes({}))).toEqual([])
    expect(apiNames(resolveServiceModes({ useMocks: "true" }))).toEqual([])
  })

  it("is all api when USE_MOCKS=false, whatever the list says", () => {
    expect(apiNames(resolveServiceModes({ useMocks: "false" }))).toEqual([...SERVICE_NAMES])
    expect(apiNames(resolveServiceModes({ useMocks: "false", apiServices: "auth" }))).toEqual([...SERVICE_NAMES])
  })

  it("selects listed services for api while the rest stay mock (mixed mode)", () => {
    expect(apiNames(resolveServiceModes({ apiServices: "auth,user" }))).toEqual(["auth", "user"])
    expect(apiNames(resolveServiceModes({ apiServices: "auth", appEnv: "staging" }))).toEqual(["auth"])
  })

  it("never mixes in production: a partial list is ignored", () => {
    expect(apiNames(resolveServiceModes({ apiServices: "auth", appEnv: "production" }))).toEqual([])
    expect(apiNames(resolveServiceModes({ useMocks: "false", apiServices: "auth", appEnv: "production" }))).toEqual([
      ...SERVICE_NAMES,
    ])
  })

  it("honours a complete list or * everywhere, including production", () => {
    expect(apiNames(resolveServiceModes({ apiServices: "*", appEnv: "production" }))).toEqual([...SERVICE_NAMES])
    expect(apiNames(resolveServiceModes({ apiServices: SERVICE_NAMES.join(","), appEnv: "production" }))).toEqual([
      ...SERVICE_NAMES,
    ])
  })
})

describe("selectServiceFactories + createServices", () => {
  const mockAuth = { kind: "mock-auth" }
  const apiAuth = { kind: "api-auth" }
  const mockUser = { kind: "mock-user" }
  const slots = {
    mock: { auth: () => mockAuth, user: () => mockUser } as unknown as Partial<ServiceFactories>,
    api: { auth: () => apiAuth } as unknown as Partial<ServiceFactories>,
  }

  it("resolves each service from the slot its mode selects", () => {
    const modes = resolveServiceModes({ apiServices: "auth" })
    const services = createServices(selectServiceFactories(modes, slots), modes)
    expect(services.auth).toBe(apiAuth)
    expect(services.user).toBe(mockUser)
  })

  it("throws service_unavailable for an api service with no Api* implementation (no mock fallback)", () => {
    const modes = resolveServiceModes({ apiServices: "auth,user" })
    const services = createServices(selectServiceFactories(modes, slots), modes)
    let thrown: unknown
    try {
      void services.user
    } catch (error) {
      thrown = error
    }
    expect(isAppError(thrown) && thrown.code).toBe("service_unavailable")
  })

  it("keeps the single-mode signature working", () => {
    const services = createServices(slots.mock, "mock")
    expect(services.auth).toBe(mockAuth)
  })
})
