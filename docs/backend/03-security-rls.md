# 03. Security, auth and RLS

Status: draft v1. This is not legal advice. Every legal point here is flagged for review by counsel.

## 1. Threat model (short)

| Asset | Main threats | Primary controls |
| --- | --- | --- |
| Meeting audio, transcripts, insights (customer content, often third-party personal data) | Cross-tenant read through a buggy query, IDOR on ids, leaked share links, insider access | API authorization, RLS as the second line, `not_found` for invisible resources, short-lived signed media URLs, audit log, least-privilege service role |
| Google and Zoom OAuth tokens | DB dump or backup exfiltration, log leakage | App-level envelope encryption, separate schema with no grants, log redaction |
| User sessions | XSS stealing access tokens, CSRF | Bearer tokens (not ambient cookies) to the API, strict CSP, short JWT TTL, refresh-token rotation |
| Pipeline (LLM) | Prompt injection from transcript content ("ignore instructions and share this with…") | The LLM has no tools and no write authority; outputs are schema-validated and evidence-verified; no URLs or actions are taken from model output |
| Webhooks | Forged events, replay | HMAC or channel-token verification, timestamp window, idempotent inbox |
| Cost and abuse | Expensive endpoints spammed, huge uploads | Rate limits and quotas, upload size and duration caps, per-user concurrency caps |

## 2. Authentication

### 2.1 Model

