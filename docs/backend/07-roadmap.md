# 07. Roadmap, testing, CI/CD, cost model, risks

Status: draft v1. **The D-track demo slice (section 1a) now comes before M0**, per the owner's 2026-10-01 decision. M0 to M10 remain the long-term plan. Effort is in **engineer-weeks for one senior full-stack/backend engineer**, including the matching `Api*Service` work in the frontend. With two engineers, the critical path is about 18 to 20 calendar weeks, because M3 can run alongside M4, M7 alongside parts of M6, and M8 alongside M9.

## 1a. D-track: investor demo slice (runs before M0)

Owner decision (2026-10-01): build an investor-ready demo slice on free tiers first. The design, verified limits and scope are in [09-demo-slice-free-stack.md](./09-demo-slice-free-stack.md). Effort is for **one engineer**: about **5 weeks plus 1 week of buffer**. Everything not listed stays on `Mock*` services.

| Milestone | Weeks | Scope | Exit criteria |
| --- | --- | --- | --- |
| **D0. Spike and accounts** | 0.5 | Supabase Free project, Render free service, Groq (ZDR on), Cerebras and Cloudflare keys. Three-track Chrome capture spike. Groq transcription by `url`. Cerebras strict-schema test. Record the `wow` golden. | The capture spike works on the owner's laptop with a Meet tab; mic/tab drift is measured; the remuxed WebM seeks; Groq and Cerebras calls succeed; every [unverified] item in 09 sections 1 and 4 is resolved or re-tagged. |
| **D1. Skeleton, auth, onboarding, settings** | 1 | `api/` Fastify (config, JWKS, error contract, health), migrations 1 to 4, 13, 14 (bootstrap), 16. `ApiAuth/User/Onboarding/SettingsService`, registry per-service mode, `http-errors` change, `proxy.ts` on claims. | Real Google sign-in through onboarding to My Calls on the deployed demo stack. |
| **D2. Calendar and meetings read** | 1 | Pull-on-read calendar, integrations-lite, meetings CRUD (Real-lite), transcript and action-item reads. | The calendar shows real events within 2 minutes of connecting; a hand-seeded meeting renders fully from the API. |
| **D3. Capture, jobs, ASR** | 1 | Capture endpoints, `ops.jobs` loop, assemble + remux, Groq ASR fan-out, segment build, provider router with usage ledger and 429 handling, `BrowserRecorder` with IndexedDB queue. | A 20-minute live capture with one reload mid-way produces a correct two-speaker transcript that plays and seeks. |
| **D4. Brief and traceability** | 1 | Extract, reduce, verify (gate unchanged from 05 s6.8), finalize, `meeting_ready` alert, alerts-lite, pgTAP traceability tests. | The `wow` eval checklist (09 s4.7) passes 4 of 5 runs; stop-to-ready under 3 min; 100% of persisted insights pass the DB traceability constraints. |
| **D5. Ask, search, demo mode** | 0.5 | Ask (FTS windows + deterministic fallback), suggestions, history, `api.search_all` (FTS), `replay-golden`, replay providers, seeded meeting, quota panel, keep-warm. | The full wow path runs 3 times in a row on the deployed stack; replay mode produces the same brief. |
| **Buffer and pilot** | 1 | Golden variants, rehearsals, 3 to 5 pilot test users, screen recording of a successful run. | The demo-day checklist (09 s2.5) is rehearsed twice. |

**Cut lines** (cut from the top when behind): follow-up generation, then alerts-lite, then settings updates, then search over decisions and actions, then Ask history and suggestions, then calendar-linked capture. **Never cut:** the verification gate and DB traceability constraints, owner RLS, the golden replay safety net, real sign-in, real capture to transcript, and a real brief.

**Relation to M0 to M10:** the D-track reuses the migrations, contracts and `Api*Service`s it builds. When the full plan resumes, M0 starts with the monorepo move (Q13) and the dropped components listed in 09 section 2.2. M1, M2 (meetings and RLS parts), M4 and M6 are partly done by then, so re-estimate them at that point rather than subtracting weeks now.

## 1. Milestones

