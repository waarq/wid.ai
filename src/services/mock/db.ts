import { differenceInCalendarDays } from "date-fns"

import { readClientSessionStage } from "@/lib/auth/client-session"
import { AppException } from "@/lib/utils/errors"
import type * as MockDataModule from "@/mock-data"
import type { PersonProfile } from "@/mock-data"
import type { CaptureSession } from "@/store/capture-machine"
import type {
  ActionItem,
  Alert,
  AuthStage,
  CalendarEvent,
  CommandSearchResult,
  Deal,
  DecisionHistory,
  FollowUpEmail,
  GoogleAccountOption,
  Integration,
  IntegrationProvider,
  Meeting,
  MeetingAnswer,
  MeetingStats,
  MeetingSummary,
  OnboardingProgress,
  Participant,
  ParticipantRole,
  PlaylistItem,
  ProcessingProgress,
  ProcessingStep,
  Settings,
  ShareLink,
  ShareRecipient,
  SuggestedQuestion,
  Tag,
  Transcript,
  User,
  WorkspaceMember,
} from "@/types"

import { mockControls } from "./controls"
import { createId, nowIso } from "./utils"

/*
 * MockDb: one mutable, coherent copy of the demo world shared by every mock
 * service. Seeded lazily from src/mock-data (dynamically imported, so API
 * mode never downloads fixtures) and snapshotted to sessionStorage after
 * writes so a refresh keeps the demo state.
 *
 * Dates: fixtures are anchored at MOCK_NOW. On seed, every ISO timestamp is
 * shifted so MOCK_NOW lands on the real current time (rounded to 5 minutes)
 * and every ISO date shifts by the matching number of calendar days. "Today",
 * "20 minutes ago" and "due tomorrow" therefore stay true whenever the demo
 * runs. Disabled when NODE_ENV is "test".
 */

type MockData = typeof MockDataModule

const SCHEMA_VERSION = 1
const SNAPSHOT_KEY = "wid-mock-db"
const FIVE_MINUTES = 5 * 60_000
const SESSION_TTL_MS = 7 * 24 * 60 * 60_000
/** Statuses that count towards "N actions" on cards and in stats. */
const OPEN_ACTION_STATUSES = new Set(["open", "in_progress"])

/* ---------- state ---------- */

export interface ProcessingPlan {
  startedAtMs: number
  phaseMs: number
  fail: boolean
  /** Revealed when processing reaches "ready". */
  summary: MeetingSummary | null
  transcript: Transcript | null
}

export interface ShareState {
  invited: ShareRecipient[]
  /** Participant person ids the owner removed from an attendee share. */
  removedPersonIds: string[]
  link: ShareLink | null
}

export interface CaptureRecord {
  session: CaptureSession
  /** True when the capture created the meeting (discard deletes it). */
  createdMeeting: boolean
}

export interface MockState {
  user: User
  /** Email of the Google account chosen at sign-in. */
  accountEmail: string
  sessionExpiresAt: string | null
  meetings: Meeting[]
  transcripts: Record<string, Transcript>
  plans: Record<string, ProcessingPlan>
  share: Record<string, ShareState>
  playlist: PlaylistItem[]
  alerts: Alert[]
  deals: Deal[]
  calendarEvents: CalendarEvent[]
  integrations: Integration[]
  settings: Settings
  onboarding: OnboardingProgress
  assistantHistory: Record<string, MeetingAnswer[]>
  capture: CaptureRecord | null
}

/** Read-only reference data (never mutated, never snapshotted). */
export interface MockStatic {
  people: PersonProfile[]
  members: WorkspaceMember[]
  googleAccounts: GoogleAccountOption[]
  tags: Tag[]
  commands: CommandSearchResult[]
  suggestedQuestions: SuggestedQuestion[]
  suggestedQuestionsByMeetingId: Record<string, SuggestedQuestion[]>
  followUpTemplates: Record<string, FollowUpEmail>
  decisionHistoryByDecisionId: Record<string, DecisionHistory>
  notFoundText: string
  demoUser: User
  newUser: User
  initialOnboarding: OnboardingProgress
  /** Integrations as seeded for the onboarded demo account. */
  seedIntegrations: Integration[]
  /** person id of the signed-in user (stable across profile edits). */
  mePersonId: string
}

interface Seed {
  state: MockState
  statics: MockStatic
  key: string
}

