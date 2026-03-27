# Architecture Research

**Domain:** Marketing Intelligence Platform (Competitive Analysis + Viral Content + AI Synthesis)
**Researched:** 2026-03-27
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
                           USER (Browser)
                               |
                    [Input: niche or URL]
                               |
                               v
  +------------------------------------------------------------+
  |                    PRESENTATION LAYER                       |
  |                   (Next.js App Router)                      |
  |                                                             |
  |  +-----------+  +-----------+  +-----------+               |
  |  | Homepage  |  | Dashboard |  | History   |               |
  |  | (Input)   |  | (Results) |  | (List)    |               |
  |  +-----+-----+  +-----+-----+  +-----+-----+             |
  |        |              |              |                      |
  +--------|--------------|--------------|----- ---------------+
           |              |              |
           v              v              v
  +------------------------------------------------------------+
  |                      API LAYER                              |
  |              (Next.js Route Handlers)                       |
  |                                                             |
  |  POST /api/analyze    GET /api/status/[id]                 |
  |  GET /api/report/[id]                                      |
  +----+-----------------------------------------------+-------+
       |                                               |
       v                                               v
  +-----------------------------+    +----------------------------------+
  |    ORCHESTRATION LAYER      |    |        DATA LAYER                |
  |      (Trigger.dev v3)       |    |     (Supabase/PostgreSQL)        |
  |                             |    |                                  |
  |  +---------------------+   |    |  +----------+  +-----------+     |
  |  | analyze-market      |   |    |  | analyses |  | competitors|    |
  |  | (orchestrator task)  |   +--->|  | viral    |  | creative   |    |
  |  +--+-----+-----+-----+   |    |  | content  |  | models     |    |
  |     |     |     |     |    |    |  +----------+  +-----------+     |
  |     v     v     v     v    |    +----------------------------------+
  |  +----+ +----+ +----+ +--+|
  |  |Comp| |Vir | |Syn | |Tx||         +---------------------+
  |  |etit| |al  | |the | |cr||         |   EXTERNAL SERVICES |
  |  |ors | |Cnt | |sis | |ibe          |                     |
  |  +--+-+ +--+-+ +--+-+ +--++    +--->|  Apify (Scraping)   |
  |     |      |      |      |     |    |  Gemini (AI)        |
  |     +------+------+------+-----+    |  AssemblyAI (Audio) |
  |                                     |  Bunny (Storage)    |
  +-------------------------------------+---------------------+
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| **Homepage (Input)** | Accept user input (niche text or URL), validate, initiate analysis | React Server Component with client form, POST to /api/analyze |
| **Dashboard (Results)** | Display analysis results with real-time progress during extraction | Client Component with useRealtimeRun or polling hook |
| **History** | List past analyses, allow re-viewing results | Server Component with Supabase query |
| **POST /api/analyze** | Validate input, call AI understanding layer, trigger orchestrator job, return analysis ID | Route Handler that calls Gemini then triggers Trigger.dev task |
| **GET /api/status/[id]** | Return current status and progress of an analysis | Route Handler that queries Supabase for status |
| **GET /api/report/[id]** | Generate and return PDF report | Route Handler that builds PDF from stored data |
| **analyze-market (orchestrator)** | Fan-out to extraction sub-tasks, wait for all, trigger synthesis | Trigger.dev task using batch.triggerByTaskAndWait |
| **extract-competitors** | Run Apify actors for website, SEO, social, ads data per competitor | Trigger.dev task calling apify-client |
| **extract-viral** | Find viral content in niche, download media to Bunny | Trigger.dev task calling Apify + Bunny Storage API |
| **synthesize** | AI analysis of all collected data, generate recommendations | Trigger.dev task calling Gemini API |
| **transcribe** | Transcribe video from Bunny URL using AssemblyAI | Trigger.dev task calling AssemblyAI SDK |
| **Supabase** | Persist analyses, competitors, viral content, recommendations, status | PostgreSQL with Row Level Security disabled (no auth) |
| **Bunny Storage** | Store downloaded media (videos, images, thumbnails) | REST API PUT/GET/DELETE |
| **Apify** | Execute scraping actors (Instagram, TikTok, Website, SimilarWeb, etc.) | apify-client .call() with waitForFinish |
| **Gemini API** | Understand input, synthesize data, generate creative models | @google/generative-ai SDK |
| **AssemblyAI** | Transcribe video audio to text | assemblyai SDK .transcribe() |