### M0. Repo, CI, Supabase local (1.5 wk)

- **Scope:** monorepo move (`apps/web`, `apps/api`, `apps/worker`, `packages/contracts`, `packages/db`, `supabase/`, `services/ml`). Fastify skeleton (Zod-validated config, Pino, request id, error handler implementing [01-architecture.md](./01-architecture.md) section 10, `/healthz`, `/readyz`, OpenAPI generation). `supabase init` with the extensions and types migration. Docker compose (api, worker, ml-cpu, ollama). GitHub Actions (section 5). `wid-staging` Supabase project. Contracts package seeded with `common`, `errors` and `user`.
- **Exit criteria:** `npm run dev` starts web, api and Supabase locally. CI is green on lint, typecheck, unit tests, `supabase db reset`, the gen-types diff and the OpenAPI diff. One contract test passes end to end (`GET /v1/me` stub).
- **Dependencies:** none. **Risks:** the monorepo move breaks Next 16/Turbopack paths or the `AGENTS.md` regeneration. Mitigation: move in a dedicated PR, verify `next build`, keep root scripts as proxies.

### M1. Auth, profile, settings, onboarding (2 wk)

- **Scope:** Supabase Google provider. `@supabase/ssr` in web, `/auth/callback`, `POST /v1/auth/bootstrap` (SQL bootstrap), JWKS verification plugin, Custom Access Token Hook (`app_stage`), `proxy.ts` on real claims. `/v1/me` and avatar upload, `/v1/auth/session`, `/v1/workspace/members`, `/v1/onboarding/*`, `/v1/settings` (incl. `auth.sessions` listing and revoke). RLS and pgTAP for these tables. Frontend: `ApiAuthService`, `ApiUserService`, `ApiOnboardingService`, `ApiSettingsService`, `setAuthTokenProvider`, and the `http-errors` `data.code` change.
- **Exit:** real Google sign-in on staging, a full onboarding round trip, refresh recovery, settings persisted. These four services run with mocks off in staging.
- **Deps:** M0. **Risks:** session revoke relies on GoTrue internals (R11).

### M2. Meetings CRUD, RLS, sharing (3 wk)

- **Scope:** `contacts`, `meetings`, `meeting_participants`, `meeting_share_grants`, `meeting_share_exclusions`, `tags`, insight tables (DDL with traceability constraints), `transcripts`/`segments` (read side), `playlist_items`, `meeting_stats`. Meeting list with scopes, ranges (user timezone), status, owner/participant/tag/deal filters, FTS search and keyset pagination. Get, create, update and delete (soft delete plus purge job stub). Share, unshare and share settings with computed permissions. Link share endpoint (behind the org flag). Action items (list, get, update, toggle, delete). Decisions and decision history. Transcript get and search. Playlist. Follow-up (template port). **The full RLS test matrix** ([03-security-rls.md](./03-security-rls.md) section 10). `seed.sql` with realistic ready meetings (ported from `src/mock-data`, fictional names only).
- **Exit:** My Calls, Team Calls, meeting detail, sharing, action items, playlist and follow-up run on the real API against seeded data. The RLS matrix passes. List p95 under 200 ms with 5k seeded meetings.
- **Deps:** M1. **Risks:** RLS performance with `can_read_meeting` on large lists. Mitigation: `readable_meeting_ids()` prefilter and `EXPLAIN` checks in CI on seeded volume.

### M3. Calendar (2.5 wk)

- **Scope:** integrations module and adapter interface, OAuth state with PKCE, token vault (envelope encryption), Google Calendar adapter (incremental consent), full and incremental sync, 410 handling, push channels with renewal, webhook endpoint, fallback polling, attendee and conference mapping. Integrations list/get/connect/disconnect/configure (`google`, `google_calendar`). Calendar service endpoints. **Submit Google OAuth verification** (demo video, privacy policy).
- **Exit:** connecting a real Google calendar shows events within 60 s. An edit in Google is reflected within 60 s through push. Channel renewal tested with a forced near-expiry. Disconnect revokes and cleans up.
- **Deps:** M1 (M2 for meeting linkage). **Risks:** verification timeline (R3); sync-token semantics with `timeMin` [unverified] (budget 2 extra days).

