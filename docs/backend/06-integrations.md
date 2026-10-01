# 06. Integrations

Status: draft v1. This covers Google (identity and Calendar), Zoom, the shared OAuth and token machinery, and extension points for Slack, Microsoft Calendar, HubSpot and Salesforce.

## 0. Shared OAuth machinery (`modules/integrations`)

```ts
interface IntegrationAdapter<P extends IntegrationProvider> {
  provider: P
  category: IntegrationCategory
  scopes: string[]                                        // real OAuth scopes
  buildAuthorizationUrl(a: { state: string; codeChallenge: string; loginHint?: string }): string
  exchangeCode(code: string, codeVerifier: string): Promise<TokenSet & { account: { id: string; label: string } }>
  refresh(t: TokenSet): Promise<TokenSet>                 // may rotate refresh_token (Zoom)
  revoke(t: TokenSet): Promise<void>
  onConnected(ctx): Promise<void>                         // e.g. enqueue calendar full sync
  onDisconnected(ctx): Promise<void>                      // stop channels, delete synced data
  settingsSchema: ZodType<IntegrationSettingsMap[P]>      // validates configure()
  defaultSettings(user): IntegrationSettingsMap[P]
}
```

Connect flow (the same for every provider):

```text
POST /v1/integrations/:provider/connect { returnTo }
  -> state = random 32 bytes; PKCE verifier; store app_private.oauth_states (hash(state), encrypted verifier, 10 min TTL)
  -> respond IntegrationOf<P> { status: 'disconnected', authorizationUrl }      (UI navigates there)
GET /v1/oauth/:provider/callback?code&state
  -> look up and delete the state (single use); reject if expired or the user mismatches the session in state
  -> exchangeCode -> encrypt tokens -> upsert integrations (connected) + integration_credentials
  -> adapter.onConnected -> 302 `${APP_URL}${returnTo}?integration=<provider>&result=connected`
  -> on error: 302 with result=error&code=<calendar_connection_failed|integration_connection_failed>
```

The callback is a top-level browser navigation, so there is no Bearer header. The `state` row carries `user_id`, and that binds the callback to the user who started the flow. `returnTo` is validated with the same rules as `getSafeNextPath` (same-origin path only).

**Token use and refresh.** All provider calls go through `withAccessToken(integrationId, fn)`:

1. Take a Postgres advisory lock per integration (`pg_advisory_xact_lock(hashtext(integration_id))`). Zoom rotates refresh tokens, so two concurrent refreshes would invalidate each other.
2. If the token is still valid for more than 2 minutes, use it. Otherwise refresh, re-encrypt, and store the new token.
3. On `invalid_grant` or a 401 after a refresh: set `status = 'revoked'` and `last_error_code`, and stop dependent jobs. Settings then shows "Reconnect". We do not raise an alert because there is no matching `AlertType`. Adding `integration_disconnected` later would close this gap.

A `pg_cron` sweep every 15 minutes refreshes tokens expiring within 10 minutes for integrations that have background work (calendar watch, pending Zoom imports). Everything else refreshes lazily.

**Disconnect** (`POST /v1/integrations/:provider/disconnect`): `adapter.onDisconnected`, then `revoke` (best effort), then delete credentials, then set `status = 'disconnected'` and `settings = null`. `google` (the sign-in identity) returns 403, matching the mock.

---

## 1. Google

### 1.1 Identity (sign-in)

Supabase Auth Google provider, scopes `openid email profile`, `prompt=select_account`. See [03-security-rls.md](./03-security-rls.md) section 2. Use **one Google Cloud project and one OAuth client** for both sign-in and Calendar: one consent-screen brand, one verification. The client is registered with two redirect URIs (Supabase callback and API callback).

### 1.2 Calendar authorization (incremental consent)

