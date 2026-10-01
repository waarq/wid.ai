/**
 * Fictional demo data for the WIT prototype. Only `services/mock` imports this
 * barrel; UI code reads data through hooks and services. Every date derives
 * from MOCK_NOW, so server and client renders always match.
 */
export { MOCK_NOW, MOCK_TIMEZONE, atDay, dateOnly, clock } from "./anchor"
export {
  people,
  personProfiles,
  users,
  currentUser,
  newUserBeforeOnboarding,
  googleAccounts,
  workspaceMembers,
  participantOf,
  personRefOf,
} from "./people"
export type { PersonProfile, PersonKey } from "./people"
export { tags, tagCatalog } from "./tags"
export {
  meetings,
  meetingsById,
  transcriptsByMeetingId,
  decisions,
  actionItems,
  questions,
  risks,
  keyMoments,
  meetingRef,
  meetingIdOf,
  meetingTypeTitles,
} from "./meetings"
export {
  meetingSeries,
  seriesIdByMeetingId,
  meetingsInSeries,
  launchDateHistory,
  decisionHistories,
  decisionHistoryByDecisionId,
} from "./series"
export type { MeetingSeries } from "./series"
export { deals } from "./deals"
export { playlistItems } from "./playlist"
export { alerts } from "./alerts"
export {
  calendarEvents,
  calendarConnection,
  calendarConnectionDisconnected,
  calendarConnectionStates,
} from "./calendar"
export { integrations, zoomDisconnected } from "./integrations"
export {
  settings,
  onboardingDefaults,
  onboardingProgressInitial,
  onboardingCompletedData,
} from "./settings"
export {
  suggestedQuestions,
  suggestedQuestionsByMeetingId,
  assistantAnswers,
  assistantNotFoundText,
} from "./assistant"
export { followUpTemplates, productPlanningFollowUp, clientDiscoveryFollowUp } from "./follow-up"
export { searchableCommands } from "./commands"
export { shareSettingsByMeetingId } from "./sharing"
export { assertMockIntegrity } from "./validate"