/* ---------- date rebasing ---------- */

const ISO_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/

interface Shift {
  ms: number
  days: number
}

function computeShift(anchorIso: string): Shift {
  if (process.env.NODE_ENV === "test") return { ms: 0, days: 0 }
  const anchor = Date.parse(anchorIso)
  const ms = Math.round((Date.now() - anchor) / FIVE_MINUTES) * FIVE_MINUTES
  const days = differenceInCalendarDays(new Date(), new Date(anchor))
  return { ms, days }
}

function shiftValue(value: string, shift: Shift): string {
  if (ISO_DATETIME.test(value)) return new Date(Date.parse(value) + shift.ms).toISOString()
  const date = ISO_DATE.exec(value)
  if (date) {
    const utc = Date.UTC(Number(date[1]), Number(date[2]) - 1, Number(date[3]) + shift.days)
    return new Date(utc).toISOString().slice(0, 10)
  }
  return value
}

function rebase<T>(value: T, shift: Shift): T {
  if (shift.ms === 0 && shift.days === 0) return value
  const walk = (node: unknown): unknown => {
    if (typeof node === "string") return shiftValue(node, shift)
    if (Array.isArray(node)) return node.map(walk)
    if (node && typeof node === "object") {
      const out: Record<string, unknown> = {}
      for (const [key, child] of Object.entries(node)) out[key] = walk(child)
      return out
    }
    return node
  }
  return walk(value) as T
}

/* ---------- seeding ---------- */

function hash(input: string): string {
  let h = 5381
  for (let i = 0; i < input.length; i++) h = ((h << 5) + h + input.charCodeAt(i)) | 0
  return (h >>> 0).toString(36)
}

function buildSeed(data: MockData): Seed {
  const shift = computeShift(data.MOCK_NOW)
  const raw = structuredClone({
    meetings: data.meetings,
    transcripts: data.transcriptsByMeetingId,
    playlist: data.playlistItems,
    alerts: data.alerts,
    deals: data.deals,
    calendarEvents: data.calendarEvents,
    integrations: data.integrations,
    settings: data.settings,
    onboarding: data.onboardingProgressInitial,
    followUpTemplates: data.followUpTemplates,
    decisionHistoryByDecisionId: data.decisionHistoryByDecisionId,
    demoUser: data.currentUser,
    newUser: data.newUserBeforeOnboarding,
  })
  const seed = rebase(raw, shift)

  const share: Record<string, ShareState> = {}
  for (const meeting of seed.meetings) share[meeting.id] = { invited: [], removedPersonIds: [], link: null }

  const mePerson = data.people.find((p) => p.userId === data.currentUser.id)
  const statics: MockStatic = {
    people: data.people,
    members: data.workspaceMembers,
    googleAccounts: data.googleAccounts,
    tags: data.tags,
    commands: data.searchableCommands,
    suggestedQuestions: data.suggestedQuestions,
    suggestedQuestionsByMeetingId: data.suggestedQuestionsByMeetingId,
    followUpTemplates: seed.followUpTemplates,
    decisionHistoryByDecisionId: seed.decisionHistoryByDecisionId,
    notFoundText: data.assistantNotFoundText,
    demoUser: seed.demoUser,
    newUser: seed.newUser,
    initialOnboarding: seed.onboarding,
    seedIntegrations: seed.integrations,
    mePersonId: mePerson?.id ?? `per_${data.currentUser.id}`,
  }

  const state: MockState = {
    user: structuredClone(seed.demoUser),
    accountEmail: seed.demoUser.email,
    sessionExpiresAt: null,
    meetings: seed.meetings,
    transcripts: seed.transcripts,
    plans: {},
    share,
    playlist: seed.playlist,
    alerts: seed.alerts,
    deals: seed.deals,
    calendarEvents: seed.calendarEvents,
    integrations: seed.integrations,
    settings: seed.settings,
    onboarding: { ...seed.onboarding, completed: true, currentStep: "zoom" },
    assistantHistory: {},
    capture: null,
  }

  const signature = [
    SCHEMA_VERSION,
    data.MOCK_NOW,
    shift.days,
    data.meetings.map((m) => `${m.id}:${m.status}:${m.summary?.actionItems.length ?? 0}`).join(","),
    Object.values(data.transcriptsByMeetingId).reduce((n, t) => n + t.segments.length, 0),
    data.alerts.length,
    data.deals.length,
    data.playlistItems.length,
  ].join("|")

  return { state, statics, key: hash(signature) }
}