### M4. Capture and upload (3.5 wk)

- **Scope:** `capture_sessions`, `capture_chunks`, `recordings`, `processing_runs`, `processing_steps`; storage buckets and policies. Capture endpoints (start, pause, resume, heartbeat, chunks, stop, discard, active). Interruption sweep and auto-finalize. **Job runner** (claim, lease, retry, DLQ, attempts, NOTIFY wakeup, cron). `capture.assemble`, `media.normalize` (FFmpeg image). Processing status endpoint and retry. Realtime `meeting:<id>` channel and trigger. Manual upload via TUS (create/complete). Frontend: `BrowserRecorder` (graph from [05-capture-and-pipeline.md](./05-capture-and-pipeline.md) section 3), IndexedDB queue, `ApiCaptureService`, capability detection with mic-only copy. ASR/AI steps are **stubs** that complete with an empty transcript, behind a flag, so the full status sequence is testable.
- **Exit:** a 60-minute Chrome tab capture survives a reload, a 2-minute network drop and a pause/resume, and produces a playable normalized `audio.webm` whose duration matches wall-clock capture time within 2 s. A 1 GB upload resumes after a reload. Playwright E2E with a fake media stream (`--use-fake-device-for-media-stream --use-file-for-fake-audio-capture`) runs in CI.
- **Deps:** M2. **Risks:** browser audio behaviour (R1, R16). A 3-day technical spike runs at the start: tab audio after the video track is stopped, macOS system audio, echo, rotation gaps.

### M5. Transcription (3 wk)

- **Scope:** `services/ml` (FastAPI: `/v1/transcribe` with faster-whisper, `/v1/diarize` with pyannote community-1, auth token, health, GPU and CPU images). `AsrProvider` (sidecar + one hosted). Silence-cut fan-out, merge, hallucination guards, channel split, cross-channel dedupe, segment builder, speaker mapping (channel, single-attendee, LLM-assisted), unidentified-speaker contacts, the speaker-assignment endpoint, transcript commit. Failure classes. Golden-file tests and a benchmark harness (WER, DER, real-time factor).
- **Exit:** on the eval set, WER is within 2 points of large-v3, DER is measured, and English and Urdu/English code-switching are reported separately. p95 time from stop to transcript is under 5 min for 60-minute meetings on the target hardware or provider.
- **Deps:** M4. **Risks:** R6, R7, R8. GPU host selection depends on [08-open-questions.md](./08-open-questions.md) Q1 and Q2 (decide by the start of M5).

### M6. AI extraction and traceability (4 wk)

- **Scope:** `LlmProvider` (Ollama structured outputs + hosted), prompt files with versions, map/reduce/verify, due-date resolution, insight persistence (DB constraints as backstop), summaries, key points, topics, key moments, stats, `meeting.finalize`, `meeting_ready` and `processing_failed` alerts (minimal), cost accounting per run. **Eval set and harness** (section 4). A model bake-off (`qwen3:14b`, `gpt-oss:20b`, one hosted model).
- **Exit:** on the eval set, decision precision is at least 0.85 and recall at least 0.70, action item precision at least 0.80 and recall at least 0.70 (initial targets, tuned after the first labelled batch). **100% of persisted insights pass traceability** (enforced by the DB). Grounding rejection rate is under 15%. p95 stop-to-ready is under 10 min for 60-minute meetings. The meeting brief UI runs on real data.
- **Deps:** M5. **Risks:** R5, R6.

### M7. Assistant, search, embeddings (3 wk)

- **Scope:** `embed.index` (chunking, `bge-m3`, HNSW), `api.search_all` with FTS + vector RRF, Node-side caps, diversity, highlights and snippets. Assistant ask (RAG with citation verification), the deterministic fallback engine port, suggestions port, history. Quotas.
- **Exit:** search p95 under 300 ms (FTS-only queries under 150 ms) on 10k synthetic meetings. Assistant: 100% of returned sources are valid segments (enforced). On a 100-question eval, answer correctness is at least 80% and `not_found` precision at least 90%. Cross-meeting ask is designed (stretch).
- **Deps:** M6 (insight chunks), M2. **Risks:** HNSW filtered-recall issues (pgvector version [unverified]).

