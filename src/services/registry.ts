import { AppException } from "@/lib/utils/errors"

import { apiServiceFactories } from "./api"
import { mockServiceFactories } from "./mock"
import { SERVICE_NAMES, serviceModes, type ServiceMode, type ServiceModes, type ServiceName } from "./modes"

import type {
  ActionItemService,
  AlertService,
  AssistantService,
  AuthService,
  CalendarService,
  CaptureService,
  DealService,
  IntegrationService,
  MeetingService,
  OnboardingService,
  PlaylistService,
  SearchService,
  SettingsService,
  TranscriptService,
  UserService,
} from "./interfaces"

/**
 * The only object UI code (via hooks) talks to. Components never import a
 * Mock* or Api* class directly, so swapping implementations never touches UI.
 */
export interface ServiceRegistry {
  auth: AuthService
  user: UserService
  onboarding: OnboardingService
  calendar: CalendarService
  meetings: MeetingService
  capture: CaptureService
  transcripts: TranscriptService
  actionItems: ActionItemService
  search: SearchService
  assistant: AssistantService
  playlist: PlaylistService
  alerts: AlertService
  deals: DealService
  integrations: IntegrationService
  settings: SettingsService
}

export type { ServiceMode, ServiceModes, ServiceName } from "./modes"

// SERVICE_NAMES (modes.ts) must list exactly the registry keys.
type Exact<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never
const registryKeysMatch: Exact<ServiceName, keyof ServiceRegistry> = true
void registryKeysMatch

/** Lazy constructors: a service is only instantiated the first time it is used. */
export type ServiceFactories = { [K in ServiceName]: () => ServiceRegistry[K] }

/**
 * SWITCH (see services/modes.ts):
 *   NEXT_PUBLIC_USE_MOCKS=false   every service defaults to Api*; anything else
 *                                 (including unset) defaults to Mock*.
 *   NEXT_PUBLIC_API_SERVICES      comma list ("auth,user") or "*" selecting Api*
 *                                 per service while the rest keep the default.
 *                                 Mixing is ignored when NEXT_PUBLIC_APP_ENV=production.
 *
 * `serviceMode` is the default mode; `serviceModes` is the per-service result.
 * Mock fixtures are loaded with a dynamic import on first use, so API mode
 * never downloads them.
 */
export const serviceMode: ServiceMode = process.env.NEXT_PUBLIC_USE_MOCKS === "false" ? "api" : "mock"
export { serviceModes }

/**
 * Implementation slots. `Partial` lets Api* services land incrementally
 * (services/api/index.ts). Resolving a service that has no factory in its
 * selected mode throws a `service_unavailable` AppError rather than silently
 * falling back to the other mode.
 */
const serviceFactories: Record<ServiceMode, Partial<ServiceFactories>> = {
  mock: mockServiceFactories,
  api: apiServiceFactories,
}

/** Picks each service's factory from the slot its mode selects (missing stays missing). */
export function selectServiceFactories(
  modes: ServiceModes,
  slots: Record<ServiceMode, Partial<ServiceFactories>>,
): Partial<ServiceFactories> {
  const selected: Partial<ServiceFactories> = {}
  for (const name of SERVICE_NAMES) {
    const factory = slots[modes[name]][name]
    // Each slot is keyed by the same name, so the assignment is type-correct per key.
    if (factory) (selected as Record<ServiceName, unknown>)[name] = factory
  }
  return selected
}

/** Builds a registry whose members are created on first access and then memoised. */
export function createServices(
  factories: Partial<ServiceFactories>,
  mode: ServiceMode | ServiceModes,
): ServiceRegistry {
  const instances: Partial<ServiceRegistry> = {}

  function resolve<K extends ServiceName>(name: K): ServiceRegistry[K] {
    const existing = instances[name]
    if (existing) return existing

    const factory = factories[name]
    if (!factory) {
      throw new AppException("service_unavailable", {
        cause: new Error(
          `No ${typeof mode === "string" ? mode : mode[name]} implementation registered for service "${name}".`,
        ),
      })
    }

    const instance = factory()
    instances[name] = instance
    return instance
  }

  return {
    get auth() { return resolve("auth") },
    get user() { return resolve("user") },
    get onboarding() { return resolve("onboarding") },
    get calendar() { return resolve("calendar") },
    get meetings() { return resolve("meetings") },
    get capture() { return resolve("capture") },
    get transcripts() { return resolve("transcripts") },
    get actionItems() { return resolve("actionItems") },
    get search() { return resolve("search") },
    get assistant() { return resolve("assistant") },
    get playlist() { return resolve("playlist") },
    get alerts() { return resolve("alerts") },
    get deals() { return resolve("deals") },
    get integrations() { return resolve("integrations") },
    get settings() { return resolve("settings") },
  }
}

/** Application-wide service container. */
export const services: ServiceRegistry = createServices(
  selectServiceFactories(serviceModes, serviceFactories),
  serviceModes,
)
