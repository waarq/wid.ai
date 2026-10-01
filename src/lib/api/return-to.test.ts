import { describe, expect, it } from "vitest"

import { buildReturnTo } from "./return-to"

describe("buildReturnTo", () => {
  it("keeps the path and unrelated query", () => {
    expect(buildReturnTo("https://app.test/settings?tab=integrations")).toBe("/settings?tab=integrations")
  })

  it("drops stale OAuth result params", () => {
    expect(buildReturnTo("https://app.test/onboarding?integration=zoom&result=error&reason=denied")).toBe("/onboarding")
  })

  it("never returns an absolute URL", () => {
    expect(buildReturnTo("https://evil.test//x")).toBe("//x")
  })
})
