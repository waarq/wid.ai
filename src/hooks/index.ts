/*
 * TanStack Query hooks: the only way UI reads or writes server data.
 * UI -> hook -> services.<name> -> Mock* | Api*.
 *
 * Named re-exports only (no `export *`), which keeps client-boundary
 * analysis simple for Next.js.
 */
export { useGoogleAccounts, useSession, useSignIn, useSignOut } from "./use-auth"
export { useProfile, useUpdateProfile, useUploadAvatar, useWorkspaceMembers } from "./use-profile"
export { useCompleteOnboarding, useOnboardingProgress, useSaveOnboardingStep } from "./use-onboarding"
export { useCalendar, useCalendarEvents, useConnectCalendar, useDisconnectCalendar } from "./use-calendar"
export {
  PROCESSING_POLL_MS,
  invalidateMeetingDependents,
  useCreateMeeting,
  useDecisionHistory,
  useDecisions,
  useDeleteMeeting,
  useFollowUp,
  useGenerateFollowUp,
  useInfiniteMeetings,
  useMeeting,
  useMeetings,
  useProcessingStatus,
  useRetryProcessing,
  useShareMeeting,
  useShareSettings,
  useUnshareMeeting,
  useUpdateMeeting,
} from "./use-meetings"
export { useTranscript, useTranscriptSearch } from "./use-transcript"
export { useActionItem, useActionItems, useDeleteAction, useToggleAction, useUpdateAction } from "./use-action-items"
export {
  SEARCH_GROUP_ORDER,
  SEARCH_MIN_LENGTH,
  groupSearchResults,
  useDebouncedValue,
  useSearch,
  type GroupedSearchResults,
} from "./use-search"
export { useAssistant, useAssistantHistory, useSuggestedQuestions } from "./use-assistant"
export {
  isOptimisticPlaylistItem,
  useAddToPlaylist,
  usePlaylist,
  useRemoveFromPlaylist,
  useUpdatePlaylistItem,
} from "./use-playlist"
export {
  useAlerts,
  useDismissAlert,
  useMarkAlertRead,
  useMarkAllAlertsRead,
  useUnreadAlertCount,
} from "./use-alerts"
export {
  useCreateDeal,
  useDeal,
  useDeals,
  useDeleteDeal,
  useLinkDealMeeting,
  useUnlinkDealMeeting,
  useUpdateDeal,
} from "./use-deals"
export {
  useConfigureIntegration,
  useConnectIntegration,
  useConnectZoom,
  useDisconnectIntegration,
  useIntegration,
  useIntegrations,
} from "./use-integrations"
export { useRevokeSession, useSettings, useUpdateSettings } from "./use-settings"
export { useCaptureController, useCaptureElapsedSeconds } from "./use-capture"