## Recommended Project Structure

The folder structure defined in CLAUDE.md is well-designed. Here is the rationale and a few refinements.

```
src/
├── app/                        # Next.js App Router pages and API routes
│   ├── page.tsx                # Homepage: input form
│   ├── analysis/[id]/page.tsx  # Dashboard: results + real-time progress
│   ├── history/page.tsx        # History: past analyses list
│   ├── api/
│   │   ├── analyze/route.ts    # POST: validate, understand, trigger job
│   │   ├── status/[id]/route.ts # GET: poll analysis status
│   │   └── report/[id]/route.ts # GET: generate PDF
│   └── layout.tsx              # Global layout (PT-BR, Tailwind)
├── components/
│   ├── ui/                     # Base UI (Button, Input, Card, Skeleton)
│   ├── analysis/               # Dashboard sections (progress, summary)
│   ├── competitors/            # Competitor cards, comparison table
│   ├── viral/                  # Viral content cards, video player
│   └── report/                 # PDF preview, export controls
├── lib/
│   ├── apify/                  # One file per actor type (thin wrappers)
│   ├── ai/                     # Gemini integration (understand, synthesize, creative, prompts)
│   ├── transcription/          # AssemblyAI wrapper
│   ├── storage/                # Bunny CDN REST wrapper
│   ├── supabase/               # Client + organized queries
│   └── pdf/                    # jsPDF report generation
├── trigger/                    # Trigger.dev task definitions
│   ├── analyze-market.ts       # Orchestrator (fan-out/fan-in)
│   ├── extract-competitors.ts  # Per-competitor data extraction
│   ├── extract-viral.ts        # Viral content + media download
│   ├── transcribe-video.ts     # Video transcription sub-task
│   └── synthesize.ts           # AI synthesis + creative modeling
├── hooks/                      # React hooks (useAnalysis, usePolling)
├── types/                      # TypeScript type definitions
├── utils/                      # Formatters, validators
└── config/                     # Service configurations (env wrappers)
```

### Structure Rationale

- **`lib/` is the service layer.** Each subfolder wraps one external service with a clean interface. Trigger.dev tasks import from `lib/` -- they never call external APIs directly. This makes testing trivial: mock `lib/apify/instagram.ts`, not the HTTP client.
- **`trigger/` is the orchestration layer.** Tasks are pure coordinators. They call `lib/` functions and write to `lib/supabase/`. No business logic in triggers beyond sequencing.
- **`components/` mirrors dashboard sections.** Each subfolder maps to a visual section of the analysis dashboard. Components are presentational; data fetching happens in page-level Server Components or hooks.
- **`types/` is shared.** Both trigger tasks and frontend components import the same types. This ensures the data contract between background jobs and UI is enforced at compile time.
- **`config/` centralizes env vars.** Each service config file reads from `process.env`, validates with zod, and exports typed config objects. Fail fast on missing config.

## Architectural Patterns

### Pattern 1: Fan-Out/Fan-In Orchestration (Trigger.dev)

**What:** A parent task triggers multiple child tasks of different types in parallel, waits for all to complete, then aggregates results for a synthesis step.

**When to use:** The core analysis cascade. After AI understands the input and identifies competitors, we need to extract data from 6+ sources per competitor simultaneously. Sequential execution would take 10+ minutes; parallel takes 1-3.

**Trade-offs:**
- Pro: Massively reduces total execution time. Fault isolation per sub-task.
- Pro: Trigger.dev checkpoints the parent task while waiting, so no compute cost during wait.
- Con: Debugging distributed failures requires good logging. Each sub-task must be independently retryable.