### M8. Alerts, notifications, deals (3 wk)

- **Scope:** the full alerts API and `user:<id>` Realtime channel, with every `AlertType` produced by real events: `meeting_ready`, `processing_failed`, `action_due` reminders, `mention` (assignment), `meeting_shared`, `deal_update`, `decision_changed` (via `ai.link_decisions`). Decision history from real supersedes links. Deals CRUD, linking (`deal_meetings`), deal-signal extraction (map pass for meetings linked to a deal or with external participants). Optional email channel (if Q8 says yes).
- **Exit:** each alert type is triggered in E2E tests. Deals pages run on real data. Decision-change detection precision is at least 0.8 on a labelled set of meeting pairs.
- **Deps:** M6 (M7 for embeddings used in decision linking). **Risks:** noisy `decision_changed` alerts. Mitigation: conservative thresholds, plus an LLM confirmation step.

### M9. Zoom (2.5 wk + review wait)

- **Scope:** Zoom app, OAuth adapter (rotating refresh tokens under lock), webhook endpoint (signature, URL validation, inbox), offers, list and import endpoints, `zoom.import` (per-participant tracks, VTT hints), deauthorization. Marketplace submission.
- **Exit:** a real Zoom cloud recording is imported end to end with correct speaker names when per-participant audio is on. Webhook validation passes the 72 h re-check. The app is submitted for review.
- **Deps:** M4 pipeline entry, M3 integration machinery. **Risks:** R4 (review time), and the paid-plan requirement limits who benefits.

### M10. Hardening and launch readiness (3 wk)

- **Scope:** k6 load tests (API at 10x expected peak; pipeline at 3x expected daily volume in 1 hour). Security review: an external pentest if budget allows, otherwise an OWASP ASVS L2 self-review, dependency and secret scanning, RLS fuzz tests. PITR plus a **restore drill**. Runbooks (incident, dead-letter triage, provider outage switch, token-key rotation, data-subject request, takedown). GDPR export and delete. Retention jobs verified. Cost dashboards. Rate-limit tuning. Chaos tests (kill workers mid-job, revoke Google tokens, Storage outage). **Legal review of ToS, privacy policy, consent copy and Google Limited Use (launch blocker).**
- **Exit:** launch checklist signed off. The restore drill finishes in under 2 hours (RTO) with under 5 min of data loss (RPO with PITR). No high or critical findings open.
- **Deps:** all. **Risks:** findings that need redesign. Mitigation: security review of the M2 and M4 designs early, not only at M10.

**Total:** about 31 engineer-weeks, plus external waits (Google verification 2 to 6 wk and Zoom review 2 to 6 wk [unverified], both running in parallel).

```text
weeks:  0    2    4    6    8   10   12   14   16   18   20   (two engineers)
Eng A:  M0─M1───M2────────M4──────────M5────────M6────────────M10──
Eng B:       (M1 help)  M3────────(M4 FE)  M7(prep)──M7──────M8──M9──
External:          [Google verification ......]        [Zoom review ......]
```

## 2. Frontend cutover from Mock to Api

