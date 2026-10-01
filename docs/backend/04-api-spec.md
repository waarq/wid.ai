# 04. API specification

Status: draft v1. This document lists every method in `src/services/interfaces/*` with its endpoint, plus the endpoints that have no interface method (capture transport, uploads, OAuth, webhooks). Schemas are summarised in Zod-like notation. The source of truth will be `packages/contracts`, which mirrors `src/types`.

## 1. Conventions

- **Base URL:** `${NEXT_PUBLIC_API_URL}` = `https://api.<domain>/api` (local `http://localhost:4000/api`, as in `.env.example`). Every route is under `/v1`. Api services call `apiClient.get("/v1/meetings")`.
- **Auth:** `Authorization: Bearer <supabase access token>` on every route except `/v1/webhooks/*`, `/v1/oauth/*/callback`, `/v1/shared/:token`, `/healthz` and `/readyz`. A missing or invalid token returns 401.
- **Content:** JSON in and out, except `POST /v1/me/avatar` (multipart). Bodies are validated with Zod (`strict()`: unknown keys give 400 `validation_error`). Responses are serialised through the response schema, so extra DB columns never leak.
- **Field naming:** camelCase, exactly matching `src/types`. Media offsets in seconds (number), instants as ISO strings, due dates `YYYY-MM-DD`.
- **Request id:** `x-request-id` is accepted and echoed (see [01-architecture.md](./01-architecture.md) section 10).
- **Errors:** the envelope and status mapping are in [01-architecture.md](./01-architecture.md) section 10.
- **Absent vs null:** optional properties are omitted when absent (the frontend types use `?:`). `null` is sent only where the type says `| null`.

## 2. Pagination, filtering, sorting

Every collection returns `ListResponse<T> = { items: T[]; total: number; nextCursor: string | null }`.

- **Params:** `cursor` (opaque) and `limit` (default 50, max 100, clamped like `paginate()` in the mock).
- **Cursor:** base64url of `{ k: <sort key values>, id: <last id>, v: 1 }`, signed with HMAC so clients cannot fabricate keyset positions. That isn't a security boundary, since RLS still filters, but it prevents confusing 500s. An invalid cursor returns 400 with `fieldErrors.cursor = ["Invalid cursor."]`.
- **Keyset per list:** meetings `recent`: `(started_at desc, id desc)`; `oldest`: asc; `longest`: `(duration_seconds desc, started_at desc, id desc)`; action items: `(active_rank, coalesce(due_date,'9999-12-31'), created_at desc, id)` to match the mock's compare; alerts and playlist: `(created_at desc, id desc)`; deals: `(updated_at desc, id desc)`.
- **`total`:** exact `count(*)` over the filtered set, computed in the same RPC. That is fine up to about 10k rows per user. If it becomes slow, return a capped count (`min(count, 1000)`) and say so in the contract.
- **Array filters** use repeated keys (`?status=ready&status=failed`), which is what `buildQueryString` produces. Booleans are `true`/`false` strings.
- **Date range semantics** (`range=today|this_week|this_month`) are computed in the **user's timezone** (`profiles.timezone`) with weeks starting Monday (`weekStartsOn: 1` in the mock). The mock uses the browser's timezone. The backend uses the profile's, which is the correct behaviour across devices.

## 3. Idempotency and concurrency

- `Idempotency-Key` header (8 to 128 chars, a UUID recommended) is **honoured** on: `POST /v1/meetings`, `POST /v1/meetings/capture`, `POST /v1/meetings/:id/capture/stop`, `POST /v1/meetings/:id/processing/retry`, `POST /v1/deals`, `POST /v1/recordings/uploads`, `POST /v1/recordings/uploads/:id/complete`, `POST /v1/meetings/:id/ask`. The first response is stored in `ops.idempotency_keys` for 24 hours. A replay with the same body hash returns the stored response; the same key with a different body returns 409.
- Naturally idempotent operations need no key: `PUT` link, `DELETE`, `markRead`, `markAllRead`, `playlist.add` (unique constraint returns the existing item, like the mock), chunk registration (`(session, seq)` primary key, same sha256 gives 200; a different hash gives 409).
- State-machine endpoints are idempotent at the target state: `pause` on an already paused capture returns 409 like the mock. **Exception:** `stop` with the same `Idempotency-Key` replays. Without a key, a second stop returns 409 `conflict`. The frontend `ApiCaptureService` sends a key per stop attempt.
- Optional optimistic concurrency: `PATCH` endpoints accept `If-Match: "<updatedAt>"`. A mismatch returns 412, which the client maps to `conflict` ("This was changed somewhere else"). Not required by the current UI.

