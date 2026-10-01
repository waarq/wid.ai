# 02. Data model

Status: draft v1. This is a **schema draft**. It is complete enough to write the first migrations from, but expect column-level changes during M1 to M6. RLS policies are in [03-security-rls.md](./03-security-rls.md). Pipeline semantics are in [05-capture-and-pipeline.md](./05-capture-and-pipeline.md).

## 0. Principles

1. **Traceability is enforced by the database, not by convention.** Every insight row (`key_points`, `decisions`, `action_items`, `questions`, `risks`, `key_moments`, `topics`, `deal_signals`, `playlist_items`, `assistant_answer_sources`, and summary evidence) has `meeting_id NOT NULL`, `source_segment_id NOT NULL` and `source_timestamp NOT NULL`. A **composite foreign key** `(meeting_id, source_segment_id) -> transcript_segments(meeting_id, id)` guarantees that the segment exists *and belongs to the same meeting*. A shared trigger checks that `source_timestamp` falls inside the segment (plus or minus 0.5 s, matching the mock's playlist validation). An insight without evidence cannot be inserted.
2. **Times.** Media offsets are `numeric(10,3)` seconds (millisecond precision, exact, no float drift). They are serialised to the API as JSON numbers. Wall-clock instants are `timestamptz` (ISO strings in the API). Due dates are `date` (`ISODate`).
3. **IDs** are `uuid` (`gen_random_uuid()`). The frontend treats ids as opaque strings, so the mock's prefixed ids (`mtg_…`) carry no meaning the backend has to reproduce. Keyset pagination uses `(sort_key, id)`.
4. **`PersonRef.id` and `Participant.id` are always `contacts.id`.** `User.id` is `auth.users.id`. This keeps the mock's rule that a participant id is stable across meetings (`per_sara` appears in many meetings) and that `TranscriptSegment.speakerId == Participant.id`.
5. **Tenancy.** Every domain row carries `org_id` (directly or through its meeting). Every user gets a personal organisation at sign-up. See [08-open-questions.md](./08-open-questions.md) Q4 for when multi-member orgs launch.
6. **Schemas.** `public` holds domain tables (exposed to PostgREST, RLS on every table). `app_private` holds RLS helpers, encrypted credentials and OAuth state, with no grants to `anon` or `authenticated`. `ops` holds jobs, idempotency, audit and webhook inbox (not exposed, service role or direct SQL only).
7. **Processing runs are versioned.** Transcripts and insights belong to a `processing_run`. `meetings.current_run_id` selects what the API shows. A retry that resumes from a failed step reuses the run. A future "reprocess" creates a new run, so playlist items and edited action items from the old run are never deleted out from under the user.

---

## 1. Extensions, schemas, shared types

```sql
-- 20261001000000_extensions_and_types.sql
create extension if not exists citext;
create extension if not exists pg_trgm;
create extension if not exists vector;        -- pgvector (HNSW requires >= 0.5; iterative scans need 0.8 [unverified on our Supabase version])
create extension if not exists pg_cron;       -- Supabase: enable via dashboard/config as well

create schema if not exists app_private;
create schema if not exists ops;
revoke all on schema app_private, ops from public, anon, authenticated;

create type email_type            as enum ('company','personal');
create type job_function          as enum ('sales','engineering','product','marketing','customer_success',
                                           'operations','management','consulting','recruiting','executive','other');
create type org_kind              as enum ('personal','company');
create type org_role              as enum ('owner','admin','member');
create type meeting_status        as enum ('upcoming','ready_to_capture','capturing','paused',
                                           'processing','transcribing','understanding','ready','failed');
create type meeting_visibility    as enum ('private','attendees','team');
create type capture_mode          as enum ('audio','video','transcript_only');
create type conference_provider   as enum ('zoom','google_meet','microsoft_teams','in_person','other');
create type participant_role      as enum ('host','attendee','guest');
create type participant_source    as enum ('owner','calendar','manual','diarization','zoom');
create type contact_kind          as enum ('person','unidentified_speaker');
create type capture_session_status as enum ('active','paused','interrupted','finalizing','finalized','discarded','failed');
create type recording_source      as enum ('browser_capture','file_upload','zoom_cloud');
create type recording_status      as enum ('uploading','assembling','ready','failed','deleted');
create type processing_step_id    as enum ('upload','transcribe','understand','extract_decisions','extract_actions');
create type processing_step_status as enum ('pending','active','complete','failed');
create type processing_run_status as enum ('queued','running','succeeded','failed','cancelled');
create type processing_trigger    as enum ('capture_stop','file_upload','zoom_import','retry','reprocess');
create type transcript_status     as enum ('pending','ready','failed');
create type action_item_status    as enum ('open','in_progress','completed','dismissed');
create type question_status       as enum ('open','answered');
create type risk_severity         as enum ('low','medium','high');
create type key_moment_type       as enum ('decision','commitment','risk','question','insight');
create type insight_origin        as enum ('ai','user');
create type playlist_item_kind    as enum ('highlight','decision','commitment','quote','insight','timestamp');
create type alert_type            as enum ('meeting_ready','processing_failed','action_due','mention',
                                           'decision_changed','meeting_shared','deal_update',
                                           'zoom_recording_available','capture_interrupted'); -- last two: frontend gap
create type deal_stage            as enum ('new','discovery','qualified','proposal','negotiation','won','lost');
create type deal_signal_kind      as enum ('interest','concern','objection','decision_maker','budget','timeline','competitor','question');
create type deal_signal_sentiment as enum ('positive','negative','neutral');
create type currency_code         as enum ('USD','EUR','GBP','PKR','AED');
create type integration_provider  as enum ('google','google_calendar','zoom','slack','microsoft_calendar','hubspot','salesforce');
create type integration_status    as enum ('connected','disconnected','error','revoked');
create type attendee_response     as enum ('accepted','declined','tentative','needs_action');
create type sharing_preference    as enum ('all_attendees','only_me');
create type capture_preference    as enum ('all_calendar_meetings','selected_meetings','manual');
create type summary_length        as enum ('brief','standard','detailed');
create type theme_preference      as enum ('light','dark','system');
create type density_preference    as enum ('comfortable','compact');

-- updated_at helper
create or replace function app_private.touch_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at := now(); return new; end $$;
```

Enum policy: Postgres enums can gain values (`ALTER TYPE ... ADD VALUE`) but cannot drop them. Every value above mirrors a `const` array in `src/types`. `packages/contracts` has a test that fails when the two drift.

---

## 2. Identity, organisations, people

```sql
create table public.profiles (
  id                     uuid primary key references auth.users(id) on delete cascade,
  email                  citext not null,
  first_name             text not null default '' check (char_length(first_name) <= 60),
  last_name              text not null default '' check (char_length(last_name) <= 60),
  avatar_path            text,                               -- storage path in bucket 'avatars'
  email_type             email_type,                         -- null until answered (never inferred)
  job_function           job_function,
  timezone               text not null default 'UTC',        -- IANA; validated in API (Intl)
  onboarding_completed_at timestamptz,
  default_org_id         uuid,                               -- FK added after organizations
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  deleted_at             timestamptz                         -- soft delete during erasure grace period
);
create unique index profiles_email_uq on public.profiles (email) where deleted_at is null;

create table public.organizations (
  id                     uuid primary key default gen_random_uuid(),
  name                   text not null check (char_length(name) between 1 and 120),
  kind                   org_kind not null,
  link_sharing_available boolean not null default false,      -- ShareSettings/SharingSettings.linkSharingAvailable
  created_by             uuid references public.profiles(id) on delete set null,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
alter table public.profiles add constraint profiles_default_org_fk
  foreign key (default_org_id) references public.organizations(id) on delete set null;

create table public.teams (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references public.organizations(id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 60),
  created_at timestamptz not null default now(),
  unique (org_id, name)
);

create table public.organization_members (
  org_id     uuid not null references public.organizations(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  role       org_role not null default 'member',
  team_id    uuid references public.teams(id) on delete set null,  -- WorkspaceMember.team (single team)
  joined_at  timestamptz not null default now(),
  primary key (org_id, user_id)
);
create index organization_members_user_idx on public.organization_members (user_id);

create table public.organization_invitations (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations(id) on delete cascade,
  email       citext not null,
  role        org_role not null default 'member',
  invited_by  uuid references public.profiles(id) on delete set null,
  token_hash  bytea not null unique,
  expires_at  timestamptz not null,
  accepted_at timestamptz,
  created_at  timestamptz not null default now()
);

-- People registry per org. Participant.id / PersonRef.id / speakerId all point here.
create table public.contacts (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.organizations(id) on delete cascade,
  kind         contact_kind not null default 'person',
  user_id      uuid references public.profiles(id) on delete set null,  -- set when the person is a WID user
  email        citext,
  display_name text not null check (char_length(display_name) between 1 and 120),
  company      text,
  is_external  boolean not null default true,
  avatar_url   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint contacts_unidentified_no_email check (kind = 'person' or email is null)
);
create unique index contacts_org_email_uq on public.contacts (org_id, email) where email is not null;
create unique index contacts_org_user_uq  on public.contacts (org_id, user_id) where user_id is not null;
create index contacts_name_trgm on public.contacts using gin (display_name gin_trgm_ops);
```

Sign-up bootstrap (`POST /v1/auth/bootstrap`, a SQL function `app_private.bootstrap_user(uid)`, idempotent):

1. Insert `profiles` from `auth.users` (email and name from Google `raw_user_meta_data`).
2. Create a personal `organizations` row (`kind='personal'`), an `organization_members` row with role `owner`, and a `contacts` row with `user_id = uid`, `is_external = false`.
3. Insert `user_settings`, `onboarding_progress`, and `integrations(provider='google', status='connected')`.
4. Back-fill access: set `contacts.user_id` and `meeting_share_grants.grantee_user_id` where the email matches, in every org. This is how a person invited by email before signing up gains access.

When the user answers `emailType='company'` and later accepts an org invitation, the personal org remains. `profiles.default_org_id` switches to the company org (see Q4 in [08-open-questions.md](./08-open-questions.md)).

---

## 3. Onboarding and settings

```sql
create table public.onboarding_progress (
  user_id         uuid primary key references public.profiles(id) on delete cascade,
  current_step    text not null default 'email_type'
                  check (current_step in ('email_type','calendar','capture','sharing','focus','job_function','personalize','zoom')),
  completed_steps text[] not null default '{}',
  skipped_steps   text[] not null default '{}',
  data            jsonb not null default '{}'::jsonb,   -- Partial<OnboardingData>; validated by Zod in API
  completed_at    timestamptz,
  updated_at      timestamptz not null default now()
);

-- One row per user. Columns (not jsonb) where backend logic reads them.
create table public.user_settings (
  user_id                         uuid primary key references public.profiles(id) on delete cascade,
  -- meetings
  default_sharing                 sharing_preference not null default 'only_me',
  meeting_focus                   text[] not null default '{decisions,action_items,questions}',
  -- capture (manualCapture is the literal true: not stored)
  capture_preference              capture_preference not null default 'manual',
  selected_meeting_categories     text[] not null default '{}',
  default_capture_mode            capture_mode not null default 'audio',
  confirm_before_capture          boolean not null default true,
  -- sharing (linkSharingAvailable comes from organizations)
  include_transcript_when_sharing boolean not null default true,
  include_recording_when_sharing  boolean not null default false,
  allow_recipients_to_reshare     boolean not null default false,
  -- ai
  ai_priorities                   text[] not null default '{decisions,action_items,questions}',
  summary_length                  summary_length not null default 'standard',
  personalize_by_job_function     boolean not null default true,
  show_suggested_questions        boolean not null default true,
  -- notifications
  notify_processing_completed     boolean not null default true,
  notify_action_item_reminders    boolean not null default true,
  notify_mentions                 boolean not null default true,
  notify_shared_meetings          boolean not null default true,
  notify_deal_updates             boolean not null default false,
  notify_weekly_summary           boolean not null default true,
  channel_in_app                  boolean not null default true,
  channel_email                   boolean not null default false,
  -- security
  recording_retention_days        integer default 90 check (recording_retention_days between 1 and 3650), -- null = keep until deleted; 90 matches mock-data default
  -- appearance
  theme                           theme_preference not null default 'system',
  density                         density_preference not null default 'comfortable',
  -- onboarding extras
  onboarding_goals                text[] not null default '{}',
  updated_at                      timestamptz not null default now()
);
```

`meeting_focus`, `ai_priorities` and the category and goal arrays are `text[]` validated by Zod against the frontend `const` arrays. An array of enums is possible but makes adding a value a two-step migration for little benefit.

`SecuritySettings.sessions` (the `ActiveSession[]` list) is **not stored by us**. It is read from `auth.sessions` (see [03-security-rls.md](./03-security-rls.md) section 2.6).

---

## 4. Integrations and encrypted tokens

```sql
create table public.integrations (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.profiles(id) on delete cascade,
  provider            integration_provider not null,
  status              integration_status not null default 'disconnected',
  account_label       text,                          -- "waleed@company.com"
  external_account_id text,                          -- Google sub / Zoom user id
  scopes              text[] not null default '{}',  -- real OAuth scopes granted
  settings            jsonb,                         -- IntegrationSettingsMap[P]; Zod-validated
  connected_at        timestamptz,
  last_error_code     text,
  last_error_at       timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (user_id, provider)
);
create index integrations_zoom_account_idx on public.integrations (provider, external_account_id);

-- Never exposed. Envelope-encrypted by the API (AES-256-GCM); see 03-security-rls.md section 5.
create table app_private.integration_credentials (
  integration_id        uuid primary key references public.integrations(id) on delete cascade,
  key_version           smallint not null,
  access_token_ct       bytea not null,
  refresh_token_ct      bytea,
  token_expires_at      timestamptz,
  refresh_failed_count  smallint not null default 0,
  updated_at            timestamptz not null default now()
);

create table app_private.oauth_states (
  state_hash         bytea primary key,             -- sha256(state)
  user_id            uuid not null references public.profiles(id) on delete cascade,
  provider           integration_provider not null,
  code_verifier_ct   bytea not null,                -- PKCE verifier, encrypted
  redirect_after     text not null,                 -- validated same-origin path
  expires_at         timestamptz not null,          -- now() + 10 min
  created_at         timestamptz not null default now()
);
```

`coming_soon` is never stored. The API lists every provider in `INTEGRATION_PROVIDERS` and reports `coming_soon` for those not in `AVAILABLE_INTEGRATION_PROVIDERS`.

---

## 5. Calendar

```sql
create table public.calendars (
  id                    uuid primary key default gen_random_uuid(),
  integration_id        uuid not null references public.integrations(id) on delete cascade,
  user_id               uuid not null references public.profiles(id) on delete cascade,
  provider_calendar_id  text not null,                 -- 'primary' or the calendar id
  summary               text,
  is_primary            boolean not null default false,
  selected              boolean not null default true,  -- settings.syncedCalendarIds
  time_zone             text,
  sync_token            text,                          -- Google nextSyncToken (opaque)
  last_full_sync_at     timestamptz,
  last_incremental_sync_at timestamptz,
  watch_channel_id      uuid,
  watch_resource_id     text,
  watch_token_hash      bytea,                          -- verifies X-Goog-Channel-Token
  watch_expires_at      timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (integration_id, provider_calendar_id)
);
create index calendars_watch_expiry_idx on public.calendars (watch_expires_at) where watch_channel_id is not null;

create table public.calendar_events (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references public.profiles(id) on delete cascade,
  calendar_id          uuid not null references public.calendars(id) on delete cascade,
  provider_event_id    text not null,                -- instance id when singleEvents=true
  ical_uid             text,
  recurring_event_id   text,                         -- set for instances of a series
  title                text not null default '(No title)',
  starts_at            timestamptz not null,
  ends_at              timestamptz not null,
  is_all_day           boolean not null default false,
  event_time_zone      text,
  status               text not null default 'confirmed' check (status in ('confirmed','tentative','cancelled')),
  organizer_email      citext,
  conference_provider  conference_provider,
  join_url             text,
  is_recurring         boolean not null default false,
  provider_updated_at  timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (calendar_id, provider_event_id),
  check (ends_at >= starts_at)
);
create index calendar_events_user_time_idx on public.calendar_events (user_id, starts_at);

create table public.calendar_event_attendees (
  event_id     uuid not null references public.calendar_events(id) on delete cascade,
  email        citext not null,
  name         text,
  response     attendee_response not null default 'needs_action',
  is_organizer boolean not null default false,
  primary key (event_id, email)
);
```

We deliberately do **not** store event descriptions or attachments. The PRD's permission explainer promises "titles, times, attendees". Data minimisation also reduces GDPR scope.

---

## 6. Meetings, participants, sharing, tags

```sql
create table public.meetings (
  id                   uuid primary key default gen_random_uuid(),
  org_id               uuid not null references public.organizations(id) on delete cascade,
  owner_id             uuid not null references public.profiles(id) on delete cascade,
  owner_contact_id     uuid not null references public.contacts(id),   -- Meeting.owner.id
  title                text not null check (char_length(btrim(title)) between 1 and 200),
  status               meeting_status not null,
  visibility           meeting_visibility not null default 'private',
  platform             conference_provider not null default 'other',
  capture_mode         capture_mode not null default 'audio',
  calendar_event_id    uuid references public.calendar_events(id) on delete set null,
  scheduled_start_at   timestamptz,
  scheduled_end_at     timestamptz,
  started_at           timestamptz not null,           -- Meeting.startedAt (scheduled while upcoming)
  ended_at             timestamptz,
  duration_seconds     numeric(10,3) not null default 0 check (duration_seconds >= 0),
  language             text,                           -- BCP 47 detected by ASR
  share_transcript     boolean not null default true,  -- snapshot of owner's includeTranscriptWhenSharing
  share_recording      boolean not null default false, -- snapshot of includeRecordingWhenSharing
  current_run_id       uuid,                           -- FK added after processing_runs
  link_token_hash      bytea unique,                   -- "Anyone with the link" (null = off)
  link_created_at      timestamptz,
  search_tsv           tsvector,                       -- title + participants + tags + summary (trigger-maintained)
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  deleted_at           timestamptz,
  constraint meetings_link_pair check ((link_token_hash is null) = (link_created_at is null))
);
create unique index meetings_calendar_event_uq on public.meetings (owner_id, calendar_event_id)
  where calendar_event_id is not null and deleted_at is null;
create index meetings_owner_started_idx on public.meetings (owner_id, started_at desc, id desc) where deleted_at is null;
create index meetings_org_visibility_idx on public.meetings (org_id, visibility, started_at desc) where deleted_at is null;
create index meetings_status_idx on public.meetings (status) where status in ('capturing','paused','processing','transcribing','understanding');
create index meetings_search_idx on public.meetings using gin (search_tsv);
create trigger meetings_touch before update on public.meetings for each row execute function app_private.touch_updated_at();

create table public.meeting_participants (
  meeting_id   uuid not null references public.meetings(id) on delete cascade,
  contact_id   uuid not null references public.contacts(id),
  role         participant_role not null default 'attendee',
  display_name text not null,                      -- snapshot at capture time
  email        citext,
  company      text,
  is_external  boolean not null,
  user_id      uuid references public.profiles(id) on delete set null,  -- denormalised for RLS speed
  source       participant_source not null,
  created_at   timestamptz not null default now(),
  primary key (meeting_id, contact_id)
);
create index meeting_participants_user_idx  on public.meeting_participants (user_id) where user_id is not null;
create index meeting_participants_email_idx on public.meeting_participants (email) where email is not null;
create index meeting_participants_contact_idx on public.meeting_participants (contact_id);

-- Explicit shares (ShareRecipient.source = 'invited')
create table public.meeting_share_grants (
  id               uuid primary key default gen_random_uuid(),
  meeting_id       uuid not null references public.meetings(id) on delete cascade,
  grantee_email    citext not null,
  grantee_user_id  uuid references public.profiles(id) on delete cascade,
  granted_by       uuid not null references public.profiles(id),
  created_at       timestamptz not null default now(),
  revoked_at       timestamptz
);
create unique index meeting_share_grants_active_uq on public.meeting_share_grants (meeting_id, grantee_email) where revoked_at is null;
create index meeting_share_grants_user_idx  on public.meeting_share_grants (grantee_user_id) where revoked_at is null;
create index meeting_share_grants_email_idx on public.meeting_share_grants (grantee_email) where revoked_at is null;

-- Attendees the owner removed from an attendee share (mock: removedPersonIds)
create table public.meeting_share_exclusions (
  meeting_id  uuid not null references public.meetings(id) on delete cascade,
  contact_id  uuid not null references public.contacts(id),
  excluded_by uuid not null references public.profiles(id),
  created_at  timestamptz not null default now(),
  primary key (meeting_id, contact_id)
);

create table public.tags (
  id     uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  label  text not null check (char_length(label) between 1 and 40),
  tone   text not null default 'neutral' check (tone in ('neutral','accent','info','warning','danger')),
  unique (org_id, label)
);
create table public.meeting_tags (
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  tag_id     uuid not null references public.tags(id) on delete cascade,
  primary key (meeting_id, tag_id)
);
```

Mock parity note: re-sharing with `visibility != 'private'` clears exclusions (`share.removedPersonIds = []` in the mock). The `share_meeting` SQL function does `delete from meeting_share_exclusions where meeting_id = $1` in that case.

---

## 7. Capture, recordings, processing runs

```sql
create table public.capture_sessions (
  id                    uuid primary key default gen_random_uuid(),
  meeting_id            uuid not null references public.meetings(id) on delete cascade,
  user_id               uuid not null references public.profiles(id) on delete cascade,
  status                capture_session_status not null default 'active',
  mode                  capture_mode not null,
  created_meeting       boolean not null,              -- discard deletes the meeting if true
  consent_attested_at   timestamptz,                   -- "I've told participants" (see 03 section 11)
  client_info           jsonb not null default '{}',   -- browser, os, audio sources, mime type
  started_at            timestamptz not null default now(),
  current_segment_started_at timestamptz,              -- null while paused
  accumulated_ms        bigint not null default 0,     -- banked capture time (mirrors capture-machine.ts)
  last_heartbeat_at     timestamptz not null default now(),
  last_chunk_seq        integer not null default -1,
  storage_prefix        text not null,                 -- {org}/{meeting}/{session}/  (object name inside bucket capture-chunks)
  stopped_at            timestamptz,
  client_elapsed_seconds numeric(10,3),
  created_at            timestamptz not null default now()
);
-- one live capture per user (mock: "A capture is already in progress")
create unique index capture_sessions_one_live_per_user on public.capture_sessions (user_id)
  where status in ('active','paused','interrupted');
create index capture_sessions_heartbeat_idx on public.capture_sessions (last_heartbeat_at) where status in ('active','paused');

create table public.capture_chunks (
  session_id   uuid not null references public.capture_sessions(id) on delete cascade,
  seq          integer not null check (seq >= 0),
  part         integer not null default 0,   -- recorder restarts produce a new self-contained part
  storage_path text not null,
  byte_size    integer not null check (byte_size > 0 and byte_size <= 8388608),
  duration_ms  integer,
  sha256       bytea not null,
  mime_type    text not null,
  received_at  timestamptz not null default now(),
  primary key (session_id, seq)
);

create table public.recordings (
  id                   uuid primary key default gen_random_uuid(),
  meeting_id           uuid not null references public.meetings(id) on delete cascade,
  source               recording_source not null,
  status               recording_status not null default 'uploading',
  storage_bucket       text not null default 'recordings',
  original_path        text,          -- uploaded file or assembled capture
  audio_path           text,          -- normalised 16 kHz mono FLAC/Opus used for ASR + playback
  video_path           text,          -- only for capture_mode = 'video'
  mime_type            text,
  byte_size            bigint,
  duration_seconds     numeric(10,3),
  channels             smallint,
  sample_rate          integer,
  sha256               bytea,
  zoom_recording_uuid  text,
  retention_expires_at timestamptz,   -- from user_settings.recording_retention_days at creation
  created_at           timestamptz not null default now(),
  ready_at             timestamptz,
  deleted_at           timestamptz
);
create index recordings_meeting_idx on public.recordings (meeting_id);
create index recordings_retention_idx on public.recordings (retention_expires_at) where deleted_at is null and retention_expires_at is not null;

create table public.processing_runs (
  id                uuid primary key default gen_random_uuid(),
  meeting_id        uuid not null references public.meetings(id) on delete cascade,
  recording_id      uuid references public.recordings(id) on delete set null,
  trigger           processing_trigger not null,
  status            processing_run_status not null default 'queued',
  attempt           smallint not null default 1,      -- incremented by retry
  pipeline_version  text not null,                    -- e.g. '2026.10.1'
  asr_provider      text,  asr_model  text,
  llm_provider      text,  llm_model  text,
  embedding_model   text,
  prompt_versions   jsonb not null default '{}',      -- {"extract":"v3","verify":"v2",...}
  error_code        text,                             -- AppErrorCode surfaced to UI
  error_user_message text,                            -- user-safe copy
  error_internal    text,                             -- never sent to clients
  cost_estimate_usd numeric(10,4),
  started_at        timestamptz not null default now(),
  finished_at       timestamptz
);
create index processing_runs_meeting_idx on public.processing_runs (meeting_id, started_at desc);
alter table public.meetings add constraint meetings_current_run_fk
  foreign key (current_run_id) references public.processing_runs(id) on delete set null;

create table public.processing_steps (
  run_id      uuid not null references public.processing_runs(id) on delete cascade,
  step        processing_step_id not null,
  status      processing_step_status not null default 'pending',
  started_at  timestamptz,
  finished_at timestamptz,
  attempts    smallint not null default 0,
  error_code  text,
  detail      jsonb not null default '{}',   -- e.g. {"chunksDone":3,"chunksTotal":7}
  primary key (run_id, step)
);
```

---

## 8. Transcript

```sql
create table public.transcripts (
  id               uuid primary key default gen_random_uuid(),
  meeting_id       uuid not null references public.meetings(id) on delete cascade,
  run_id           uuid not null unique references public.processing_runs(id) on delete cascade,
  status           transcript_status not null default 'pending',
  language         text not null default 'en',
  duration_seconds numeric(10,3) not null default 0,
  created_at       timestamptz not null default now()
);

create table public.transcript_segments (
  id            uuid primary key default gen_random_uuid(),
  meeting_id    uuid not null,
  transcript_id uuid not null references public.transcripts(id) on delete cascade,
  seq           integer not null,
  speaker_id    uuid not null,                    -- == Participant.id == contacts.id
  start_time    numeric(10,3) not null check (start_time >= 0),
  end_time      numeric(10,3) not null,
  text          text not null check (char_length(text) between 1 and 8000),
  confidence    real check (confidence between 0 and 1),
  channel       smallint,                         -- 0 = mic (capturing user), 1 = tab/system audio
  words         jsonb,                            -- [{w,s,e,p}] word timestamps (optional, large)
  tsv           tsvector generated always as (to_tsvector('english', text)) stored,
  constraint seg_time_order check (end_time >= start_time),
  constraint seg_meeting_unique unique (meeting_id, id),       -- target of composite FKs
  constraint seg_seq_unique unique (transcript_id, seq),
  constraint seg_speaker_is_participant foreign key (meeting_id, speaker_id)
    references public.meeting_participants (meeting_id, contact_id),
  constraint seg_meeting_fk foreign key (meeting_id) references public.meetings(id) on delete cascade
);
create index transcript_segments_order_idx on public.transcript_segments (transcript_id, start_time);
create index transcript_segments_tsv_idx on public.transcript_segments using gin (tsv);
```

The `speaker_id` FK to `meeting_participants` enforces "speakerId == participant id". Diarized speakers that we can't map to an attendee get a `contacts(kind='unidentified_speaker', display_name='Speaker 2')` row plus a participant row with `source='diarization'`. Renaming or merging a speaker later updates `transcript_segments.speaker_id` in one statement. That endpoint is a frontend gap, listed in section 16.

`words` holds optional word-level timestamps. Keep it for karaoke-style highlighting and precise clip boundaries, but strip it from the default `GET /transcript` response (it roughly triples the payload).

---

## 9. Insights (all traceable)

The shared guard used by every insight table:

```sql
-- Validates source_timestamp against its segment (±0.5s, like MockPlaylistService.add)
create or replace function app_private.check_source_timestamp() returns trigger
language plpgsql as $$
declare s_start numeric; s_end numeric;
begin
  select start_time, end_time into s_start, s_end
  from public.transcript_segments
  where meeting_id = new.meeting_id and id = new.source_segment_id;
  if not found then
    raise exception 'source segment % not in meeting %', new.source_segment_id, new.meeting_id
      using errcode = '23503';
  end if;
  if new.source_timestamp < s_start - 0.5 or new.source_timestamp > s_end + 0.5 then
    raise exception 'source_timestamp % outside segment [% , %]', new.source_timestamp, s_start, s_end
      using errcode = '23514';
  end if;
  return new;
end $$;
```

Every insight table below repeats this traceability block (written out once here, then abbreviated as `TRACE` in the DDL that follows):

```sql
  meeting_id        uuid not null references public.meetings(id) on delete cascade,
  run_id            uuid not null references public.processing_runs(id) on delete cascade,
  source_segment_id uuid not null,
  source_timestamp  numeric(10,3) not null check (source_timestamp >= 0),
  evidence_quote    text check (char_length(evidence_quote) <= 1000),  -- verbatim span; required for origin='ai' (check below)
  origin            insight_origin not null default 'ai',
  confidence        real check (confidence between 0 and 1),
  constraint <t>_segment_fk foreign key (meeting_id, source_segment_id)
    references public.transcript_segments (meeting_id, id) on delete cascade,
  constraint <t>_ai_has_quote check (origin = 'user' or evidence_quote is not null)
-- plus: create trigger <t>_trace before insert or update of source_segment_id, source_timestamp
--       on public.<t> for each row execute function app_private.check_source_timestamp();
```

```sql
create table public.summaries (
  run_id               uuid primary key references public.processing_runs(id) on delete cascade,
  meeting_id           uuid not null references public.meetings(id) on delete cascade,
  overview             text not null check (char_length(overview) between 1 and 4000),
  overview_segment_ids uuid[] not null check (cardinality(overview_segment_ids) >= 1),  -- evidence for overview
  length               summary_length not null,
  created_at           timestamptz not null default now()
);
-- overview_segment_ids membership is validated by a trigger (array FKs are not supported)

create table public.key_points (     -- MeetingSummary.keyPoints: string[] in the API today
  id uuid primary key default gen_random_uuid(),
  position smallint not null,
  text text not null check (char_length(text) between 1 and 500),
  TRACE
);

create table public.decisions (
  id                     uuid primary key default gen_random_uuid(),
  title                  text not null check (char_length(title) between 1 and 300),
  context                text,
  decided_by_contact_id  uuid references public.contacts(id),
  subject_key            text,       -- normalised subject, e.g. 'launch date' (decision history)
  value_label            text,       -- 'Oct 15' (DecisionHistoryEntry.value)
  supersedes_decision_id uuid references public.decisions(id) on delete set null,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  tsv tsvector generated always as (to_tsvector('english', title || ' ' || coalesce(context,''))) stored,
  TRACE
);
create index decisions_meeting_idx on public.decisions (meeting_id, run_id);
create index decisions_supersedes_idx on public.decisions (supersedes_decision_id);
create index decisions_tsv_idx on public.decisions using gin (tsv);

create table public.action_items (
  id                  uuid primary key default gen_random_uuid(),
  title               text not null check (char_length(btrim(title)) between 1 and 200),
  description         text,
  assignee_contact_id uuid references public.contacts(id),
  due_date            date,
  status              action_item_status not null default 'open',
  completed_at        timestamptz,
  edited_at           timestamptz,      -- set on user edits; reprocess never overwrites edited rows
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  tsv tsvector generated always as (to_tsvector('english', title || ' ' || coalesce(description,''))) stored,
  constraint action_completed_at check ((status = 'completed') = (completed_at is not null)),
  TRACE
);
create index action_items_meeting_idx on public.action_items (meeting_id, run_id);
create index action_items_assignee_idx on public.action_items (assignee_contact_id, status, due_date);
create index action_items_due_idx on public.action_items (due_date) where status in ('open','in_progress');
create index action_items_tsv_idx on public.action_items using gin (tsv);

create table public.questions (
  id                 uuid primary key default gen_random_uuid(),
  text               text not null check (char_length(text) between 1 and 500),
  asked_by_contact_id uuid references public.contacts(id),
  status             question_status not null default 'open',
  answer             text,
  answer_segment_id  uuid,              -- optional second evidence pointer
  constraint q_answer_fk foreign key (meeting_id, answer_segment_id) references public.transcript_segments (meeting_id, id),
  TRACE
);

create table public.risks (
  id                  uuid primary key default gen_random_uuid(),
  title               text not null check (char_length(title) between 1 and 300),
  description         text,
  severity            risk_severity not null,
  raised_by_contact_id uuid references public.contacts(id),
  TRACE
);

create table public.key_moments (
  id           uuid primary key default gen_random_uuid(),
  type         key_moment_type not null,
  title        text not null,
  description  text,
  related_kind text check (related_kind in ('decision','action_item','question','risk')),
  related_id   uuid,                      -- soft reference; nulled by triggers when target deleted
  TRACE
);

create table public.topics (
  id         uuid primary key default gen_random_uuid(),
  label      text not null check (char_length(label) between 1 and 80),
  start_time numeric(10,3) not null,
  end_time   numeric(10,3) not null check (end_time >= start_time),
  TRACE                                     -- source_segment_id = first segment of the topic
);
```

**Stats** (`Meeting.stats`) are computed, never stored:

```sql
create view public.meeting_stats with (security_invoker = true) as
select m.id as meeting_id,
  (select count(*) from public.decisions d where d.run_id = m.current_run_id)::int as decisions,
  (select count(*) from public.action_items a where a.run_id = m.current_run_id and a.status in ('open','in_progress'))::int as action_items,
  (select count(*) from public.questions q where q.run_id = m.current_run_id and q.status = 'open')::int as open_questions,
  (select count(*) from public.risks r where r.run_id = m.current_run_id)::int as risks
from public.meetings m;
```

Deleting an action item mirrors the mock: key moments with `related_id` pointing at it get `related_id = null`, alerts targeting it are retargeted to the meeting, and `deals.next_action_item_id` is set to null (FK `on delete set null`). These are an `after delete` trigger plus FKs.

---

## 10. Playlist, alerts, deals

```sql
create table public.playlist_items (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles(id) on delete cascade,
  kind              playlist_item_kind not null,
  title             text not null check (char_length(btrim(title)) between 1 and 120),
  note              text check (char_length(note) <= 500),
  quote             text,                         -- copied from the segment at save time
  end_timestamp     numeric(10,3),
  created_at        timestamptz not null default now(),
  meeting_id        uuid not null references public.meetings(id) on delete cascade,
  source_segment_id uuid not null,
  source_timestamp  numeric(10,3) not null,
  constraint pl_segment_fk foreign key (meeting_id, source_segment_id)
    references public.transcript_segments (meeting_id, id) on delete cascade,
  constraint pl_clip_order check (end_timestamp is null or end_timestamp > source_timestamp),
  constraint pl_idempotent unique (user_id, meeting_id, source_segment_id, kind)   -- mock: add() is idempotent
);
create index playlist_user_created_idx on public.playlist_items (user_id, created_at desc, id desc);
-- + trigger app_private.check_source_timestamp

create table public.alerts (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,  -- recipient
  type            alert_type not null,
  title           text not null,
  body            text not null,
  target          jsonb not null,           -- AlertTarget; shape checked below
  meeting_id      uuid references public.meetings(id) on delete cascade,
  action_item_id  uuid references public.action_items(id) on delete set null,
  decision_id     uuid references public.decisions(id) on delete set null,
  deal_id         uuid,                     -- FK added after deals
  actor_contact_id uuid references public.contacts(id),
  change_from     text,
  change_to       text,
  dedupe_key      text,                     -- e.g. 'action_due:<action_id>:<date>'
  read_at         timestamptz,
  dismissed_at    timestamptz,
  emailed_at      timestamptz,
  created_at      timestamptz not null default now(),
  constraint alert_target_kind check (target->>'kind' in ('meeting','action_item','decision','meetings','deal'))
);
create unique index alerts_dedupe_uq on public.alerts (user_id, dedupe_key) where dedupe_key is not null;
create index alerts_user_feed_idx on public.alerts (user_id, created_at desc, id desc) where dismissed_at is null;
create index alerts_user_unread_idx on public.alerts (user_id) where read_at is null and dismissed_at is null;

create table public.deals (
  id                    uuid primary key default gen_random_uuid(),
  org_id                uuid not null references public.organizations(id) on delete cascade,
  owner_id              uuid not null references public.profiles(id),
  owner_contact_id      uuid not null references public.contacts(id),
  company               text not null check (char_length(btrim(company)) between 1 and 120),
  name                  text not null,
  value_amount          numeric(14,2) check (value_amount >= 0),
  value_currency        currency_code,
  stage                 deal_stage not null,
  next_action_title     text,
  next_action_due_date  date,
  next_action_item_id   uuid references public.action_items(id) on delete set null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  tsv tsvector generated always as (to_tsvector('english', company || ' ' || name || ' ' || coalesce(next_action_title,''))) stored,
  constraint deal_money_pair check ((value_amount is null) = (value_currency is null))
);
create index deals_org_updated_idx on public.deals (org_id, updated_at desc, id desc);
create index deals_tsv_idx on public.deals using gin (tsv);
alter table public.alerts add constraint alerts_deal_fk foreign key (deal_id) references public.deals(id) on delete cascade;

-- One deal per meeting (mock: linking moves the meeting). Separate table so linking a
-- shared meeting does not require write access to someone else's meetings row.
create table public.deal_meetings (
  deal_id    uuid not null references public.deals(id) on delete cascade,
  meeting_id uuid not null unique references public.meetings(id) on delete cascade,
  linked_by  uuid not null references public.profiles(id),
  linked_at  timestamptz not null default now(),
  primary key (deal_id, meeting_id)
);

create table public.deal_signals (
  id          uuid primary key default gen_random_uuid(),
  deal_id     uuid not null references public.deals(id) on delete cascade,
  kind        deal_signal_kind not null,
  sentiment   deal_signal_sentiment not null,
  label       text not null check (char_length(label) between 1 and 120),
  created_at  timestamptz not null default now(),
  TRACE        -- meeting_id must also be linked to the deal (trigger)
);
```

`Meeting.dealId` is read from `deal_meetings`. `Deal.meetings` and `Deal.lastMeetingAt` come from a join, filtered to meetings the caller can read (a deal may reference a meeting the viewer cannot open; it is omitted rather than leaked).

---

## 11. Assistant

```sql
create table public.assistant_sessions (     -- groups history; 'meeting' scope today, 'global' later
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  scope      text not null check (scope in ('meeting','global')),
  meeting_id uuid references public.meetings(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint as_scope_meeting check ((scope = 'meeting') = (meeting_id is not null))
);
create unique index assistant_sessions_meeting_uq on public.assistant_sessions (user_id, meeting_id) where scope = 'meeting';

create table public.assistant_messages (     -- one row == one MeetingAnswer
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references public.assistant_sessions(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  meeting_id  uuid references public.meetings(id) on delete cascade,
  question    text not null check (char_length(btrim(question)) between 1 and 500),
  answer      text not null,
  status      text not null check (status in ('answered','not_found')),
  confidence  text not null check (confidence in ('high','medium','low')),
  model       text,
  prompt_version text,
  latency_ms  integer,
  created_at  timestamptz not null default now()
);
create index assistant_messages_history_idx on public.assistant_messages (user_id, meeting_id, created_at);

create table public.assistant_answer_sources (
  message_id        uuid not null references public.assistant_messages(id) on delete cascade,
  position          smallint not null,
  meeting_id        uuid not null references public.meetings(id) on delete cascade,
  source_segment_id uuid not null,
  source_timestamp  numeric(10,3) not null,
  quote             text,
  speaker_name      text,
  primary key (message_id, position),
  constraint aas_segment_fk foreign key (meeting_id, source_segment_id)
    references public.transcript_segments (meeting_id, id) on delete cascade
);
-- invariant (trigger, deferred): status='answered' => at least one source; 'not_found' => none
```

History cap: the mock keeps 50 answers per meeting. We keep everything but return the latest 50 (oldest first), and retention deletes them with the meeting.

---

## 12. Embeddings and full-text search

```sql
create table public.embedding_chunks (
  id               uuid primary key default gen_random_uuid(),
  meeting_id       uuid not null references public.meetings(id) on delete cascade,
  run_id           uuid not null references public.processing_runs(id) on delete cascade,
  org_id           uuid not null,
  kind             text not null check (kind in ('transcript_window','summary','decision','action_item','question','risk','key_point')),
  source_id        uuid,                       -- insight id for insight kinds
  start_segment_id uuid not null,              -- traceability anchor for retrieval hits
  segment_ids      uuid[] not null,
  source_timestamp numeric(10,3) not null,
  content          text not null,              -- exact text embedded (speaker-prefixed lines)
  token_count      integer not null,
  embedding        vector(1024) not null,
  model            text not null,              -- 'bge-m3' | 'text-embedding-3-small@1024' ...
  created_at       timestamptz not null default now(),
  constraint ec_segment_fk foreign key (meeting_id, start_segment_id)
    references public.transcript_segments (meeting_id, id) on delete cascade
);
create index embedding_chunks_meeting_idx on public.embedding_chunks (meeting_id, kind);
create index embedding_chunks_hnsw on public.embedding_chunks
  using hnsw (embedding vector_cosine_ops) with (m = 16, ef_construction = 64);
```

**Chunking strategy.**

- `transcript_window`: consecutive segments packed to about 250 to 400 tokens (never splitting a segment). Each line is prefixed with the speaker name (`Sara Ahmed: …`) because "who said X" queries depend on it. One segment of overlap between windows. A 60-minute meeting gives about 40 to 60 windows.
- One chunk per insight (`decision`, `action_item`, `question`, `risk`, `key_point`) and one for the `summary` overview. These are short, precise and already grounded, so they rank well for "what did we decide about X".
- Every chunk carries `start_segment_id` and `source_timestamp`, so a vector hit always renders as a traceable source.

**Index choice: HNSW, not IVFFlat.** HNSW needs no training step, handles continuous inserts (meetings arrive one at a time), and gives better recall at the same latency. IVFFlat's lists must be re-tuned as the table grows, and it builds poorly on small or empty tables. Cost: HNSW builds slower and uses more memory. That is fine below about 10M rows. pgvector's HNSW supports up to 2,000 dimensions for `vector` [unverified exact limit on our version]. 1024 is well within it.

**Filtered queries.** For single-meeting RAG we filter by `meeting_id` and let Postgres use the btree (`embedding_chunks_meeting_idx`) plus an exact distance sort, because there are under 200 rows per meeting and exact search is both faster and has perfect recall. For cross-meeting search we use the HNSW index with a prefilter on accessible meeting ids, and set `hnsw.ef_search = 100`. If pgvector 0.8 is available, enable `hnsw.iterative_scan = relaxed_order` so selective filters don't return too few rows [unverified that our Supabase version ships 0.8].

**Full-text search.** `tsvector` generated columns with the `english` config and GIN indexes on `transcript_segments`, `decisions`, `action_items` and `deals`. `meetings.search_tsv` is maintained by trigger from title (weight A), tags and participants (B), summary overview, key points and topics (C). The mock's prefix behaviour (`launc` finds `launch`) is reproduced with `to_tsquery('english', 'launc:*')`. People search uses `pg_trgm` on `contacts.display_name` and company. Ranking and fusion are described in [05-capture-and-pipeline.md](./05-capture-and-pipeline.md) section 12.

---

## 13. Ops: jobs, idempotency, webhooks, audit

```sql
create table ops.jobs (
  id             bigint generated always as identity primary key,
  queue          text not null,                 -- 'capture','media','asr','ai','embed','notify','sync','zoom','retention'
  kind           text not null,                 -- 'asr.transcribe', 'ai.extract', ...
  payload        jsonb not null,
  status         text not null default 'queued' check (status in ('queued','running','succeeded','failed','dead','cancelled')),
  priority       smallint not null default 100, -- lower runs first; interactive retries get 50
  attempt        smallint not null default 0,
  max_attempts   smallint not null default 5,
  run_after      timestamptz not null default now(),
  locked_by      text,
  locked_until   timestamptz,
  dedupe_key     text,
  meeting_id     uuid,                          -- for ops dashboards / cancellation on delete
  run_id         uuid,
  owner_id       uuid,                          -- per-user fairness caps in the claim query
  trace_context  jsonb,
  last_error     text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  finished_at    timestamptz
);
create index jobs_claim_idx on ops.jobs (queue, priority, run_after) where status = 'queued';
create index jobs_lease_idx on ops.jobs (locked_until) where status = 'running';
create unique index jobs_dedupe_uq on ops.jobs (dedupe_key) where dedupe_key is not null and status in ('queued','running');
create index jobs_meeting_idx on ops.jobs (meeting_id) where meeting_id is not null;
create index jobs_owner_running_idx on ops.jobs (queue, owner_id) where status = 'running';

create table ops.job_attempts (
  job_id      bigint not null references ops.jobs(id) on delete cascade,
  attempt     smallint not null,
  worker_id   text not null,
  started_at  timestamptz not null,
  finished_at timestamptz,
  outcome     text check (outcome in ('succeeded','retry','failed','lease_expired')),
  error_class text,
  error       text,
  primary key (job_id, attempt)
);

create or replace function ops.enqueue_job(
  p_queue text, p_kind text, p_payload jsonb, p_dedupe_key text default null,
  p_run_after timestamptz default now(), p_priority smallint default 100,
  p_max_attempts smallint default 5, p_meeting_id uuid default null, p_run_id uuid default null,
  p_owner_id uuid default null
) returns bigint language plpgsql security definer set search_path = '' as $$
declare v_id bigint;
begin
  insert into ops.jobs (queue, kind, payload, dedupe_key, run_after, priority, max_attempts, meeting_id, run_id, owner_id)
  values (p_queue, p_kind, p_payload, p_dedupe_key, p_run_after, p_priority, p_max_attempts, p_meeting_id, p_run_id, p_owner_id)
  on conflict (dedupe_key) where dedupe_key is not null and status in ('queued','running') do nothing
  returning id into v_id;
  perform pg_notify('jobs', p_queue);
  return v_id;   -- null when deduplicated
end $$;
revoke all on function ops.enqueue_job from public, anon, authenticated;

create table ops.idempotency_keys (
  user_id       uuid not null,
  key           text not null check (char_length(key) between 8 and 128),
  method        text not null,
  path          text not null,
  request_hash  bytea not null,
  status_code   smallint,
  response_body jsonb,
  created_at    timestamptz not null default now(),
  expires_at    timestamptz not null default now() + interval '24 hours',
  primary key (user_id, key)
);

create table ops.webhook_events (
  id           bigint generated always as identity primary key,
  provider     text not null check (provider in ('zoom','google_calendar')),
  external_id  text not null,           -- Zoom event_ts+payload hash / Google X-Goog-Message-Number+channel
  event_type   text not null,
  received_at  timestamptz not null default now(),
  payload      jsonb,                   -- minimised; download tokens encrypted or stripped
  processed_at timestamptz,
  unique (provider, external_id)
);

create table ops.audit_log (
  id          bigint generated always as identity primary key,
  at          timestamptz not null default now(),
  actor_id    uuid,                     -- null = system
  org_id      uuid,
  action      text not null,            -- 'meeting.share', 'meeting.delete', 'integration.connect', 'recording.download_url', ...
  target_type text not null,
  target_id   text not null,
  request_id  text,
  ip          inet,
  metadata    jsonb not null default '{}'
);
create index audit_log_target_idx on ops.audit_log (target_type, target_id, at desc);
create index audit_log_actor_idx on ops.audit_log (actor_id, at desc);
```

Zoom import offers (user-initiated imports, see [06-integrations.md](./06-integrations.md) section 3):

```sql
create table public.zoom_recording_offers (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references public.profiles(id) on delete cascade,
  zoom_meeting_uuid  text not null,
  topic              text,
  started_at         timestamptz,
  duration_seconds   integer,
  files              jsonb not null,          -- [{id,file_type,recording_type,file_size}] (no URLs)
  status             text not null default 'offered' check (status in ('offered','importing','imported','declined','expired')),
  meeting_id         uuid references public.meetings(id) on delete set null,
  created_at         timestamptz not null default now(),
  unique (user_id, zoom_meeting_uuid)
);
```

---

## 14. Realtime emission

Status changes emit Broadcast messages inside the same transaction (so clients never see an event for a change that rolled back):

```sql
create or replace function app_private.emit_meeting_status() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status is distinct from old.status then
    perform realtime.send(
      jsonb_build_object('meetingId', new.id, 'status', new.status, 'updatedAt', new.updated_at),
      'meeting.status', 'meeting:' || new.id::text, true);   -- private channel
  end if;
  return new;
end $$;
create trigger meetings_emit_status after update of status on public.meetings
  for each row execute function app_private.emit_meeting_status();
-- processing_steps: same pattern -> event 'meeting.progress' on 'meeting:<id>'
-- alerts insert: event 'alert.created' on 'user:<user_id>'
```

Only ids and statuses are broadcast, never content. The client then refetches through the API, so authorization stays in one place. Channel authorization policies are in [03-security-rls.md](./03-security-rls.md) section 8.

---

## 15. State machines

### 15.1 MeetingStatus (server)

```text
               create (future start)          create (past/now) or calendar capture
   (none) ───────────────▶ upcoming ──time──▶ ready_to_capture
                              │                    │
                              └──── startCapture ──┴──▶ capturing ◀──resume── paused
                                                         │   └──pause──▶ ┘ │
                                         stop / finalize │                 │ stop / finalize
                                                         ▼                 ▼
          upload complete / zoom import ───────────▶ processing  (step: upload = assemble + normalize)
                                                         │ ASR started
                                                         ▼
                                                    transcribing (step: transcribe)
                                                         │ transcript committed
                                                         ▼
                                                    understanding (steps: understand, extract_decisions, extract_actions)
                                                         │ insights committed + verified
                                                         ▼
                                                       ready ──(embeddings, alerts run after; non-blocking)
   any of processing|transcribing|understanding ──dead job──▶ failed ──retryProcessing──▶ processing (resume at failed step)
   capturing|paused ──session failed (storage rejected, nothing usable)──▶ failed
   capturing|paused ──discard──▶ (deleted if created_meeting) | ready_to_capture
```

- `upcoming` to `ready_to_capture` is time-based. We **compute** it on read (`case when status='upcoming' and started_at <= now() then 'ready_to_capture'`), and a cheap `pg_cron` sweep persists it every 5 minutes. It never triggers capture.
- Transitions are enforced by `app_private.transition_meeting(meeting_id, from[], to)`, which raises `55000` (mapped to 409 `conflict`) on an invalid edge. Every writer, API or worker, goes through it.
- An interrupted capture (no heartbeat for 2 minutes, see [05-capture-and-pipeline.md](./05-capture-and-pipeline.md) section 3.5) keeps `meetings.status='paused'`, sets `capture_sessions.status='interrupted'` and raises a `capture_interrupted` alert. **The frontend has no `interrupted` status. We map it to `paused`** and expose `capture.interrupted=true` on the capture-session resource.

### 15.2 Mapping to the client CaptureStatus

| MeetingStatus (server) | CaptureStatus (client, `capture-machine.ts`) | `ProcessingProgress.steps` |
| --- | --- | --- |
| `upcoming`, `ready_to_capture` | `idle` / `ready` (client-only "prepare") | n/a (`GET /processing` returns 409, like the mock) |
| `capturing` | `capturing` | n/a |
| `paused` | `paused` | n/a |
| `processing` | `processing` | upload `active`, rest `pending` |
| `transcribing` | `transcribing` | upload `complete`, transcribe `active` |
| `understanding` | `understanding` | upload and transcribe `complete`, understand `active`, then extract_decisions and extract_actions `active` as they start |
| `ready` | `complete` | all `complete` |
| `failed` | `failed` (`failedFrom` from the client session) | the failed step `failed`, earlier `complete`, later `pending` |

The client machine only advances forward and may skip ahead (`advance` allows `to > from`), which is compatible with polling or Realtime delivering a later status first. The mock always reports `failed` at the transcribe step. The real backend reports the actual failed step from `processing_steps`.

---

## 16. Mapping to frontend types and mismatches

| Frontend type | Source |
| --- | --- |
| `User` | `profiles` (+ `onboarding_completed_at is not null` gives `onboardingCompleted`; `avatarUrl` is a public or signed URL of `avatar_path`) |
| `AuthSession` | JWT (`exp` gives `expiresAt`) + `profiles` (stage = onboarding completed ? `ready` : `onboarding`) |
| `WorkspaceMember` | `organization_members` join `contacts` (where `user_id` matches) join `teams` |
| `OnboardingProgress` | `onboarding_progress` (+ live `calendarConnected`/`zoomConnected` from `integrations`, as in the mock) |
| `Settings` | `user_settings` + `profiles` (general) + `organizations.link_sharing_available` + `auth.sessions` (security.sessions) |
| `Integration` | `integrations` (+ static `coming_soon` rows) |
| `CalendarConnection` | `integrations(google_calendar)` + `calendars` (`lastSyncedAt` = max `last_incremental_sync_at`) + count of upcoming `calendar_events` |
| `CalendarEvent` | `calendar_events` + `calendar_event_attendees` + `meetings.id` (the caller's own meeting for the event) |
| `Meeting` | `meetings` + `meeting_participants` + `meeting_tags` + `deal_meetings` + summary set (current run) + `meeting_stats` + `processing_runs/steps` + signed `audioUrl` |
| `Participant` | `meeting_participants` (`id` = `contact_id`, `userId` = `user_id`) |
| `MeetingSummary` | `summaries` + `key_points` + `decisions` + `action_items` + `questions` + `risks` + `key_moments` + `topics` for `current_run_id` |
| `Transcript`, `TranscriptSegment` | `transcripts` + `transcript_segments` (`startTime` = `start_time`, `speakerName` = `meeting_participants.display_name`) |
| `ShareSettings`, `ShareRecipient` | computed from `meetings.visibility`, `meeting_participants`, `organization_members`, `meeting_share_grants`, `meeting_share_exclusions`, `link_*` |
| `ActionItem` | `action_items` + `meetings` (`meeting: MeetingRef`) + assignee participant |
| `PlaylistItem` | `playlist_items` + `meetings` |
| `Alert` | `alerts` |
| `Deal`, `DealSignal` | `deals` + `deal_meetings` + `deal_signals` |
| `MeetingAnswer`, `AnswerSource` | `assistant_messages` + `assistant_answer_sources` |
| `DecisionHistory` | recursive CTE over `decisions.supersedes_decision_id`, filtered to readable meetings; `subject` from `subject_key`, `value` from `value_label` (falls back to `title`, like the mock) |
| `FollowUpEmail` | computed on demand (not persisted). See [04-api-spec.md](./04-api-spec.md). |

**Mismatches and gaps.** Each needs a decision. Recommended resolutions are marked (A) for an additive frontend type change or (B) for a backend-only adaptation.

1. **`Topic` is not `Traceable`** (it has only `startTime`/`endTime`). Under the hard rule it must carry evidence. Recommendation (A): add `meetingId`, `sourceSegmentId`, `sourceTimestamp` to `Topic`. These are additive optional fields at first, and the backend always sends them.
2. **`MeetingSummary.keyPoints: string[]` and `overview: string` carry no evidence.** We store `key_points` rows with evidence and `summaries.overview_segment_ids`. Recommendation (A): add optional `keyPointSources?: Traceable[]` (parallel to `keyPoints`) and `overviewSources?: Traceable[]`. Until the frontend adopts them, the API still returns plain strings.
3. **`MeetingService` has no `discardCapture`.** The mock discards inside `MockCaptureService` by writing to the DB directly. Recommendation (A): add `discardCapture(meetingId): Promise<void>` to `MeetingService`, which maps to `POST /meetings/:id/capture/discard`.
4. **No upload, chunk or heartbeat methods anywhere.** `CaptureService` is client-side, and `ApiCaptureService` needs `registerChunk`, `heartbeat`, `getActiveCapture`, plus a manual-upload flow. Recommendation (A): add a small `RecordingService` (`createUpload`, `completeUpload`) and extend `MeetingService` with `getActiveCapture()`. Chunk and heartbeat calls are internal to `ApiCaptureService` and need no interface change.
5. **No speaker rename or merge.** Unidentified speakers ("Speaker 2") need `PATCH /meetings/:id/speakers/:speakerId { contactId | name, email }`. Recommendation (A): `TranscriptService.assignSpeaker()`.
6. **`AlertType` lacks `zoom_recording_available` and `capture_interrupted`.** Recommendation (A): add both. Until the frontend ships them, the API **does not emit** these two types (re-labelling them as an existing type would mislead users), so the Zoom import offer is reachable only from the Integrations screen and an interrupted capture is surfaced by the capture bar on next load.
7. **`MeetingStatus` has no `interrupted`.** Mapped to `paused` plus a flag (section 15.1). (B)
8. **`Meeting.audioUrl` is a signed URL with a TTL.** Recommendation (A): add optional `audioUrlExpiresAt` and refetch the meeting when playback gets a 400 or 403 from Storage. Non-owners get `audioUrl` only if `share_recording`.
9. **`ShareRecipient.id` for attendees and team members is synthetic.** We use `attendee:<contactId>`, `team:<contactId>` and the grant uuid for invited people. `unshare(recipientId)` parses the prefix. (B)
10. **`CalendarConnection.scopes` are UX labels (`events.read`, ...), not OAuth scopes.** The API keeps returning the labels when the corresponding real scopes are granted ([06-integrations.md](./06-integrations.md) section 1.2). (B)
11. **`SearchService` and commands.** The interface says commands are client-side; the mock returns them unless excluded. The API **never** returns `command` results. `ApiSearchService` merges the static command list on the client so the palette behaves the same. (B, plus a small frontend change)
12. **`AuthService.signInWithGoogle` returns `AuthResult` but real OAuth is a redirect.** See [03-security-rls.md](./03-security-rls.md) section 2.3. (A: document that it never resolves in redirect mode; the callback page calls `POST /auth/bootstrap`)
13. **Deal visibility is not modelled in the frontend.** Backend rule: deals are org-scoped (members read; owner or admin write). The mock has no rule. (B, confirm in [08-open-questions.md](./08-open-questions.md) Q9)
14. **`includeTranscriptWhenSharing` / `includeRecordingWhenSharing` are not enforced by the mock.** The backend enforces them per meeting (snapshotted at creation, editable later by the owner). With transcript sharing off, recipients still see insights but `Jump to conversation` can only seek audio (if shared) and the transcript endpoint returns 403. Recommendation: keep the default `true` for transcripts. (B)
15. **`ActiveSession.device/browser/location`** are derived from `auth.sessions.user_agent` and `ip` when available. Location requires IP geolocation, which we omit at MVP (field optional). [unverified: column availability]
16. **`ListResponse.total`** requires an exact count. That is fine at MVP scale; capped counts or estimates come later (see [04-api-spec.md](./04-api-spec.md) section 2).
17. **`ActionItem` cannot be created by users** (no `create` in `ActionItemService`). The schema supports `origin='user'` for when it lands. (A, later)
18. **`CaptureMode='transcript_only'`** still records audio temporarily. The backend deletes audio objects once the transcript is committed. The copy must say so ([03-security-rls.md](./03-security-rls.md) section 9).
19. **`Meeting.duration` while `upcoming`** is the scheduled length (mock behaviour). The API computes it from `scheduled_end_at - scheduled_start_at`.

---

## 17. Migrations strategy

- Tooling: **Supabase CLI**. Migrations in `supabase/migrations/YYYYMMDDHHMMSS_<slug>.sql` (the CLI's timestamp format), one concern per file (`..._meetings.sql`, `..._meetings_rls.sql`). DDL and RLS for a table ship in the **same PR**. A table must never exist without its policies.
- Local: `supabase start` runs Postgres, Auth, Storage and Realtime in Docker. `supabase db reset` replays all migrations plus `supabase/seed.sql`. The seed creates one demo org with the PRD's fictional people and companies (Northstar Labs, Meridian Freight, …), a few `ready` meetings with transcripts and insights, and Auth users created through the CLI or an admin script. The seed is never applied outside local and CI.
- Types: `supabase gen types typescript --local > packages/db/src/database.types.ts` runs in CI. The build fails on diff, so generated types always match migrations.
- Tests: pgTAP files in `supabase/tests/` (`supabase test db`) cover every RLS policy (section 10 of [03-security-rls.md](./03-security-rls.md)) and the traceability trigger.
- Production: `supabase db push` from CI against staging, then prod, gated by approval. **Expand, then contract**: add columns as nullable or defaulted, deploy code that writes both, back-fill, then tighten and drop in a later release. Destructive migrations require a second reviewer.
- Long index builds (`create index concurrently`) go in their own migration file, because the CLI wraps each file in a transaction and `concurrently` cannot run inside one. [unverified: current CLI behaviour; check before the first large-table index]
- Back-fills of more than about 100k rows run as `retention`-queue jobs in batches, not inside migrations.