- A separate authorization request from the API, made **after** sign-in: `access_type=offline`, `include_granted_scopes=true`, `prompt=consent` (needed to get a refresh token reliably), `login_hint=<user email>`.
- Scopes, as narrow as possible:
  - `https://www.googleapis.com/auth/calendar.events.readonly` for event titles, times, attendees and conference data.
  - `https://www.googleapis.com/auth/calendar.calendarlist.readonly` for the calendar list behind `syncedCalendarIds` [unverified that this narrow scope is generally available. Fallback: `calendar.readonly`. Both are **sensitive**, not restricted].
- Map to the frontend's UX labels: when `calendar.events.readonly` is granted, `CalendarConnection.scopes = ['events.read','titles.read','times.read','attendees.read']`.
- If the user unticks a scope on Google's granular consent screen, the token response lists only the granted scopes. If `calendar.events.readonly` is missing, we treat the connect as failed (`calendar_connection_failed`) and say exactly what is missing.

### 1.3 Sync strategy

| Phase | Mechanism |
| --- | --- |
| Initial (on connect, per selected calendar; default `primary`) | `events.list(calendarId, singleEvents=true, showDeleted=false, timeMin=now-30d, maxResults=250)`, paginated, upserting `calendar_events` and attendees. Save `nextSyncToken` from the last page. Track the expected volume against `upcomingEventCount` for "12 upcoming meetings found". [unverified: that a `timeMin`-bounded initial list still yields a `nextSyncToken` usable for incremental sync. If not, run the initial sync without `timeMin` and filter app-side.] |
| Incremental | `events.list(calendarId, syncToken)`, applying changes. `status: cancelled` deletes the row (a linked meeting keeps existing, and `calendar_event_id` goes to null through the FK). **HTTP 410 Gone** means the sync token is invalid: wipe that calendar's events (keep the links on meetings) and run a full sync. |
| Triggers | (1) Push notification. (2) Fallback poll every 15 minutes for calendars whose channel is missing or expired. (3) `GET /v1/calendar/events` when `last_incremental_sync_at` is more than 5 minutes old enqueues a sync but serves the cached data immediately. |
| Window and pruning | Serve `from` to `to` from the table. A weekly job prunes events older than 30 days that have no linked meeting. |

### 1.4 Push notification channels

