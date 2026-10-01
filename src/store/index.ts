/*
 * Zustand stores: UI/client state only. Server data lives in TanStack Query.
 * Persisted stores use `skipHydration` and are rehydrated by AppProviders on
 * mount; gate on `useStoreHydration(store)` where defaults must not flash.
 */
export { useUIStore } from "./ui-store"
export { useStoreHydration } from "./hydration"
export { rehydratePersistedStores } from "./persisted"
export {
  getCaptureStateSnapshot,
  selectCaptureError,
  selectCaptureMeetingId,
  selectCaptureSession,
  selectCaptureStatus,
  selectCaptureTitle,
  selectIsCaptureActive,
  selectIsRecording,
  sanitizeCaptureSession,
  useCaptureStore,
  type CaptureStoreState,
} from "./capture-store"
export {
  INITIAL_CAPTURE_SESSION,
  canTransition,
  formatCaptureClock,
  getElapsedMs,
  getElapsedSeconds,
  isActiveCaptureStatus,
  isProcessingCaptureStatus,
  isRecordingStatus,
  toCaptureState,
  transition,
  type CaptureEvent,
  type CaptureSession,
  type ProcessingCaptureStatus,
} from "./capture-machine"
export {
  ONBOARDING_DRAFT_DEFAULTS,
  ONBOARDING_STEP_COUNT,
  ONBOARDING_STORE_VERSION,
  getMissingOnboardingFields,
  getNextStep,
  getPreviousStep,
  getStepIndex,
  isOnboardingStep,
  sanitizeDraft,
  selectCanGoBack,
  selectIsLastStep,
  selectOnboardingData,
  selectOnboardingStep,
  selectOnboardingStepIndex,
  toOnboardingData,
  useOnboardingStore,
  type OnboardingDraft,
  type OnboardingStoreState,
} from "./onboarding-store"
export {
  PLAYBACK_RATES,
  selectDealsView,
  selectIsBriefSectionCollapsed,
  selectMeetingsView,
  selectPlaybackRate,
  selectTeamCallsView,
  selectTranscriptAutoScroll,
  selectVolume,
  usePreferencesStore,
  type CollectionView,
  type DealsView,
  type PlaybackRate,
  type PreferencesState,
} from "./preferences-store"
