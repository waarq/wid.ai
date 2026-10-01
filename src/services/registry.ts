import { AppException } from "@/lib/utils/errors"

import { mockServiceFactories } from "./mock"

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

export type ServiceName = keyof ServiceRegistry
export type ServiceMode = "mock" | "api"

/** Lazy constructors: a service is only instantiated the first time it is used. */
export type ServiceFactories = { [K in ServiceName]: () => ServiceRegistry[K] }

/**
 * SWITCH: NEXT_PUBLIC_USE_MOCKS=false uses the Api* services; anything else
 * (including unset) uses the Mock* services. Read literally so Next.js inlines it.
 *
 * Mock fixtures are loaded with a dynamic import on first use, so API mode
 * never downloads them.
 */
export const serviceMode: ServiceMode = process.env.NEXT_PUBLIC_USE_MOCKS === "false" ? "api" : "mock"

/**
 * Implementation slots, filled per mode. Each phase adds its factories here:
 *
 *   import { mockServiceFactories } from "./mock"
 *   import { apiServiceFactories } from "./api"
 *   const serviceFactories = { mock: mockServiceFactories, api: apiServiceFactories }
 *
 * `Partial` lets services land incrementally; once a mode is complete its slot
 * can be typed as the full `ServiceFactories`. Resolving a service that has no
 * factory in the active mode throws a `service_unavailable` AppError rather
 * than silently falling back to the other mode.
 */
const serviceFactories: Record<ServiceMode, Partial<ServiceFactories>> = {
  mock: mockServiceFactories,
  // Api* services land with the backend; until then every slot throws service_unavailable.
  api: {},
}

/** Builds a registry whose members are created on first access and then memoised. */
export function createServices(factories: Partial<ServiceFactories>, mode: ServiceMode): ServiceRegistry {
  const instances: Partial<ServiceRegistry> = {}

  function resolve<K extends ServiceName>(name: K): ServiceRegistry[K] {
    const existing = instances[name]
    if (existing) return existing

    const factory = factories[name]
    if (!factory) {
      throw new AppException("service_unavailable", {
        cause: new Error(`No ${mode} implementation registered for service "${name}".`),
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
export const services: ServiceRegistry = createServices(serviceFactories[serviceMode], serviceMode)