**Example:**
```typescript
import { task, batch } from "@trigger.dev/sdk/v3";
import { extractCompetitors } from "./extract-competitors";
import { extractViral } from "./extract-viral";
import { synthesize } from "./synthesize";
import { metadata } from "@trigger.dev/sdk/v3";

export const analyzeMarket = task({
  id: "analyze-market",
  run: async (payload: { analysisId: string; niche: string; competitors: string[] }) => {
    metadata.set("status", "extracting");
    metadata.set("progress", 0);

    // Fan-out: trigger all extraction tasks in parallel
    const { runs } = await batch.triggerByTaskAndWait([
      ...payload.competitors.map(comp => ({
        task: extractCompetitors,
        payload: { analysisId: payload.analysisId, competitor: comp },
      })),
      {
        task: extractViral,
        payload: { analysisId: payload.analysisId, niche: payload.niche },
      },
    ]);

    metadata.set("status", "synthesizing");
    metadata.set("progress", 70);

    // Fan-in: collect results, handle partial failures
    const successfulRuns = runs.filter(r => r.ok);
    const failedRuns = runs.filter(r => !r.ok);

    // Synthesis proceeds even with partial data
    const result = await synthesize.triggerAndWait({
      analysisId: payload.analysisId,
      extractedData: successfulRuns.map(r => r.output),
      failures: failedRuns.map(r => r.taskIdentifier),
    });

    metadata.set("status", "completed");
    metadata.set("progress", 100);

    return result.ok ? result.output : { error: "Synthesis failed" };
  },
});
```

### Pattern 2: Resilient External Service Calls (Apify Wrappers)

**What:** Thin wrapper functions in `lib/apify/` that call a specific Apify actor, wait for results, extract only the relevant fields, and return typed data. Each wrapper handles timeouts, retries, and field filtering.

**When to use:** Every Apify actor call. The wrappers isolate the rest of the system from Apify's specific data formats and error modes.

**Trade-offs:**
- Pro: Apify output shapes vary wildly between actors. Wrappers normalize to our types.
- Pro: Field filtering here (not storing raw output) keeps database lean per CLAUDE.md requirement.
- Con: Must maintain one wrapper per actor. Actor API changes require wrapper updates.

**Example:**
```typescript
import { ApifyClient } from "apify-client";
import type { CompetitorSocialData } from "@/types/competitor";

const client = new ApifyClient({ token: process.env.APIFY_API_TOKEN });

/** Extrai dados do Instagram de um perfil de concorrente */
export const scrapeInstagramProfile = async (
  username: string
): Promise<CompetitorSocialData> => {
  const run = await client.actor("apify/instagram-profile-scraper").call({
    usernames: [username],
    resultsLimit: 20,
  }, {
    timeout: 120, // seconds
    memory: 256,  // MB
  });

  const { items } = await client.dataset(run.defaultDatasetId).listItems();

  // Filter to only relevant fields (CLAUDE.md requirement)
  return {
    platform: "instagram",
    username,
    followers: items[0]?.followersCount ?? 0,
    posts: items[0]?.postsCount ?? 0,
    recentPosts: (items[0]?.latestPosts ?? []).slice(0, 10).map(post => ({
      url: post.url,
      caption: post.caption,
      likes: post.likesCount,
      comments: post.commentsCount,
      date: post.timestamp,
      mediaUrl: post.displayUrl,
    })),
  };
};
```

### Pattern 3: Real-Time Progress via Trigger.dev Metadata + Supabase

**What:** Two complementary channels for progress updates: (1) Trigger.dev run metadata for task-level progress visible via `useRealtimeRun` hook, and (2) Supabase database updates for persistent status that survives page refreshes.

**When to use:** The analysis dashboard. Users need to see "Extracting competitor 2 of 4..." in real time during the 1-3 minute cascade.

**Trade-offs:**
- Pro: Trigger.dev Realtime API handles WebSocket infrastructure for free (no custom WebSocket server needed).
- Pro: Supabase persists status so a page refresh doesn't lose progress context.
- Con: Two sources of truth. Keep them synchronized by having tasks update both metadata and database.