1. **Per-service mode.** Extend `services/registry.ts`: keep `NEXT_PUBLIC_USE_MOCKS`, and add `NEXT_PUBLIC_API_SERVICES` (a comma list, read literally so Next inlines it). In api mode, a service is resolved from `apiServiceFactories` if listed, otherwise from the mock factories. **Mixed mode is allowed only when `NEXT_PUBLIC_APP_ENV !== 'production'`.** Production must list every service (or `*`), keeping the registry's "never silently fall back" principle. Mixed mode has known seams (mock meetings vs the real user id). It is a dev convenience, not a product state.
2. **Cutover order** follows the milestones: `auth,user,onboarding,settings` (M1), then `meetings,transcripts,actionItems,playlist` (M2, seeded data), `calendar,integrations` (M3), `capture` (M4), `assistant,search` (M7), `alerts,deals` (M8).
3. **Definition of done per service:**
   - `Api<Name>Service` implemented with `apiClient` and `parse: Contracts.<Schema>.parse` (dev and test).
   - The **mock conformance test** passes: every `Mock*` method's output parses with the same Zod schemas. Run under `NODE_ENV=test` via `jiti`, like the Phase 1 script, but committed. This proves the UI built against mocks is compatible with the API contract.
   - The **API contract test** passes: route response schemas come from the same package, and `app.inject` integration tests assert status codes and error envelopes, including `fieldErrors` keys used by forms.
   - The **Api service adapter test** passes: replay recorded API responses through the existing `ApiAdapter` seam (no network), covering error mapping (401 to `unauthorized`, 422 to `fieldErrors`, 429 to `retryAfterSeconds`, `data.code` domain codes).
   - Staging runs with the service in api mode for at least 3 days without new Sentry errors before production.
4. **Remove mock-only behaviour** that does not exist in API mode: the `?mockFail` and `?mockLatency` URL flags (these stay mock-only), the `wid_session_hint` writers (replaced by Supabase claims), and `listGoogleAccounts` fixtures.

## 3. Testing strategy

| Layer | Tool | What | Where |
| --- | --- | --- | --- |
| Unit | Vitest | Pure logic: cursor codec, permission calculators, segment builder, cross-channel dedupe, verification (quote matching, re-anchoring), due-date resolution, RRF fusion, ported `answerQuestion` / `suggestQuestions` / `findHighlights`, capture timeline maths (shared with `capture-machine.ts`) | every PR |
| DB / RLS | pgTAP (`supabase test db`) | Every policy, the traceability FK and trigger, state-transition function, enqueue dedupe, `readable_meeting_ids` parity with `can_read_meeting` | every PR |
| Integration | Vitest + `supabase start` + `app.inject` | Real Postgres, Storage and Auth (test users created through the admin API locally; JWTs from real sign-in with test credentials enabled **only** in local/CI config) | every PR |
| Contract | Zod schemas in `packages/contracts` | Mock conformance, API response conformance, OpenAPI diff | every PR |
| Pipeline golden files | Vitest + recorded fixtures | 6 to 10 short fictional recordings with stub providers replaying recorded ASR/LLM outputs: status sequence, steps, invariants, idempotent re-runs (each step run twice gives identical DB state) | every PR |
| Pipeline real-model | Nightly CI job (GPU runner or hosted keys) | WER, DER, extraction P/R, grounding rejection, latency, cost per meeting, compared with the last baseline | nightly + before model/prompt releases |
| E2E | Playwright | Sign-in (staging test account), onboarding, capture with a fake media stream, upload, ready, ask, share | staging deploy |
| Load | k6 | API read/write mix, search, ask; pipeline throughput | M7, M10 |

## 4. Extraction eval set

- **Composition (target 40 meetings by the end of M6):**
  - 20 fictional role-played meetings recorded by the team (sales discovery, sprint planning, 1:1, customer research, leadership sync), using **only the PRD's fictional names and companies**, with English, accented English and Urdu/English code-switching.
  - 10 to 20 meetings from openly licensed corpora such as the **AMI Meeting Corpus** (CC BY 4.0 [unverified licence terms; confirm before use]).
  - **Never production data** (privacy, plus Google Limited Use if calendar-derived context is involved).
- **Labels:** for each meeting, gold decisions, action items (assignee, due phrase), questions (answered or open), risks, each with gold segment ids. Two annotators. Disagreements are adjudicated. Annotation guidelines live in the repo.
- **Metrics:**
  - Precision and recall per type, with a match defined as same type, semantic match (LLM judge **and** a human spot-check of 20%) and evidence within ±1 segment.
  - Grounding validity (must be 100%).
  - Assignee accuracy and due-date accuracy.
  - Assistant: 100 Q&A pairs (answerable and unanswerable) scored for correctness, citation validity and `not_found` precision.
