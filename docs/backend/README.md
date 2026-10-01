# WIT backend implementation plan

Status: draft v1, 2026-10-01. Scope: everything needed for the real backend to replace the mock services in `src/services/mock` without UI rewrites, while keeping the PRD's two hard rules: **manual capture only** and **every insight traceable to a meeting, a transcript segment and a timestamp**.

> **Demo slice first (owner decision, 2026-10-01).** The next build is an **investor-ready demo slice on free tiers only**, not M0 to M10. It covers real Google sign-in and read-only Calendar, live Chrome tab and mic capture to a real transcript, a real traceable AI brief (verification gate kept), Ask-the-meeting and search. Everything else stays mocked behind the service registry. The slice uses Supabase Free, one Render free web service running the API and worker in one process, Groq Whisper for ASR, Cerebras/Groq `gpt-oss-120b` for extraction, Cloudflare Workers AI as fallback, and Postgres FTS with no vectors. It is about 5 engineer-weeks plus 1 week of buffer (the D-track in [07-roadmap.md](./07-roadmap.md) section 1a). Read [09-demo-slice-free-stack.md](./09-demo-slice-free-stack.md) first. Files 01 to 08 remain the long-term target; 09 section 7 lists what the slice defers from each.

## Reading order

| # | File | Read it for |
| --- | --- | --- |
| 1 | [01-architecture.md](./01-architecture.md) | System diagram, responsibilities, repo layout, deployment, queue choice, observability, error contract |
| 2 | [02-data-model.md](./02-data-model.md) | Full Postgres DDL, traceability enforcement, state machines, type mapping and mismatches, migrations |
| 3 | [03-security-rls.md](./03-security-rls.md) | Auth (Supabase + Bearer), RLS helpers and policies, token encryption, storage, privacy/GDPR, consent |
| 4 | [04-api-spec.md](./04-api-spec.md) | Every service-interface method mapped to REST; pagination, idempotency, versioning, Realtime topics |
| 5 | [05-capture-and-pipeline.md](./05-capture-and-pipeline.md) | How audio gets in; FFmpeg, Whisper, diarization, LLM extraction, verification, RAG and search |
| 6 | [06-integrations.md](./06-integrations.md) | Google Calendar (sync, push channels, verification), Zoom (OAuth, webhooks, import), extension points |
| 7 | [07-roadmap.md](./07-roadmap.md) | M0 to M10 milestones, cutover plan, testing, CI/CD, cost model, risk register |
| 8 | [08-open-questions.md](./08-open-questions.md) | Decisions the owner must make, each with a recommendation, and which ones the demo slice resolves or defers |
| 9 | [09-demo-slice-free-stack.md](./09-demo-slice-free-stack.md) | **Build this first.** Free-stack selection with verified limits, privacy rules for free AI tiers, the simplified slice architecture, per-service scope, trimmed migrations, capture and pipeline, the wow-path script, frontend cutover, week plan and risks |

Short on time? Read this page, then [09](./09-demo-slice-free-stack.md), then [05](./05-capture-and-pipeline.md) sections 1 and 6, then [08](./08-open-questions.md).

## One-page summary

**Shape.** Next.js frontend, then a **Fastify 5 modular monolith** (Node 22 + TypeScript, Zod, Pino, OpenAPI from route schemas), then **Supabase** (Postgres with RLS, Auth with Google, Storage, Realtime Broadcast, pgvector, pg_cron). A **worker** process (same codebase) runs a **Postgres job queue** (`ops.jobs` + `SKIP LOCKED`). A small, stateless **Python ML sidecar** runs faster-whisper and pyannote. **Ollama** (or a hosted provider behind the same interfaces) handles LLM and embeddings. Everything lives in one monorepo with a shared `packages/contracts` (Zod) used by both frontend and API.

**Key decisions.**

1. The browser talks to the Node API for all domain data (Bearer Supabase JWT). It talks to Supabase directly only for sign-in, Storage uploads into pre-registered paths, and private Realtime channels. RLS is enabled on every table as a second line of defence. The API uses a user-scoped Supabase client, so RLS applies to its queries too.
2. **Traceability is enforced in the schema.** Every insight row has `NOT NULL` evidence columns, a composite FK to a transcript segment of the *same* meeting, a trigger checking the timestamp against that segment, and a verbatim `evidence_quote` for AI rows. The pipeline's verification gate rejects ungrounded output before it reaches the DB. `sourceTimestamp` is always set by the server, never by the model.
3. **Capture.** Phase 1 is Chromium browser capture (tab/system audio + mic, recorded as stereo with mic on L and remote on R, which gives "who is me" for free), 5-second chunks buffered in IndexedDB and uploaded to Storage with a capture-session API (heartbeat, crash recovery, interruption handling), plus manual upload via TUS. Mic-only fallback on Safari and Firefox. Phase 2 adds Zoom cloud-recording import, offered to the user and never auto-imported. Bots and desktop agent are deferred on evidence.
4. **Pipeline.** Assemble, then FFmpeg normalize, then Whisper (fan-out on silences), then diarization and speaker mapping (channel, attendees, conservative LLM assist, otherwise "Speaker N" for the user to assign), then map-reduce structured extraction with strict Zod schemas, then the **grounding verification gate**, then finalize (`ready`, alerts). Embeddings and decision linking run afterwards. Each step is idempotent per run, retries with backoff, dead-letters into `failed` with Retry resuming at the failed step.
5. **Search and RAG.** Postgres FTS (prefix tsquery, GIN) fused with pgvector HNSW (`bge-m3`, 1024-d) by reciprocal rank fusion. Behaviour mirrors `search-engine.ts` and `assistant-engine.ts`. The ported deterministic assistant engine is kept as the fallback when the LLM is unavailable.
6. **Integrations.** Google Calendar uses a separate incremental-consent OAuth flow (sensitive scopes, no CASA), sync tokens, 7-day push channels with renewal, and envelope-encrypted tokens. Zoom uses user-managed OAuth with rotating refresh tokens under a lock, HMAC-verified webhooks, and user-initiated import.