**Decision: Use Trigger.dev Realtime as primary, Supabase as fallback.**

The `@trigger.dev/react-hooks` package provides `useRealtimeRun(runId)` which subscribes to run metadata changes via Electric SQL (HTTP-based, no WebSocket management). The task sets `metadata.set("step", "extracting-instagram")` and the frontend reactively updates. On page refresh, the hook reconnects automatically using the stored `runId`.

Supabase status column serves as the persistent record and is updated at major milestones (not every sub-step) to avoid excessive writes.

### Pattern 4: Media Pipeline (Apify -> Bunny -> AssemblyAI)

**What:** A three-stage pipeline where videos discovered by Apify actors are downloaded and stored in Bunny Storage, then transcribed by AssemblyAI using the Bunny CDN URL.

**When to use:** Viral content extraction. When Apify finds viral TikTok/Instagram videos, we need to preserve them (platform URLs expire) and transcribe them for AI analysis.

**Trade-offs:**
- Pro: Bunny CDN URLs are stable (platform URLs expire/change). Transcription can happen later.
- Pro: Bunny Storage is cheap and fast. CDN delivery means AssemblyAI gets fast download speeds.
- Con: Adds storage costs proportional to video count. Must implement cleanup for old analyses.

**Example flow:**
```
1. Apify TikTok actor returns video URLs (temporary platform URLs)
2. extract-viral task downloads video binary data
3. PUT to Bunny Storage: https://{zone}.storage.bunnycdn.com/{path}/video.mp4
4. Store Bunny CDN URL: https://{pullzone}.b-cdn.net/{path}/video.mp4
5. transcribe-video task sends Bunny CDN URL to AssemblyAI
6. AssemblyAI downloads from CDN, transcribes, returns text
7. AI analysis uses transcript to identify hook/body/CTA structure
```

### Pattern 5: Cache-First with 24h TTL

**What:** Before starting a new analysis, check Supabase for an existing analysis of the same niche created within the last 24 hours. If found, return it immediately instead of re-running the entire cascade.

**When to use:** The `/api/analyze` endpoint. Prevents redundant Apify calls (which cost credits) for the same niche.

**Trade-offs:**
- Pro: Saves Apify credits (free tier is limited). Instant results for cached niches.
- Con: Data may be up to 24h stale. Users may expect fresh data each time.

**Implementation:** Normalize niche names (lowercase, trim, remove accents) for cache key matching. Store `created_at` timestamp on analyses. Query: `WHERE niche_normalized = $1 AND created_at > now() - interval '24 hours'`.

## Data Flow

### Primary Analysis Flow

```
User Input (niche text or URL)
    |
    v
POST /api/analyze
    |
    +--> [1] Validate input (zod schema)
    |
    +--> [2] Call Gemini "understand" layer
    |         - Identify niche, segment, region
    |         - Discover 3-4 competitor names/URLs
    |         - Return structured understanding
    |
    +--> [3] Check cache (Supabase: same niche < 24h?)
    |         - YES: Return cached analysis ID
    |         - NO: Continue
    |
    +--> [4] Create analysis record in Supabase (status: "processing")
    |
    +--> [5] Trigger analyze-market task (Trigger.dev)
    |         - Returns run handle with runId
    |
    +--> [6] Return { analysisId, runId } to frontend
    |
    v
Frontend redirects to /analysis/[id]
    |
    +--> Subscribe to Trigger.dev run via useRealtimeRun(runId)
    |
    v
Trigger.dev: analyze-market orchestrator
    |
    +--> [Fan-out] Per competitor (3-4 parallel):
    |     |
    |     +--> Apify: Website scraper -> site data
    |     +--> Apify: SimilarWeb -> SEO/traffic data
    |     +--> Apify: Instagram scraper -> social data
    |     +--> Apify: TikTok scraper -> social data
    |     +--> Apify: Facebook Ads Library -> ad creatives
    |     +--> Apify: Google Ads -> search ad presence
    |     |
    |     +--> Each result: filter fields -> save to Supabase
    |
    +--> [Fan-out] Viral content (parallel with competitors):
    |     |
    |     +--> Apify: TikTok trending in niche
    |     +--> Apify: Instagram trending in niche
    |     |
    |     +--> For each video found:
    |           +--> Download binary from platform URL
    |           +--> PUT to Bunny Storage
    |           +--> Store CDN URL in Supabase
    |           +--> Trigger transcription sub-task
    |                 +--> AssemblyAI.transcribe(bunnyCdnUrl)
    |                 +--> Store transcript in Supabase
    |
    +--> [Fan-in] Wait for all extraction tasks
    |
    +--> [Synthesis] Call Gemini with all collected data:
    |     |
    |     +--> Market overview and positioning analysis
    |     +--> Competitive strengths/weaknesses matrix
    |     +--> Viral content pattern identification
    |     +--> Strategic recommendations (specific, actionable)
    |     +--> Creative modeling: video scripts with hook/body/CTA
    |     |
    |     +--> Save synthesis results to Supabase
    |
    +--> Update analysis status to "completed"
    |
    v
Frontend receives real-time update -> renders dashboard
```