## 4. Versioning and OpenAPI

- **Path version** `/v1`. Within v1, only additive changes are allowed: new optional fields, new endpoints, new enum values (only after the frontend handles unknown values; today it doesn't, so enum additions are coordinated releases). Breaking changes go to `/v2` with the old version kept for at least 90 days, and `Deprecation`/`Sunset` headers.
- **OpenAPI 3.1** is generated from the route schemas: `fastify-type-provider-zod` + `@fastify/swagger`, served at `/v1/openapi.json` (non-prod) and committed to `packages/contracts/openapi.json` by CI. A diff is required in review. `@fastify/swagger-ui` runs in local and staging only.
- Zod version: the frontend pins Zod 3.25, which ships the `zod/v4` entrypoint. `packages/contracts` imports from `zod/v4` so both sides share one major version [unverified: exact `fastify-type-provider-zod` version compatibility with Zod 3.25's v4 entrypoint; pin and check in M0].
- The frontend `Api*Service` passes `parse: Schema.parse` in development and test builds (contract drift fails loudly) and skips it in production (performance), or keeps it for low-volume endpoints.

## 5. Endpoint table: every service-interface method

Notation: `Q{}` for query, `B{}` for body, `->` for the response body. "Owner" means meeting owner. Error lists name the non-generic cases. 401, 429 and 5xx are always possible.

### 5.1 AuthService

| Method | HTTP | Request | Response | Auth | Errors |
| --- | --- | --- | --- | --- | --- |
| `listGoogleAccounts()` | none (client returns `[]`) | none | `GoogleAccountOption[]` = `[]` | none | none |
| `signInWithGoogle(input)` | Supabase `signInWithOAuth` redirect; then `POST /v1/auth/bootstrap` from `/auth/callback` | `B{ intent?: 'sign_in'|'register' }` | `AuthResult { session: AuthSession, isNewUser }` | Bearer (fresh) | 401 |
| `signOut()` | `POST /v1/auth/sign-out` (after `supabase.auth.signOut`) | none | 204 | Bearer (best effort) | none |
| `getCurrentUser()` | `GET /v1/me` | none | `User` | Bearer | 401, which the client maps to `null` |
| `getSession()` | `GET /v1/auth/session` | none | `AuthSession { user, stage: 'onboarding'|'ready', expiresAt }` | Bearer | 401, which the client maps to `null` |

PRD reconciliation: `POST /auth/google` becomes `POST /v1/auth/bootstrap` (OAuth itself is handled by Supabase), and `GET /me` becomes `GET /v1/me`.

### 5.2 UserService

| Method | HTTP | Request | Response | Errors |
| --- | --- | --- | --- | --- |
| `getProfile()` | `GET /v1/me` | none | `User` | none |
| `updateProfile(input)` | `PATCH /v1/me` | `B UpdateProfileInput { firstName?≤60, lastName?≤60, timezone? (IANA), jobFunction?, emailType? }` | `User` | 422 fieldErrors (same copy as `applyProfile`) |
| `uploadAvatar(file)` | `POST /v1/me/avatar` (multipart `file`) | image/*, ≤5 MB | `User` (new `avatarUrl`) | 422 `avatar` |
| `listWorkspaceMembers()` | `GET /v1/workspace/members` | none | `WorkspaceMember[]` (current org, `isCurrentUser` computed) | none |

Extra (not in the interface): `DELETE /v1/me` (erasure request, 202) and `POST /v1/me/export` (202). Planned for M10.

### 5.3 OnboardingService

| Method | HTTP | Request | Response | Errors |
| --- | --- | --- | --- | --- |
| `getProgress()` | `GET /v1/onboarding` | none | `OnboardingProgress` (`calendarConnected`/`zoomConnected` are live from integrations) | none |
| `saveStep(input)` | `PUT /v1/onboarding/steps/:step` | `B { data: OnboardingStepData[step], skipped?: boolean }` (discriminated by `:step`) | `OnboardingProgress` | 422 `step`, field errors |
| `complete(data)` | `POST /v1/onboarding/complete` | `B OnboardingData` | `User` (`onboardingCompleted: true`). Side effects: settings, `ai_priorities`, `profiles.onboarding_completed_at`. Client then calls `refreshSession()` | 422 (rules from `validateComplete`) |

### 5.4 CalendarService

| Method | HTTP | Request | Response | Errors |
| --- | --- | --- | --- | --- |
| `getConnection()` | `GET /v1/calendar/connection` | none | `CalendarConnection` (`status: 'disconnected'` when none; never 404) | none |
| `connect()` | `POST /v1/calendar/connect` | `B{ returnTo?: string }` (safe same-origin path) | `CalendarConnection` with `authorizationUrl` set (status still `disconnected`) | 502 `calendar_connection_failed` |
| *(OAuth callback)* | `GET /v1/oauth/google_calendar/callback?code&state` | none | 302 to `returnTo?calendar=connected|error` | none (renders a redirect) |
| `disconnect()` | `DELETE /v1/calendar/connection` | none | 204 (revokes the Google token, stops watch channels, deletes events) | none |
| `listEvents(params)` | `GET /v1/calendar/events` | `Q{ from?, to?, limit?, includeCaptured?=true }` | `CalendarEvent[]` (not paginated, matching the interface; `limit` max 250) | 422 invalid dates |

PRD reconciliation: `GET /calendar/connection`, `POST /calendar/connect` and `GET /calendar/events` are kept as is, under `/v1`.

### 5.5 MeetingService

| Method | HTTP | Request | Response | Auth rule | Errors |
| --- | --- | --- | --- | --- | --- |
| `list(params)` | `GET /v1/meetings` | `Q MeetingListParams { scope?=my_calls, range?, status?[], search?≤200, ownerId?, participantId?, tagId?, dealId?, sort?, cursor?, limit? }` | `ListResponse<Meeting>` (summary omitted in list; `stats` included) | readable only | 422 status/sort/cursor |
| `getById(id)` | `GET /v1/meetings/:id` | none | `Meeting` (with `summary` when ready; `audioUrl` signed when allowed) | readable | 404 |
| `create(input)` | `POST /v1/meetings` | `B CreateMeetingInput` | `Meeting` (`upcoming` if future, else `ready_to_capture`) | any member | 422, 404 `calendarEventId` |
| `update(id, input)` | `PATCH /v1/meetings/:id` | `B UpdateMeetingInput { title?, visibility?, tagIds?, dealId?: string|null }` | `Meeting` | owner | 403, 404, 422 |
| `delete(id)` | `DELETE /v1/meetings/:id` | none | 204 | owner | 409 if capturing or paused |
| `startCapture(input)` | `POST /v1/meetings/capture` | `B StartCaptureInput & { consentAttested?: boolean, client?: { userAgent, sources: ('mic'|'tab'|'system'|'file')[], mimeType } }` | `{ meeting: Meeting, capture: CaptureSessionInfo }`. `ApiMeetingService` returns `.meeting` | any member | 409 live capture, 404 event, 422 mode/platform/consent |
| `setCapturePaused(id, paused)` | `POST /v1/meetings/:id/capture/pause` or `/resume` | `B{ at?: ISO }` (client clock, advisory) | `Meeting` | owner | 409 wrong state |
| `stopCapture(id, input)` | `POST /v1/meetings/:id/capture/stop` | `B StopCaptureInput & { lastSeq: number }` | `Meeting` (`processing`) | owner | 409 not capturing, 422 |
| `getProcessingStatus(id)` | `GET /v1/meetings/:id/processing` | none | `ProcessingProgress` | readable | 404, 409 not captured yet |
| `retryProcessing(id)` | `POST /v1/meetings/:id/processing/retry` | none | `ProcessingProgress` | owner | 409 not failed |
| `getShareSettings(id)` | `GET /v1/meetings/:id/share` | none | `ShareSettings` (`canManage`, `canRemove` computed) | readable | 404 |
| `share(id, input)` | `PATCH /v1/meetings/:id/share` | `B ShareMeetingInput { visibility?, inviteEmails?≤50, linkEnabled? }` | `ShareSettings` | owner | 403, 422 `inviteEmails` |
| `unshare(id, recipientId)` | `DELETE /v1/meetings/:id/share/recipients/:recipientId` | none | `ShareSettings` | owner | 403 team recipient, 404 |
| `listDecisions(id)` | `GET /v1/meetings/:id/decisions` | none | `Decision[]` | readable | 404 |
| `getDecisionHistory(decisionId)` | `GET /v1/decisions/:id/history` | none | `DecisionHistory` (entries limited to readable meetings) | readable | 404 |
| `generateFollowUp(id, input)` | `POST /v1/meetings/:id/follow-up` | `B GenerateFollowUpInput { tone?, signOffName? }` | `FollowUpEmail` | readable | 409 not ready |

`CaptureSessionInfo = { sessionId, storageBucket: 'capture-chunks', storagePrefix, chunkMaxBytes: 8388608, heartbeatIntervalSec: 15, maxDurationSec: 14400, interrupted: boolean }`.

Follow-up generation: deterministic template composition from live insights (port of `composeFollowUp`), so it is instant, free and fully grounded. An optional `?polish=true` uses the LLM to rewrite the prose without adding facts (M8+, gated). Not persisted.

PRD reconciliation: `GET/POST/PATCH/DELETE /meetings[/:id]` are kept. `GET /meetings/:id/transcript` is in 5.7. `GET /meetings/:id/actions` is an **alias** of `GET /v1/action-items?meetingId=:id` (kept for PRD parity). `GET /meetings/:id/decisions` is kept. `POST /meetings/:id/ask` is in 5.9.

### 5.6 Capture transport (no interface methods; used inside `ApiCaptureService`)

| Endpoint | Purpose | Request | Response | Errors |
| --- | --- | --- | --- | --- |
| `GET /v1/capture/active` | Recover a live or interrupted session after refresh or on another device | none | `{ meeting: Meeting, capture: CaptureSessionInfo, lastSeq, accumulatedMs } | 204` | none |
| `POST /v1/meetings/:id/capture/chunks` | Register an uploaded chunk (after the Storage upload succeeds) | `B{ seq, part, path, byteSize, durationMs, sha256 (hex), mimeType }` | `{ ack: seq, lastContiguousSeq }` | 409 hash mismatch or session not live, 422 path outside prefix |
| `POST /v1/meetings/:id/capture/heartbeat` | Liveness plus elapsed sync every 15 s | `B{ status: 'capturing'|'paused', clientElapsedMs, lastSeq }` | `{ serverElapsedMs, expiresInSec }` | 409 session ended |
| `POST /v1/meetings/:id/capture/discard` | Abandon (maps to `CaptureService.discard`) | none | 204 | 409 not live |

### 5.7 TranscriptService

| Method | HTTP | Request | Response | Errors |
| --- | --- | --- | --- | --- |
| `getByMeetingId(id)` | `GET /v1/meetings/:id/transcript` | `Q{ words?: boolean }` | `Transcript` (`status pending|ready|failed`; segments ordered) | 404 not captured or unreadable, 403 transcript not shared |
| `search(id, query)` | `GET /v1/meetings/:id/transcript/search` | `Q{ q: string≤200 }` | `TranscriptSearchMatch[]` (phrase or all-token match + highlights, as in the mock) | 404 |
| *(gap)* assign speaker | `PATCH /v1/meetings/:id/speakers/:speakerId` | `B{ contactId } | { name, email? }` | `Transcript` | owner; 422 |

Long transcripts (more than 3,000 segments) are still returned in one response, gzip-compressed (`@fastify/compress`). A 2-hour meeting is about 1,500 segments, about 300 KB of JSON, about 60 KB gzipped. Segment-range paging is added only if this proves heavy.

### 5.8 ActionItemService

| Method | HTTP | Request | Response | Errors |
| --- | --- | --- | --- | --- |
| `list(params)` | `GET /v1/action-items` | `Q ActionItemListParams { meetingId?, mine?, assigneeId?, status?[], due?, cursor?, limit? }`. Dismissed items are hidden unless `status` includes them | `ListResponse<ActionItem>` | 422 |
| `getById(id)` | `GET /v1/action-items/:id` | none | `ActionItem` | 404 |
| `update(id, input)` | `PATCH /v1/action-items/:id` | `B UpdateActionItemInput` (assignee must be a meeting participant) | `ActionItem` (sets `edited_at`, `origin` stays) | 403, 422 |
| `toggleComplete(id)` | `POST /v1/action-items/:id/toggle-complete` | none | `ActionItem` | 403 |
| `delete(id)` | `DELETE /v1/action-items/:id` | none | 204 (side effects as in the mock: key moments, alerts, deal next action) | 403 (owner only) |

### 5.9 AssistantService

| Method | HTTP | Request | Response | Errors |
| --- | --- | --- | --- | --- |
| `ask(meetingId, question)` | `POST /v1/meetings/:id/ask` | `B{ question: string 1..500 }` | `MeetingAnswer` (`answered` has at least one source; `not_found` has none) | 404, 422, 429 quota, 503 provider down |
| `getSuggestedQuestions(id)` | `GET /v1/meetings/:id/assistant/suggestions` | none | `SuggestedQuestion[]` (empty unless ready and `showSuggestedQuestions`) | 404 |
| `listHistory(id)` | `GET /v1/meetings/:id/assistant/history` | none | `MeetingAnswer[]` (the caller's own, oldest first, last 50) | 404 |

Latency target: p95 under 6 s with a hosted LLM, under 12 s with local 14B to 20B models. The interface is request/response. Streaming (SSE `POST /v1/meetings/:id/ask?stream=1`) can be added later without changing `ask()`.

### 5.10 SearchService

| Method | HTTP | Request | Response | Errors |
| --- | --- | --- | --- | --- |
| `search(query, params)` | `GET /v1/search` | `Q{ q: string≤200, types?: SearchResultType[] (command ignored), meetingId?, limit?≤50 }` | `SearchResult[]` sorted by `score` desc. **No `command` results.** `ApiSearchService` merges client-side commands | 422 |

### 5.11 PlaylistService

| Method | HTTP | Request | Response | Errors |
| --- | --- | --- | --- | --- |
| `list(params)` | `GET /v1/playlist` | `Q{ kind?, meetingId?, cursor?, limit? }` | `ListResponse<PlaylistItem>` (only readable meetings) | none |
| `add(input)` | `POST /v1/playlist` | `B AddPlaylistItemInput { meetingId, sourceSegmentId, sourceTimestamp, kind, title≤120, note?, endTimestamp? }` | `PlaylistItem` (201 new, 200 existing) | 404 meeting, 422 segment or timestamp or clip |
| `update(id, input)` | `PATCH /v1/playlist/:id` | `B{ title?, note?: string|null }` | `PlaylistItem` | 404 |
| `remove(id)` | `DELETE /v1/playlist/:id` | none | 204 | 404 |

PRD: `GET /playlist` and `POST /playlist` are kept.

### 5.12 AlertService

| Method | HTTP | Request | Response | Errors |
| --- | --- | --- | --- | --- |
| `list(params)` | `GET /v1/alerts` | `Q{ filter?: all|unread|actions|mentions|decisions, cursor?, limit? }` | `ListResponse<Alert>` | 422 filter |
| `getUnreadCount()` | `GET /v1/alerts/unread-count` | none | `{ count: number }`. `ApiAlertService` returns `.count` | none |
| `markRead(id)` | `PATCH /v1/alerts/:id/read` | none | `Alert` | 404 |
| `markAllRead()` | `POST /v1/alerts/read-all` | none | 204 | none |
| `dismiss(id)` | `DELETE /v1/alerts/:id` | none | 204 (sets `dismissed_at`) | 404 |

PRD: `GET /alerts` and `PATCH /alerts/:id/read` are kept. Unread-count polling (`UNREAD_POLL_MS`) stays as the fallback. Realtime `alert.created` triggers an immediate refetch.

### 5.13 DealService

| Method | HTTP | Request | Response | Errors |
| --- | --- | --- | --- | --- |
| `list(params)` | `GET /v1/deals` | `Q{ stage?, search?, ownerId?, cursor?, limit? }` | `ListResponse<Deal>` (org-scoped) | 422 |
| `getById(id)` | `GET /v1/deals/:id` | none | `Deal` | 404 |
| `create(input)` | `POST /v1/deals` | `B CreateDealInput { company, name?, value?, stage, meetingIds? }` | `Deal` 201 | 422 (meetings must be readable) |
| `update(id, input)` | `PATCH /v1/deals/:id` | `B UpdateDealInput` | `Deal` (a stage change creates a `deal_update` alert if enabled) | 403, 422 |
| `delete(id)` | `DELETE /v1/deals/:id` | none | 204 | 403 |
| `linkMeeting(dealId, meetingId)` | `PUT /v1/deals/:id/meetings/:meetingId` | none | `Deal` (moves the meeting from its previous deal) | 404, 403 |
| `unlinkMeeting(dealId, meetingId)` | `DELETE /v1/deals/:id/meetings/:meetingId` | none | `Deal` | 404 not linked |

PRD: `GET /deals` and `GET /deals/:id` are kept.

### 5.14 IntegrationService

| Method | HTTP | Request | Response | Errors |
| --- | --- | --- | --- | --- |
| `list()` | `GET /v1/integrations` | none | `Integration[]` (all 7 providers in display order; unavailable ones `coming_soon`) | none |
| `get(provider)` | `GET /v1/integrations/:provider` | none | `IntegrationOf<P>` | 404 unknown provider |
| `connect(provider)` | `POST /v1/integrations/:provider/connect` | `B{ returnTo? }` | `IntegrationOf<P>` with `authorizationUrl` (`google` is always connected and is returned as is) | 503 `coming_soon`, 502 |
| `disconnect(provider)` | `POST /v1/integrations/:provider/disconnect` | none | `IntegrationOf<P>` (status `disconnected`, settings null) | 403 `google`, 503 `coming_soon` |
| `configure(provider, settings)` | `PATCH /v1/integrations/:provider/settings` | `B Partial<IntegrationSettingsMap[P]>` | `IntegrationOf<P>` | 409 not connected, 422 |

`google_calendar` connect and disconnect through either `/v1/calendar/*` or `/v1/integrations/google_calendar/*` share one implementation. PRD: `GET /integrations` and `POST /integrations/:provider/connect` are kept.

### 5.15 SettingsService

| Method | HTTP | Request | Response | Errors |
| --- | --- | --- | --- | --- |
| `get()` | `GET /v1/settings` | none | `Settings` (`general` from profile, `capture.manualCapture: true`, `sharing.linkSharingAvailable` from the org, `security.sessions` from `auth.sessions`) | none |
| `update(input)` | `PATCH /v1/settings` | `B UpdateSettingsInput { section, patch }` (read-only fields ignored, as in the mock) | `Settings` | 422 |
| `revokeSession(id)` | `DELETE /v1/settings/sessions/:sessionId` | none | `Settings` | 403 current session, 404 |

PRD: `GET /settings` and `PATCH /settings` are kept.

### 5.16 CaptureService

Client-side by design. `ApiCaptureService` implements the interface with:

- a `BrowserRecorder` (the `CaptureRecorder` plug-in point that already exists in `mock/capture-service.ts`) that uses `getDisplayMedia` + `getUserMedia` and a `MediaRecorder` ([05-capture-and-pipeline.md](./05-capture-and-pipeline.md) section 3);
- an upload queue (IndexedDB) that pushes chunks to Storage and calls `POST .../capture/chunks`;
- `MeetingService.startCapture/setCapturePaused/stopCapture`, plus `/capture/heartbeat`, `/capture/discard` and `GET /capture/active`;
- the existing pure `capture-machine.ts` for state and elapsed time, so `subscribe()` keeps emitting ticks locally.

| Method | Calls |
| --- | --- |
| `getState()` | local session, else `GET /v1/capture/active` (rehydrate) |
| `start(input)` | `POST /v1/meetings/capture` then `recorder.start()`. If the recorder fails, `POST .../capture/discard` (mirrors the mock rollback) |
| `pause()` / `resume()` | `recorder.pause()` + `POST .../capture/pause` / `recorder.resume()` + `.../resume` |
| `stop()` | `recorder.stop()`, flush the upload queue (with a timeout), then `POST .../capture/stop` with `lastSeq`, then poll `GET .../processing` (or Realtime) |
| `discard()` | `recorder.discard()`, `POST .../capture/discard`, clear IndexedDB |
| `subscribe()` | local listeners; ticks from the machine; status advances from Realtime `meeting.status` or polling |

## 6. Endpoints with no interface method

| Endpoint | Purpose |
| --- | --- |
| `POST /v1/recordings/uploads` | Manual file upload: `B{ meetingId? , title?, fileName, byteSize, mimeType, durationSec? }`. Creates a meeting (`ready_to_capture` then `processing` on complete) if no `meetingId`, plus a `recordings` row (`uploading`), and returns `{ recordingId, meetingId, tus: { endpoint, bucket, objectName, chunkSize: 6291456 } }` (Supabase TUS requires 6 MB chunks [verified: [Resumable uploads](https://supabase.com/docs/guides/storage/uploads/resumable-uploads)]) |
| `POST /v1/recordings/uploads/:id/complete` | Verifies the object exists and its size matches, then enqueues `media.normalize` and returns `Meeting` (`processing`) |
| `GET /v1/integrations/zoom/recordings` | Lists the user's recent Zoom cloud recordings (import candidates) |
| `POST /v1/integrations/zoom/recordings/:zoomMeetingUuid/import` | User-initiated import, which returns `Meeting` (`processing`) |
| `POST /v1/integrations/zoom/offers/:id/decline` | Dismisses an import offer |
| `GET /v1/oauth/:provider/callback` | OAuth redirect target for `google_calendar` and `zoom` |
| `POST /v1/webhooks/google-calendar` | Push notifications (channel token verified) |
| `POST /v1/webhooks/zoom` | Zoom events (HMAC verified, URL validation challenge) |
| `GET /v1/shared/:token` | Link-share read-only meeting brief (only when `link_sharing_available`) |
| `GET /healthz`, `GET /readyz` | Liveness and readiness (DB reachable, JWKS cached) |

## 7. Response shape details that are easy to get wrong

- `Meeting.summary` is present only when `status = 'ready'` (mock rule). `Meeting.processing` is present while processing and after failure. `Meeting.stats` is present when ready (lists include it).
- `Meeting.sharedWithMe = !isOwner && canRead` is computed per viewer.
- `Meeting.owner` is a `PersonRef` (contact id, name, email). `Participant.userId` is present only for WID users.
- `ActionItem.meeting` is a `MeetingRef` embedded in every list item (one join, no N+1). `ActionItem.assignee` is a full `Participant`.
- `ProcessingProgress.error` is an `AppError` JSON object (`code: 'processing_failed'` or `'capture_failed'`, user-safe `message`, `retryable`).
- `Alert.target` exactly matches the `AlertTarget` union. `meetings` targets list only readable meetings, and the alert is dropped if none remain (mock `deleteMeetingOp` semantics).
- `Deal.meetings` and `Deal.signals` only include readable meetings.
- `TranscriptSegment.speakerName` is the participant's current display name, so a speaker rename is reflected everywhere.

## 8. Realtime channels

All private channels (RLS on `realtime.messages`, see [03-security-rls.md](./03-security-rls.md) section 8). Payloads are minimal. Clients treat events as **invalidation hints** and refetch through the API.

| Topic | Event | Payload | Frontend reaction |
| --- | --- | --- | --- |
| `meeting:<meetingId>` | `meeting.status` | `{ meetingId, status, updatedAt }` | invalidate `queryKeys.meetings.detail(id)`, `.processing(id)`, lists; capture machine `advance` |
| `meeting:<meetingId>` | `meeting.progress` | `{ meetingId, step, stepStatus, detail? }` | invalidate `.processing(id)` |
| `meeting:<meetingId>` | `meeting.updated` | `{ meetingId, fields: string[] }` (title, visibility, insights) | invalidate the detail |
| `user:<userId>` | `alert.created` | `{ alertId, type }` | invalidate alerts list and unread count, show a toast |
| `user:<userId>` | `capture.state` | `{ meetingId, status, interrupted }` | multi-device capture state |

Polling stays the baseline (`refetchInterval` already exists in `use-meetings.ts` and `use-alerts.ts`). With Realtime connected, the frontend can stretch polling intervals to 30 to 60 s.