**Stack challenges raised** (the details are in [01-architecture.md](./01-architecture.md) section 1):

- **sentence-transformers is Python.** Replaced with Ollama `bge-m3` (or moved into the Python sidecar we need anyway).
- **Whisper and diarization are Python-first**, so a Node-only audio pipeline isn't realistic. A Python sidecar is needed.
- **supabase-js cannot do transactions, `LISTEN` or `SKIP LOCKED`.** We add SQL RPC functions plus a plain `postgres` driver for the worker and queue. Still no ORM.
- **Self-hosted GPU at MVP volume costs more than hosted APIs.** Self-hosting is a privacy choice, so we keep provider abstractions.
- **The frontend's httpOnly-cookie assumption** conflicts with direct Storage and Realtime access. We switch to Bearer tokens.
- **Supabase provider tokens aren't refreshed for us.** Calendar and Zoom get their own OAuth.
- **pg-boss can't be enqueued from our SQL transactions.** We build a custom table queue (pgmq is the fallback).
- **Supabase Realtime Postgres Changes doesn't scale with RLS.** We use Broadcast from the database.

**Top risks** (full register in [07-roadmap.md](./07-roadmap.md) section 7):

- R1: browser capture can't hear Zoom/Teams **desktop** on macOS, or anything in Safari or Firefox.
- R2: recording-consent law.
- R5: hallucinated insights.
- R3 and R4: Google verification and Zoom review timelines.
- R9: authorization leaks.
- R7 and R8: ASR and diarization quality on accented or code-switched speech.

**Effort.** About 31 engineer-weeks (M0 to M10), or about 18 to 20 calendar weeks with two engineers, plus external review waits running in parallel.

**Cost** (rough). About $65 to 210/month at 100 meetings, $280 to 1,020 at 1k, and $1.8k to 7.6k at 10k, depending on hosted vs self-hosted AI ([07-roadmap.md](./07-roadmap.md) section 6).

## Frontend changes this plan requires (all small, mostly additive)

The demo slice needs only a subset of these, with `src/contracts` in place of `packages/contracts`. See [09-demo-slice-free-stack.md](./09-demo-slice-free-stack.md) section 5 for the ordered checklist.

| Change | Where | Milestone |
| --- | --- | --- |
| Read `data.code` from error bodies when it's a valid `AppErrorCode`; map 503 to `service_unavailable` | `src/lib/api/http-errors.ts` | M1 |
| Supabase browser/server clients via `@supabase/ssr`; `/auth/callback` route; register `setAuthTokenProvider(() => session.access_token)` | `src/lib/auth`, `app/(auth)`, providers | M1 |
| `proxy.ts` reads the stage from verified Supabase claims (`app_stage`) instead of `wit_session_hint` | `src/proxy.ts`, `src/lib/auth/*` | M1 |
| `signInWithGoogle` becomes redirect-based (its promise never resolves); `listGoogleAccounts` returns `[]` | `ApiAuthService` + login UI pending state | M1 |
| Per-service API mode (`NEXT_PUBLIC_API_SERVICES`) | `src/services/registry.ts` | M1 |
| `Api*Service` implementations using `packages/contracts` schemas | `src/services/api/*` | M1 to M8 |
| Additive types: `Topic` traceable fields, `keyPointSources`/`overviewSources`, `MeetingService.discardCapture`, `getActiveCapture`, `RecordingService` (upload), `TranscriptService.assignSpeaker`, `AlertType` += `zoom_recording_available`/`capture_interrupted`, `Meeting.audioUrlExpiresAt` | `src/types`, `src/services/interfaces` | M2 to M9 |
| `BrowserRecorder` + IndexedDB upload queue behind the existing `CaptureRecorder` seam; capability detection and mic-only copy; consent attestation in the start dialog | `src/services/api/capture-service.ts`, capture UI | M4 |
| `ApiSearchService` merges client-side command results (API never returns `command`) | `src/services/api/search-service.ts` | M7 |
| Realtime subscriptions (`meeting:<id>`, `user:<id>`) that invalidate TanStack queries; polling kept as fallback | `src/hooks/*` | M4, M8 |

## Fact-check notes

Facts checked against vendor docs during planning are tagged **[verified]** with links in each doc. Things not yet confirmed are tagged **[unverified]** and must be checked before we build on them. The most important unverified items:

- Chrome-on-macOS system-audio capture.
- Whether stopping the display video track ends tab audio.
- The pgvector version on our Supabase project (iterative HNSW scans).
- Exact Zoom granular scope names and refresh-token lifetime.
- Whether the `calendar.calendarlist.readonly` scope is available.
- Sync-token behaviour with `timeMin`.
- Deleting a specific session in `auth.sessions`.
- GPU throughput and latency figures.
