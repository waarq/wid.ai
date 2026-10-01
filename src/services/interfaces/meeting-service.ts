import type {
  CreateMeetingInput,
  Decision,
  DecisionHistory,
  FollowUpEmail,
  GenerateFollowUpInput,
  ListResponse,
  Meeting,
  MeetingListParams,
  ProcessingProgress,
  ShareMeetingInput,
  ShareSettings,
  StartCaptureInput,
  StopCaptureInput,
  UpdateMeetingInput,
} from "@/types"

export interface MeetingService {
  list(params?: MeetingListParams): Promise<ListResponse<Meeting>>
  getById(id: string): Promise<Meeting>
  create(input: CreateMeetingInput): Promise<Meeting>
  update(id: string, input: UpdateMeetingInput): Promise<Meeting>
  delete(id: string): Promise<void>

  // Capture lifecycle (server-side record). Called by CaptureService, not by UI directly.
  /** Creates or attaches the meeting record in "capturing" state. Only ever user-initiated. */
  startCapture(input: StartCaptureInput): Promise<Meeting>
  /** Marks the record paused/resumed so other devices see the right state. */
  setCapturePaused(meetingId: string, paused: boolean): Promise<Meeting>
  /** Finalises the recording and moves the meeting into "processing". */
  stopCapture(meetingId: string, input: StopCaptureInput): Promise<Meeting>
  /** Step-by-step progress for the processing screen. Poll until ready/failed. */
  getProcessingStatus(meetingId: string): Promise<ProcessingProgress>
  /** Re-runs processing after a failure. */
  retryProcessing(meetingId: string): Promise<ProcessingProgress>

  // Sharing
  getShareSettings(meetingId: string): Promise<ShareSettings>
  share(meetingId: string, input: ShareMeetingInput): Promise<ShareSettings>
  unshare(meetingId: string, recipientId: string): Promise<ShareSettings>

  // Decisions
  listDecisions(meetingId: string): Promise<Decision[]>
  /** How a decision evolved across meetings ("Launch -> Oct 5 -> Oct 12 -> Oct 15"). */
  getDecisionHistory(decisionId: string): Promise<DecisionHistory>

  // Follow-up
  generateFollowUp(meetingId: string, input?: GenerateFollowUpInput): Promise<FollowUpEmail>
}
