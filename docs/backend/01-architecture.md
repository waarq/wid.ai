# 01. Architecture

Status: draft v1 (2026-10-01). Owner: backend. Read [README.md](./README.md) first for the summary and reading order.

This document fixes the shape of the system: what runs where, who owns which responsibility, how the repo is laid out, how we deploy, and how errors reach the frontend's `AppError`. Schema details are in [02-data-model.md](./02-data-model.md), auth and RLS in [03-security-rls.md](./03-security-rls.md), endpoints in [04-api-spec.md](./04-api-spec.md), and the capture and AI pipeline in [05-capture-and-pipeline.md](./05-capture-and-pipeline.md).

Conventions used in all backend docs:

- **[verified]** means checked against vendor docs during this planning pass (links inline).
- **[unverified]** means believed true but not confirmed. Confirm it before building on it.
- "Frontend" means the existing Next.js 16 app in this repo. "API" means the Node service. "Worker" means the Node job runner. "ML sidecar" means the Python inference service introduced below.

---

## 1. Baseline stack and where we deviate from it

The product owner's baseline is kept with five deliberate deviations. Each one is a real constraint, not a matter of taste.

| Baseline item | Decision | Why |
| --- | --- | --- |
| Node.js + TypeScript modular monolith + separate worker | **Kept.** One codebase, two entrypoints (`api`, `worker`). | Simple to run, deploy and test. Module boundaries are enforced by folder plus lint rules, not by network hops. |
| Fastify preferred over Express | **Kept: Fastify 5.** | See section 1.1. |
| Supabase (Postgres, Auth with Google, Storage, Realtime, pgvector, RLS) | **Kept.** | It covers five infrastructure concerns with one vendor and gives RLS as a second line of defence. |
| Supabase JS client first, no Prisma | **Kept with one addition:** a plain SQL driver (`postgres`, the porsager library) for the worker, the job queue and multi-statement transactions. | **Challenge 1.** `supabase-js` talks to PostgREST over HTTP. It cannot open a transaction, hold a session, `LISTEN`, or run `SELECT ... FOR UPDATE SKIP LOCKED`. Multi-row atomic writes (for example "stop capture, set status, enqueue job") must be either a Postgres function called through `rpc()` or a SQL transaction on a direct connection. We use both: RPC functions for request-path atomic writes under the user's JWT, and the SQL driver only in trusted server code. This is not an ORM and adds no schema layer. |
| No Redis / BullMQ / MinIO initially | **Kept.** | The job queue lives in Postgres (section 6). Rate limits are per instance (section 9). Storage is Supabase Storage. Triggers to add Redis are listed in section 9. |
| Postgres job queue (SKIP LOCKED table vs pgmq vs pg-boss) | **Custom `ops.jobs` table with `SKIP LOCKED`.** | See section 6. |
| Whisper for transcription | **Kept, but it runs in a Python ML sidecar** (faster-whisper), with a hosted ASR API behind the same interface. | **Challenge 2.** Whisper runtimes that are production-grade (faster-whisper, WhisperX) and the only credible open diarization model (pyannote) are Python. A Node-only audio pipeline would mean whisper.cpp with no diarization. We isolate Python in one small HTTP service with no business logic and no database access. |
| Ollama for local LLM | **Kept, behind an `LlmProvider` interface** with a hosted fallback. | **Challenge 3.** At 100 to 1,000 meetings a month, an always-on GPU costs more than hosted inference (see the cost model in [07-roadmap.md](./07-roadmap.md)). Self-hosting is a privacy and positioning decision, not a cost one, until roughly 5k to 10k meetings a month. The abstraction keeps the choice open. See [08-open-questions.md](./08-open-questions.md) Q1. |
| Embeddings with sentence-transformers | **Replaced by Ollama embedding models (`bge-m3`, 1024 dimensions)**, with a hosted embedding API as fallback. | **Challenge 4.** sentence-transformers is a Python library and cannot run in the Node worker. Ollama already exposes `/api/embed` and hosts `bge-m3` (1024 dims, multilingual) and `nomic-embed-text` (768 dims) [verified: [Ollama embedding models overview](https://www.morphllm.com/ollama-embedding-models)]. If we end up running the Python sidecar anyway (we do, for ASR), moving embeddings into it with sentence-transformers is a one-file change. The column is fixed at 1024 dimensions so `bge-m3`, `qwen3-embedding:0.6b` and OpenAI `text-embedding-3-small` with `dimensions=1024` are interchangeable without a schema change, though switching models still requires re-embedding. |
| Supabase Realtime | **Kept, using Broadcast from the database on private channels**, not Postgres Changes. | Broadcast via `realtime.send` with RLS on `realtime.messages` [verified: [Realtime Authorization](https://supabase.com/docs/guides/realtime/authorization)]. Postgres Changes re-evaluates RLS per subscriber per change and is the documented scaling bottleneck. The frontend already polls (`refetchInterval` in `use-meetings.ts` and `use-alerts.ts`), so Realtime only speeds things up and nothing depends on it. |
| httpOnly-cookie sessions (frontend convention) | **Changed to Supabase session + Bearer token to the API.** | **Challenge 5.** The browser must hold a Supabase access token anyway, to upload capture chunks to Storage and to join private Realtime channels. A backend-only httpOnly cookie would still have to hand that token to JavaScript. Details and the required frontend changes are in [03-security-rls.md](./03-security-rls.md) section 2. |

### 1.1 Why Fastify over Express

- Pino is Fastify's logger, so request-scoped structured logs with `reqId` come at no extra cost.
- Schema-first routes: `fastify-type-provider-zod` turns the same Zod schemas we share with the frontend into request validation, response serialisation and TypeScript types. `@fastify/swagger` emits OpenAPI 3.1 from them. With Express we would have to assemble each of these ourselves.
- Encapsulated plugins map cleanly onto modules (`meetings`, `deals`, ...). Each module registers its routes, decorators and hooks in its own scope, which is what a modular monolith needs.
- Raw-body access per route (`addContentTypeParser` scoped to webhook plugins) is needed for Zoom HMAC verification without disabling JSON parsing elsewhere.
- Built-in `inject()` for in-process HTTP tests.

Express 5 would work. It just needs more glue code, and that glue is where validation and error-mapping bugs tend to come from.

---

## 2. System diagram

```text
                                    ┌──────────────────────────────────────────────┐
                                    │                 Browser                       │
                                    │  Next.js 16 app (apps/web)                    │
                                    │  - services/api/* -> apiClient (Bearer JWT)   │
                                    │  - @supabase/ssr: Google sign-in, session     │
                                    │  - Recorder: getDisplayMedia + mic mix,       │
                                    │    MediaRecorder chunks -> IndexedDB buffer   │
                                    └───┬─────────────┬───────────────┬────────────┘
                     REST /api/v1 (JSON, │             │ Storage upload │ Realtime WS
                     Bearer access token)│             │ (chunks, TUS)  │ (private channels)
                                         ▼             ▼                ▼
┌──────────────────────────┐   ┌──────────────────────────────────────────────────────────┐
│ Node API (apps/api)      │   │                       Supabase project                    │
│ Fastify 5 modular        │   │  ┌────────────┐  ┌──────────────┐  ┌────────────────────┐ │
│ monolith                 │──▶│  │ Auth (GoTrue│  │ Storage      │  │ Realtime           │ │
│ - verifies JWT via JWKS  │   │  │ Google OIDC)│  │ buckets:     │  │ Broadcast via      │ │
│ - Zod validation         │   │  └────────────┘  │ capture-     │  │ realtime.send()    │ │
│ - permissions            │   │                  │ chunks,      │  │ RLS on             │ │
│ - user-scoped supabase-js│   │                  │ recordings,  │  │ realtime.messages  │ │
│   (RLS enforced)         │   │                  │ avatars      │  └────────────────────┘ │
│ - RPC for atomic writes  │   │                  └──────────────┘                         │
│ - OAuth (Google Cal,Zoom)│   │  ┌──────────────────────────────────────────────────────┐ │
│ - webhooks (Zoom, GCal)  │──▶│  │ Postgres 15+/17  (RLS on every public table)         │ │
│ - signed media URLs      │   │  │ public: domain tables      app_private: helpers,     │ │
└───────────┬──────────────┘   │  │ ops: jobs, audit, idem.    encrypted tokens          │ │
            │ enqueue (SQL fn) │  │ extensions: vector, pg_trgm, citext, pg_cron         │ │
            ▼                  │  └──────────────────────────────────────────────────────┘ │
┌──────────────────────────┐   └──────────────────────────────────────────────────────────┘
│ Worker (apps/worker)     │──── direct SQL (postgres driver): SKIP LOCKED, LISTEN/NOTIFY
│ same codebase, job       │──── service-role supabase-js for Storage download/upload
│ handlers by queue:       │
│  capture.assemble        │        ┌───────────────────────────┐
│  media.normalize (FFmpeg)│──HTTP─▶│ ML sidecar (services/ml)  │ Python, FastAPI
│  asr.transcribe          │        │ faster-whisper (GPU/CPU)  │ stateless, no DB access
│  ai.extract / ai.verify  │        │ pyannote diarization      │
│  embed.index             │        └───────────────────────────┘
│  notify.*  calendar.sync │        ┌───────────────────────────┐
│  zoom.import  retention  │──HTTP─▶│ Ollama (LLM + embeddings) │ or hosted LLM / ASR /
└──────────────────────────┘        └───────────────────────────┘ embedding API (fallback)
            │
            └──HTTPS──▶ Google Calendar API, Zoom API, email provider (later)

  Inbound webhooks:  Google Calendar push ─┐
                     Zoom event webhooks  ─┴─▶ Node API /api/v1/webhooks/* ─▶ ops.webhook_events ─▶ job
```

---

## 3. Responsibilities: who owns what

| Concern | Supabase | Node API | Worker | ML sidecar / Ollama | Browser |
| --- | --- | --- | --- | --- | --- |
| Identity, Google sign-in, session refresh | **Owns** (Auth) | Verifies JWT, bootstraps profile | none | none | Starts OAuth with `@supabase/ssr` |
| Calendar and Zoom OAuth tokens | Stores ciphertext | **Owns** flow, encryption, refresh | Refresh jobs | none | Redirects only |
| Domain data and authorization | **Enforces RLS** (second line) | **Primary authorization**, computes `canManage`/`canRemove` | Service role, scoped by job payload | none | Never trusted |
| Media bytes | **Stores** (Storage) | Issues signed URLs, validates registrations | Assembles, normalises, deletes | Reads a presigned URL | Uploads chunks/files directly |
| Processing pipeline | Holds queue tables | Enqueues | **Owns execution** | **Inference only** | Polls or subscribes |
| Realtime events | **Delivers** | none | Emits via `realtime.send` (in SQL, inside the same transaction as the status change) | none | Subscribes to private channels |
| Search and RAG | FTS, pgvector, SQL functions | Ranking and fusion, prompt assembly | Embedding writes | Embeddings, LLM | Renders |
| Schedules (token refresh, channel renewal, retention, reminders) | `pg_cron` enqueues jobs | none | Executes | none | none |

Rules that come out of this table:

1. **The browser never reads or writes domain tables through PostgREST.** Every `services.*` call goes to the Node API. The browser talks to Supabase directly only for Auth, Storage uploads to paths the API pre-registered, and Realtime subscriptions. RLS stays on every table anyway (defence in depth, and because PostgREST is reachable with the anon key).
2. **The API uses a per-request, user-scoped `supabase-js` client** (created with the caller's JWT), so RLS applies to every query it makes on the user's behalf. The service-role key is used only in modules listed in [03-security-rls.md](./03-security-rls.md) section 6.
3. **Python holds no state and no secrets other than its own auth token.** It receives a short-lived signed Storage URL and returns JSON. That keeps the Python surface small and replaceable by a hosted API.

---

## 4. Repository layout

**Recommendation: one monorepo, npm workspaces** (the frontend already uses npm), not a separate `wid-backend` repo.

Why: the single most valuable artefact in this project is the contract between `src/services/interfaces` and the API. With one repo, the Zod schemas live in one package that both the frontend (`parse:` in `apiClient`) and the API (route schemas, OpenAPI) import, and a contract change is one PR that type-checks both sides. With two repos, the contract has to be published as a versioned package and drift between the two sides goes unnoticed until runtime.

Cost: in M0 the Next.js app moves from the repo root to `apps/web` (`git mv` keeps history). `AGENTS.md`/`CLAUDE.md` stay at the root. `next dev` regenerates its agent block relative to the app, so check where it writes after the move.

```text
wid/
├── apps/
│   ├── web/                      # existing Next.js app (moved from root in M0)
│   ├── api/                      # Fastify API
│   │   └── src/
│   │       ├── main.ts           # API entrypoint
│   │       ├── app.ts            # buildApp(): registers plugins + modules (used by tests)
│   │       ├── common/           # config (Zod-validated env), errors, logger, auth plugin,
│   │       │                     # supabase clients, db (postgres driver), pagination,
│   │       │                     # idempotency, rate-limit, request context, crypto
│   │       └── modules/
│   │           ├── auth/         # /auth/bootstrap, /auth/session
│   │           ├── users/        # /me, avatar
│   │           ├── organizations/# workspace, members, teams, invitations
│   │           ├── onboarding/
│   │           ├── settings/     # incl. sessions list/revoke
│   │           ├── integrations/ # registry + OAuth (google_calendar, zoom), token vault
│   │           ├── calendar/     # connection, events, sync, push channels
│   │           ├── meetings/     # CRUD, sharing, decisions, follow-up, stats
│   │           ├── capture/      # capture sessions, chunk registry, heartbeat, stop/discard
│   │           ├── recordings/   # uploads (TUS targets), signed playback URLs, retention
│   │           ├── transcripts/
│   │           ├── insights/     # action items (and the insight read models)  [owner's "notes"]
│   │           ├── assistant/    # ask, suggestions, history (RAG)
│   │           ├── search/
│   │           ├── playlist/
│   │           ├── alerts/       # in-app alerts == notifications feed           [owner's "notifications"]
│   │           ├── deals/
│   │           ├── webhooks/     # zoom, google calendar (raw body, signature checks)
│   │           └── ai/           # LlmProvider, AsrProvider, EmbeddingProvider, prompts/, schemas/
│   └── worker/
│       └── src/
│           ├── main.ts           # WORKER_QUEUES=asr,ai ... selects handlers
│           ├── runner.ts         # claim loop (SKIP LOCKED), heartbeats, retries, DLQ
│           └── handlers/
│               ├── capture-assemble.ts
│               ├── media-normalize.ts      # FFmpeg
│               ├── transcription.worker.ts # asr.transcribe + diarize + speaker mapping
│               ├── ai.worker.ts            # ai.extract, ai.verify, ai.link_decisions
│               ├── embedding.worker.ts     # embed.index
│               ├── notify.ts               # alerts, reminders, email later
│               ├── calendar-sync.ts        # full/incremental sync, channel renewal
│               ├── integrations-refresh.ts # OAuth token refresh
│               ├── zoom-import.ts
│               └── retention.ts            # recording expiry, account erasure, storage GC
├── packages/
│   ├── contracts/                # Zod schemas mirroring src/types + route definitions
│   ├── db/                       # generated Supabase types (supabase gen types), SQL helpers
│   └── config/                   # shared tsconfig/eslint
├── services/
│   └── ml/                       # Python 3.11, FastAPI: /v1/transcribe, /v1/diarize, /healthz
├── supabase/
│   ├── config.toml
│   ├── migrations/               # YYYYMMDDHHMMSS_<slug>.sql
│   ├── seed.sql                  # demo org + fixtures for local dev only
│   └── tests/                    # pgTAP RLS tests
├── docs/backend/                 # this plan
└── docker/                       # compose for local: api, worker, ml, ollama
```

The owner's proposed `workers/{transcription,ai,embedding}.worker.ts` map to handler files. They are **one worker binary** that can be deployed as several pools by setting `WORKER_QUEUES`, so GPU-bound and I/O-bound work scale separately without separate codebases.

Module rules (enforced with `eslint-plugin-boundaries` or `dependency-cruiser`):

- A module may import `common/*`, `packages/*`, and another module's `public.ts` only. Never another module's internals.
- Cross-module writes go through the owning module's service functions, or through a SQL function owned by that module's migration.
- `ai/` has no HTTP routes of its own. `assistant/`, the worker and `meetings/` (follow-up) call it.

---

## 5. Environments

| Env | Supabase | API / worker | ML / LLM | Purpose |
| --- | --- | --- | --- | --- |
| `local` | `supabase start` (CLI, Docker) | `npm run dev` | ML sidecar on CPU (`small` or `large-v3-turbo` int8), Ollama local, or hosted provider via env | Daily development. Seeded with fictional demo data (the PRD's names only). |
| `ci` | `supabase start` in the CI job | built and run in-process (`app.inject`) | stub providers (golden fixtures) | Unit, integration and RLS tests. Optional nightly pipeline run with real models. |
| `staging` | dedicated project `wid-staging` | one API and one worker instance | small GPU on demand or hosted | Pre-release, OAuth app review demos, load tests. |
| `production` | dedicated project `wid-prod` (Pro plan or higher; the Free plan caps files at 50 MB [verified: [Storage limits](https://supabase.com/docs/guides/storage/uploads/file-limits)]) | at least 2 API instances, worker pools by queue | per [08-open-questions.md](./08-open-questions.md) Q1 | Live. |

Use one Supabase project per environment, not branches, for staging and prod: OAuth redirect URLs, webhooks and storage policies differ per environment, and the isolation is worth the small extra cost. Supabase Branching can be added later for per-PR preview databases.

Pick the production region to match the data-residency decision ([08-open-questions.md](./08-open-questions.md) Q5) and place the GPU or inference provider in the same region, because audio moves between them.

---

## 6. Job queue decision

| Option | Pros | Cons | Verdict |
| --- | --- | --- | --- |
| **Custom `ops.jobs` + `SKIP LOCKED`** | Enqueue from inside SQL functions, so "status change + job" commits atomically in one RPC. We own the schema (pipeline-specific columns: `dedupe_key`, `meeting_id`, `run_id`, progress). Visible in our migrations and testable with pgTAP. No extra dependency. | We write and maintain about 300 lines: claim, heartbeat or lease, retry with backoff, dead-lettering. | **Chosen.** |
| pgmq (Supabase Queues) | Supported Supabase extension. `pgmq.send` works from SQL, so transactional enqueue is possible. Visibility-timeout semantics [verified: [PGMQ](https://supabase.com/docs/guides/queues/pgmq)]. | No backoff, dead-letter or scheduling built in. Messages are opaque JSON in per-queue tables, so "is there already a pending extract job for meeting X" is awkward. Dedupe is ours to build anyway. | Good second choice. Switch if our runner becomes a maintenance burden. |
| pg-boss | Mature Node library: retries, backoff, cron, singleton keys, dead-letter. | Owns its own schema and internals, so enqueueing from our SQL functions or triggers is unsupported. Needs a session-capable connection (direct or Supavisor session mode, port 5432). On Supabase the direct connection is IPv6 only unless you buy the IPv4 add-on [verified: [Connecting to Postgres](https://supabase.com/docs/guides/database/connecting-to-postgres)]. | Rejected, mainly for the transactional-enqueue gap. |

Mechanics of the chosen design (DDL in [02-data-model.md](./02-data-model.md) section 13):

- `ops.enqueue_job(queue, kind, payload, dedupe_key, run_after, priority)` is a SQL function. It is called inside the same transaction as the state change. `dedupe_key` (for example `ai.extract:run:<run_id>`) has a partial unique index over non-terminal jobs, so double enqueue is a no-op.
- The worker claims with `UPDATE ops.jobs SET status='running', locked_by=$1, locked_until=now()+lease ... WHERE id IN (SELECT id FROM ops.jobs WHERE queue = ANY($2) AND status='queued' AND run_after <= now() ORDER BY priority, run_after FOR UPDATE SKIP LOCKED LIMIT $3) RETURNING *`.
- Leases: long jobs (ASR on a 2-hour meeting) extend `locked_until` every 30 s. A reaper (`pg_cron`, every minute) requeues jobs whose lease expired, which covers crashed workers.
- Wakeup: `pg_notify('jobs', queue)` from `enqueue_job` plus `LISTEN` in the worker, with a 2 s polling fallback. `LISTEN` requires the worker to use the direct connection or Supavisor **session** mode, never transaction mode.
- Retries: exponential backoff with jitter (`run_after = now() + least(2^attempt * base, cap)`). `max_attempts` is set per kind. After the last attempt the job moves to `status='dead'` (the dead-letter state) and the pipeline marks the meeting `failed` (see [05-capture-and-pipeline.md](./05-capture-and-pipeline.md) section 9).
- Every attempt is recorded in `ops.job_attempts` with duration, error class and worker id, for debugging and metrics.
- Schedules: `pg_cron` calls `ops.enqueue_job` (token refresh sweep, calendar channel renewal, retention, action-item reminders, lease reaper). We do not need a separate scheduler.

**When to leave Postgres** (any one is enough): sustained enqueue above about 50 jobs per second; queue-table bloat that autovacuum can't keep up with; or fan-out needs such as per-tenant fairness across many GPU pools. At that point move to SQS or Redis Streams and keep `ops.enqueue_job` as the outbox (transactional outbox pattern), so request-path code does not change.

---

## 7. Configuration and secrets

- All config is environment variables, parsed once at boot by a Zod schema in `apps/api/src/common/config.ts`. The process exits on invalid config. Nothing reads `process.env` elsewhere.
- Secret classes:
  - Supabase: `SUPABASE_URL`, `SUPABASE_ANON_KEY` (or the new publishable key), `SUPABASE_SERVICE_ROLE_KEY` (or the secret key), `DATABASE_URL` (direct or session pooler, worker and migrations only).
  - OAuth: `GOOGLE_OAUTH_CLIENT_ID/SECRET` (calendar flow), `ZOOM_CLIENT_ID/SECRET`, `ZOOM_WEBHOOK_SECRET_TOKEN`.
  - Encryption: `TOKEN_ENCRYPTION_KEYS` (a key ring `v1:<base64>,v2:<base64>`, with the active version named separately; see [03-security-rls.md](./03-security-rls.md) section 5).
  - Providers: `ML_SIDECAR_URL` + `ML_SIDECAR_TOKEN`, `OLLAMA_URL`, optional hosted provider keys.
- Storage: the platform secret store (Fly secrets, Render env groups, GCP Secret Manager, and so on). Never commit secrets and never put them in `NEXT_PUBLIC_*`. The frontend gets only `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (the anon or publishable key is public by design; RLS is what protects data).
- Rotation: service-role and OAuth secrets are rotated on staff change or incident. The token-encryption key ring supports rotation without downtime (decrypt with any known version, encrypt with the active one, and a background job re-encrypts).

---

## 8. Deployment

| Component | Recommended MVP host | Alternatives | Notes |
| --- | --- | --- | --- |
| Next.js web | Vercel | Netlify, self-host | Unchanged by the backend. |
| API | Fly.io or Render (2 small instances, region next to Supabase) | Railway, Google Cloud Run, AWS App Runner/ECS | Stateless. Cloud Run works if min-instances is at least 1 (webhooks need low cold-start latency; Zoom requires a response within 3 s [verified: [Zoom webhooks](https://developers.zoom.us/docs/api/webhooks/)]). |
| Worker (CPU pools: assemble, normalize, ai-orchestration, notify, sync) | Same host as the API, separate process group | Same as above | Needs FFmpeg in the image (Docker). Long-lived connections, so not serverless. |
| ML sidecar (GPU) | On-demand GPU with scale-to-zero (RunPod serverless, Modal) **or** hosted ASR API | Dedicated GPU VM (Hetzner, Lambda, AWS g6/L4) once utilisation justifies it | See [08-open-questions.md](./08-open-questions.md) Q1 and Q2. |
| Ollama | Co-located with the ML sidecar on the GPU box when self-hosting | Hosted LLM API | 24 GB VRAM covers 14B to 20B models at Q4 to Q8 plus Whisper turbo [unverified for concurrent load]. |
| Supabase | Managed, Pro plan or higher in prod | Self-hosted Supabase (not recommended for MVP) | PITR add-on for prod (see [07-roadmap.md](./07-roadmap.md) M10). |

Container images: one `Dockerfile` for `api` and `worker` (multi-stage, Node 22 LTS, FFmpeg from the distro package), and one for `services/ml` (CUDA base image). `docker/compose.yml` runs api, worker, ml (CPU), and ollama for local development, next to `supabase start`.

Release flow: CI builds the images, runs the migrations against staging (`supabase db push`), deploys to staging, runs smoke tests, then promotes the same image to prod after a manual approval. Migrations must be backward compatible with the previous API version (expand, then contract) because the API and worker roll independently.

---

## 9. Observability, rate limiting, resilience

**Logging (Pino).** JSON logs with `reqId` (taken from the frontend's `x-request-id` header, or generated, and always echoed back), `userId`, `orgId`, `route`, `status`, `durationMs`. Worker logs carry `jobId`, `queue`, `kind`, `meetingId`, `runId`, `attempt`. Redaction paths drop `authorization`, cookies, tokens, transcript text and prompt bodies. **Never log transcript text or LLM prompts at info level.** They are customer content.

**Tracing.** OpenTelemetry SDK in api and worker. The trace context is stored in `ops.jobs.trace_context`, so one trace spans from `POST /capture/stop` through every pipeline step. Export to any OTLP backend (Grafana Cloud, Honeycomb, Datadog).

**Errors.** Sentry (or equivalent) in api, worker and ml, with scrubbing for the same fields as the logs.

**Metrics** (Prometheus format or OTLP):

- HTTP: rate, error rate and latency per route.
- Queue: depth per queue, age of the oldest queued job, claim latency, attempts per job, dead-letter count.
- Pipeline: time from stop to ready (p50, p95), per-step duration, ASR real-time factor, LLM tokens and cost per meeting, **grounding rejection rate** (the share of extracted insights rejected by verification; a spike means a prompt or model regression).
- Integrations: token refresh failures, push-channel renewals, webhook verification failures.

**SLOs for the MVP** (proposed): API p95 under 300 ms for reads and under 600 ms for writes; time from stop to ready under 10 min for a 60-minute meeting at p95; pipeline success rate of at least 98% excluding user-caused failures (empty audio).

**Rate limiting.** `@fastify/rate-limit` with an in-memory store, keyed by `userId` (or IP when there is no auth):

| Bucket | Limit (per user) | Applies to |
| --- | --- | --- |
| default | 300 req/min | all authenticated routes |
| expensive-ai | 20 req/min, 300/day | `POST /meetings/:id/ask`, `POST /meetings/:id/follow-up` |
| search | 60 req/min | `GET /search` |
| capture-control | 60 req/min | capture start/stop/heartbeat/chunks (heartbeat every 15 s fits) |
| oauth | 10 req/min | `*/connect`, OAuth callbacks |
| webhooks | per-IP 600 req/min, signature checked first | `/webhooks/*` |

With N API instances the effective limit is up to N times higher. That is acceptable for MVP abuse protection. Daily AI quotas are enforced in Postgres (a count over `assistant_messages` for the day) so they are exact. **Trigger for Redis:** more than 3 API instances, or evidence of distributed abuse.

**Backpressure** is covered in [05-capture-and-pipeline.md](./05-capture-and-pipeline.md) section 10.

---

## 10. Error contract (backend to frontend `AppError`)

The frontend never shows backend messages. `lib/api/http-errors.ts` maps HTTP status to `AppErrorCode` and reads only `fieldErrors`/`errors` and `Retry-After`. The backend therefore owes it a **stable status code** plus a machine-readable body.

**Error body (every non-2xx, `application/json`):**

```json
{
  "code": "validation_error",
  "message": "Developer-facing summary. Never shown to users.",
  "requestId": "6f1c0c6e-...",
  "fieldErrors": { "title": ["Add a title."] },
  "retryable": false
}
```

`fieldErrors` is a **top-level** key because `extractFieldErrors()` reads `data.fieldErrors` or `data.errors` at the top level. Messages in `fieldErrors` are user-safe copy, the same strings the mocks use.

**Status mapping** (the backend throws `ApiError(code, opts)`. A Fastify `setErrorHandler` converts Zod errors, Postgres errors and unknown errors):

| AppErrorCode | HTTP | When |
| --- | --- | --- |
| `validation_error` | 400 (malformed) / 422 (semantic) | Zod failure, invalid cursor, domain validation. Postgres `23514` check violations map here. |
| `unauthorized` | 401 | Missing, expired or invalid JWT. |
| `forbidden` | 403 | Authenticated and allowed to *see* the resource but not change it (for example a non-owner changing sharing). |
| `not_found` | 404 | Missing **or not visible to the caller**. Existence is never leaked, which matches `requireMeeting` in the mock. |
| `conflict` | 409 | State-machine violations (stopping a meeting that isn't capturing, a second active capture), unique violations (`23505`), `If-Match` mismatch (412 maps to conflict too). |
| `rate_limited` | 429 + `Retry-After` | Rate-limit or quota exceeded. |
| `server_error` | 500 | Unhandled errors (logged with `requestId`). |
| `service_unavailable` | 503 + `Retry-After` | Provider outage, kill-switch, or a dependency circuit breaker open. |
| `calendar_connection_failed` | 502 | Google OAuth exchange or API failure during connect. |
| `integration_connection_failed` | 502 | Zoom (and future) OAuth failure. |
| `capture_failed` | 409 / 500 | Capture session cannot continue (session expired or storage rejected). |
| `processing_failed` | not an HTTP error | Appears inside `ProcessingProgress.error` (an `AppError` JSON) when a run fails. |

**Required frontend change (small):** `codeForStatus()` derives the code from the status alone, so domain codes (`calendar_connection_failed`, `service_unavailable` on 503, `capture_failed`) are lost. Change `httpErrorFromResponse` to prefer `data.code` when `isAppErrorCode(data.code)`, falling back to status mapping. Also add `503 -> service_unavailable` and `502 -> server_error` in `codeForStatus`. This is listed in the frontend change list in [README.md](./README.md).

**Request IDs:** the API reads `x-request-id` from the client, accepts it only if it is a UUID or matches `^req_[a-z0-9_]{6,64}$` (the client's fallback format), and otherwise generates one. It always returns it in the `x-request-id` response header and in the error body.
