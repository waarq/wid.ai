import type {
  ActionItemListParams,
  AlertListParams,
  CalendarEventParams,
  DealListParams,
  IntegrationProvider,
  MeetingListParams,
  PlaylistListParams,
  SearchParams,
} from "@/types"

/*
 * Query-key factory. Keys are hierarchical so invalidation can target a whole
 * domain (`queryKeys.meetings.all`), every list (`.lists()`), or one entity.
 * Hooks, prefetchers and mutations must import keys from here; never inline
 * array literals.
 */

const auth = ["auth"] as const
const user = ["user"] as const
const onboarding = ["onboarding"] as const
const calendar = ["calendar"] as const
const meetings = ["meetings"] as const
const meetingLists = [...meetings, "list"] as const
const meetingDetails = [...meetings, "detail"] as const
const transcripts = ["transcripts"] as const
const actionItems = ["action-items"] as const
const actionItemLists = [...actionItems, "list"] as const
const search = ["search"] as const
const assistant = ["assistant"] as const
const playlist = ["playlist"] as const
const playlistLists = [...playlist, "list"] as const
const alerts = ["alerts"] as const
const alertLists = [...alerts, "list"] as const
const deals = ["deals"] as const
const dealLists = [...deals, "list"] as const
const integrations = ["integrations"] as const
const settings = ["settings"] as const

const meetingDetail = (meetingId: string) => [...meetingDetails, meetingId] as const
const transcriptDetail = (meetingId: string) => [...transcripts, meetingId] as const

export const queryKeys = {
  auth: {
    all: auth,
    session: () => [...auth, "session"] as const,
    googleAccounts: () => [...auth, "google-accounts"] as const,
  },

  user: {
    all: user,
    profile: () => [...user, "profile"] as const,
    members: () => [...user, "members"] as const,
  },

  onboarding: {
    all: onboarding,
    progress: () => [...onboarding, "progress"] as const,
  },

  calendar: {
    all: calendar,
    connection: () => [...calendar, "connection"] as const,
    events: (params: CalendarEventParams = {}) => [...calendar, "events", params] as const,
  },

  meetings: {
    all: meetings,
    lists: () => meetingLists,
    list: (params: MeetingListParams = {}) => [...meetingLists, params] as const,
    details: () => meetingDetails,
    detail: meetingDetail,
    processing: (meetingId: string) => [...meetingDetail(meetingId), "processing"] as const,
    share: (meetingId: string) => [...meetingDetail(meetingId), "share"] as const,
    decisions: (meetingId: string) => [...meetingDetail(meetingId), "decisions"] as const,
    followUp: (meetingId: string) => [...meetingDetail(meetingId), "follow-up"] as const,
    decisionHistory: (decisionId: string) => [...meetings, "decision-history", decisionId] as const,
  },

  transcripts: {
    all: transcripts,
    detail: transcriptDetail,
    search: (meetingId: string, query: string) =>
      [...transcriptDetail(meetingId), "search", query] as const,
  },

  actionItems: {
    all: actionItems,
    lists: () => actionItemLists,
    list: (params: ActionItemListParams = {}) => [...actionItemLists, params] as const,
    detail: (actionItemId: string) => [...actionItems, "detail", actionItemId] as const,
  },

  search: {
    all: search,
    results: (query: string, params: SearchParams = {}) => [...search, query, params] as const,
  },

  assistant: {
    all: assistant,
    suggestions: (meetingId: string) => [...assistant, meetingId, "suggestions"] as const,
    history: (meetingId: string) => [...assistant, meetingId, "history"] as const,
  },

  playlist: {
    all: playlist,
    lists: () => playlistLists,
    list: (params: PlaylistListParams = {}) => [...playlistLists, params] as const,
  },

  alerts: {
    all: alerts,
    lists: () => alertLists,
    list: (params: AlertListParams = {}) => [...alertLists, params] as const,
    unreadCount: () => [...alerts, "unread-count"] as const,
  },

  deals: {
    all: deals,
    lists: () => dealLists,
    list: (params: DealListParams = {}) => [...dealLists, params] as const,
    detail: (dealId: string) => [...deals, "detail", dealId] as const,
  },

  integrations: {
    all: integrations,
    list: () => [...integrations, "list"] as const,
    detail: (provider: IntegrationProvider) => [...integrations, "detail", provider] as const,
  },

  settings: {
    all: settings,
    detail: () => [...settings, "detail"] as const,
  },
} as const

export type QueryKeys = typeof queryKeys