### Complete Mode Extension

```
Quick Mode:
  Input: "clínicas odontológicas em SP"
  -> AI identifies niche, finds competitors
  -> Full cascade runs

Complete Mode:
  Input: "clínicas odontológicas em SP" + user's business data
  -> Same cascade PLUS:
  -> AI includes user's data in synthesis
  -> Recommendations are comparative: "Competitor X does Y, you should Z"
  -> Creative models reference user's brand/positioning
```

### State Machine (Analysis Lifecycle)

```
              +-----------+
              |  created  |  (record exists, job not started)
              +-----+-----+
                    |
                    v
            +-------+-------+
            | understanding |  (Gemini interpreting input)
            +-------+-------+
                    |
                    v
            +-------+-------+
            |  extracting   |  (Apify actors running in parallel)
            +-------+-------+
                    |
                    v
            +-------+-------+
            | transcribing  |  (AssemblyAI processing videos)
            +-------+-------+
                    |
                    v
            +-------+-------+
            | synthesizing  |  (Gemini analyzing all data)
            +-------+-------+
                    |
              +-----+-----+
              |           |
              v           v
        +---------+  +--------+
        |completed|  | error  |  (partial or full failure)
        +---------+  +--------+
```

Note: "transcribing" may overlap with "extracting" since transcription tasks are triggered as videos are discovered. The state reflects the dominant activity for user-facing progress.

### Key Data Flows

1. **Input Understanding:** User text -> POST /api/analyze -> Gemini "understand" -> structured niche/competitors/region -> Supabase
2. **Competitor Extraction:** Trigger.dev task -> apify-client .call() per actor -> filtered fields -> Supabase competitors table
3. **Media Pipeline:** Apify video URL -> HTTP download -> Bunny PUT -> CDN URL -> AssemblyAI .transcribe() -> transcript text -> Supabase
4. **AI Synthesis:** All Supabase data -> Gemini prompt with structured context -> recommendations + creative models -> Supabase
5. **Progress Updates:** Trigger.dev metadata.set() -> @trigger.dev/react-hooks useRealtimeRun -> React component re-render

## Database Schema (Key Tables)