- **Gate:** see [05-capture-and-pipeline.md](./05-capture-and-pipeline.md) section 13.

## 5. CI/CD

- **On every PR:** install, lint, typecheck (web, api, worker, contracts), unit tests, `supabase start`, migrations, pgTAP, integration tests, gen-types diff, OpenAPI diff, golden pipeline tests, Docker build (no push), dependency audit, secret scan.
- **On main:** build and push images (`api`, `worker`, `ml`). `supabase db push` to **staging**. Deploy the API and worker to staging (rolling). Smoke tests (health, sign-in with a test account, list meetings, upload a 30 s sample and wait for `ready`). Playwright suite.
- **Promote to production:** manual approval in GitHub Environments, then migrations, worker, API (workers first, because the worker must understand new job payloads before the API enqueues them). Release notes come from conventional commits.
- **Migrations:** expand/contract only, with automated checks that reject `drop column` or `alter type ... rename` without a `-- contract-phase` marker and a second reviewer.
- **Rollback:** images are immutable and roll back with one click. Migrations are forward-only, so rollback means a corrective migration. That is why expand/contract matters.

## 6. Cost model (monthly, rough, USD)

Assumptions: average meeting 45 minutes, 5 assistant questions per meeting, playback audio kept 90 days, prices as of this planning pass and **[unverified]** except the $0.006/min ASR reference. LLM cost assumes a mid-tier hosted model at about $0.10 to $0.30 per meeting all-in (extraction, verification, assistant). Recompute with real token counts after M6.

| Line item | 100 meetings | 1,000 meetings | 10,000 meetings |
| --- | --- | --- | --- |
| Audio volume | 75 h | 750 h | 7,500 h |
| **Hosted AI path** | | | |
| ASR at $0.006/min | $27 | $270 | $2,700 |
| LLM (extraction + verify + assistant) | $10 to 30 | $100 to 300 | $1,000 to 3,000 |
| Embeddings | <$1 | ~$3 | ~$30 |
| **Self-hosted AI path** | | | |
| GPU, on-demand scale-to-zero (~8 GPU-min per meeting at $0.7 to 1.2/h + cold-start overhead) | $20 to 40 | $120 to 250 | not ideal at this volume |
| GPU, always-on (1x 24 GB at about $500 to 900 each) | $500 to 900 (wasteful) | $500 to 900 (~20% utilised) | 2 to 3 boxes: $1,000 to 2,700 (vLLM batching recommended) |
| **Common** | | | |
| Supabase (Pro + compute add-on + storage + egress) | $25 to 50 | $60 to 150 | $300 to 800 |
| API + worker hosting | $20 to 50 | $50 to 150 | $300 to 600 |
| Observability / error tracking | $0 to 50 | $50 to 150 | $200 to 500 |
| **Total, hosted AI** | **~$85 to 210** | **~$530 to 1,020** | **~$4,500 to 7,600** |
| **Total, self-hosted (best option per column)** | **~$65 to 190** (on-demand) | **~$280 to 700** (on-demand) | **~$1,800 to 4,600** (always-on) |
| Cost per meeting | $0.6 to 2.1 | $0.3 to 1.0 | $0.2 to 0.8 |

Takeaways:

1. Below about 1k meetings per month the difference between hosted and self-hosted is noise next to engineering time. Choose on privacy and positioning, not cost.
2. Always-on GPUs only pay off around 5k or more meetings per month.
3. On-demand GPU with scale-to-zero is the best self-hosted option early, at the price of 10 to 60 s cold starts (fine for a pipeline that already takes minutes).
4. Storage stays small for audio-only (about 11 MB per 45-minute meeting). Video mode changes this by about 50x.

## 7. Risk register

