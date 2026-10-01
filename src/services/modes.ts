/*
 * Per-service mock/api selection. Pure and dependency-free so `src/proxy.ts`
 * can import it without pulling any Mock* or Api* implementation into the
 * proxy bundle.
 *
 *   NEXT_PUBLIC_USE_MOCKS    "false" = api is the default mode; anything else = mock
 *   NEXT_PUBLIC_API_SERVICES comma list of registry keys ("auth,user") or "*"
 *   NEXT_PUBLIC_APP_ENV      "production" forbids mixing modes
 *
 * Rules:
 *   - A listed service uses Api*; an unlisted one uses the default mode.
 *   - "*" (or a list naming every service) means every service uses Api*.
 *   - Mixed mode (some mock, some api) is a dev convenience. When
 *     NEXT_PUBLIC_APP_ENV === "production" a partial list is ignored and every
 *     service follows NEXT_PUBLIC_USE_MOCKS, so production never silently
 *     falls back to mocks for some services (docs/backend/07-roadmap.md 2.1).
 *   - An api-mode service without an Api* implementation throws
 *     `service_unavailable` from the registry; it never falls back to a mock.
 */

export const SERVICE_NAMES = [
  "auth",
  "user",
  "onboarding",
  "calendar",
  "meetings",
  "capture",
  "transcripts",
  "actionItems",
  "search",
  "assistant",
  "playlist",
  "alerts",
  "deals",
  "integrations",
  "settings",
] as const

export type ServiceName = (typeof SERVICE_NAMES)[number]
export type ServiceMode = "mock" | "api"
export type ServiceModes = Record<ServiceName, ServiceMode>

const SERVICE_NAME_SET: ReadonlySet<string> = new Set<string>(SERVICE_NAMES)

export function isServiceName(value: string): value is ServiceName {
  return SERVICE_NAME_SET.has(value)
}

/** "*" or a comma list. Unknown names are dropped (they would otherwise be silent typos). */
export function parseApiServiceList(raw: string | undefined | null): ReadonlySet<ServiceName> {
  const entries = (raw ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
  if (entries.includes("*")) return new Set(SERVICE_NAMES)
  return new Set(entries.filter(isServiceName))
}

export interface ServiceModeEnv {
  useMocks?: string
  apiServices?: string
  appEnv?: string
}

export function resolveServiceModes(env: ServiceModeEnv): ServiceModes {
  const defaultMode: ServiceMode = env.useMocks === "false" ? "api" : "mock"
  const listed = parseApiServiceList(env.apiServices)
  const covers = listed.size === SERVICE_NAMES.length
  const mixingAllowed = env.appEnv !== "production"

  const modes = {} as ServiceModes
  for (const name of SERVICE_NAMES) {
    if (covers) modes[name] = "api"
    else if (mixingAllowed && listed.has(name)) modes[name] = "api"
    else modes[name] = defaultMode
  }
  return modes
}

/** Read literally so Next.js inlines each value at build time. */
export const serviceModes: ServiceModes = resolveServiceModes({
  useMocks: process.env.NEXT_PUBLIC_USE_MOCKS,
  apiServices: process.env.NEXT_PUBLIC_API_SERVICES,
  appEnv: process.env.NEXT_PUBLIC_APP_ENV,
})

/** True when real Supabase auth is active (Api auth service). */
export const isRealAuth: boolean = serviceModes.auth === "api"