```
analyses
  id              uuid PK
  niche_input     text           -- raw user input
  niche_normalized text          -- lowercase, trimmed (cache key)
  mode            text           -- 'quick' | 'complete'
  user_business   jsonb          -- null for quick mode
  understanding   jsonb          -- Gemini understanding output
  status          text           -- state machine value
  trigger_run_id  text           -- Trigger.dev run ID for realtime
  created_at      timestamptz
  completed_at    timestamptz

competitors
  id              uuid PK
  analysis_id     uuid FK -> analyses
  name            text
  url             text
  site_data       jsonb          -- website analysis
  seo_data        jsonb          -- SimilarWeb data
  social_data     jsonb          -- Instagram + TikTok data
  ads_data        jsonb          -- Meta Ads Library + Google Ads
  maps_data       jsonb          -- Google Maps (when applicable)

viral_content
  id              uuid PK
  analysis_id     uuid FK -> analyses
  platform        text           -- 'tiktok' | 'instagram'
  original_url    text
  bunny_url       text           -- CDN URL for stored media
  metrics         jsonb          -- views, likes, shares, etc.
  transcript      text           -- AssemblyAI output
  hook_body_cta   jsonb          -- AI-identified structure

synthesis
  id              uuid PK
  analysis_id     uuid FK -> analyses (unique)
  market_overview text
  positioning     jsonb
  strengths_weaknesses jsonb     -- per competitor
  recommendations jsonb          -- specific, actionable list
  creative_models jsonb          -- video scripts with hook/body/CTA
  created_at      timestamptz
```

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-50 analyses (demo period) | Current architecture is fine. Free tiers of all services. Single Trigger.dev worker. No optimization needed. |
| 50-500 analyses | Add Supabase indexes on niche_normalized + created_at for cache lookups. Monitor Apify credit usage. Consider increasing Trigger.dev concurrency limit. |
| 500-5000 analyses | Implement Bunny Storage cleanup (delete media older than 30 days). Add rate limiting on /api/analyze. Queue analyses when Apify rate limits hit. |
| 5000+ analyses | Consider dedicated Apify proxy pools. Add Supabase connection pooling. Evaluate if synthesis results can be partially cached across similar niches. |

### Scaling Priorities

1. **First bottleneck: Apify credits and rate limits.** Free tier has limited credits. Each analysis triggers 10-20 actor runs. Solution: aggressive 24h caching, reduce actors called in Quick Mode, add credit monitoring.
2. **Second bottleneck: Bunny Storage costs.** Video storage grows linearly. Solution: implement cleanup job (delete media from analyses older than N days), keep only thumbnails for history view.
3. **Third bottleneck: Gemini API rate limits.** Free tier has RPM/RPD limits. Solution: queue synthesis tasks with backoff, consider batching multiple competitor analyses into single Gemini calls.

## Anti-Patterns

### Anti-Pattern 1: Synchronous Cascade in Route Handler

**What people do:** Call Apify actors sequentially in the POST /api/analyze route handler, waiting for each to complete before returning a response.
**Why it's wrong:** Route handlers on Vercel have a 10-second timeout (free tier) or 60-second (pro). A full cascade takes 1-3 minutes. The request will timeout, the user gets an error, and partial work is lost.
**Do this instead:** Route handler triggers the Trigger.dev orchestrator task and returns immediately with an analysis ID. All long-running work happens in Trigger.dev's serverless runtime which has no timeout.

### Anti-Pattern 2: Storing Raw Apify Output

**What people do:** Save the complete JSON output from each Apify actor into the database as-is.
**Why it's wrong:** Apify actor outputs can be 10-100KB per item with many irrelevant fields (internal IDs, debug info, raw HTML). Multiplied by 4 competitors x 7 actors = 28 raw blobs per analysis. Database bloats fast, queries slow down, and frontend has to parse irrelevant data.
**Do this instead:** Filter to only relevant fields in `lib/apify/` wrappers before saving. Define TypeScript types for exactly what you need and map actor output to those types.

### Anti-Pattern 3: Promise.all with triggerAndWait

**What people do:** Use `Promise.all([task1.triggerAndWait(...), task2.triggerAndWait(...)])` to run child tasks in parallel within Trigger.dev.
**Why it's wrong:** Trigger.dev explicitly warns against this. It can cause the parent task to become stuck because the checkpoint/restore mechanism doesn't handle concurrent wait points correctly.
**Do this instead:** Use `batch.triggerByTaskAndWait([...])` which is the official pattern for triggering multiple different tasks in parallel and waiting for all results.

### Anti-Pattern 4: Polling Supabase for Progress