/* ---------- snapshot persistence ---------- */

function readSnapshot(key: string): MockState | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.sessionStorage.getItem(SNAPSHOT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { key?: string; state?: MockState }
    return parsed.key === key && parsed.state ? parsed.state : null
  } catch {
    return null
  }
}

function writeSnapshot(key: string, state: MockState): void {
  if (typeof window === "undefined") return
  try {
    window.sessionStorage.setItem(SNAPSHOT_KEY, JSON.stringify({ key, state }))
  } catch {
    // Quota or blocked storage: the demo simply will not survive a refresh.
  }
}

function clearSnapshot(): void {
  if (typeof window === "undefined") return
  try {
    window.sessionStorage.removeItem(SNAPSHOT_KEY)
  } catch {
    // Ignore.
  }
}

/* ---------- processing steps ---------- */

const STEP_IDS: ProcessingStep["id"][] = ["upload", "transcribe", "understand", "extract_decisions", "extract_actions"]

function stepsFor(phase: "processing" | "transcribing" | "understanding" | "ready" | "failed"): ProcessingStep[] {
  const statusAt = (index: number): ProcessingStep["status"] => {
    switch (phase) {
      case "processing":
        return index === 0 ? "active" : "pending"
      case "transcribing":
        return index === 0 ? "complete" : index === 1 ? "active" : "pending"
      case "understanding":
        return index <= 1 ? "complete" : index === 2 ? "active" : "pending"
      case "ready":
        return "complete"
      case "failed":
        return index === 0 ? "complete" : index === 1 ? "failed" : "pending"
    }
  }
  return STEP_IDS.map((id, index) => ({ id, status: statusAt(index) }))
}

export function computeStats(summary: MeetingSummary): MeetingStats {
  return {
    decisions: summary.decisions.length,
    actionItems: summary.actionItems.filter((a) => OPEN_ACTION_STATUSES.has(a.status)).length,
    openQuestions: summary.questions.filter((q) => q.status === "open").length,
    risks: summary.risks.length,
  }
}

/* ---------- the database ---------- */

export class MockDb {
  state: MockState
  readonly statics: MockStatic
  private readonly seedKey: string
  private readonly data: MockData
  private saveTimer: ReturnType<typeof setTimeout> | null = null

  private constructor(data: MockData) {
    this.data = data
    const seed = buildSeed(data)
    this.statics = seed.statics
    this.seedKey = seed.key
    this.state = readSnapshot(seed.key) ?? seed.state
    this.syncSessionFromCookie()
  }

  static create(data: MockData): MockDb {
    const db = new MockDb(data)
    mockControls.onReset(() => db.reset())
    if (typeof window !== "undefined") {
      window.__WID_MOCK__ = mockControls
      window.addEventListener("pagehide", () => db.flush())
    }
    return db
  }

  /* ----- persistence ----- */

  save(): void {
    if (typeof window === "undefined") return
    if (this.saveTimer) clearTimeout(this.saveTimer)
    this.saveTimer = setTimeout(() => this.flush(), 120)
  }

  flush(): void {
    if (this.saveTimer) clearTimeout(this.saveTimer)
    this.saveTimer = null
    writeSnapshot(this.seedKey, this.state)
  }

  /** Back to seed data, keeping who is signed in. */
  reset(): void {
    const { user, accountEmail, sessionExpiresAt, onboarding } = this.state
    clearSnapshot()
    const seed = buildSeed(this.data)
    this.state = { ...seed.state, user, accountEmail, sessionExpiresAt, onboarding }
    this.flush()
  }

  /* ----- session ----- */

  /** The hint cookie decides signed-in state (it is what proxy.ts routes on). */
  get stage(): AuthStage {
    return readClientSessionStage()
  }

  private syncSessionFromCookie(): void {
    const stage = this.stage
    if (stage === "unauthenticated") return
    // A cookie without matching DB state (new tab, cleared storage): trust the cookie.
    if (stage === "ready" && !this.state.user.onboardingCompleted) {
      this.state.user = { ...this.state.user, onboardingCompleted: true }
    }
    if (stage === "onboarding" && this.state.user.onboardingCompleted) {
      this.state.user = { ...this.state.user, onboardingCompleted: false }
      this.state.onboarding = { ...this.state.onboarding, completed: false }
    }
    this.state.sessionExpiresAt ??= new Date(Date.now() + SESSION_TTL_MS).toISOString()
  }

