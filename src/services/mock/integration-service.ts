import { AppException } from "@/lib/utils/errors"
import type { IntegrationService } from "@/services/interfaces"
import {
  CAPTURE_MODES,
  INTEGRATION_PROVIDERS,
  type Integration,
  type IntegrationOf,
  type IntegrationProvider,
  type IntegrationSettingsMap,
} from "@/types"

import type { MockDb } from "./db"
import { mockCall, mockWrite } from "./runtime"
import { nowIso } from "./utils"

/*
 * Integration connection state is the single source of truth for Google
 * Calendar and Zoom: MockCalendarService and onboarding progress read it.
 * The mock resolves connected immediately (no authorizationUrl).
 */

function assertProvider(provider: string): asserts provider is IntegrationProvider {
  if (!(INTEGRATION_PROVIDERS as readonly string[]).includes(provider)) {
    throw new AppException("not_found", { cause: new Error(`integration ${provider}`) })
  }
}

export function defaultSettings(db: MockDb, provider: IntegrationProvider): Integration["settings"] {
  switch (provider) {
    case "google":
      return {}
    case "google_calendar":
    case "microsoft_calendar":
      return { syncedCalendarIds: ["primary"], showDeclinedEvents: false }
    case "zoom":
      return { defaultCaptureMode: db.state.settings.capture.defaultCaptureMode }
    case "slack":
      return { channelId: null, postSummaries: false }
    case "hubspot":
    case "salesforce":
      return { syncDeals: false }
  }
}

/** Shared with MockCalendarService. */
export function connectOp(db: MockDb, provider: IntegrationProvider): Integration {
  const integration = db.integration(provider)
  if (integration.status === "coming_soon") {
    throw new AppException("service_unavailable", { message: "This integration is coming later." })
  }
  if (integration.status !== "connected") {
    Object.assign(integration, {
      status: "connected",
      accountLabel: db.state.user.email,
      connectedAt: nowIso(),
      settings: integration.settings ?? defaultSettings(db, provider),
    })
  }
  return integration
}

export function disconnectOp(db: MockDb, provider: IntegrationProvider): Integration {
  const integration = db.integration(provider)
  if (integration.status === "coming_soon") {
    throw new AppException("service_unavailable", { message: "This integration is coming later." })
  }
  if (provider === "google") {
    throw new AppException("forbidden", { message: "Google is how you sign in to WID, so it can't be disconnected." })
  }
  Object.assign(integration, { status: "disconnected", accountLabel: undefined, connectedAt: undefined, settings: null })
  return integration
}

function validateSettings(provider: IntegrationProvider, patch: Record<string, unknown>): void {
  const errors: Record<string, string[]> = {}
  if (provider === "zoom" && "defaultCaptureMode" in patch && !(CAPTURE_MODES as readonly unknown[]).includes(patch.defaultCaptureMode)) {
    errors.defaultCaptureMode = ["Choose a capture mode."]
  }
  if ("syncedCalendarIds" in patch && !(Array.isArray(patch.syncedCalendarIds) && patch.syncedCalendarIds.every((id) => typeof id === "string"))) {
    errors.syncedCalendarIds = ["Invalid calendars."]
  }
  for (const key of ["showDeclinedEvents", "postSummaries", "syncDeals"]) {
    if (key in patch && typeof patch[key] !== "boolean") errors[key] = ["Must be on or off."]
  }
  if (Object.keys(errors).length > 0) throw new AppException("validation_error", { details: { fieldErrors: errors } })
}

export class MockIntegrationService implements IntegrationService {
  list(): Promise<Integration[]> {
    return mockCall("integrations.list", (db) =>
      INTEGRATION_PROVIDERS.map((provider) => db.integration(provider)),
    )
  }

  get<P extends IntegrationProvider>(provider: P): Promise<IntegrationOf<P>> {
    return mockCall("integrations.get", (db) => {
      assertProvider(provider)
      return db.integration(provider) as IntegrationOf<P>
    })
  }

  connect<P extends IntegrationProvider>(provider: P): Promise<IntegrationOf<P>> {
    return mockWrite("integrations.connect", (db) => {
      assertProvider(provider)
      return connectOp(db, provider) as IntegrationOf<P>
    })
  }

  disconnect<P extends IntegrationProvider>(provider: P): Promise<IntegrationOf<P>> {
    return mockWrite("integrations.disconnect", (db) => {
      assertProvider(provider)
      return disconnectOp(db, provider) as IntegrationOf<P>
    })
  }

  configure<P extends IntegrationProvider>(
    provider: P,
    settings: Partial<IntegrationSettingsMap[P]>,
  ): Promise<IntegrationOf<P>> {
    return mockWrite("integrations.configure", (db) => {
      assertProvider(provider)
      const integration = db.integration(provider)
      if (integration.status !== "connected") {
        throw new AppException("conflict", { message: "Connect this integration before configuring it." })
      }
      const patch = (settings ?? {}) as Record<string, unknown>
      validateSettings(provider, patch)
      integration.settings = { ...(integration.settings ?? defaultSettings(db, provider)), ...patch } as never
      return integration as IntegrationOf<P>
    })
  }
}