**What people do:** Set up a `setInterval` in the frontend that polls GET /api/status/[id] every 2 seconds to check if the analysis is done.
**Why it's wrong:** Creates unnecessary load on Supabase and the API. On Vercel free tier, each poll is a serverless function invocation. 30 polls per minute per active analysis adds up.
**Do this instead:** Use `@trigger.dev/react-hooks` `useRealtimeRun(runId)` for real-time updates via Electric SQL (no polling). Fall back to polling only if Trigger.dev Realtime is unavailable, with a 10-second interval minimum.

### Anti-Pattern 5: Monolithic Synthesis Prompt

**What people do:** Dump all competitor data, all viral content, all transcripts into a single massive Gemini prompt and ask for everything at once.
**Why it's wrong:** Gemini has context window limits. A single prompt with 4 competitors x 7 data sources + 10 viral transcripts can easily exceed token limits. The response quality degrades with prompt size. If the call fails, you lose everything.
**Do this instead:** Structure synthesis as multiple focused Gemini calls: (1) market overview from site/SEO data, (2) social strategy from social data, (3) ad analysis from ads data, (4) viral pattern analysis from transcripts, (5) final recommendations aggregating the sub-analyses. Each call is smaller, more focused, and independently retryable.

## Integration Points

### External Services

| Service | Integration Pattern | Rate Limits / Gotchas |
|---------|---------------------|------------------------|
| **Apify** | `apify-client` npm package. `.actor(id).call(input, options)` starts actor and waits for completion. `.dataset(id).listItems()` fetches results. | Free tier: limited compute units. Each actor run consumes CUs based on memory and time. Some actors (SimilarWeb) are slower. Set timeouts per actor. |
| **Gemini API** | `@google/generative-ai` SDK. `model.generateContent(prompt)` for text generation. Use `gemini-2.0-flash` for speed. | Free tier: 15 RPM, 1M TPM, 1500 RPD. Flash model is fast but less capable than Pro for complex reasoning. Structure prompts carefully. |
| **AssemblyAI** | `assemblyai` npm SDK. `client.transcripts.transcribe({ audio_url })` sends URL and polls until complete. | Free tier: limited hours. Transcription time approximately 0.5x real-time. Use `submit()` + webhook for better efficiency in production, but `transcribe()` (polling) is simpler and fine for MVP volume. |
| **Bunny Storage** | Raw REST API (no official SDK). PUT for upload, GET for download, DELETE for cleanup. Auth via `AccessKey` header. | No rate limits for storage operations. CDN has bandwidth limits on free trial. Storage zone name and API key are separate from CDN pull zone. |
| **Supabase** | `@supabase/supabase-js` client. Use service role key for Trigger.dev tasks (server-side). Use anon key for frontend (read-only, no RLS needed since no auth). | Free tier: 500MB database, 1GB file storage (not using Supabase storage), 2GB bandwidth. Connection pooling recommended for Trigger.dev tasks hitting DB concurrently. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Frontend <-> API | HTTP (fetch). JSON request/response. | Keep payloads small. Analysis ID + run ID is all frontend needs from POST /api/analyze. |
| API <-> Trigger.dev | `tasks.trigger()` SDK call from route handler. Returns run handle. | Route handler must NOT use `triggerAndWait` -- it would timeout on Vercel. Fire-and-forget only. |
| Trigger.dev <-> lib/ | Direct function import. Tasks call lib/ functions synchronously within their execution context. | lib/ functions are pure service wrappers. They throw on errors, tasks handle retries. |
| Trigger.dev <-> Supabase | Service role client. Tasks write results incrementally as each extraction completes. | Use upsert for idempotency. If a task retries, it should overwrite, not duplicate. |
| Trigger.dev <-> Frontend | Realtime API via `useRealtimeRun`. Metadata changes propagate automatically. | Frontend needs the `runId` returned from POST /api/analyze. Store it alongside the analysis ID. |

## Build Order (Dependencies)

The following build order respects component dependencies. Each phase can only function if the previous phase's components exist.