  newSessionExpiry(): string {
    return new Date(Date.now() + SESSION_TTL_MS).toISOString()
  }

  requireSignedIn(): void {
    if (this.stage === "unauthenticated") throw new AppException("unauthorized")
  }

  /* ----- identity ----- */

  get me(): { userId: string; personId: string; email: string; name: string } {
    const { user } = this.state
    return {
      userId: user.id,
      personId: this.statics.mePersonId,
      email: user.email,
      name: `${user.firstName} ${user.lastName}`.trim(),
    }
  }

  personByEmail(email: string | undefined): PersonProfile | undefined {
    if (!email) return undefined
    const needle = email.toLowerCase()
    return this.statics.people.find((p) => p.email.toLowerCase() === needle)
  }

  personById(id: string): PersonProfile | undefined {
    return this.statics.people.find((p) => p.id === id || p.userId === id)
  }

  /** Participant record for the signed-in user. */
  meAsParticipant(role: ParticipantRole = "host"): Participant {
    const me = this.me
    return {
      id: me.personId,
      name: me.name,
      email: me.email,
      role,
      isExternal: false,
      userId: me.userId,
    }
  }

  /** Maps a contact to a known person (by email) or a new guest participant. */
  participantFrom(
    contact: { name: string; email?: string; isExternal?: boolean; company?: string },
    role: ParticipantRole = "attendee",
  ): Participant {
    if (contact.email && contact.email.toLowerCase() === this.me.email.toLowerCase()) return this.meAsParticipant(role)
    const person = this.personByEmail(contact.email)
    if (person) {
      if (person.id === this.me.personId) return this.meAsParticipant(role)
      return {
        id: person.id,
        name: person.name,
        email: person.email,
        role: person.isExternal && role === "attendee" ? "guest" : role,
        isExternal: person.isExternal,
        company: person.isExternal ? person.company : undefined,
        userId: person.userId,
      }
    }
    const isExternal = contact.isExternal ?? true
    return {
      id: `per_${createId("guest").slice(6)}`,
      name: contact.name.trim() || contact.email || "Guest",
      email: contact.email,
      role: isExternal ? "guest" : role,
      isExternal,
      company: contact.company,
    }
  }

  /* ----- meetings & access ----- */

  findMeeting(id: string): Meeting | undefined {
    return this.state.meetings.find((m) => m.id === id)
  }

  isOwner(meeting: Meeting): boolean {
    return meeting.owner.id === this.me.personId || meeting.owner.id === this.me.userId
  }

  isParticipant(meeting: Meeting): boolean {
    const { personId, userId } = this.me
    return meeting.participants.some((p) => p.id === personId || p.userId === userId)
  }

  /** Shared with the user personally: seeded `sharedWithMe` or an invite to their email. */
  isExplicitlyShared(meeting: Meeting): boolean {
    if (this.isOwner(meeting)) return false
    const share = this.state.share[meeting.id]
    const email = this.me.email.toLowerCase()
    const invited = share?.invited.some((r) => r.email.toLowerCase() === email) ?? false
    const removed = share?.removedPersonIds.includes(this.me.personId) ?? false
    return !removed && (meeting.sharedWithMe || invited)
  }

  canAccess(meeting: Meeting): boolean {
    if (this.isOwner(meeting)) return true
    if (this.isExplicitlyShared(meeting)) return true
    if (meeting.visibility === "team") return true
    if (meeting.visibility === "attendees") {
      const removed = this.state.share[meeting.id]?.removedPersonIds.includes(this.me.personId) ?? false
      return this.isParticipant(meeting) && !removed
    }
    return false
  }

  /** Accessible meeting or not_found (existence is not leaked). */
  requireMeeting(id: string): Meeting {
    const meeting = this.findMeeting(id)
    if (!meeting || !this.canAccess(meeting)) {
      throw new AppException("not_found", { cause: new Error(`meeting ${id}`) })
    }
    this.refreshProcessing(meeting)
    return meeting
  }

  requireOwnedMeeting(id: string): Meeting {
    const meeting = this.requireMeeting(id)
    if (!this.isOwner(meeting)) {
      throw new AppException("forbidden", { message: "Only the meeting owner can change this." })
    }
    return meeting
  }