| # | Risk | L | I | Mitigation | Trigger / owner |
| --- | --- | --- | --- | --- | --- |
| R1 | Browser capture cannot hear remote participants for Zoom/Teams **desktop** on macOS, or in Safari/Firefox, so many users get mic-only notes | H | H | Clear capability copy before start. Manual upload. Zoom cloud import (M9). Verify Chrome macOS system audio in the M4 spike. Desktop agent later. | More than 30% of captures are mic-only or fall back to upload: re-prioritise the desktop agent |
| R2 | Recording-consent legal exposure (all-party consent jurisdictions, GDPR) | M | H | Consent attestation, participant notice, ToS obligations, counsel review before launch, no voice prints | Launch blocker (M10) |
| R3 | Google OAuth verification takes long or is rejected | M | H | Submit in M3 with a complete demo video. Narrow scopes. No restricted scopes. | No approval 4 weeks before launch: launch to under 100 test users |
| R4 | Zoom Marketplace review delays or rejection; cloud recording needs paid Zoom | M | M | Submit early in M9. Browser capture covers Zoom web. Upload covers local recordings. | Rejection: fix and resubmit, Zoom stays beta |
| R5 | Hallucinated or ungrounded insights damage trust | M | H | Evidence-required schema, quote verification, judge, DB constraints, eval gate, users can edit and dismiss | Grounding rejection >15% weekly or a user report of a false decision: freeze model/prompt changes |
| R6 | Self-hosted model quality or ops burden too high (GPU availability, drivers, OOM) | M | M | Provider abstraction, hosted fallback and overflow routing, bake-off in M6 | Eval below target with local models: use hosted for extraction and keep local for embeddings |
| R7 | ASR quality on accented or code-switched (Urdu/English) speech | M | M | Eval split by language. large-v3 for affected languages. Hosted alternative. Language override. | WER >25% on the code-switch subset |
| R8 | Diarization or speaker mapping errors assign action items to the wrong person | M | M | Channel split, conservative mapping, "Speaker N" with user assignment, assignee shown with source | Assignee accuracy <85% on eval |
| R9 | RLS or authorization bug leaks meetings across users or tenants | L | Critical | Defence in depth (API checks + RLS), pgTAP matrix, `not_found` semantics, security review in M2 and M10, audit log | Any finding: incident process |
| R10 | Supabase plan limits or outages (Realtime connections, storage, compute), vendor lock-in | M | M | Polling fallback. Standard Postgres SQL (portable). Storage behind our own module. Pro plan with PITR. | Sustained limit alarms: upgrade compute or move Realtime to a dedicated service |
| R11 | Session revoke depends on undocumented `auth.sessions` deletion | M | L | Isolated in one function, tested on each Supabase upgrade, fallback "sign out everywhere" (`auth.admin.signOut` global scope) | Breakage on a GoTrue upgrade |
| R12 | Postgres queue bloat or contention at scale | L | M | Partial indexes, short retention of terminal jobs, autovacuum tuning, outbox pattern ready for SQS | Above 50 jobs/s or claim p95 >200 ms |
| R13 | Contract drift between frontend types and API | M | M | Shared Zod package, mock conformance tests, OpenAPI diff, enum parity test | Any CI failure blocks merge |
| R14 | Single backend engineer (bus factor, velocity) | H | M | These docs, runbooks, ADRs in `docs/backend/adr/`, a second engineer by M4 | Slipping more than 2 weeks on a milestone |
| R15 | Hosted AI cost overrun (assistant abuse, long meetings) | L | M | Quotas, per-run cost accounting, alerting on cost per meeting, duration caps | Cost per meeting >2x the model |
| R16 | Audio loss on crash or chunk corruption | M | H | IndexedDB-first buffering, parts rotation, contiguity check, "process what was captured", chunks retained 24 h | Any reported loss: postmortem |
| R17 | Prompt injection via transcript content | M | L-M | No tools or actions for the LLM, schema-only outputs, verification, instruction to treat the transcript as data | Detected injection pattern in eval or a report |
| R18 | Google Limited Use / DPA compliance when hosted LLMs see calendar-derived data | M | M | Prefer self-hosted for calendar-derived context, or vendors with no-training terms. Legal review. | Before enabling hosted providers in prod |

Risks specific to the free-tier demo slice (quota exhaustion, cold starts, project pausing, provider changes, Testing-mode token expiry, free-tier data use) are F1 to F11 in [09-demo-slice-free-stack.md](./09-demo-slice-free-stack.md) section 6.2.