```
Phase 1: Foundation
  - Project setup (Next.js, TypeScript, Tailwind, ESLint, Vitest)
  - Supabase: schema migrations, client setup, typed queries
  - Config layer (env validation with zod)
  - Type definitions (analysis, competitor, viral, database)
  WHY FIRST: Everything depends on types, database, and config.

Phase 2: AI Understanding + Input
  - lib/ai/understand.ts (Gemini input interpretation)
  - lib/ai/prompts.ts (prompt templates)
  - Homepage component (input form)
  - POST /api/analyze route (validate -> understand -> create record)
  WHY SECOND: This is the entry point. Nothing else triggers without it.

Phase 3: Orchestration Skeleton
  - Trigger.dev config (trigger.config.ts)
  - analyze-market orchestrator task (fan-out stub)
  - GET /api/status/[id] route
  - Dashboard page with progress display
  WHY THIRD: Establishes the async processing pattern. Sub-tasks are stubs initially.

Phase 4: Data Extraction
  - lib/apify/* wrappers (one per actor)
  - extract-competitors task (calls apify wrappers, saves to Supabase)
  - extract-viral task (calls apify, downloads media)
  - lib/storage/bunny.ts (upload/download)
  WHY FOURTH: Depends on orchestration skeleton and database. Can be built incrementally (one actor at a time).

Phase 5: Transcription + Synthesis
  - lib/transcription/transcribe.ts (AssemblyAI)
  - transcribe-video sub-task
  - lib/ai/synthesize.ts + lib/ai/creative.ts
  - synthesize task
  WHY FIFTH: Depends on extracted data existing in Supabase and media in Bunny.

Phase 6: Dashboard + Polish
  - Full dashboard components (competitor cards, viral content, recommendations)
  - History page
  - PDF report generation (lib/pdf/generate.ts, GET /api/report/[id])
  - Cache-first logic in /api/analyze
  - Error states, loading skeletons, responsive design
  WHY LAST: Presentation layer. Needs all data to exist in the database.
```

## Sources

- [Trigger.dev - How it Works](https://trigger.dev/docs/how-it-works) - Durable execution, checkpoint/restore architecture
- [Trigger.dev - Triggering](https://trigger.dev/docs/triggering) - triggerAndWait, batchTriggerAndWait, batch.triggerByTaskAndWait patterns
- [Trigger.dev - Realtime Overview](https://trigger.dev/docs/realtime/overview) - useRealtimeRun hook, metadata streaming
- [Trigger.dev - Batch Processing](https://trigger.dev/launchweek/0/batch-processing) - Fan-out pattern best practices
- [Trigger.dev Deep Dive (Vadim's Blog)](https://vadim.blog/trigger-dev-deep-dive) - Queue fan-out, MCP, real-world patterns
- [Apify - Parallel Actor Runs](https://docs.apify.com/academy/node-js/multiple-runs-scrape) - Orchestrator pattern for multiple scrapers
- [Apify - Run Actor via API](https://docs.apify.com/academy/api/run-actor-and-retrieve-data-via-api) - apify-client .call() pattern
- [AssemblyAI - Webhooks](https://www.assemblyai.com/docs/deployment/webhooks) - Async transcription patterns
- [AssemblyAI - Transcribe API](https://www.assemblyai.com/docs/api-reference/transcripts/submit) - URL-based transcription
- [Bunny Storage API Reference](https://docs.bunny.net/reference/storage-api) - REST upload/download/delete
- [Supabase - Realtime Architecture](https://supabase.com/docs/guides/realtime/architecture) - Phoenix channels, WebSocket subscriptions
- [Supabase - Realtime with Next.js](https://supabase.com/docs/guides/realtime/realtime-with-nextjs) - Integration patterns
- [Web Scraping Architecture Patterns (2026)](https://use-apify.com/blog/web-scraping-architecture-patterns) - Pipeline evolution patterns

---
*Architecture research for: LupAI Marketing Intelligence Platform*
*Researched: 2026-03-27*