  accessibleMeetings(): Meeting[] {
    return this.state.meetings.filter((m) => {
      if (!this.canAccess(m)) return false
      this.refreshProcessing(m)
      return true
    })
  }

  /** Outgoing copy with viewer-relative and derived fields filled in. */
  present(meeting: Meeting): Meeting {
    this.refreshProcessing(meeting)
    const out: Meeting = structuredClone(meeting)
    out.sharedWithMe = !this.isOwner(meeting) && this.canAccess(meeting)
    if (out.summary) out.stats = computeStats(out.summary)
    return out
  }

  touchMeeting(meeting: Meeting): void {
    meeting.updatedAt = nowIso()
  }

  /** Keeps embedded MeetingRefs in sync after a rename. */
  renameMeetingRefs(meetingId: string, title: string): void {
    const fix = (ref: { id: string; title: string } | undefined) => {
      if (ref && ref.id === meetingId) ref.title = title
    }
    for (const meeting of this.state.meetings) meeting.summary?.actionItems.forEach((a) => fix(a.meeting))
    this.state.playlist.forEach((p) => fix(p.meeting))
    this.state.alerts.forEach((a) => fix(a.meeting))
    this.state.deals.forEach((d) => d.meetings.forEach(fix))
  }

  /* ----- processing (time-driven) ----- */

  /**
   * Advances a meeting created by capture through
   * processing -> transcribing -> understanding -> ready (or failed), based
   * only on time since it was stopped. Navigation, remounts and refreshes
   * cannot stall it. Seeded meetings without a plan keep their status.
   */
  refreshProcessing(meeting: Meeting): void {
    const plan = this.state.plans[meeting.id]
    if (!plan) return
    const elapsed = Date.now() - plan.startedAtMs
    const { phaseMs } = plan
    const startedAt = new Date(plan.startedAtMs).toISOString()

    if (plan.fail && elapsed >= phaseMs * 1.5) {
      this.finishProcessing(meeting, plan, "failed")
      return
    }
    if (elapsed >= phaseMs * 3) {
      this.finishProcessing(meeting, plan, "ready")
      return
    }
    const phase = elapsed < phaseMs ? "processing" : elapsed < phaseMs * 2 ? "transcribing" : "understanding"
    if (meeting.status !== phase) {
      meeting.status = phase
      meeting.processing = { meetingId: meeting.id, status: phase, steps: stepsFor(phase), startedAt }
      this.save()
    }
  }

  private finishProcessing(meeting: Meeting, plan: ProcessingPlan, outcome: "ready" | "failed"): void {
    const completedAt = new Date(
      plan.startedAtMs + (outcome === "ready" ? plan.phaseMs * 3 : plan.phaseMs * 1.5),
    ).toISOString()
    const startedAt = new Date(plan.startedAtMs).toISOString()
    delete this.state.plans[meeting.id]

    if (outcome === "ready" && plan.summary && plan.transcript) {
      meeting.status = "ready"
      meeting.summary = plan.summary
      meeting.stats = computeStats(plan.summary)
      meeting.processing = {
        meetingId: meeting.id,
        status: "ready",
        steps: stepsFor("ready"),
        startedAt,
        completedAt,
      }
      this.state.transcripts[meeting.id] = plan.transcript
      if (this.state.settings.notifications.processingCompleted) {
        this.addAlert({
          type: "meeting_ready",
          title: "Meeting ready",
          body: `Your ${meeting.title} meeting is ready.`,
          target: { kind: "meeting", meetingId: meeting.id },
          meeting: { id: meeting.id, title: meeting.title, startedAt: meeting.startedAt },
          createdAt: completedAt,
        })
      }
    } else {
      meeting.status = "failed"
      meeting.summary = undefined
      meeting.stats = undefined
      meeting.processing = {
        meetingId: meeting.id,
        status: "failed",
        steps: stepsFor("failed"),
        startedAt,
        error: new AppException("processing_failed", {
          message: "We couldn't transcribe this recording. The audio was uploaded safely, so you can try again.",
          retryable: true,
        }).toJSON(),
      }
      this.state.transcripts[meeting.id] = {
        meetingId: meeting.id,
        status: "failed",
        language: "en",
        duration: meeting.duration,
        segments: [],
      }
      this.addAlert({
        type: "processing_failed",
        title: "Processing failed",
        body: `We couldn't transcribe ${meeting.title}. Your recording is safe, and you can try again.`,
        target: { kind: "meeting", meetingId: meeting.id },
        meeting: { id: meeting.id, title: meeting.title, startedAt: meeting.startedAt },
        createdAt: completedAt,
      })
    }
    meeting.updatedAt = completedAt
    this.save()
  }

