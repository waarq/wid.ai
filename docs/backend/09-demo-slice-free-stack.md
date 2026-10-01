# 09. Demo slice on a free stack

Status: draft v1, 2026-10-01. This document scopes an **investor-ready demo slice** that runs on free tiers only. It does not replace files 01 to 08. Those remain the long-term target. Where the slice deviates, it says so and names the file and section it defers.

**Binding constraints from the product owner (2026-10-01):**

- Build an investor-ready demo slice first, not M0 to M10. Everything else stays mocked behind the existing service registry.
- Must work for real: Google sign-in plus read-only Google Calendar; live browser capture (tab + mic) producing a real transcript; a real AI brief with traceable decisions, actions, questions and risks (timestamp-grounded, verification gate kept); Ask-the-meeting (single meeting) and search.
- Everything **completely free**. No usable local hardware (no GPU, modest CPU laptop), so no self-hosted Whisper or Ollama as the primary path.
- Hosting: Supabase free tier plus a free Node host for the API and worker. Solo or small team. Internal and friends pilot only: Google OAuth stays in **Testing** mode with test users and no verification. No Zoom. English only. Browser tab/mic capture is the capture method.

Tag conventions are the same as [01-architecture.md](./01-architecture.md): **[verified]** means checked against the vendor page on the date given; **[unverified]** means not confirmed; **[estimate]** means our own arithmetic or judgement. All vendor pages below were checked on **2026-10-01**. Free tiers change often (Gemini's was cut in December 2025), so re-check every number in the D0 spike and again the week before a demo.

---

## 1. Free-stack selection

### 1.1 Supabase Free plan

| Limit | Value | Impact on the slice | Source |
| --- | --- | --- | --- |
| Database size | 500 MB per project | About 150 to 300 KB per 30-minute meeting (segments, insights, tsvectors), with `words` jsonb not stored. Thousands of demo meetings fit. | [verified: [pricing](https://supabase.com/pricing)] |
| File storage | 1 GB | This is the binding storage limit. See section 4.2 for the bytes per meeting. | [verified: pricing] |
| Max upload file size | 50 MB (cannot be raised on Free) | Every object we write must stay under 50 MB. The slice keeps objects under 10 MB. Manual upload of long files is deferred. | [verified: [file limits](https://supabase.com/docs/guides/storage/uploads/file-limits)] |
| Egress | 5 GB, plus 5 GB cached | Playback plus ASR fetches are about 30 to 45 MB per 30-minute meeting. Fine. | [verified: pricing] |
| Monthly active users | 50,000 | Not a constraint. | [verified: pricing] |
| Realtime | 200 concurrent connections, 2 M messages/month, 100 messages/s, 100 channel joins/s | Not a constraint, and the slice does not use Realtime (polling only). | [verified: pricing, [Realtime limits](https://supabase.com/docs/guides/realtime/limits)] |
| Edge Functions | 500k invocations; 256 MB memory; **2 s CPU time** per request; 150 s wall clock on Free | Too tight to host the pipeline (see 2.4). | [verified: pricing, [function limits](https://supabase.com/docs/guides/functions/limits)] |
| Project pausing | Paused after **1 week of low database activity**. "A few user requests to the database each day" keeps it active. Restore from the dashboard ("Resume project"). Restorable for 90 days. | A demo project that sits idle for a week goes dark. See 2.5. | [verified: pricing, [project pausing](https://supabase.com/docs/guides/platform/free-project-pausing), [90-day changelog](https://supabase.com/changelog/27497-paused-free-plan-projects-are-restorable-for-90-days)] |
| Active projects | 2 per org | One `wit-demo` project. Local dev uses `supabase start`. There is no separate staging project in the slice. | [verified: pricing] |
| Custom Access Token hook | Available on Free | The `app_stage` claim from [03-security-rls.md](./03-security-rls.md) section 2.4 works unchanged. | [verified: [auth hooks](https://supabase.com/docs/guides/auth/auth-hooks)] |
| Backups / PITR | No PITR on Free. Whether daily backups can be downloaded on Free is **[unverified]**. | Treat demo data as disposable. Run a weekly `supabase db dump` from CI or by hand. | none |
| Compute size, max DB connections on Free | **[unverified]** (believed to be the smallest shared instance) | Keep the API's SQL pool at 5 connections or fewer. | none |

### 1.2 Free Node hosts for the API and worker

| Host | Free offer | Sleeping / cold start | RAM / CPU | Always-on worker? | Card needed? | Verdict |
| --- | --- | --- | --- | --- | --- | --- |
| **Render** free web service | 750 instance-hours per workspace per month (enough for one service 24/7, since 31 x 24 = 744). Docker supported. | Spins down after **15 min without inbound traffic**. Spin-up takes about **1 minute**. "Render might restart a Free web service at any time." | 512 MB, 0.1 CPU [verified via Render's compute-plans page, as summarised by search; confirm in the dashboard] | No **background worker** service type on Free. A worker loop **inside the web service process** works while the process is awake. | Not required for the free web service [unverified] | **Primary.** |
| Google Cloud Run | 180,000 vCPU-s, 360,000 GiB-s, 2 M requests/month (request-based billing); instance-based billing gets 240,000 vCPU-s and 450,000 GiB-s | Scales to zero. Cold start of a few seconds [unverified]. | Configurable | Request-based billing throttles CPU outside requests, so an in-process background worker does not run. Instance-based billing at 24/7 needs about 2.6 M vCPU-s/month, which is far over the free amount. | **Yes** (billing account required) | Not chosen: it needs a different worker model. |
| Google Compute Engine `e2-micro` | 1 always-free VM in `us-west1`, `us-central1` or `us-east1`; 30 GB disk; 1 GB egress/month from North America | Never sleeps | 1 GB RAM, shared core | Yes | **Yes** | **Fallback host** if Render's sleep and restarts hurt. Our egress is small JSON because Groq fetches audio from Supabase directly (section 4). |
| Oracle Cloud Always Free (Ampere A1) | 1,500 OCPU-hours and 9,000 GB-hours/month (about 2 OCPU and 12 GB) | Never sleeps, **but idle instances may be reclaimed** if 95th-percentile CPU, network and memory are all under 20% over 7 days | 2 OCPU, 12 GB | Yes | **Yes** (verification) | Not chosen. A demo box is idle by nature, which is exactly what gets reclaimed. Capacity availability is often reported as poor [unverified]. |
| Koyeb | No free compute instance on the current pricing page. Only a free Postgres. | none | none | none | none | Not available. |
| Fly.io | No free allowance for new orgs on the pricing page (trial only) | none | none | none | Yes | Not free. |
| Railway | $5 one-time trial for 30 days, then **$1/month** credit | none | Trial: up to 1 GB | $1/month cannot run 24/7 | none | Not free. |
| Hugging Face Spaces | Docker and Gradio Spaces **now need a paid plan to create**. Only static Spaces are free. | none | none | none | none | Not available. |

Sources [verified 2026-10-01]: [Render free](https://render.com/docs/free), [Render compute plans](https://render.com/docs/compute-plans), [Cloud Run pricing](https://cloud.google.com/run/pricing), [Google Cloud free tier](https://docs.cloud.google.com/free/docs/free-cloud-features), [Oracle Always Free](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm), [Koyeb pricing](https://www.koyeb.com/pricing), [Fly pricing](https://docs.fly.io/about/pricing/), [Railway trial](https://docs.railway.com/reference/pricing/free-trial), [HF Spaces](https://huggingface.co/docs/hub/spaces-overview).

**Can the worker run in the same process as the API?** Yes, and for the slice it should. `ROLE=all` starts Fastify and the job loop in one Node process. Capture keeps the process awake on its own, because the browser sends heartbeats every 15 s and chunk registrations every 10 s while recording, and the pipeline starts within seconds of Stop. The jobs table makes this safe: if Render restarts the process mid-job, the lease expires and the job is claimed again (section 2.3). With 512 MB and 0.1 CPU, the process must not decode or transcode audio in bulk. The slice is designed so the server only does byte concatenation and one `ffmpeg -c copy` remux (section 4).

**Frontend hosting (flag).** Vercel's Hobby plan is restricted to "non-commercial, personal use", and an investor demo for a company is arguably commercial [verified: [Vercel fair use](https://vercel.com/docs/limits/fair-use-guidelines)]. Netlify's free plan (300 credits/month) is reported to allow commercial use [unverified, from secondary sources and the Netlify forum]. Decide in [08-open-questions.md](./08-open-questions.md) QD3. This does not affect the backend.

### 1.3 Free ASR options

| Provider / model | Free limits | File limit | Timestamps / diarization | Data policy | Verdict |
| --- | --- | --- | --- | --- | --- |
| **Groq `whisper-large-v3`** | 20 RPM, 2,000 RPD, **7,200 audio-seconds/hour (2 h), 28,800 audio-seconds/day (8 h)**. Minimum billed length 10 s per request. | **25 MB** on Free (100 MB on the Dev tier). Accepts FLAC, MP3, MP4, M4A, OGG, WAV, **WebM**, by upload or `url`. | Segment and word timestamps (`verbose_json`). **No diarization.** | No retention for inference by default. Logs kept up to 30 days only for reliability or abuse investigations. **Zero Data Retention is a self-serve toggle.** No training on inputs or outputs without permission, per the Services Agreement. | **Primary ASR.** Groq lists 10.3% WER and a 189x speed factor. |
| Groq `whisper-large-v3-turbo` | Same limits table as large-v3 | Same | Same | Same | **Overflow ASR.** 12% WER, 216x speed. Whether its daily audio quota is separate from large-v3's is **[unverified]**: Groq says limits apply "at the organization level". Assume a shared quota until tested. |
| **Cloudflare Workers AI** `@cf/openai/whisper-large-v3-turbo` | Free allocation of **10,000 neurons/day** (Free and Paid plans). This model costs 46.63 neurons per audio minute, so about **214 audio-min/day** if nothing else uses neurons. | Max size and duration **[unverified]** (not stated on the model page). Keep requests at 10 min or less. | Segments and VTT; optional VAD filter. No diarization. | Cloudflare states it does not use customer content to train models on Workers AI. | **ASR fallback.** It shares the neuron budget with any LLM fallback calls. |
| Gemini (free tier) audio input | Free models include the Gemini 3.x Flash and Flash-Lite and 2.5 Flash and Flash-Lite families. Per-model RPM and RPD are **shown only in AI Studio**. A secondary source says 2.5 Flash fell to about 20 RPD on 2025-12-06 [unverified]. | n/a | Timestamps from a generative model are not reliable enough for traceability [estimate] | **Free tier: content is used to improve Google products, and human reviewers may read it. "Do not submit sensitive, confidential, or personal information."** (EEA, UK and Swiss users get paid-tier terms even on the free quota.) | **Synthetic or scripted content only.** Never real pilot audio. |
| Mistral Voxtral Mini Transcribe 2 (`voxtral-mini-latest`) | The free "Experiment" plan's limits are no longer published. Whether Voxtral is included is **[unverified]**. | Up to 3 h per request (per Mistral's announcement) | Word timestamps **and diarization** | The training opt-out toggle exists ("Anonymous improvement data"). Whether it is on by default for the free plan is **[unverified]**: secondary sources say yes. | **Optional D0 spike candidate**, only for remote-side diarization (section 2.2). Not on the critical path. |
| Hugging Face Inference Providers | $0.10/month of credits for free users | n/a | n/a | n/a | Too small to matter. |
| AssemblyAI | $50 **one-time** credit (about 185 h), diarization included | n/a | Diarization | **Free users cannot opt out of model training.** | Synthetic content only, and not recurring. Not chosen. |

Sources [verified 2026-10-01]: [Groq rate limits](https://console.groq.com/docs/rate-limits), [Groq speech-to-text](https://console.groq.com/docs/speech-to-text), [Groq models (WER and speed)](https://console.groq.com/docs/model/whisper-large-v3), [Groq your data](https://console.groq.com/docs/your-data), [Cloudflare Workers AI pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/), [Cloudflare whisper turbo](https://developers.cloudflare.com/workers-ai/models/whisper-large-v3-turbo/), [Cloudflare data usage](https://developers.cloudflare.com/workers-ai/platform/data-usage/), [Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing), [Gemini API terms](https://ai.google.dev/gemini-api/terms), [Gemini rate limits](https://ai.google.dev/gemini-api/docs/rate-limits), [Mistral speech-to-text](https://docs.mistral.ai/studio/audio/speech_to_text), [Mistral opt-out](https://help.mistral.ai/en/articles/455207-can-i-opt-out-of-my-input-or-output-data-being-used-for-training), [HF credits](https://huggingface.co/docs/inference-providers/pricing), [AssemblyAI training](https://www.assemblyai.com/docs/data-retention-and-model-training). Gemini's December 2025 free-tier cut: [agentdeals issue #2017](https://github.com/robhunter/agentdeals/issues/2017) (secondary).

### 1.4 Free LLM options with structured output

| Provider / model | Free limits | Structured output | Data policy | Verdict |
| --- | --- | --- | --- | --- |
| **Cerebras `gpt-oss-120b`** (also `qwen-3.8-27b`) | **5 RPM, 30K uncached TPM (90K total), 1M TPH, 1M TPD** per model. Free-tier max context is **[unverified]**. | `json_schema` with **strict mode** on `gpt-oss-120b` and `qwen-3.8-27b`. Limits: schema text up to 5,000 chars, depth up to 10, `additionalProperties: false`, **no regex `pattern`, no `oneOf`/`allOf`, no recursion**. | Its privacy policy says it does not retain inference inputs and outputs [verified via the privacy policy as summarised by search; read the ToS before the pilot]. | **Primary LLM** for extraction, judge and ask. |
| **Groq `openai/gpt-oss-120b`** (also `gpt-oss-20b`, `qwen/qwen3.8-27b`) | 30 RPM, 1K RPD, **8K TPM**, 200K TPD | Strict `json_schema` on gpt-oss-20b/120b and qwen3.8-27b. All fields required, `additionalProperties: false`, optional fields as `null` unions. No streaming with structured outputs. | Same as Groq ASR (no training, ZDR toggle) | **LLM fallback.** 8K TPM means one request must stay under about 6K tokens total. Windows are sized for that (section 4.3). |
| Cloudflare Workers AI `@cf/openai/gpt-oss-120b` | Shares the 10,000 neurons/day: 31,818 neurons per M input and 68,182 per M output, so a 7K-in / 2.5K-out call is about 400 neurons | JSON-schema support on this model is **[unverified]** | No training on customer content | **Second LLM fallback** (it competes with ASR fallback for neurons). |
| Gemini free (3.x Flash / 2.5 Flash) | Per-project limits in AI Studio only [unverified numbers] | JSON schema supported | **Trains on content, human review** | Synthetic content only. |
| OpenRouter `:free` models | 20 RPM, **50 RPD** (1,000 RPD only after buying $10 of credits) | Depends on the model | Depends on the upstream provider; some free endpoints log prompts [unverified per model] | Not chosen. |
| Mistral Experiment plan | Per-workspace limits, not published (secondary sources say about 1 rps and a monthly token cap) | JSON schema supported | The opt-out toggle exists; default for free is [unverified] | Not chosen for real audio. Acceptable for synthetic. |

Sources [verified 2026-10-01]: [Cerebras rate limits](https://inference-docs.cerebras.ai/support/rate-limits), [Cerebras structured outputs](https://inference-docs.cerebras.ai/capabilities/structured-outputs), [Cerebras privacy policy](https://www.cerebras.ai/privacy-policy), [Groq structured outputs](https://console.groq.com/docs/structured-outputs), [OpenRouter limits](https://openrouter.ai/docs/api/reference/limits), [Mistral privacy controls](https://docs.mistral.ai/admin/monitor-comply/privacy-data-controls).

**Consequence for the Zod-to-JSON-schema step.** The extraction schemas in [05-capture-and-pipeline.md](./05-capture-and-pipeline.md) section 6.7 use `.regex(/^s\d{3,5}$/)` for handles and optional fields. Strict mode on both Cerebras and Groq rejects or ignores `pattern`, and Groq requires every field to be required (optional fields become `T | null`). So the slice sends a **provider-compatible JSON schema** (no patterns, nullable instead of optional) and still parses the response with the **full Zod schema**. Zod is the contract; the JSON schema is only a decoding hint. A Zod failure gets one repair retry, as in 05.

### 1.5 Embeddings: skip them for the slice

| Option | Notes |
| --- | --- |
| **No vectors; Postgres FTS only** (recommended) | Single-meeting Ask has fewer than 200 transcript windows. The structured-insight block (under 2.5K tokens) plus FTS top windows covers the PRD questions ("what did we decide", "what are my actions", "who owns X"). Global search in `search-engine.ts` is keyword-based already. That removes pgvector, the `embedding_chunks` table, the `embed.index` job and a provider dependency. |
| Cloudflare `@cf/baai/bge-m3` (1024-d) | **Matches the 1024-d column in [02-data-model.md](./02-data-model.md) section 12 exactly.** 1,075 neurons per M input tokens, so about 27 neurons per 30-minute meeting (about 25K tokens). This is the planned first upgrade when semantic search is wanted (D-stretch). |
| Gemini Embedding 2 (free) | Free, but free-tier content may be used for training. Not for real pilot data. |

### 1.6 Privacy: which providers may see real pilot audio

Several free tiers pay for themselves with your data. For an internal pilot with **real voices and real conversations**:

| Provider | Real pilot audio and transcripts? | Why |
| --- | --- | --- |
| Groq (ASR + LLM) | **Yes**, with **ZDR switched on** in Data Controls before the first real meeting | No training by contract. ZDR removes the 30-day reliability logs. |
| Cerebras (LLM) | **Yes**, after the owner reads the current ToS | No-retention statement in the privacy policy |
| Cloudflare Workers AI (ASR/LLM fallback) | **Yes** | No training on customer content |
| Supabase, Render | **Yes** (they are our infrastructure) | Standard hosting terms |
| Gemini free, AssemblyAI free, OpenRouter `:free`, Mistral Experiment (until opt-out is confirmed) | **No. Synthetic or scripted content only.** | Training on content, human review, or no opt-out |

Caveats to state honestly:

1. Free tiers come with **no signed DPA**. This is acceptable for an internal pilot among people who agreed to it. It is **not** acceptable for customer calls, confidential business meetings, or anyone in the EU or UK without proper terms. The production answer stays [08-open-questions.md](./08-open-questions.md) Q1 and Q17.
2. All three AI providers process in the US [unverified for Cerebras and Cloudflare routing]. Tell participants.
3. The provider allowlist is enforced in config: `PROVIDERS_ALLOWED_FOR_REAL_AUDIO=groq,cerebras,cloudflare`. The router refuses any other provider unless the meeting is flagged `synthetic=true` (section 2.6).

**What to tell pilot participants** (in the consent dialog copy and a one-page pilot note):

> This is an internal test of WIT. When you're in a captured meeting, the audio is stored in WIT's database (Supabase) and sent to third-party AI services (Groq, Cerebras and, as a fallback, Cloudflare) in the US to produce the transcript and notes. Under their terms these services don't train on it, but this pilot has no formal data-processing agreement. Don't use WIT for confidential, customer or legal matters. Ask the meeting owner, or [owner email], to delete a recording at any time. Recordings are deleted after 30 days.

This complements the consent attestation from [03-security-rls.md](./03-security-rls.md) section 12, which stays on (`confirmBeforeCapture` defaults to true).

**Demo with a scripted or synthetic meeting.** For the investor demo itself, use a **scripted meeting with fictional content** (section 4.6), run live between the owner and a colleague. No real business content is exposed, the brief is reproducible, and any provider is acceptable, though we still use the same allowlisted ones so the demo shows the real configuration. Meetings created from the golden recording or the scripted script are flagged `synthetic=true`.

### 1.7 Recommended providers per role

| Role | Primary | Fallback 1 | Fallback 2 | Never for real audio |
| --- | --- | --- | --- | --- |
| ASR | Groq `whisper-large-v3` | Groq `whisper-large-v3-turbo` (if its quota proves separate) | Cloudflare `whisper-large-v3-turbo` | Gemini, AssemblyAI free |
| Extraction (map/reduce) | Cerebras `gpt-oss-120b` (strict schema, reasoning effort low) | Groq `openai/gpt-oss-120b` (6K-token windows) | Cloudflare `gpt-oss-120b` | Gemini free, OpenRouter free |
| Verification judge | same as extraction | same chain | none: skip the judge and keep the deterministic quote and handle checks, with confidence lowered by 0.2 | same |
| Ask | Cerebras | Groq | **Deterministic engine** (port of `assistant-engine.ts`, per [05-capture-and-pipeline.md](./05-capture-and-pipeline.md) section 12.1) | same |
| Embeddings | none (FTS only) | Cloudflare `bge-m3` (D-stretch) | none | Gemini free |
| Diarization | channel split (mic vs tab) + attendee rule | Voxtral (only if the D0 spike passes) | none | none |
| Replay (demo safety net) | `ReplayAsrProvider` / `ReplayLlmProvider` serving recorded outputs of the golden recording | none | none | none |

### 1.8 Provider abstraction (a swap is a config change)

Groq, Cerebras and (for most models) Cloudflare expose **OpenAI-compatible** endpoints, so one adapter class covers them, with a base URL and model per instance. Cloudflare's OpenAI-compatible coverage for Whisper is **[unverified]**, so a small native adapter is budgeted. A paid swap later (OpenAI, a hosted Whisper, or self-hosted vLLM, Ollama or a faster-whisper server with an OpenAI-compatible API) is a new entry in the env list, not a code change. These are the same interfaces as [05-capture-and-pipeline.md](./05-capture-and-pipeline.md) sections 6.5 and 6.7, plus explicit limits:

```ts
// api/src/ai/providers.ts (interface sketch only)
export interface ProviderLimits {
  rpm?: number; rpd?: number; tpm?: number; tpd?: number
  audioSecPerHour?: number; audioSecPerDay?: number
  maxFileBytes?: number; minBilledAudioSec?: number; contextTokens?: number
}

export interface AsrProvider {
  id: string                                   // 'groq:whisper-large-v3'
  limits: ProviderLimits
  realAudioAllowed: boolean                    // from PROVIDERS_ALLOWED_FOR_REAL_AUDIO
  transcribe(req: { audioUrl: string; language: 'en'; prompt?: string; durationSec: number }):
    Promise<{ segments: Array<{ start: number; end: number; text: string
                                avgLogprob?: number; noSpeechProb?: number
                                words?: Array<{ w: string; s: number; e: number }> }> }>
}

export interface LlmProvider {
  id: string                                   // 'cerebras:gpt-oss-120b'
  limits: ProviderLimits
  realAudioAllowed: boolean
  generateJson<T>(req: { system: string; user: string; schema: ZodType<T>
                         jsonSchema: object      // provider-compatible (no pattern, nullable)
                         maxTokens: number; temperature: number }):
    Promise<{ data: T; usage: { inputTokens: number; outputTokens: number } }>
}

export interface ProviderRouter {
  asr(ctx: { synthetic: boolean; estAudioSec: number }): Promise<AsrProvider>   // throws QuotaExhausted
  llm(role: 'extract' | 'judge' | 'ask', ctx: { synthetic: boolean; estTokens: number }): Promise<LlmProvider>
}
```

Config:

```text
ASR_PROVIDERS=groq:whisper-large-v3,groq:whisper-large-v3-turbo,cloudflare:@cf/openai/whisper-large-v3-turbo
LLM_PROVIDERS=cerebras:gpt-oss-120b,groq:openai/gpt-oss-120b,cloudflare:@cf/openai/gpt-oss-120b
PROVIDERS_ALLOWED_FOR_REAL_AUDIO=groq,cerebras,cloudflare
QUOTA_SAFETY_MARGIN=0.1          # never plan to use the last 10% of a daily quota
REPLAY_FIXTURES=fixtures/golden  # enables Replay* providers for synthetic meetings only
```

### 1.9 Rate-limit handling

1. **Usage ledger.** A new table `ops.provider_usage(provider, model, day, requests, input_tokens, output_tokens, audio_seconds)` is incremented after every call, using the provider's reported usage. Audio is rounded up to the 10 s minimum billed length. The day is UTC. Whether Groq's daily window is a calendar day or rolling is **[unverified]**, so treat it as rolling and keep the margin.
2. **Pre-flight budget check.** Before a call, the router estimates the cost (audio seconds = part duration; tokens = prompt chars / 3.5 + `maxTokens`) and picks the first provider in the list whose remaining daily budget, minus `QUOTA_SAFETY_MARGIN`, covers it. Per-minute limits (RPM, TPM, audio-seconds/hour) use an in-process token bucket. That is correct because there is exactly one process.
3. **429 handling.** Read `retry-after` (Groq sends it on 429 [verified]). If it is 120 s or less, re-enqueue the job with `run_after = now() + retry-after + jitter` **without consuming an attempt**. If it is longer, mark the provider exhausted for the day in memory and fall through to the next provider.
4. **Chunking to fit limits.**
   - **ASR:** parts are 10 minutes or less (about 2.4 MB at 32 kbps), well under Groq's 25 MB. At most 3 ASR requests run in flight (Groq allows 20 RPM).
   - **LLM:** transcript windows are at most **4,000 tokens**, so any request (system prompt plus window plus output) stays under about 6K tokens. That fits Groq's 8K TPM, and works whatever Cerebras's free context turns out to be. Cerebras's 5 RPM limits each meeting's pipeline to one LLM call every 12 s.
5. **Admission control.** `POST /v1/meetings/capture` returns 503 `service_unavailable` (with `Retry-After`) if the remaining ASR budget across allowed providers is under **40 audio-minutes** (one 20-minute dual-track meeting). The frontend already maps 503. A 4-hour session cap from 03 becomes **45 minutes** in the slice (section 4.2).
6. **Daily exhaustion mid-pipeline.** The step re-enqueues itself every 15 minutes for up to 2 hours (status stays `transcribing` or `understanding`, which the UI already shows as progress). After that it fails with `retryable: true` and the copy "Today's processing capacity is used up. Retry later." The Retry button from 05 section 9 then works unchanged.
7. **Circuit breaker** per provider: 5 consecutive 5xx errors or timeouts opens it for 60 s, as in [05-capture-and-pipeline.md](./05-capture-and-pipeline.md) section 10.
8. **Operator view.** `GET /v1/dev/quota` (owner allowlist, `DEMO_TOOLS=true` only) returns remaining budgets per provider. Check it before every demo.

### 1.10 How much the free quota supports [estimate]

Assumptions: about 150 spoken words per minute, about 1.3 tokens per word plus handles and speaker prefixes, so about **260 transcript tokens per minute** of meeting. Dual-track capture transcribes mic and tab separately, so **2 audio-seconds per meeting-second**. Section 4.2 shows how silent mic parts are skipped, typically saving 20 to 40% of the mic side [estimate]. The numbers below ignore that saving.

| Meeting length | ASR audio (dual) | LLM tokens (extract + judge + summary, incl. ~2K reasoning) | One Ask (structured block + FTS windows) |
| --- | --- | --- | --- |
| 10 min | 20 min | ~12K | ~6K |
| 20 min | 40 min | ~20K | ~7K |
| 30 min | 60 min | ~28K | ~8K |

| Daily budget | Supports |
| --- | --- |
| Groq ASR: 480 audio-min/day (if large-v3 and turbo share the quota) | 24 x 10-min, 12 x 20-min or **8 x 30-min meetings** |
| Cloudflare ASR fallback: about 214 audio-min/day | +10 x 10-min or +3 x 30-min meetings (less if neurons are spent on LLM fallback) |
| Cerebras LLM: 1M tokens/day | about 35 x 30-min meetings with 0 asks, or about 12 x 30-min meetings with 10 asks each |
| Groq LLM fallback: 200K tokens/day | about 7 x 30-min meetings with no asks |

**Bottom line:** the free stack realistically supports **about 6 to 8 thirty-minute meetings (3 to 4 hours of meetings) per day**, with ASR as the binding limit. An investor demo needs 1 to 3 runs. A pilot of 3 to 5 people with roughly one short meeting each per day fits. Anything above that hits the upgrade triggers in section 6.4.

---

## 2. Simplified architecture for the slice

### 2.1 Shape

```text
Browser (Next.js, Chrome)                                   Supabase Free (one project)
  @supabase/ssr Google sign-in ───────────────────────────▶ Auth (Google, Testing mode)
  3 MediaRecorders (mic, tab, mix) ─ chunks ───────────────▶ Storage: capture-chunks, recordings
  services/api/* ── REST + Bearer ──┐                        Postgres: RLS, traceability FKs/trigger,
                                    ▼                                  ops.jobs, ops.provider_usage
                     Render free web service (Docker, 512 MB)            ▲
                     one Node process, ROLE=all                          │ postgres driver
                     ├─ Fastify API (Zod, JWKS)  ── user-scoped supabase-js (RLS)
                     └─ job loop (SKIP LOCKED)   ── service-role for Storage + worker writes
                            │ signed URL                                  
                            ├──▶ Groq Whisper (fetches audio by URL from Supabase Storage)
                            ├──▶ Cerebras / Groq gpt-oss-120b (JSON schema)
                            ├──▶ Cloudflare Workers AI (fallbacks)
                            └──▶ Google Calendar API (read-only, pull on read)
```

### 2.2 What is dropped, and what replaces it

| Long-term component (file, section) | Slice | Replacement and reason |
| --- | --- | --- |
| Python ML sidecar, faster-whisper ([01](./01-architecture.md) s1, [05](./05-capture-and-pipeline.md) s6.5) | **Dropped** | Groq Whisper. No GPU; the CPU host is 0.1 vCPU. |
| pyannote diarization ([05](./05-capture-and-pipeline.md) s6.6) | **Dropped** | **Channel split by recording separate tracks**: mic means the capturing user (confidence 1.0). For the tab track, if the linked calendar event has **exactly one** other attendee, map to them (confidence 0.8, rule 3 from 05). Otherwise the whole tab track is one `unidentified_speaker` contact, "Speaker 2". LLM name inference (05 rule 4) is used only to **name** that single remote speaker when it finds a direct address such as "Thanks, Sara" with confidence of 0.8 or more. It is never used to split one channel into several speakers, which is unreliable without audio features. Multi-speaker remote diarization is the Voxtral spike (optional) or post-demo. The demo script is written around this (section 4.6). |
| Ollama, `bge-m3`, pgvector, `embedding_chunks`, `embed.index`, HNSW ([02](./02-data-model.md) s12) | **Dropped** | FTS only (section 1.5). The `vector` extension is not created. |
| `pg_cron` schedules ([01](./01-architecture.md) s6, [02](./02-data-model.md) s15.1) | **Dropped** | An in-process `setInterval` in the job loop for the lease reaper (60 s) and the capture-interruption sweep (60 s). A sweep that doesn't run while the host sleeps doesn't matter, because nothing is capturing then. `upcoming` to `ready_to_capture` is computed on read (02 already does this). Calendar push renewal does not exist in the slice. |
| `LISTEN/NOTIFY` wakeup, `ops.job_attempts`, per-owner fairness, priorities beyond 2 levels | **Dropped** | Poll `ops.jobs` every 2 s while any job is queued or running and every 10 s otherwise. Attempts go into `ops.jobs.last_error`. One process, a handful of users. |
| Custom queue complexity | **Kept minimal** | `ops.jobs` with `SKIP LOCKED`, lease, `attempt`/`max_attempts`, `run_after`, `dedupe_key`, `status='dead'`. About 120 lines instead of 300. An in-memory queue was rejected because Render "might restart at any time", and jobs must survive that. |
| Realtime Broadcast triggers ([02](./02-data-model.md) s14, [04](./04-api-spec.md) s8) | **Dropped** | The frontend already polls (`refetchInterval`). |
| Monorepo move to `apps/web` ([01](./01-architecture.md) s4, Q13) | **Deferred** | Add top-level `api/` (Fastify + worker) and `supabase/` folders. Shared Zod contracts live in **`src/contracts/`**, imported by the frontend through `@/contracts` and by the API through a relative path or tsconfig alias (bundled with `tsup`). Moving later is mechanical. |
| Separate Calendar OAuth with push channels, sync tokens, webhooks ([06](./06-integrations.md) s1.2 to 1.4) | **Simplified** | Keep the API-owned incremental-consent OAuth flow (state + PKCE + encrypted tokens) because the onboarding "Connect calendar" step and `CalendarService.connect()` already assume it. Drop `events.watch`, webhooks, sync tokens and renewal. Use **pull on read**: `GET /v1/calendar/events` calls `events.list` (`singleEvents=true`, the requested window) if the cache is older than 2 minutes, upserts `calendar_events` and attendees, and serves from the table. |
| Token key ring with rotation ([03](./03-security-rls.md) s5) | **Simplified** | One AES-256-GCM key (`TOKEN_ENCRYPTION_KEY`), with the same ciphertext layout (`key_version = 1`), so rotation can be added later. |
| Multi-member orgs, invitations, teams, sharing ([08](./08-open-questions.md) Q4, Q9, Q11) | **Deferred** | Personal org only. The share tables are created (empty) so the RLS helpers from 03 can be used verbatim. `share()` is not exposed (section 3). |
| Idempotency keys, webhook inbox, audit log | **Dropped** | `stop` relies on the state machine: a second stop returns 409, and `ApiCaptureService` treats "409 + meeting already `processing`" as success. |
| OpenTelemetry, Sentry, k6, pgTAP matrix | **Reduced** | Pino logs (Render log stream), Sentry free tier optional [unverified limits]. A **small pgTAP suite** for the traceability trigger and the owner-only RLS policies. |
| Manual upload via TUS ([05](./05-capture-and-pipeline.md) s4) | **Deferred** | Not required. A dev-only golden-recording replay endpoint covers the demo safety net (section 4.6). |

### 2.3 What is kept, unchanged in intent

- **RLS on every table** created, with the helpers and policies from [03-security-rls.md](./03-security-rls.md) section 4. The API uses a user-scoped client for request-path queries, and the service role only in the job loop, bootstrap and signed-URL minting.
- **Traceability constraints**: the composite FK `(meeting_id, source_segment_id)`, `app_private.check_source_timestamp()`, `evidence_quote` required for `origin='ai'`, and `source_timestamp` always set by the server ([02-data-model.md](./02-data-model.md) section 9). These are the investor claim and cost almost nothing.
- **The verification gate** ([05-capture-and-pipeline.md](./05-capture-and-pipeline.md) section 6.8): handle check, quote check with re-anchoring, entity check, LLM support judge, then the DB backstop.
- **Zod contracts** mirroring `src/types`, used by `apiClient` `parse:` in dev and by Fastify route schemas.
- **Service interfaces mapping** ([04-api-spec.md](./04-api-spec.md) section 5): the same paths and shapes for every endpoint the slice implements, so the post-demo build extends rather than rewrites.
- **Error contract** ([01-architecture.md](./01-architecture.md) section 10).
- **Manual capture only**: no job kind may start capture.

### 2.4 Why not Supabase Edge Functions for the pipeline

Edge Functions never sleep the way Render does, but the Free plan's **2 s CPU per request** and **150 s wall clock** are too tight. The pipeline is mostly I/O wait, but Zod parsing, quote matching across about 300 segments and the transcript commit for a 30-minute meeting are uncomfortably close to 2 s of CPU on a cold isolate [estimate]. A Groq-plus-Cerebras chain for one meeting can also exceed 150 s under 429 backoff. It is also a second runtime (Deno) for one engineer. Edge Functions are **not used** in the slice. Revisit only if Render proves unusable and no card is available for GCE.

### 2.5 Free-host sleeping and Supabase pausing

| Problem | Mitigation |
| --- | --- |
| Render sleeps after 15 min without traffic; about 1 min to wake | (1) The frontend fires `GET /healthz` (fire-and-forget) when any page loads, so the API is warming while the user signs in. (2) An external pinger (cron-job.org or UptimeRobot free, every 10 min) on `GET /readyz` during pilot hours and **all of demo day**. 750 h/month covers 24/7 for one service, but external pings are "not a supported fix" on Render [unverified wording, secondary source], so don't rely on them alone. (3) Active capture keeps the host awake through heartbeats. |
| Render restarts the process at any time | Jobs are leased in Postgres. A restart mid-step means the lease expires after 2 minutes and the job is claimed again. Every step is idempotent per `(run_id, step[, part])` as in 05 section 9. The browser buffers chunks in IndexedDB and retries uploads. |
| Supabase pauses after 1 week of low activity | `GET /readyz` runs a real query (`select 1 from public.profiles limit 1`) through the API, so the pinger also produces database activity. Whether that counts as "user database activity" is **[unverified]**. A GitHub Actions scheduled workflow runs a daily REST query with the anon key against a harmless RPC as a second signal. |
| Demo-day checklist | **T-24 h:** open the Supabase dashboard and confirm the project is Active (resume it if paused, then re-test). Confirm the Render service is awake. Check `GET /v1/dev/quota`. **Reconnect Google Calendar** (Testing-mode refresh tokens expire after 7 days, see 2.7). Run the golden replay end to end. **T-1 h:** start the pinger, run one 2-minute live capture, and keep the replay tab ready. |

### 2.6 Demo mode

- `meetings.synthetic boolean not null default false` (slice addition, expand-compatible). It is set when a meeting is created by the golden replay endpoint, or when the owner ticks "Scripted demo meeting" in a dev-only control (hidden unless `NEXT_PUBLIC_DEMO_TOOLS=true`).
- `POST /v1/dev/replay-golden` (owner allowlist, `DEMO_TOOLS=true`): copies the stored golden parts into a new capture session and runs **the real pipeline**. The `REPLAY` flag picks between the real providers and `Replay*` providers that return the recorded outputs of the golden run. The replay providers still go through segment build, the verification gate and the DB constraints, so even the safety net is traceable.
- A **seeded ready meeting** for the demo account (created once by replay, then kept) means the brief, Ask (deterministic fallback) and search can be shown even if every provider and the host's outbound network are down.

### 2.7 Google OAuth in Testing mode

- Testing mode with an External user type allows **at most 100 test users**, and unverified sensitive scopes show the "unverified app" warning screen [verified: [Google production readiness](https://developers.google.com/identity/protocols/oauth2/production-readiness/overview), [unverified apps](https://support.google.com/cloud/answer/7454865?hl=en)]. Sign-in with only `openid email profile` does not need the allowlist. `calendar.events.readonly` does.
- **Refresh tokens issued to a Testing-mode app for non-basic scopes expire after 7 days** [verified: [Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)]. Calendar access will stop weekly. The slice handles `invalid_grant` by setting the integration to `revoked`, which shows "Reconnect" in Settings (06 section 0, unchanged). Reconnect before every demo. Supabase sign-in sessions are unaffected (Supabase issues its own refresh tokens).
- Rehearse the "Google hasn't verified this app" screen. In the demo, click through it confidently or connect the calendar beforehand.

---

## 3. Demo-slice scope

### 3.1 Services (all 15 interfaces)

"Real" means an `Api*Service` against the API. "Real-lite" means real for what the demo uses, with the other methods returning `service_unavailable` (503) and their UI entry points hidden by `NEXT_PUBLIC_DEMO_SLICE=true`. "Mock (hidden)" means it stays on the `Mock*` implementation and its navigation is hidden, because mock fixtures reference mock meeting ids that don't exist in the real DB and would produce broken links.

| Service | Slice | Methods in scope | Reason |
| --- | --- | --- | --- |
| `auth` | **Real** | all (`listGoogleAccounts` returns `[]`; `signInWithGoogle` redirects) | Must-have |
| `user` | **Real-lite** | `getProfile`, `updateProfile`, `listWorkspaceMembers` (returns only the user) | `uploadAvatar` is deferred: the Google avatar URL is used. |
| `onboarding` | **Real** | all | The `app_stage` claim and the route guard depend on it. The Zoom step is skipped (`skipped: true`). |
| `calendar` | **Real** | all (pull-on-read sync) | Must-have, read-only |
| `meetings` | **Real-lite** | `list` (scope `my_calls` only), `getById`, `create`, `update` (title only), `delete`, `startCapture`, `setCapturePaused`, `stopCapture`, `getProcessingStatus`, `retryProcessing`, `listDecisions`, `getDecisionHistory` (a single entry, no linking), `generateFollowUp` (port of the deterministic `composeFollowUp`, about 1 day; first item on the cut line) | `getShareSettings` returns the computed private-only settings (`canManage` true, no recipients). `share` and `unshare` return 503 and the share button is hidden. Team Calls (`scope=team`) returns empty and its nav is hidden. |
| `capture` | **Real** | all | Must-have |
| `transcripts` | **Real** | `getByMeetingId`, `search` | Must-have. `assignSpeaker` (a gap from 02 section 16) is not in the slice. |
| `actionItems` | **Real** | all | The brief's actions must be toggleable on real data, which is part of the wow path. |
| `search` | **Real** | `search` (FTS; types meeting, transcript, decision, action, person) | Must-have. No deals. Commands are merged client-side (04 section 5.10). |
| `assistant` | **Real** | `ask`, `getSuggestedQuestions` (deterministic port), `listHistory` | Must-have (single meeting) |
| `playlist` | **Mock (hidden)** | none | Not required. The table and endpoints are about 2 days of work and the first D-stretch item. |
| `alerts` | **Real-lite** | `list`, `getUnreadCount`, `markRead`, `markAllRead`, `dismiss`. Only `meeting_ready` and `processing_failed` are produced. | The topbar bell polls unread count on every page. Mock alerts would point at nonexistent meetings. |
| `deals` | **Mock (hidden)** | none | Not required. Deferred to M8. |
| `integrations` | **Real-lite** | `list`, `get`, `connect`/`disconnect` for `google_calendar` (shared with `calendar`); `google` is always connected; all others `coming_soon` (Zoom too, per the owner's "no Zoom") | Settings and onboarding read it |
| `settings` | **Real-lite** | `get`, `update` | `security.sessions` lists only the current session. `revokeSession` returns 503 (the GoTrue-internals risk R11 is avoided). |

Demo build env: `NEXT_PUBLIC_USE_MOCKS=false`, `NEXT_PUBLIC_API_SERVICES=auth,user,onboarding,calendar,integrations,settings,meetings,capture,transcripts,actionItems,alerts,assistant,search`, `NEXT_PUBLIC_APP_ENV=demo` (mixed mode is allowed outside `production`, per [07-roadmap.md](./07-roadmap.md) section 2), `NEXT_PUBLIC_DEMO_SLICE=true`.

### 3.2 Database subset

Create these, in this order, as Supabase CLI migrations. "As 02" means copy the DDL from [02-data-model.md](./02-data-model.md) unchanged. Only differences are written out.

| # | Migration | Contents |
| --- | --- | --- |
| 1 | `..._extensions_and_types.sql` | As 02 section 1, **minus** `vector` and `pg_cron`. Keep **all** enums (cheap, and it avoids future `ADD VALUE` churn). |
| 2 | `..._identity.sql` | `profiles`, `organizations`, `organization_members`, `contacts` (as 02 section 2). **Skip** `teams` (the `organization_members.team_id` column is kept but has no FK yet) and `organization_invitations`. |
| 3 | `..._onboarding_settings.sql` | `onboarding_progress`, `user_settings` (as 02 section 3). |
| 4 | `..._integrations.sql` | `integrations`, `app_private.integration_credentials`, `app_private.oauth_states` (as 02 section 4). |
| 5 | `..._calendar.sql` | `calendars` (keep the `watch_*` and `sync_token` columns, unused), `calendar_events`, `calendar_event_attendees` (as 02 section 5). |
| 6 | `..._meetings.sql` | `meetings` (as 02, **plus `synthetic boolean not null default false`**), `meeting_participants`, `meeting_share_grants`, `meeting_share_exclusions`, `tags`, `meeting_tags` (created empty so the 03 RLS helpers work verbatim). The `search_tsv` trigger is as 02. |
| 7 | `..._capture_processing.sql` | `capture_sessions`, `capture_chunks`, `recordings`, `processing_runs`, `processing_steps` (as 02 section 7) **with two changes**: `capture_chunks` gains `track text not null default 'mix' check (track in ('mic','tab','mix'))` and `part_started_ms integer` (the part's offset on the capture timeline), and its primary key becomes `(session_id, track, seq)`. `recordings` is unchanged: one row per meeting, whose `audio_path` is the remuxed `mix` playback file. The temporary per-part ASR object paths are kept in `processing_steps.detail`, not in new rows. |
| 8 | `..._transcripts.sql` | `transcripts`, `transcript_segments` (as 02 section 8). `channel` stores 0 for mic and 1 for tab. `words` stays null (not stored in the slice). |
| 9 | `..._insights.sql` | `app_private.check_source_timestamp()`, `summaries`, `key_points`, `decisions`, `action_items`, `questions`, `risks`, `key_moments`, `topics`, and the `meeting_stats` view (as 02 section 9). **Skip** `deal_signals`. |
| 10 | `..._alerts.sql` | `alerts` as 02 section 10, with `deal_id uuid` kept but **no FK** (deals don't exist yet). **Skip** `playlist_items`, `deals`, `deal_meetings`. |
| 11 | `..._assistant.sql` | `assistant_sessions`, `assistant_messages`, `assistant_answer_sources` (as 02 section 11). |
| 12 | `..._ops.sql` | `ops.jobs` (as 02 section 13, minus `trace_context`), `ops.enqueue_job` (as 02; `pg_notify` removed), and the new `ops.provider_usage` (below). **Skip** `ops.job_attempts`, `ops.idempotency_keys`, `ops.webhook_events`, `ops.audit_log`, `zoom_recording_offers`. |
| 13 | `..._rls.sql` | The helpers from 03 section 4.1 and the policies from 03 section 4.2 for every table above (`can_read_meeting` effectively reduces to the owner branch, because no shares exist). The `realtime.messages` policies are skipped. |
| 14 | `..._rpc.sql` | `bootstrap_user`, `transition_meeting`, `start_capture`, `stop_capture`, `discard_capture`, `retry_processing`, `delete_meeting` (03 section 4.3, minus the share functions), `api.search_all` (FTS branches only, 05 section 12.2), and `delete_action_item` (does the key-moment `related_id` null-out in SQL). |
| 15 | `..._storage.sql` | Bucket `capture-chunks` (private, 8 MB limit, `audio/webm`), bucket `recordings` (private, **45 MB limit**, under the Free 50 MB cap), and the `owns_live_capture_prefix` policy (03 section 7). No `avatars` bucket. |
| 16 | `..._access_token_hook.sql` | The Custom Access Token hook function for `app_stage` (03 section 2.4). |

```sql
-- migration 12 addition (slice)
create table ops.provider_usage (
  provider       text not null,             -- 'groq', 'cerebras', 'cloudflare'
  model          text not null,
  day            date not null,             -- UTC
  requests       integer not null default 0,
  input_tokens   bigint  not null default 0,
  output_tokens  bigint  not null default 0,
  audio_seconds  numeric(12,3) not null default 0,
  primary key (provider, model, day)
);
```

**Traceability trigger simplifications** (each is moved into code, not dropped):

1. The `summaries.overview_segment_ids` membership trigger is **not created**. The verification gate only accepts overview segment ids that are already evidence of accepted insights, and the `finalize` step asserts it.
2. The deferred `assistant_answer_sources` invariant ("answered means at least one source") is **not created**. The Ask handler enforces it before insert (05 section 12.1, step 4).
3. The key-moment and alert retargeting `after delete` trigger on `action_items` is replaced by the `delete_action_item` RPC.
4. Unchanged and mandatory: the composite FKs, `check_source_timestamp` on every insight table, the `*_ai_has_quote` checks, and `seg_speaker_is_participant`.

pgTAP in the slice (about 1 day): the trigger rejects an out-of-range timestamp; the composite FK rejects a segment from another meeting; an AI row without a quote is rejected; a stranger cannot select another user's meeting, transcript or insights; the `capture-chunks` policy rejects a path outside the live prefix.

---

## 4. Capture and pipeline for the slice

### 4.1 Recording graph (Chrome only; mic-only elsewhere)

Same audio graph as [05-capture-and-pipeline.md](./05-capture-and-pipeline.md) section 3.1, but instead of one stereo recorder, the slice runs **three mono MediaRecorders** off one `AudioContext`:

| Track | Source | Bitrate | Purpose | Rotation into parts |
| --- | --- | --- | --- | --- |
| `mic` | `getUserMedia` (echo cancellation on) | Opus 32 kbps | ASR for "me" | Every ~10 min, at the first 300 ms of silence after 9.5 min (hard cut at 10.5 min). Each part is a self-contained WebM. |
| `tab` | `getDisplayMedia` tab audio | Opus 32 kbps | ASR for remote participants | Same rule, driven by tab-track energy |
| `mix` | both, summed | Opus 32 kbps | Playback (`Meeting.audioUrl`) | Never rotated. `MediaRecorder.pause()/resume()` keeps one stream. A new part only after a crash or recorder error. |

Why three recorders instead of one stereo file: Groq can't transcribe one channel of a stereo file, and the server can't afford to split channels with FFmpeg at 0.1 vCPU. Recording the tracks separately moves the split to the browser, where it is free. Upstream bandwidth is 96 kbps in total. Two recorders fed from one `AudioContext` should share a clock, so mic/tab drift should be negligible over 45 minutes **[unverified: measure in D0]**.

Timeslice is **10 s** (05 uses 5 s), which halves chunk registrations: about 18 per minute across three tracks. The IndexedDB buffer, ordered upload, `POST .../capture/chunks` registration (now with `track` and `partStartedMs`), heartbeat, pause/resume, stop, discard and crash recovery are as 05 sections 3.3 to 3.5. Capability detection: anything other than Chromium gets mic-only mode with the copy from 05 section 1.1 (only the `mic` and `mix` tracks are recorded).

The client also computes a per-part **speech fraction** from an `AnalyserNode` (share of 100 ms frames above -45 dBFS) and sends it with the last chunk of each part. Mic parts with a speech fraction under 2% are not transcribed. That saves quota, and it avoids Whisper's well-known hallucinations on silence.

### 4.2 Bytes, limits and caps

| Item | Size | Limit it must respect |
| --- | --- | --- |
| One 10 s chunk (any track) | ~40 KB | `capture-chunks` 8 MB bucket limit |
| One ASR part (10 min, 32 kbps) | ~2.4 MB | Groq Free 25 MB per file (about 10x headroom); Supabase 50 MB per object |
| Playback `mix` file, 30 min | ~7.2 MB | `recordings` bucket 45 MB limit, so the **maximum session is 45 min** (10.8 MB). The cap is set by ASR quota and demo scope, not by size. |
| Stored per 30-min meeting | ~7 MB kept (mix); ~14 MB of ASR parts deleted after the transcript commits; chunks deleted after assembly | 1 GB Storage, so **about 140 thirty-minute meetings** of playback. In the slice, `bootstrap_user` sets `recording_retention_days = 30` (the long-term default is 90, Q14), and a daily in-process sweep deletes expired playback objects. |

Session cap: **45 minutes** (warning at 40). This replaces 4 hours from 03 section 11 for the slice.

### 4.3 Pipeline steps (concrete)

Step ids and the status mapping are as [05-capture-and-pipeline.md](./05-capture-and-pipeline.md) section 6.2, so the frontend's `ProcessingProgress` behaves unchanged.

1. **Stop** (`stop_capture` RPC): session `finalizing`, meeting `processing`, run plus steps created, job `capture.assemble` enqueued. The client keeps draining unacked chunks for up to 10 minutes.
2. **`capture.assemble`** (step `upload`): wait until each `(track, part)` is contiguous (re-enqueue every 15 s, give up after 10 minutes and log gaps). For each `mic` and `tab` part, concatenate chunk bytes in order (a valid WebM, no decoding) and upload it to `recordings/{org}/{meeting}/{run}/asr/{track}-{part}.webm`. For `mix`, concatenate, then run **`ffmpeg -i mix.webm -c copy audio.webm`** (remux, no re-encode) so the file gets a duration and cues, because MediaRecorder WebM files often have no duration, which breaks seeking for "Jump to conversation" **[unverified on current Chrome; test in D0]**. `ffprobe` gives the authoritative `duration_seconds`. Peak memory is about 20 MB and CPU time is a few seconds even at 0.1 vCPU [estimate]. FFmpeg ships as a static binary in the Docker image. Then enqueue one `asr.transcribe_part` per part.
3. **`asr.transcribe_part`** (step `transcribe`, meeting `transcribing`; fan-out with at most 3 in flight): mint a 30-minute signed URL and call the router's ASR provider with `url`, `language: 'en'`, `response_format: verbose_json` and word plus segment timestamps. Shift every timestamp by `part_started_ms / 1000`. Apply the hallucination guards from 05 section 6.5 (drop `no_speech_prob > 0.6` with low `avg_logprob`, drop 3x repeat loops). Store the raw result in `processing_steps.detail` (or a `tmp/` Storage object if it exceeds 200 KB). The last part to finish enqueues `asr.build_segments`.
4. **`asr.build_segments`**: merge mic and tab results on one timeline. **Cross-channel dedupe** as 05 section 3.1: when the same text appears on both tracks within ±1.5 s, keep the tab version, because echo on speakers puts remote speech on the mic. Build segments of 2 to 30 s with one speaker each (05 section 6.6, steps 2 and 3, using word timestamps). Map speakers (section 2.2). In one transaction, insert `transcripts`, `transcript_segments` and any `unidentified_speaker` contact and participant, set the transcript `ready`, set the meeting to `understanding`, and enqueue `ai.extract`. Delete the ASR part objects after commit.
5. **`ai.extract`** (step `understand`): build the handle-based prompt (05 section 6.7). Window the transcript at **4,000 tokens or fewer** with 6 segments of overlap: 10 min is 1 window, 20 min is 2, 30 min is 2 to 3. One map call per window, with the provider-compatible schema and the full Zod parse. Respect `meeting_focus`/`ai_priorities`. Reasoning effort low. Temperature 0.1.
6. **`ai.reduce`**: deterministic merge (trigram 0.8 or more, overlapping evidence). One LLM call for the overview, ordered key points, topics and key moments, citing only accepted evidence. `chrono-node` resolves due dates against the meeting date in the owner's timezone.
7. **`ai.verify`** (steps `extract_decisions`, `extract_actions`): exactly the gate from 05 section 6.8. A batched judge call for decisions, actions and risks; if every LLM provider is exhausted, skip the judge and lower confidence by 0.2. Insert with `evidence_quote`, `origin='ai'`, `confidence`, and the server-set `source_timestamp`.
8. **`meeting.finalize`**: insert the summary and key points, set `current_run_id`, refresh `search_tsv`, mark steps complete, set the meeting `ready`, and create a `meeting_ready` alert. The `processing_failed` alert comes from the dead-letter path (05 section 9).

### 4.4 Expected end-to-end latency (Stop to `ready`) [estimate]

Assumptions: a warm host; Groq round trip of 4 to 12 s per 10-minute part (Groq's speed factor is 189x, so most of the time is network and queueing); Cerebras output speed **[unverified]**, assumed 1,000 tok/s or more; Groq LLM fallback paced by 8K TPM.

| Step | 10 min | 20 min | 30 min |
| --- | --- | --- | --- |
| Drain remaining chunks after stop | 1 to 5 s | 1 to 5 s | 1 to 5 s |
| Assemble + remux | 3 to 10 s | 5 to 12 s | 5 to 15 s |
| ASR (2 / 4 / 6 parts, 3 in flight) | 5 to 15 s | 10 to 25 s | 15 to 35 s |
| Segment build + commit | under 5 s | under 5 s | under 5 s |
| Extract (1 / 2 / 3 windows; Cerebras 5 RPM paces calls 12 s apart) | 5 to 15 s | 15 to 35 s | 30 to 50 s |
| Reduce + judge | 10 to 25 s | 15 to 30 s | 15 to 35 s |
| **Total, Cerebras primary** | **~0.5 to 1.5 min** | **~1 to 2 min** | **~1.5 to 2.5 min** |
| **Total, Groq LLM fallback** (one ~6K request per minute) | ~2 to 3 min | ~3 to 5 min | ~5 to 7 min |
| Add if the host was asleep at Stop (rare, capture keeps it awake) | +60 s | +60 s | +60 s |

That is well inside the long-term SLO of under 10 minutes for 60 minutes of audio ([01-architecture.md](./01-architecture.md) section 9). Measure the real numbers in D3 and D4 and replace this table.

### 4.5 Failure modes

| Failure | Detection | Behaviour |
| --- | --- | --- |
| Tab audio missing (user shared a window or the screen without "Share tab audio") | The `tab` track's energy stays at zero for 20 s | A capture-bar warning: "WIT can't hear the meeting tab. Stop and share the tab with audio." The demo script rehearses choosing the tab. |
| User on speakers: echo on the mic | Cross-channel dedupe hits | Handled in `build_segments`. Brief quality degrades a little. Recommend headphones in the script. |
| Whisper hallucination on silence or music | `no_speech_prob`, repeat loops | Dropped. Silent mic parts are never sent (speech fraction under 2%). |
| Cut word at a part rotation | Rotation happens at silence | Usually none. The worst case is one garbled word. |
| Groq 429 or daily quota | `retry-after`, ledger | Section 1.9: wait if 120 s or less, otherwise the next provider, otherwise wait up to 2 h, then a retryable failure |
| Cerebras or Groq output fails Zod twice | Parse error | Next provider. After the chain, a retryable `processing_failed` with the transcript readable (Q10). |
| Grounding rejection is high (over 25% on the run) | Gate metrics | Logged. The brief shows only verified items. During rehearsal, a spike means a prompt regression: freeze prompts before the demo. |
| Render restart mid-pipeline | Lease expiry (2 min) | The job is reclaimed. Idempotent step. Adds about 2 minutes. |
| Supabase paused | `/readyz` fails | Demo checklist (2.5). The seeded meeting cannot help, because it lives in the same DB. Resuming is the only fix, so check T-24 h. |
| Calendar token expired (7-day Testing limit) | `invalid_grant` | Integration `revoked`. Settings shows "Reconnect". Capture still works without a calendar event (an ad-hoc meeting with title "Untitled meeting", renamable). |
| Browser crash mid-capture | `GET /v1/capture/active` | Resume, finish or discard, as 05 section 3.5 |

### 4.6 The wow path: a 6 to 7 minute scripted meeting

**Setup:** the owner (demo user **Waleed Ahmed**) in Chrome with WIT open. A colleague plays **Sara Ahmed (Northstar Labs)** on Google Meet in another Chrome tab, both wearing headphones. A calendar event "Northstar Labs launch sync" is on the owner's Google Calendar with exactly one other attendee (the colleague's account, whose display name is set to "Sara Ahmed"), so the tab track maps to Sara with no diarization. All names and companies are the PRD's fictional ones (conventions section 8), so the content is synthetic and `synthetic=true`.

**Script beats** (each beat is written so the extraction target is explicit, quotable and unambiguous; the full line-by-line script lives in `fixtures/golden/wow-script.md`):

| Time | Beat | Planted target |
| --- | --- | --- |
| 0:00 to 0:40 | Greetings; "Thanks for joining, Sara" (names the remote speaker); agenda: launch date, pricing, onboarding | Topic boundaries; speaker-name evidence |
| 0:40 to 2:00 | Launch date discussion: Sara proposes October 15; Waleed: "Okay, let's make it official: we launch on October 15." | **Decision 1** (subject "launch date", value "Oct 15") |
| 2:00 to 3:10 | Pricing: "We'll keep the Growth plan at forty-nine dollars and drop the annual discount." Both agree. | **Decision 2** |
| 3:10 to 4:20 | "Sara, can you send the revised pricing deck by Friday?" "Yes, I'll send it by Friday." Then: "I'll set up the onboarding checklist by next Wednesday." | **Action 1** (Sara, due Friday), **Action 2** (Waleed, due next Wednesday) |
| 4:20 to 5:20 | "Do we need legal sign-off for the EU launch?" "I don't know, I'll have to check." (left unanswered) | **Open question** |
| 5:20 to 6:20 | "If the payment provider integration slips past the 10th, the launch slips too." | **Risk** (high) |
| 6:20 to 6:50 | Wrap-up recap that repeats the decisions in different words | Tests dedupe in `ai.reduce` |

**On stage:** Start capture from the calendar event, then attest consent. Show the live timer. Stop. Processing moves through its steps in about 1 minute. Open the brief: 2 decisions, 2 actions with owners and due dates, 1 open question, 1 risk. Each one has "Source · mm:ss · Jump to conversation". Click it, and the audio seeks while the transcript scrolls to the quoted line. Tick Sara's action. Ask "What did we decide about pricing?", which answers with a citation. Ask "Who owns the onboarding checklist?". Ask something not in the meeting ("What's the budget?"), which returns `not_found`. That honesty is part of the pitch. Search "launc" in the command palette to find the decision, the action and the transcript line.

**Fallbacks, in order:** (1) If the live capture fails: run `replay-golden` with the real providers (about 1 minute). (2) If the providers fail or quota is gone: `replay-golden` with `REPLAY=true` (seconds). (3) If the API host is down, the seeded ready meeting can't help either, because it is served by the same host. For that worst case, keep a **screen recording of a full successful run** on the laptop. Disclose to investors that a replay is a replay.

### 4.7 Golden recording and eval checklist

**Golden recordings** (in `fixtures/golden/`, git-LFS or a private bucket, fictional content only):

1. `wow` (above), recorded as real Chrome captures with the three tracks plus their recorded ASR and LLM outputs for replay.
2. `wow-speakers`: the same script with the owner on laptop speakers (echo path).
3. `noisy`: café background noise at about 10 dB SNR.
4. `long-20` and `long-30`: 20 and 30 minute extended scripts (window and fan-out paths).
5. `no-decisions`: a status-update meeting with no decisions (the empty-result path must show none, not invented ones).

Optional: generate a fully synthetic two-voice version with a TTS model (for example Groq's `canopylabs/orpheus-v1-english`: 10 RPM, 100 RPD, 3.6K tokens/day on Free [verified, Groq rate-limit table]) for repeatable CI input. Human recordings stay the reference for quality.

**Eval checklist** (run each golden 5 times, since providers are not perfectly deterministic; it passes if 4 of 5 runs pass every line; run before every prompt or model change and on demo week):

- [ ] Every planted decision, action, question and risk is present (recall = 100% on `wow`, at least 80% on the others).
- [ ] No extracted item lacks a planted counterpart on `wow` or `no-decisions` (precision = 100% on `wow`).
- [ ] Each item's `sourceSegmentId` is within ±1 segment of the gold segment, and `sourceTimestamp` lies inside that segment (the DB guarantees the second).
- [ ] Each `evidence_quote` is a verbatim (normalised) substring of its segment.
- [ ] Assignees are right (Sara for the deck, Waleed for the checklist). Due dates resolve to the right calendar dates relative to the recording date.
- [ ] The decision subject and value for the launch date are "launch date" and "Oct 15".
- [ ] The open question is `open`, not `answered`.
- [ ] The wrap-up recap did not create duplicates.
- [ ] The grounding rejection rate is under 15%. Re-anchors are logged.
- [ ] Ask: 10 scripted questions (6 answerable, 4 not). All answerable ones are `answered` with valid citations; at least 3 of 4 unanswerable ones are `not_found`.
- [ ] Search "launc", "pricing deck" and "Sara" return the expected types.
- [ ] Stop-to-ready is under 3 minutes on `wow` with the primary providers.
- [ ] Speaker attribution: all mic segments are Waleed and all tab segments are Sara on `wow`; on `wow-speakers`, at most 5% of segments are duplicated.

---

## 5. Frontend cutover for the slice (ordered checklist)

This reuses the "Frontend changes" table in [README.md](./README.md); the last column says what the slice needs.

| README change | Slice? |
| --- | --- |
| `http-errors.ts`: prefer `data.code`, add 503 to `service_unavailable` and 502 to `server_error` | **Yes** |
| `@supabase/ssr` clients, `/auth/callback`, `setAuthTokenProvider` | **Yes** |
| `proxy.ts` reads `app_stage` from verified claims | **Yes** |
| `signInWithGoogle` redirect, `listGoogleAccounts` returns `[]` | **Yes** |
| Per-service `NEXT_PUBLIC_API_SERVICES` | **Yes** |
| `Api*Service` implementations | **Yes**, for the 13 services in 3.1, against `src/contracts` (not `packages/contracts`) |
| Additive types (Topic traceable fields, `keyPointSources`, `discardCapture`, `getActiveCapture`, `RecordingService`, `assignSpeaker`, new alert types, `audioUrlExpiresAt`) | **Only `audioUrlExpiresAt`** (optional; the signed URL TTL is 6 h in the slice). Topic evidence fields may be sent by the API but are not required by the UI. Everything else is deferred. |
| `BrowserRecorder` + IndexedDB queue + capability detection + consent attestation | **Yes**, with the three-track graph from section 4.1 |
| `ApiSearchService` merges client-side commands | **Yes** |
| Realtime subscriptions | **No** (polling) |

Ordered checklist:

1. [ ] `src/lib/api/http-errors.ts`: prefer `data.code` when `isAppErrorCode(data.code)`; 503 to `service_unavailable`, 502 to `server_error`; keep 429 `Retry-After` to `retryAfterSeconds` and 422 `fieldErrors`.
2. [ ] Add `@supabase/ssr` browser and server clients in `src/lib/auth`; the `/auth/callback` route handler (exchange code, `POST /v1/auth/bootstrap`, redirect by stage); register `setAuthTokenProvider(() => session.access_token)` in the app providers.
3. [ ] `src/proxy.ts`: `getClaims()`, then `app_stage`, then the existing `resolveRouteAccess()`; stop writing `wit_session_hint`. After `POST /onboarding/complete`, call `supabase.auth.refreshSession()`.
4. [ ] `src/services/registry.ts`: add `NEXT_PUBLIC_API_SERVICES` (read literally) and allow mixed mode when `NEXT_PUBLIC_APP_ENV !== 'production'` (07 section 2).
5. [ ] `src/contracts/`: Zod schemas for every type the 13 services return, plus a **mock conformance test** (each `Mock*` output parses), run with `npm run test:run`.
6. [ ] `src/services/api/`: `ApiAuthService` (with a "Redirecting to Google" pending state in the login UI), `ApiUserService`, `ApiOnboardingService`, `ApiSettingsService`.
7. [ ] `ApiIntegrationService` and `ApiCalendarService` (the connect response's `authorizationUrl`, then navigate; handle `?integration=google_calendar&result=...` on return).
8. [ ] `ApiMeetingService` (Real-lite per 3.1), `ApiTranscriptService`, `ApiActionItemService`.
9. [ ] `ApiCaptureService` + `BrowserRecorder` (three tracks, speech fraction, silence-aligned rotation) + IndexedDB queue + `GET /v1/capture/active` rehydration; Chrome detection with the mic-only copy; consent attestation in the start dialog; treat 409 on a repeated stop as success when the meeting is already `processing`.
10. [ ] `ApiAlertService` (Real-lite).
11. [ ] `ApiAssistantService`, `ApiSearchService` (merge static commands).
12. [ ] `NEXT_PUBLIC_DEMO_SLICE=true` hides Deals, Playlist, Team Calls, Share, Zoom and avatar upload entry points. `NEXT_PUBLIC_DEMO_TOOLS=true` shows the dev-only "Replay golden" and quota panel for allowlisted owners.
13. [ ] A fire-and-forget `GET ${NEXT_PUBLIC_API_URL}/healthz` on app load (host warm-up).
14. [ ] Keep `?mockFail` and `?mockLatency` mock-only (unchanged).

Error mapping the UI must handle in the slice: 401 means `unauthorized` (sign out and redirect to login); 403 `forbidden` (should not occur with a personal org); 404 `not_found`; 409 `conflict` (capture state); 422 `validation_error` with `fieldErrors`; 429 `rate_limited` with `retryAfterSeconds` (Ask quota); **503 `service_unavailable`** (provider quota at capture start, deferred methods); 502 `calendar_connection_failed` (connect).

---

## 6. Plan, risks, upgrade path

### 6.1 Week-by-week for one engineer (about 5 weeks plus 1 week of buffer)

| Weeks (cumulative) | Milestone | Exit criteria |
| --- | --- | --- |
| 0 to 0.5 | **D0. Spike and accounts** | Supabase project (region chosen), Render service, Groq (ZDR on), Cerebras and Cloudflare keys exist. In real Chrome on the owner's laptop: three-track capture from a Meet tab works; tab audio keeps flowing; mic/tab drift is measured; the remuxed WebM seeks correctly. Groq transcribes a 10-minute WebM part by `url`. Cerebras returns a strict-schema `MapOutput` for a 4K-token window. Cerebras free context length is measured. The `wow` golden is recorded once. Every **[unverified]** item in sections 1 and 4 is resolved or re-tagged. |
| 0.5 to 1.5 | **D1. Skeleton, auth, onboarding, settings** | `api/` Fastify with config, JWKS, error contract, `/healthz`, `/readyz`. Migrations 1 to 4, 13, 14 (bootstrap), 16. Frontend checklist items 1 to 6. Real Google sign-in through onboarding to My Calls on the deployed demo stack. |
| 1.5 to 2.5 | **D2. Calendar and meetings read** | Migrations 5, 6, 8 to 11. Calendar connect plus pull-on-read events; integrations-lite; meetings list/get/create/update/delete; transcripts and action items read against a hand-seeded meeting. Checklist items 7 and 8. |
| 2.5 to 3.5 | **D3. Capture, jobs, ASR** | Migrations 7, 12, 15. Capture endpoints, job loop, assemble + remux, `asr.transcribe_part`, `build_segments`, the router with ledger and 429 handling. Checklist item 9. A 20-minute live capture (with one reload mid-way) produces a correct two-speaker transcript, playable and seekable. |
| 3.5 to 4.5 | **D4. Brief and traceability** | `ai.extract`, `reduce`, `verify`, `finalize`, the `meeting_ready` alert, pgTAP traceability tests, alerts-lite (checklist item 10). The `wow` eval checklist passes 4 of 5 runs. Stop-to-ready under 3 minutes. |
| 4.5 to 5 | **D5. Ask, search, demo mode** | Ask with FTS windows plus the deterministic fallback, suggestions, history; `api.search_all`; `replay-golden` and the replay providers; the seeded meeting; quota panel; keep-warm; checklist items 11 to 14. The full wow path runs 3 times in a row on the deployed stack. |
| 5 to 6 | **Buffer, rehearsal, pilot** | 3 to 5 pilot users onboarded as Google test users. Golden variants recorded and evaluated. The demo-day checklist is rehearsed twice. Screen recording of a successful run captured. |

**Cut lines** (cut from the top when a week slips; never cut below the line):

1. `generateFollowUp` (return 503 and hide the button).
2. Alerts-lite (hide the bell; the meeting status UI is enough).
3. Settings-lite `update` (read-only settings page).
4. Search across decisions and actions (keep meetings and transcript only).
5. Ask history and suggestions (keep `ask`).
6. Calendar-linked capture (capture ad-hoc and type the title; the calendar list stays visible).

**Never cut:** the verification gate and DB traceability constraints, the RLS owner policies, the golden replay safety net, real sign-in, real capture to transcript, and a real brief.

### 6.2 Risks specific to free tiers

| # | Risk | L | I | Mitigation |
| --- | --- | --- | --- | --- |
| F1 | ASR or LLM quota exhausted mid-demo (rehearsals burn it) | M | H | Ledger plus `GET /v1/dev/quota`; **no rehearsals on demo day after 09:00**; capture admission control; Cloudflare fallback; replay mode |
| F2 | Render cold start or restart in front of investors | M | M | Warm-up ping on page load, external pinger on demo day, capture heartbeats, leased jobs; fallback host GCE `e2-micro` (needs a card) |
| F3 | Supabase project paused | L | Critical | Pinger plus daily GitHub Action; **T-24 h dashboard check**; weekly `db dump` |
| F4 | Provider outage or silent free-tier change (limits cut, model renamed or deprecated: Gemini's free tier was cut sharply on 2025-12-06, and Groq's free LLM list has already changed) | M | H | Two providers per role, config-only swap, D0 and demo-week re-verification of limits, replay mode, screen recording |
| F5 | Model quality: a missed decision, a wrong assignee or a hallucinated item on stage | M | H | A scripted meeting with explicit beats; the verification gate; the eval checklist at 4 of 5; prompts frozen 1 week before; temperature 0.1 |
| F6 | Testing-mode calendar refresh token expires (7 days) | H | L | Reconnect at T-24 h; capture works without a calendar |
| F7 | "Unverified app" screen looks bad to investors | H | L | Connect the calendar before the demo; rehearse the click-through; explain "internal pilot, verification after funding" |
| F8 | Real pilot audio reaches a provider that trains on it | L | H | The `PROVIDERS_ALLOWED_FOR_REAL_AUDIO` allowlist enforced in the router; synthetic-only providers are never configured in the demo env |
| F9 | Free host terms (Vercel Hobby non-commercial; Render free not meant for production) | M | M | QD3; Netlify free as an alternative for the frontend; budget for the first paid tier (6.4) |
| F10 | Storage fills (1 GB) or exceeds the 50 MB object cap | L | M | 45-minute cap, ASR parts deleted after commit, 30-day playback retention, a storage-usage line in the quota panel |
| F11 | Groq's large-v3 and turbo share one daily quota (assumed) | M | L | The capacity estimate already assumes sharing |

### 6.3 Mitigation summary for demo day

Live run first. If it fails: `replay-golden` with live providers. If providers fail: `replay-golden` with `REPLAY=true`. If the host is down: the pre-recorded screen capture. Disclose fallbacks honestly. The seeded ready meeting covers "show me the brief again" without any provider call.

### 6.4 Upgrade-path triggers (free to paid or self-hosted)

Each upgrade is a config or plan change because of section 1.8 and the unchanged schema.

| Trigger | Upgrade | Rough cost [unverified prices, except Groq per-hour pricing which is verified] |
| --- | --- | --- |
| More than 300 audio-min/day for 5 days, or any external pilot | Groq paid tier for Whisper large-v3 at **$0.111/audio-hour** [verified, Groq model page], which also lifts the file limit to 100 MB | About $0.11 per 30-minute dual-track meeting |
| Any real customer or confidential meeting, or EU/UK users | Paid LLM and ASR tiers with a DPA, no training and ZDR (Q1, Q17 in 08) | Per [07-roadmap.md](./07-roadmap.md) section 6 |
| A visible cold start in a demo, or more than 1 Render restart per day under use | Paid always-on instance (Render paid or GCE) | About $7 to 25/month |
| Supabase DB over 300 MB, storage over 700 MB, or a 2nd pause scare | Supabase Pro (no pausing, 100 GB storage, PITR add-on, 500 GB uploads) | $25/month and up |
| Remote-side multi-speaker meetings are common in the pilot | Diarizing ASR (Voxtral, or hosted diarization), or the pyannote sidecar on an on-demand GPU (Q2) | Per minute or per GPU-second |
| Users ask semantic questions FTS misses (from the eval or pilot feedback) | Cloudflare `bge-m3` embeddings (1024-d, schema-compatible), then pgvector | About 27 neurons per meeting (free tier) |
| Funding or a public beta | Resume the full plan from M0 (monorepo move, Q13), reusing the slice's migrations and `Api*Service`s | [07-roadmap.md](./07-roadmap.md) |

---

## 7. What the slice defers from 01 to 08 (index)

| File | Deferred in the slice |
| --- | --- |
| [01](./01-architecture.md) | Monorepo (s4), separate worker pools (s4), NOTIFY wakeup and pg_cron schedules (s6), OTel and multi-instance rate limiting (s9), staging environment (s5) |
| [02](./02-data-model.md) | `teams`, `organization_invitations`, `playlist_items`, `deals`, `deal_meetings`, `deal_signals`, `embedding_chunks`, `zoom_recording_offers`, `ops.job_attempts`, `ops.idempotency_keys`, `ops.webhook_events`, `ops.audit_log`, Realtime emission (s14), the overview-membership and answer-source invariant triggers (moved to code) |
| [03](./03-security-rls.md) | Key ring rotation (s5), Realtime policies (s8), session revoke (s2.6), the full RLS matrix (s10; only the owner subset is tested), GDPR export and erasure (s9) |
| [04](./04-api-spec.md) | Sharing, link share, deals, playlist, Zoom, uploads, webhooks, idempotency keys, Realtime channels |
| [05](./05-capture-and-pipeline.md) | Python sidecar, pyannote, manual upload, Zoom import, embeddings, `ai.link_decisions`, `notify.action_due`, overflow routing to self-hosted |
| [06](./06-integrations.md) | Calendar push channels, sync tokens, webhooks and renewal; Google verification; all of Zoom |
| [07](./07-roadmap.md) | M0 to M10 as written (see the D-track in section 1a there) |