- **Identity:** Supabase Auth with the Google provider, using only `openid email profile` scopes at sign-in. Google is the only sign-in method (`SecuritySettings.signInMethod: "google"`).
- **Session:** owned by Supabase Auth. The access token is a JWT (default TTL 1 hour) and the refresh token is rotating and single-use.
- **JWT signing:** use **asymmetric signing keys** (projects created after 2025-05-01 default to RSA keys). The API verifies tokens locally against `https://<ref>.supabase.co/auth/v1/.well-known/jwks.json` with `jose` (`createRemoteJWKSet`, cached), so there is no network call per request [verified: [Supabase JWT signing keys](https://supabase.com/blog/jwt-signing-keys)]. Checks: `iss`, `aud = authenticated`, `exp`, `role = authenticated`. The user id comes from `sub` and the session id from `session_id`.
- **Calendar and Zoom authorization is a separate OAuth flow owned by the API.** It is not Supabase Auth's provider token, because Supabase does not refresh provider tokens for us (it returns `provider_token`/`provider_refresh_token` once, at sign-in [unverified that this is still the current behaviour]). We need offline access with incremental consent. See [06-integrations.md](./06-integrations.md).

### 2.2 How this maps onto the current frontend `apiClient`

What the frontend assumes today (`lib/api`, `docs/conventions.md` section 9):

- The fetch adapter sends `credentials: "include"` (a backend httpOnly cookie).
- Optionally, `setAuthTokenProvider()` registers an in-memory bearer token source. The API client then sends `Authorization: Bearer`.
- `proxy.ts` routes on a non-sensitive `wid_session_hint` cookie.

**Recommendation: the Supabase session lives in cookies managed by `@supabase/ssr`, and the API is called with `Authorization: Bearer <access_token>` through `setAuthTokenProvider`.**

Why not a pure backend httpOnly-cookie session (a BFF):

1. The browser must upload capture chunks and large files directly to Supabase Storage (proxying audio through the API doubles bandwidth and adds failure modes), and it must join **private** Realtime channels. Both require a Supabase JWT in JavaScript. A BFF would have to hand the token to the browser anyway, which removes the httpOnly benefit.
2. Bearer tokens are not ambient credentials, so the API needs no CSRF protection and CORS can stay strict without credentials.
3. `@supabase/ssr` stores the session in cookies, not `localStorage`, which still satisfies the convention "no credentials in localStorage". These cookies are **not** httpOnly, because the browser client must read them. That is an explicit trade-off against XSS, mitigated in section 2.5.

Trade-off accepted: an XSS bug can steal the current access token (1-hour TTL) and the refresh token. A BFF would reduce that to "XSS can act as the user while the tab is open". Given points 1 and 2, the BFF does not remove the exposure, it only narrows it, at the cost of a proxy for all media. We revisit this only if we later stop uploading directly to Storage.

### 2.3 Sign-in flow (concrete)

```text
/login  ──"Continue with Google"──▶ supabase.auth.signInWithOAuth({
                                      provider: 'google',
                                      options: { redirectTo: `${APP_URL}/auth/callback?next=…`,
                                                 queryParams: { prompt: 'select_account', login_hint? } } })
        ──▶ Google account chooser (Google's own UI; replaces the mock chooser)
        ──▶ Supabase /auth/v1/callback ──▶ ${APP_URL}/auth/callback?code=…   (PKCE)
/auth/callback (Next.js route handler, server):
        supabase.auth.exchangeCodeForSession(code)        // sets sb-* cookies
        POST {API}/v1/auth/bootstrap  (Bearer)            // idempotent: profile, personal org, settings
          ← { session: AuthSession, isNewUser }
        redirect(getPostAuthPath(session.stage, next))    // /onboarding or /my-calls
```

Mapping onto `AuthService`:

| Method | Api implementation |
| --- | --- |
| `listGoogleAccounts()` | Returns `[]`. Google's chooser replaces the mock chooser, and the interface already allows this. |
| `signInWithGoogle(input)` | Calls `signInWithOAuth`. `input.loginHint` maps to `login_hint`; `intent: "register"` makes no difference to OAuth (the bootstrap reports `isNewUser`). **The returned promise never resolves, because the page navigates away.** The UI must treat the pending state as "redirecting". This is a documented interface caveat. |
| `signOut()` | `supabase.auth.signOut({ scope: 'local' })`, then `POST /v1/auth/sign-out` (audit plus best-effort discard of a live capture's client buffer). |
| `getCurrentUser()` | `GET /v1/me` (returns null on 401). |
| `getSession()` | `GET /v1/auth/session`, which returns `{ user, stage, expiresAt }`. |

### 2.4 Route guarding (`proxy.ts`)

Replace the mock hint cookie with real but still non-authoritative routing:

- In `proxy.ts`, create a `@supabase/ssr` server client from request cookies. It refreshes the session cookie when needed, which is the documented middleware/proxy pattern. Next 16 `proxy.ts` always runs on Node.js, which `@supabase/ssr` supports.
- Call `supabase.auth.getClaims()`. It verifies the JWT locally with asymmetric keys [verified: [getClaims](https://supabase.com/docs/reference/javascript/auth-getclaims)].
- Stage: add a **Custom Access Token Hook** (a Postgres function) that puts `app_stage: 'onboarding' | 'ready'` into the JWT from `profiles.onboarding_completed_at`. After `POST /onboarding/complete`, the frontend calls `supabase.auth.refreshSession()` so the next navigation sees `ready`.
- Keep `resolveRouteAccess()` unchanged. Only the input (stage) changes source. The `wid_session_hint` cookie can be removed.

### 2.5 XSS and token hardening

- A strict **CSP** on the Next.js app: `script-src 'self' 'nonce-…'`, no `unsafe-inline`, `connect-src` limited to the API, Supabase and the Realtime WSS endpoints. Use Next's nonce support.
- No third-party scripts on authenticated routes (analytics only on marketing pages).
- JWT TTL stays at 1 hour, with refresh-token rotation and reuse detection enabled (Supabase default [unverified: reuse interval setting]).
- `SameSite=Lax` and `Secure` on the `sb-*` cookies.

### 2.6 Active sessions (Security settings)

- `GET /v1/settings` assembles `security.sessions` with a SQL query (service role, scoped to `auth.uid()`) over `auth.sessions` (`id`, `created_at`, `updated_at`/`refreshed_at`, `user_agent`, `ip`). `isCurrent = (id = jwt.session_id)`. `device`/`browser` come from parsing the user agent. `location` is omitted at MVP.
- `revokeSession(id)`: `delete from auth.sessions where id = $1 and user_id = $2 and id <> current_session`. This revokes the refresh token, and the other device's access token dies within 1 hour or less. **[unverified]** Supabase does not document deleting one specific session through an official API. `auth.admin.signOut(jwt, scope)` signs out by JWT. Direct deletion works on GoTrue's schema today but is an internal detail. Risk logged in [07-roadmap.md](./07-roadmap.md).

## 3. Authorization model

### 3.1 Access rules (mirrors `MockDb.canAccess` exactly, adding org scoping)

A user **U** can read meeting **M** (not soft-deleted) if any of these is true:

1. **Owner:** `M.owner_id = U`.
2. **Explicit share:** an active `meeting_share_grants` row with `grantee_user_id = U` or `grantee_email = U's verified email`.
3. **Team visibility:** `M.visibility = 'team'` and U is a member of `M.org_id`. The mock treats "team" as everyone in the single workspace; we scope it to the meeting's organisation.
4. **Attendee visibility:** `M.visibility = 'attendees'` and U is a participant (`meeting_participants.user_id = U` or `email = U's verified email`) and that participant's contact is not in `meeting_share_exclusions`.
5. **Private by default:** none of the above means no access. New meetings default to `private` unless `user_settings.default_sharing = 'all_attendees'` (giving `attendees`), exactly as `defaultVisibility()` in the mock.
6. **Link share** (`link_token_hash`), only when `organizations.link_sharing_available`: grants **read-only** access to the meeting brief (not the transcript unless `share_transcript`, not audio unless `share_recording`) through `GET /v1/shared/:token`. That endpoint is served by the API with the service role after a constant-time token check. It is never an RLS path, so a guessed token cannot reach PostgREST.

Derived rules:

- **Write (update, delete, share, unshare, capture control, retry):** owner only (`requireOwnedMeeting` in the mock). Others get `forbidden`.
- **Child data** (transcript, insights, assistant, playlist reads) is readable if the meeting is readable. The transcript and audio additionally need `owner OR share_transcript / share_recording`.
- **Action items:** updating status, assignee or due date is allowed for the meeting owner **and** for the assignee (WID users assigned to an item can mark it done). The mock allows any viewer to edit. We narrow that. Confirm in [08-open-questions.md](./08-open-questions.md) Q9.
- **Alerts:** recipient only. **Playlist:** creator only, and an item is visible only while its meeting is still readable (mock behaviour).
- **Deals:** org members read; owner or org admin write. Signals are visible only if the source meeting is readable.
- **Invisible means `not_found`**, never `forbidden`. That is what `requireMeeting` does and it prevents id probing.

### 3.2 Backend-computed permissions

- `ShareSettings.canManage = (U = owner)`.
- `ShareRecipient.canRemove = canManage AND source in ('attendee','invited')`. Team-derived recipients are not removable ("Change visibility to remove them").
- Computed in `meetings/sharing.ts` from the same facts as the RLS helpers, and covered by the same test matrix (section 10). The UI never derives them.

## 4. RLS design

### 4.1 Helpers (in `app_private`, SECURITY DEFINER, `search_path = ''`, STABLE)

```sql
create or replace function app_private.uid() returns uuid language sql stable as
$$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;  -- or (select auth.uid())

create or replace function app_private.jwt_email() returns citext language sql stable as
$$ select lower(coalesce(auth.jwt() ->> 'email', ''))::citext $$;

create or replace function app_private.is_org_member(p_org uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.organization_members
                 where org_id = p_org and user_id = (select auth.uid()))
$$;

create or replace function app_private.can_read_meeting(p_meeting uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.meetings m
    where m.id = p_meeting and m.deleted_at is null and (
          m.owner_id = (select auth.uid())
       or exists (select 1 from public.meeting_share_grants g
                  where g.meeting_id = m.id and g.revoked_at is null
                    and (g.grantee_user_id = (select auth.uid()) or g.grantee_email = app_private.jwt_email()))
       or (m.visibility = 'team' and app_private.is_org_member(m.org_id))
       or (m.visibility = 'attendees' and exists (
             select 1 from public.meeting_participants p
             where p.meeting_id = m.id
               and (p.user_id = (select auth.uid()) or p.email = app_private.jwt_email())
               and not exists (select 1 from public.meeting_share_exclusions x
                               where x.meeting_id = m.id and x.contact_id = p.contact_id)))
    ))
$$;

create or replace function app_private.is_meeting_owner(p_meeting uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.meetings where id = p_meeting and owner_id = (select auth.uid()) and deleted_at is null)
$$;

create or replace function app_private.can_read_transcript(p_meeting uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select app_private.is_meeting_owner(p_meeting)
      or (app_private.can_read_meeting(p_meeting)
          and exists (select 1 from public.meetings where id = p_meeting and share_transcript))
$$;

-- Set-returning variant for search / list prefilters (one evaluation per statement)
create or replace function app_private.readable_meeting_ids() returns setof uuid
language sql stable security definer set search_path = '' as $$
  select m.id from public.meetings m where m.deleted_at is null and (
        m.owner_id = (select auth.uid())
     or m.id in (select meeting_id from public.meeting_share_grants
                 where revoked_at is null and (grantee_user_id = (select auth.uid()) or grantee_email = app_private.jwt_email()))
     or (m.visibility = 'team' and m.org_id in (select org_id from public.organization_members where user_id = (select auth.uid())))
     or (m.visibility = 'attendees' and m.id in (
           select p.meeting_id from public.meeting_participants p
           where (p.user_id = (select auth.uid()) or p.email = app_private.jwt_email())
             and not exists (select 1 from public.meeting_share_exclusions x where x.meeting_id = p.meeting_id and x.contact_id = p.contact_id))))
$$;
grant execute on all functions in schema app_private to authenticated;  -- functions only; no table grants
```

Notes:

- `(select auth.uid())` instead of a bare `auth.uid()` lets Postgres evaluate it once per statement (Supabase's documented RLS performance advice).
- Matching on email relies on Google-verified emails. Email/password sign-up is disabled. If another provider is ever added, require `email_confirmed_at` before honouring email matches.
- `security definer` helpers bypass RLS internally, which avoids recursive policy evaluation. They return booleans or ids only, never data.

### 4.2 Policies (representative; every public table has RLS enabled and a policy set)

```sql
alter table public.meetings enable row level security;
create policy meetings_select on public.meetings for select to authenticated
  using (app_private.can_read_meeting(id));
create policy meetings_insert on public.meetings for insert to authenticated
  with check (owner_id = (select auth.uid()) and app_private.is_org_member(org_id));
create policy meetings_update on public.meetings for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy meetings_delete on public.meetings for delete to authenticated
  using (owner_id = (select auth.uid()));

-- Child tables of a meeting: read follows the meeting; writes only via RPC/worker
create policy participants_select on public.meeting_participants for select to authenticated
  using (app_private.can_read_meeting(meeting_id));
create policy segments_select on public.transcript_segments for select to authenticated
  using (app_private.can_read_transcript(meeting_id));
create policy decisions_select on public.decisions for select to authenticated
  using (app_private.can_read_meeting(meeting_id));
-- same select policy for key_points, questions, risks, key_moments, topics, summaries, meeting_tags,
-- processing_runs, processing_steps, transcripts (transcripts use can_read_transcript)

create policy action_items_select on public.action_items for select to authenticated
  using (app_private.can_read_meeting(meeting_id));
create policy action_items_update on public.action_items for update to authenticated
  using (app_private.is_meeting_owner(meeting_id)
         or assignee_contact_id in (select id from public.contacts where user_id = (select auth.uid())))
  with check (app_private.can_read_meeting(meeting_id));
create policy action_items_delete on public.action_items for delete to authenticated
  using (app_private.is_meeting_owner(meeting_id));

create policy share_grants_owner on public.meeting_share_grants for all to authenticated
  using (app_private.is_meeting_owner(meeting_id)) with check (app_private.is_meeting_owner(meeting_id));
create policy share_grants_self on public.meeting_share_grants for select to authenticated
  using (grantee_user_id = (select auth.uid()));

create policy playlist_owner on public.playlist_items for all to authenticated
  using (user_id = (select auth.uid()) and app_private.can_read_meeting(meeting_id))
  with check (user_id = (select auth.uid()) and app_private.can_read_meeting(meeting_id));

create policy alerts_recipient on public.alerts for select to authenticated using (user_id = (select auth.uid()));
create policy alerts_recipient_upd on public.alerts for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy deals_select on public.deals for select to authenticated using (app_private.is_org_member(org_id));
create policy deals_write on public.deals for update to authenticated
  using (owner_id = (select auth.uid()) or exists (select 1 from public.organization_members
         where org_id = deals.org_id and user_id = (select auth.uid()) and role in ('owner','admin')));
create policy deal_signals_select on public.deal_signals for select to authenticated
  using (app_private.can_read_meeting(meeting_id)
         and exists (select 1 from public.deals d where d.id = deal_id and app_private.is_org_member(d.org_id)));

create policy profiles_self on public.profiles for select to authenticated using (id = (select auth.uid())
  or id in (select om2.user_id from public.organization_members om1
            join public.organization_members om2 using (org_id) where om1.user_id = (select auth.uid())));
create policy profiles_self_upd on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy settings_self on public.user_settings for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy integrations_self on public.integrations for select to authenticated using (user_id = (select auth.uid()));
create policy calendar_events_self on public.calendar_events for select to authenticated using (user_id = (select auth.uid()));
create policy assistant_self on public.assistant_messages for select to authenticated
  using (user_id = (select auth.uid()) and app_private.can_read_meeting(meeting_id));
create policy embeddings_none on public.embedding_chunks for select to authenticated
  using (app_private.can_read_transcript(meeting_id));   -- read only via search RPC in practice
```

Tables with **no** `authenticated` write policy (`meetings` child insight tables on insert, `transcript_segments`, `processing_*`, `embedding_chunks`, `capture_chunks`) are written by the worker (service role) or by `security definer` RPC functions that check ownership explicitly. Examples: `app_private.start_capture`, `stop_capture`, `share_meeting`. Simple single-row updates (action item toggle, alert read) use the user-scoped client directly under the update policies.

### 4.3 RPC functions for atomic request-path writes

The API calls these with the **user-scoped** client (`supabase.rpc(...)`). Each one re-checks authorization itself (`is_meeting_owner(...)`) because it is `security definer`:

| Function | Does atomically |
| --- | --- |
| `app_private.bootstrap_user()` | profile, personal org, membership, self contact, settings, onboarding, google integration row, back-fill of email-based grants |
| `app_private.start_capture(input jsonb)` | creates or attaches the meeting (mock `startCaptureOp` rules), participants from calendar attendees, `capture_sessions` row, conflict on an existing live session |
| `app_private.stop_capture(meeting_id, client_elapsed, last_seq)` | session to `finalizing`, meeting `capturing/paused` to `processing`, creates the `processing_run` and steps, `ops.enqueue_job('capture','capture.assemble',…)` |
| `app_private.discard_capture(meeting_id)` | deletes the meeting (if `created_meeting`) or resets it to `ready_to_capture`; enqueues storage cleanup |
| `app_private.retry_processing(meeting_id)` | `failed` to `processing`, `attempt+1`, resets failed and later steps to `pending`, enqueues from the first incomplete step |
| `app_private.share_meeting(meeting_id, visibility, invite_emails[], link_enabled)` | the mock `share()` semantics including clearing exclusions, plus creates `meeting_shared` alerts for invited WID users |
| `app_private.unshare(meeting_id, recipient_id)` | revoke a grant or insert an exclusion; rejects team recipients |
| `app_private.delete_meeting(meeting_id)` | soft-delete, cancel queued jobs, enqueue storage purge, clean alert targets (mock `deleteMeetingOp`) |

These functions are exposed through PostgREST under an `api` schema containing thin wrappers, or by granting execute on specific functions. Never expose a blanket `app_private`.

## 5. Token encryption at rest

**Recommendation: application-level envelope encryption in the API, not pgsodium.**

- pgsodium is **pending deprecation** on Supabase and its Transparent Column Encryption is not recommended. Vault remains supported, with a stable API [verified: [pgsodium docs](https://supabase.com/docs/guides/database/extensions/pgsodium), [discussion #27109](https://github.com/orgs/supabase/discussions/27109)].
- Vault is designed for a handful of project secrets, not thousands of per-user rows that rotate hourly.
- Design:
  - Data key per token: random 256-bit DEK. AES-256-GCM encrypts the token. The DEK is wrapped with a **KEK** from `TOKEN_ENCRYPTION_KEYS` (env, held in the platform secret manager). When we move to a cloud KMS (AWS KMS / GCP KMS), only the wrap and unwrap calls change.
  - Stored as `key_version || iv || wrapped_dek || ciphertext || tag` in `bytea`. Additional authenticated data = `integration_id || provider`, so a ciphertext cannot be swapped between rows.
  - The table lives in `app_private` with no grants. Only the worker and API (service role) access it, through `integrations/vault.ts`.
  - Key rotation: add `v2`, make it active, and a `retention` job re-wraps rows. Decryption accepts any known version.
- Tokens are never logged, never returned by any endpoint, and never placed in job payloads (jobs carry `integration_id` only).

## 6. Service-role boundaries

The service-role key bypasses RLS. It is allowed only in:

1. **Worker** (all handlers). Every handler loads its scope from the job payload (`meeting_id`, `run_id`) and must not read rows outside that scope. Every insert sets `org_id` and `meeting_id` from the loaded meeting, never from model output.
2. **API modules:** `integrations/vault`, `webhooks/*` (no user context), `shared/:token` (link shares), `auth/bootstrap` (via the SQL function), `settings/sessions` (`auth.sessions`), `recordings/signed-urls` (after an explicit `can_read_*` check through the user client).
3. **Migrations and CI.**

Enforcement: `common/supabase.ts` exports `userClient(req)` and `serviceClient`. An ESLint `no-restricted-imports` rule allows `serviceClient` only in the paths above. A code-review checklist item: "any new service-role call states why RLS can't apply".

## 7. Storage security

| Bucket | Public | Who writes | Who reads | Path |
| --- | --- | --- | --- | --- |
| `capture-chunks` | no | browser (user JWT), insert only, path must match a live `capture_sessions.storage_prefix` owned by the user (storage RLS policy calls `app_private.owns_live_capture_prefix(name)`) | worker (service role) | `{org}/{meeting}/{session}/{part:04}-{seq:06}.webm` |
| `recordings` | no | browser via TUS for manual uploads (path pre-registered by the API, same policy pattern); worker for assembled and normalised files | API issues **signed URLs** (TTL 1 hour) after `can_read_transcript` and `share_recording` checks | `{org}/{meeting}/{recording}/original.*`, `audio.webm` (Opus), `video.webm` |
| `avatars` | public-read via signed or transformed URLs, or a public bucket | API (`POST /me/avatar`) | anyone with the URL | `{user}/{hash}.webp` |

```sql
create or replace function app_private.owns_live_capture_prefix(p_name text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.capture_sessions s
                 where s.user_id = (select auth.uid())
                   and s.status in ('active','paused','interrupted','finalizing')
                   and p_name like (s.storage_prefix || '%')
                   and p_name !~ '\.\.')                       -- no path traversal
$$;
create policy capture_chunks_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'capture-chunks' and app_private.owns_live_capture_prefix(name));
-- recordings: same pattern with app_private.owns_pending_upload(name) over recordings.status = 'uploading'
-- no select/update/delete policies for authenticated on these buckets (reads go through signed URLs)
```

`storage_prefix` is stored **without** the bucket name (`{org}/{meeting}/{session}/`), because `storage.objects.name` excludes the bucket.

- Bucket file-size limits: `capture-chunks` 8 MB, `recordings` 4 GB (Pro plan or higher; up to 500 GB is configurable [verified: [Storage limits](https://supabase.com/docs/guides/storage/uploads/file-limits)]). Allowed MIME types are set per bucket.
- Signed playback URLs are minted per `GET /meetings/:id` response for permitted viewers and logged to `ops.audit_log` (`recording.signed_url`) for the owner's later review.
- Audio is never public, never linked in emails and never sent to third parties other than the configured ASR or LLM provider (see Q1 in [08-open-questions.md](./08-open-questions.md) for the hosted-AI data-processing implications).

## 8. Realtime channel authorization

Private channels only, with RLS on `realtime.messages`:

```sql
create policy rt_user_channel on realtime.messages for select to authenticated
  using (realtime.topic() = 'user:' || (select auth.uid())::text);
create policy rt_meeting_channel on realtime.messages for select to authenticated
  using (realtime.topic() like 'meeting:%'
         and app_private.can_read_meeting(substring(realtime.topic() from 9)::uuid));
-- no insert policy: clients cannot broadcast; only DB triggers (realtime.send) emit
```

The client sets `private: true` and calls `supabase.realtime.setAuth()` so the JWT is sent [verified: [Realtime Authorization](https://supabase.com/docs/guides/realtime/authorization)]. Payloads carry ids and statuses only.

## 9. Privacy, retention, deletion, GDPR basics

- **Data minimisation:** no calendar descriptions, no attendee data beyond name, email and response. No raw prompts or transcripts in logs.
- **Retention:**
  - `recording_retention_days` (per user, null keeps until deleted) sets `recordings.retention_expires_at`. A daily job deletes the Storage objects and sets `deleted_at`. Transcripts and insights stay, because the setting covers recordings only (it says "Days recordings are retained"). Make this explicit in the settings copy.
  - `capture_mode='transcript_only'`: audio objects are deleted as soon as the transcript commits (the job `retention.purge_audio` is enqueued by the pipeline).
  - Capture chunks are deleted after successful assembly, and at most 7 days after an abandoned session.
  - Assistant history and alerts are deleted with their meeting. Alerts are also purged after 180 days.
  - `ops.webhook_events` is kept for 30 days, `ops.jobs` (terminal) for 14 days, `ops.audit_log` for 1 year (contains no content).
- **Meeting deletion:** soft delete (hidden immediately, `not_found` everywhere), then a purge job hard-deletes rows (cascades) and Storage objects within 24 hours. Embeddings cascade.
- **Account deletion (GDPR erasure):** `DELETE /v1/me`, then a 7-day grace period (`profiles.deleted_at`), then a purge job deletes owned meetings, recordings, tokens (with revocation calls to Google and Zoom), settings and the auth user. **Meetings owned by others that mention the user are not deleted.** The user's contact record is anonymised (`display_name='Former member'`, email null) only if they are not an external participant in someone else's meeting. Legal review is needed on how far erasure reaches into others' meeting content.
- **Export (GDPR access and portability):** `POST /v1/me/export` produces a job that builds a ZIP (JSON plus transcripts) delivered by a signed URL. Planned for M10.
- **Backups:** Supabase daily backups, plus PITR in prod. Deleted data persists in backups until they rotate out, which the privacy policy must state.
- **Sub-processors:** Supabase, the host, any hosted ASR or LLM provider, and the email provider. These go in the DPA and privacy policy.

## 10. Authorization test matrix (must pass in CI)

pgTAP (RLS) plus API integration tests (computed permissions), with fixtures for: owner O; teammate T (same org, not a participant); attendee A (WID user, participant); excluded attendee X; invited external E (email grant, not yet signed up, then signed up); stranger S (other org); assignee Y.

For each visibility (private, attendees, team), each actor and each operation (read meeting, read transcript, read audio URL, update, share, unshare, toggle action, add playlist, ask assistant, search hit, deal signal visibility) the expected result is asserted. The mock's behaviour is the oracle for overlapping cases. The test file lives at `supabase/tests/rls_meetings.test.sql` and mirrors `src/services/mock/meeting-service.ts` `inScope` and `canAccess`.

## 11. Abuse controls

- Rate limits as in [01-architecture.md](./01-architecture.md) section 9.
- Upload caps: a capture session is at most 4 hours (configurable) and chunks at most 8 MB; manual uploads at most 2 GB and 4 hours of media (checked with `ffprobe` before ASR; over the limit means failure with a clear message).
- Concurrency caps: at most 1 live capture per user (unique index) and at most 3 meetings processing per user at once (later ones queue).
- Daily AI quotas: 300 assistant questions and 50 follow-ups per user per day (tunable).
- Share invites: at most 50 emails per request and 200 per day per user. Inviting is the main spam vector, so emails to non-users are sent only after the email feature ships, and each is rate-limited.
- Webhooks: signature verification **before** parsing heavy payloads, and per-IP limits.

## 12. Recording consent (flagged, not legal advice)

The product records conversations involving people who are not WID users. Legal exposure depends on the participants' jurisdictions, not only the user's:

- **All-party (two-party) consent jurisdictions** exist in several US states (for example California, Florida, Illinois, Pennsylvania and Washington are commonly cited) and in other countries. Recording without every participant's consent can be a criminal offence in some of them.
- **GDPR (EU/UK):** voice recordings and transcripts are personal data. A lawful basis is needed (often legitimate interest or consent), along with transparency to participants, and possibly a DPIA for systematic recording plus AI analysis. Voice used to identify speakers can be biometric data, which bears on any future voice-print speaker identification. **We do not build voice prints in the MVP for this reason.**
- **Pakistan and other markets** relevant to the demo persona: obtain local counsel advice. We make no claims here.

Product controls we build regardless of the legal outcome:

1. `confirmBeforeCapture` (default on): the start-capture dialog includes "I've let everyone know this meeting is being captured", and the attestation is stored in `capture_sessions.consent_attested_at`. The API rejects `start` without it when the setting is on.
2. A copyable notice ("This meeting is being captured by WID for notes. Let me know if you'd prefer not.") for the meeting chat. Bots that announce themselves are out of scope (see [05-capture-and-pipeline.md](./05-capture-and-pipeline.md) section 2).
3. Zoom cloud recordings already show Zoom's own recording notice to participants, so the Zoom import path carries the least risk.
4. A participant data-request process: anyone in a recording can ask the owner or WID for deletion. A support runbook is written in M10.
5. Terms of Service must put the consent obligation on the user. Counsel must review the ToS, the privacy policy and the in-product copy before public launch. This is a launch blocker in [07-roadmap.md](./07-roadmap.md).