  /** Progress for any meeting, including seeded ones without a plan. */
  processingFor(meeting: Meeting): ProcessingProgress {
    this.refreshProcessing(meeting)
    if (meeting.processing) return meeting.processing
    const startedAt = meeting.endedAt ?? meeting.startedAt
    if (meeting.status === "ready") {
      return { meetingId: meeting.id, status: "ready", steps: stepsFor("ready"), startedAt, completedAt: meeting.updatedAt }
    }
    if (meeting.status === "failed") {
      return { meetingId: meeting.id, status: "failed", steps: stepsFor("failed"), startedAt }
    }
    if (meeting.status === "processing" || meeting.status === "transcribing" || meeting.status === "understanding") {
      return { meetingId: meeting.id, status: meeting.status, steps: stepsFor(meeting.status), startedAt }
    }
    throw new AppException("conflict", { message: "This meeting hasn't been captured yet." })
  }

  startProcessing(meeting: Meeting, plan: Omit<ProcessingPlan, "startedAtMs" | "phaseMs">): void {
    const startedAtMs = Date.now()
    this.state.plans[meeting.id] = { ...plan, startedAtMs, phaseMs: mockControls.getProcessingPhaseMs() }
    meeting.status = "processing"
    meeting.summary = undefined
    meeting.stats = undefined
    meeting.processing = {
      meetingId: meeting.id,
      status: "processing",
      steps: stepsFor("processing"),
      startedAt: new Date(startedAtMs).toISOString(),
    }
    this.state.transcripts[meeting.id] = {
      meetingId: meeting.id,
      status: "pending",
      language: "en",
      duration: meeting.duration,
      segments: [],
    }
    this.refreshProcessing(meeting)
  }

  /* ----- action items ----- */

  /** Every action item in accessible meetings, with its meeting. */
  actionEntries(): Array<{ item: ActionItem; meeting: Meeting }> {
    return this.accessibleMeetings().flatMap((meeting) =>
      (meeting.summary?.actionItems ?? []).map((item) => ({ item, meeting })),
    )
  }

  requireAction(id: string): { item: ActionItem; meeting: Meeting } {
    const entry = this.actionEntries().find((e) => e.item.id === id)
    if (!entry) throw new AppException("not_found", { cause: new Error(`action ${id}`) })
    return entry
  }

  /* ----- alerts ----- */

  addAlert(alert: Omit<Alert, "id" | "readAt" | "createdAt"> & { createdAt?: string }): Alert {
    const created: Alert = { ...alert, id: createId("alert"), readAt: null, createdAt: alert.createdAt ?? nowIso() }
    this.state.alerts.unshift(created)
    return created
  }

  /* ----- integrations ----- */

  integration(provider: IntegrationProvider): Integration {
    const found = this.state.integrations.find((i) => i.provider === provider)
    if (!found) throw new AppException("not_found", { cause: new Error(`integration ${provider}`) })
    return found
  }

  isConnected(provider: IntegrationProvider): boolean {
    return this.state.integrations.some((i) => i.provider === provider && i.status === "connected")
  }

  /* ----- workspace ----- */

  members(): WorkspaceMember[] {
    const me = this.me
    return this.statics.members.map((m) =>
      m.id === me.personId ? { ...m, name: me.name, email: me.email, isCurrentUser: true } : { ...m, isCurrentUser: false },
    )
  }

  teamOf(personId: string): string | undefined {
    return this.statics.members.find((m) => m.id === personId)?.team ?? this.personById(personId)?.team
  }
}

/* ---------- singleton ---------- */

let dbPromise: Promise<MockDb> | null = null

/** Lazily loads fixtures (separate chunk) and builds the shared database. */
export function getMockDb(): Promise<MockDb> {
  dbPromise ??= import("@/mock-data")
    .then((data) => MockDb.create(data))
    .catch((error: unknown) => {
      dbPromise = null
      throw new AppException("service_unavailable", { cause: error })
    })
  return dbPromise
}
