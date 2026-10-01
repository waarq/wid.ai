import type { ServiceFactories } from "../registry"

import { MockActionItemService } from "./action-item-service"
import { MockAlertService } from "./alert-service"
import { MockAssistantService, MockSearchService } from "./assistant-service"
import { MockAuthService } from "./auth-service"
import { MockCalendarService } from "./calendar-service"
import { MockCaptureService } from "./capture-service"
import { MockDealService } from "./deal-service"
import { MockIntegrationService } from "./integration-service"
import { MockMeetingService } from "./meeting-service"
import { MockOnboardingService } from "./onboarding-service"
import { MockPlaylistService } from "./playlist-service"
import { MockSettingsService } from "./settings-service"
import { MockTranscriptService } from "./transcript-service"
import { MockUserService } from "./user-service"

/*
 * Mock implementations. All share one MockDb (./db), so state is coherent
 * across services. UI code never imports this folder: it goes through
 * `services` from "@/services". Scripts/tests may import `mockControls`.
 */
export const mockServiceFactories: ServiceFactories = {
  auth: () => new MockAuthService(),
  user: () => new MockUserService(),
  onboarding: () => new MockOnboardingService(),
  calendar: () => new MockCalendarService(),
  meetings: () => new MockMeetingService(),
  capture: () => new MockCaptureService(),
  transcripts: () => new MockTranscriptService(),
  actionItems: () => new MockActionItemService(),
  search: () => new MockSearchService(),
  assistant: () => new MockAssistantService(),
  playlist: () => new MockPlaylistService(),
  alerts: () => new MockAlertService(),
  deals: () => new MockDealService(),
  integrations: () => new MockIntegrationService(),
  settings: () => new MockSettingsService(),
}

export { mockControls } from "./controls"
export type { MockControls } from "./controls"
export {
  MockActionItemService,
  MockAlertService,
  MockAssistantService,
  MockAuthService,
  MockCalendarService,
  MockCaptureService,
  MockDealService,
  MockIntegrationService,
  MockMeetingService,
  MockOnboardingService,
  MockPlaylistService,
  MockSearchService,
  MockSettingsService,
  MockTranscriptService,
  MockUserService,
}
export type { CaptureRecorder } from "./capture-service"