- `events.watch` per calendar: `{ id: <uuid>, type: 'web_hook', address: 'https://api.<domain>/api/v1/webhooks/google-calendar', token: <random 32 bytes, stored hashed> }`. Default and maximum TTL is 7 days (604,800 s) [verified: [Events: watch](https://developers.google.com/workspace/calendar/api/v3/reference/events/watch), [Push guide](https://developers.google.com/workspace/calendar/api/guides/push)].
- **Renewal:** there is no automatic renewal [verified]. A `pg_cron` job every 6 hours finds channels expiring within 24 hours, creates a new channel, swaps `watch_*` columns, then calls `channels.stop` on the old one. Both channels may deliver briefly during the overlap. That is harmless because handling is idempotent.
- **Handling:** notifications have **no body** [verified]. Verify `X-Goog-Channel-ID` against a known channel and `X-Goog-Channel-Token` against its stored hash (constant-time). Ignore `X-Goog-Resource-State: sync` (the handshake). For `exists`/`not_exists`, enqueue `calendar.sync_incremental` with `dedupe_key = 'gcal:<calendar_id>'`, so bursts coalesce into one queued sync. Respond 200 immediately.
- Requirements: a public HTTPS endpoint with a valid certificate. [unverified: whether Google still requires domain ownership verification for webhook addresses; check during M3 setup.] Local development uses polling only (no public URL), or a tunnel for testing.

### 1.5 Time zones, recurrence, all-day events

- Store `starts_at`/`ends_at` as `timestamptz` (Google returns `dateTime` with an offset). For all-day events (`date` only), set `is_all_day = true` and store midnight in the **calendar's** time zone. The UI should show them as all-day and **not** offer capture by default (they're rarely meetings).
- `singleEvents=true` expands recurring series into instances with stable instance ids. `recurring_event_id` links them. `CalendarEvent.isRecurring = recurring_event_id is not null`.
- A moved instance updates in place (same instance id). A linked meeting keeps its own `started_at` (actual capture time).
- `event_time_zone` is kept for display only. API date-range filters (`range=today`) use the **user's** profile time zone.

### 1.6 Attendee mapping

- `calendar_event_attendees` stores every non-resource attendee (`resource: true` entries are rooms and are skipped).
- At `startCapture` with a `calendarEventId`, participants are built from attendees with `response != 'declined'`:
  - `contacts` are upserted by `(org_id, email)`. `is_external` = the email is not an `organization_members` user of the meeting's org. **We don't infer from domain**, in line with the PRD's spirit and because personal orgs have no domain.
  - `self` (the owner) becomes role `host`, matching the mock's `startCaptureOp`.
  - `displayName` falls back to the email local part.
- Conference detection: `conferenceData.conferenceSolution.key.type = 'hangoutsMeet'` or `hangoutLink` means `google_meet`. A URL matching `zoom.us/j/` in location, description or conference entry points means `zoom`. `teams.microsoft.com` means `microsoft_teams`. Otherwise, a location with no URL means `in_person`, and anything else is `other`. Only the URL is kept; the description itself is not stored.

### 1.7 Google verification and policy requirements

- **Sensitive scopes, not restricted:** Calendar scopes require Google **OAuth app verification** before production use by more than 100 users (unverified apps show a warning screen and hit a user cap). They do **not** require a CASA security assessment [verified: [Nylas guide](https://developer.nylas.com/docs/provider-guides/google/google-verification-security-assessment-guide/) and related sources].
- Verification needs: a verified domain, homepage and privacy policy on that domain, an accurate consent-screen brand, a scope justification, and a **demo video** showing the OAuth flow and each scope in use. Timeline: plan for 2 to 6 weeks including back-and-forth [unverified; varies]. **Start during M3**, because it blocks public launch.
- **Restricted scopes warning:** do **not** request Drive or Gmail scopes. Importing Google Meet recordings or transcripts from Drive (see [05-capture-and-pipeline.md](./05-capture-and-pipeline.md) option e) would pull in restricted scopes and an annual CASA assessment (Tier 2 or 3, which costs money and takes weeks). It stays deferred for that reason.
- **Google API Services User Data Policy, Limited Use:** calendar data may be used only to provide user-facing features, may not be used to train generalised AI/ML models, and humans may not read it except with consent, for security, or as legally required. Implications:
  1. Our training and eval sets must never include production calendar data.
  2. If hosted LLMs see attendee names (speaker mapping prompts), the provider must be bound by terms that prevent training on the data.
  3. The privacy policy must include the Limited Use disclosure.

  Needs legal review; flagged in [08-open-questions.md](./08-open-questions.md).

### 1.8 Disconnect

`channels.stop` for every channel, `POST https://oauth2.googleapis.com/revoke?token=<refresh_token>`, delete credentials, delete `calendars` (cascades `calendar_events`; meetings keep their data with `calendar_event_id = null`), set `status = 'disconnected'`. `CalendarService.disconnect()` returns 204.

---

## 2. Calendar module behaviour vs the mock

- `getConnection()` never throws for "not connected". It returns `status: 'disconnected', upcomingEventCount: 0, scopes: []`.
- `listEvents()` returns `[]` when disconnected. An event "still in progress counts as upcoming" (`ends_at > from`). `includeCaptured=false` hides events that have a meeting owned by the caller. Results are sorted by `starts_at`.
- `CalendarEvent.meetingId` is set only if the **caller** owns a meeting for that event. It is never set automatically, because capture is manual.

---

## 3. Zoom

### 3.1 App setup

- Zoom Marketplace **General App, user-managed OAuth**. Required for other accounts to install it. An unpublished app can only be installed within the developer's own account, so **public use requires Marketplace review and publishing** [verified indirectly: [devforum on unpublished app limits](https://devforum.zoom.us/t/how-to-test-obf-token-implementation-with-external-zoom-accounts-if-unpublished-app-cant-be-installed-outside-developer-account/145012)]. Plan 2 to 6 weeks for review [unverified].
- Scopes (granular, read-only, minimal): user profile (`user:read:user`), list and read cloud recordings (`cloud_recording:read:list_user_recordings`, `cloud_recording:read:recording`) [unverified exact granular scope names; confirm in the app builder]. **No** delete scopes and **no** meeting-join or SDK scopes.
- Event subscriptions: `recording.completed`, `recording.transcript_completed` (optional), plus the deauthorization notification (`app.deauthorized`) that Marketplace requires.
- Cloud recording is a Zoom **paid-plan** feature, and the **host** (or an account admin) is the one whose token can list a meeting's recordings. A WID user who is only an attendee of someone else's Zoom meeting cannot import it.

### 3.2 OAuth

- `https://zoom.us/oauth/authorize` and `https://zoom.us/oauth/token` (Basic auth with client id and secret). Access tokens last about 1 hour. **Refresh tokens rotate:** each refresh returns a new one and invalidates the old [unverified exact lifetime; commonly 90 days]. That is why refresh happens under the advisory lock.
- `onConnected`: store `external_account_id` = Zoom user id and `account_id` (in `integrations.settings` metadata or a dedicated column), then enqueue `zoom.backfill_offers` (the last 7 days of recordings, listed as offers but **not imported**).

### 3.3 Webhooks

- Endpoint `POST /v1/webhooks/zoom`. Fastify raw-body parser for this route only.
- **Signature:** compute `HMAC_SHA256(ZOOM_WEBHOOK_SECRET_TOKEN, "v0:" + x-zm-request-timestamp + ":" + rawBody)` and compare (constant-time) with `x-zm-signature` (`v0=<hex>`). Reject if the timestamp is more than 5 minutes off. [verified: [Zoom webhooks](https://developers.zoom.us/docs/api/webhooks/)]
- **URL validation:** for `event = endpoint.url_validation`, respond `{ plainToken, encryptedToken: HMAC_SHA256(secret, plainToken).hex }` within 3 s. Zoom re-validates every 72 hours [verified].
- **Delivery:** respond 200 within 3 s. Zoom retries 5xx and timeouts at 5, 20 and 60 minutes, and does not retry 4xx [verified]. So: verify, insert into `ops.webhook_events` (unique `(provider, external_id)` where `external_id = event + ':' + object.uuid + ':' + event_ts`), enqueue `zoom.handle_event`, return 200. Duplicates are a no-op.
- The `download_token` in the payload is valid for **24 hours** [verified: [Zoom download tokens](https://developers.zoom.us/blog/meeting-api-querying-tips-part4/)]. Store it encrypted on the offer (or not at all; the OAuth token works too), and never in `webhook_events.payload` (strip it before insert).

### 3.4 Manual-capture-compliant import

`recording.completed` **never auto-imports by default.**

```text
zoom.handle_event(recording.completed):
  user = integrations where provider='zoom' and external_account_id = payload.object.host_id (status connected)
  if none -> drop (store nothing beyond the webhook inbox row, which expires in 30 days)
  upsert zoom_recording_offers(user, zoom_meeting_uuid, topic, start_time, duration, files metadata) status 'offered'
  (when the frontend supports AlertType 'zoom_recording_available') -> alert "Zoom recording ready: <topic>. Import?"
User clicks Import  (GET /v1/integrations/zoom/recordings lists offers + recent recordings via API)
  POST /v1/integrations/zoom/recordings/:uuid/import
   -> create meeting (platform 'zoom', title = topic, started_at = start_time, link to the caller's calendar event
      when a calendar event with a Zoom join URL matches the meeting id and time) -> status 'processing'
   -> enqueue zoom.import (download audio_only M4A, or per-participant tracks if present; VTT transcript as hints)
```

- A future per-meeting opt-in ("Import this Zoom recording automatically when it's ready", set by the user on a specific calendar event) is still manual capture: the user decided per meeting. It needs a small `zoom_import_intents` table, not in the MVP.
- After 24 hours, downloads use `GET /meetings/{meetingUUID}/recordings` with the user's OAuth token. Meeting UUIDs that start with `/` or contain `//` must be **double URL-encoded** [unverified; long-standing Zoom API quirk].
- Recording files can be large. Download streams straight to Storage (`recordings/.../original.m4a`) without buffering in memory.

### 3.5 Deauthorization and data deletion

- On `app.deauthorized`: verify, mark the integration `revoked`, delete credentials, delete offers, keep already-imported meetings (they are the user's WID data now), and respond 200. Zoom's Marketplace data-compliance rules may also require confirming deletion through their compliance API [unverified current requirement; check during review].
- User-initiated disconnect: `POST https://zoom.us/oauth/revoke`, then the same cleanup.

---

## 4. Token refresh and maintenance jobs (summary)

| Job | Schedule | Action |
| --- | --- | --- |
| `integrations.refresh_sweep` | every 15 min | Refresh tokens expiring within 10 min for integrations with background work |
| `calendar.renew_channels` | every 6 h | Renew Google channels expiring within 24 h |
| `calendar.poll_fallback` | every 15 min | Incremental sync for calendars with no live channel |
| `calendar.prune` | weekly | Drop unlinked events older than 30 days |
| `zoom.expire_offers` | daily | Offers older than 30 days go to `expired` |
| `meetings.upcoming_to_ready` | every 5 min | Persist `upcoming` to `ready_to_capture` |
| `capture.mark_interrupted` | every 1 min | Sessions without a heartbeat for more than 120 s become `interrupted` |
| `capture.auto_finalize` | hourly | Sessions `interrupted` for more than 24 h are stopped and processed |
| `notify.action_due` | hourly | 09:00 local "due tomorrow" reminders |
| `retention.recordings` | daily | Expire recordings past `retention_expires_at` |
| `ops.reap_leases` / `ops.gc` | 1 min / daily | Requeue expired leases. Purge old jobs, webhook events and idempotency keys. |

All are `pg_cron` entries calling `ops.enqueue_job`. The work runs in the worker.

---

## 5. Future integrations: extension points

| Provider | Category | Shape | Notes and triggers |
| --- | --- | --- | --- |
| **Microsoft Calendar** | calendar | `CalendarProviderAdapter { listCalendars, fullSync, incrementalSync, watch, stopWatch }`, implemented with Microsoft Graph delta queries + change-notification subscriptions | Subscriptions expire quickly and need frequent renewal [unverified exact maximum]. Same `calendars`/`calendar_events` tables (`provider` comes from the integration). `CalendarProvider` already has `microsoft_calendar`. |
| **Slack** | messaging | `notify` fan-out sink: on `meeting_ready`, post the brief (decisions + actions with "Open in WID" links, **no transcript**) to `settings.channelId` if `postSummaries` | Bot token stored like the other credentials. Respect meeting visibility: only post meetings whose visibility is `team`, or `attendees` when the channel is private and confirmed by the user. |
| **HubSpot / Salesforce** | crm | One-way push first: deal stage, next action, meeting-summary note on the CRM record. `integration_object_links(provider, external_type, external_id, local_type, local_id)` maps records. | Deals stay "not a CRM" (PRD). Two-way sync is a separate project. `syncDeals` setting already exists. |
| Email | notifications | `notify` channel `email` (`channel_email`), via a transactional email provider; templates for meeting ready, action due, shared with you | Needs SPF/DKIM/DMARC on the sending domain. Invite emails to non-users wait for this. |

Adding a provider means: an adapter, a settings schema, a migration adding its enum value (if new), the `AVAILABLE_INTEGRATION_PROVIDERS` change in the frontend, and contract tests.
