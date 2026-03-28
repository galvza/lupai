# Phase 6: Viral Content & Transcription - Context

**Gathered:** 2026-03-28 (auto mode)
**Status:** Ready for planning

<domain>
## Phase Boundary

Discover viral niche content across TikTok and Instagram (niche-wide, not competitor-specific), download videos to Bunny Storage, transcribe via AssemblyAI, extract per-video hook/body/CTA structure with Gemini, and run cross-video pattern detection across all transcriptions. Frontend/UI components are out of scope — backend extraction and analysis only. Script generation (CRTV-01-04) is deferred to Phase 7.

</domain>

<decisions>
## Implementation Decisions

### Platform Scope (User-Specified)
- **D-01:** TikTok + Instagram Reels ONLY — no Facebook for MVP (user explicitly overrides VIRL-01 which mentions Facebook)
- **D-02:** Viral search is INDEPENDENT of competitors — searches the entire niche, any creator (user-specified)
- **D-03:** Search query derived from NicheInterpreted keywords (niche + segment from Phase 2 AI understanding)

### Volume & Filtering Rules (User-Specified)
- **D-04:** Top 5 viral videos per platform = 10 total per analysis
- **D-05:** Time window: last 30 days
- **D-06:** Sort by engagement rate (likes + comments + shares relative to views)
- **D-07:** MAX 4 minutes per video — discard anything longer before download
- **D-08:** If a platform returns fewer than 5 qualifying videos, accept what's available (partial > nothing)

### Viral Discovery Method (Apify Actors)
- **D-09:** Need NEW Apify wrapper functions for hashtag/trend-based viral search — existing `scrapeInstagram()` and `scrapeTiktok()` are profile-based scrapers, NOT suitable for niche-wide viral discovery
- **D-10:** TikTok viral: Use a hashtag/keyword search Apify actor that returns trending videos by topic (e.g., `clockworks/tiktok-scraper` with keyword/hashtag input mode, or `microworlds/tiktok-search`)
- **D-11:** Instagram viral: Use a hashtag/search Apify actor for Reels discovery (e.g., `apify/instagram-hashtag-scraper` or `apify/instagram-scraper` in hashtag mode)
- **D-12:** Each actor must return: video URL (for download), caption/description, engagement metrics (views, likes, comments, shares), duration, creator handle, post date
- **D-13:** Filter actor results by: duration <= 240s, post date within last 30 days, sort by engagement rate, take top 5

### Video Download Pipeline (User-Specified)
- **D-14:** Videos MUST be downloaded to Bunny Storage first — TikTok/Instagram URLs are temporary and protected (user-specified)
- **D-15:** Download within Trigger.dev task using native `fetch()` → `Buffer` → `uploadFile()` to Bunny Storage
- **D-16:** Bunny Storage path: `viral/{analysisId}/{platform}/{videoIndex}.mp4` (e.g., `viral/abc123/tiktok/01.mp4`)
- **D-17:** After upload, store Bunny CDN URL in `bunny_url` field on `viral_content` DB record
- **D-18:** If download fails for a specific video, skip it and try next candidate — never block entire pipeline
- **D-19:** Create `viral_content` DB record immediately after successful download (before transcription)

### Transcription Flow (User-Specified)
- **D-20:** Transcribe ALL downloaded videos via AssemblyAI (user-specified: all 10)
- **D-21:** Use Bunny CDN URL as input to AssemblyAI (user-specified: Bunny URL → AssemblyAI, NOT original platform URL)
- **D-22:** Transcribe in parallel via `Promise.allSettled()` — AssemblyAI handles concurrent requests
- **D-23:** Store transcription text + duration on each `viral_content` record
- **D-24:** If transcription fails for a video, mark as null transcription and continue — video still has metadata value

### Per-Video HBC Extraction (TRNS-02)
- **D-25:** After transcription, send each video's transcription to Gemini for individual hook/body/CTA structural analysis
- **D-26:** HBC extraction identifies: hook text + timing (first N seconds), body structure (how attention is held), CTA text/call
- **D-27:** Store `HookBodyCta` on each `viral_content` record (existing type: `{ hook, body, cta, hookDurationSeconds, totalDurationSeconds }`)
- **D-28:** Run HBC extractions in parallel (batch of Gemini calls via Promise.allSettled)
- **D-29:** Videos without transcription skip HBC extraction (null hookBodyCta)

### Cross-Video Pattern Detection (User-Specified)
- **D-30:** After ALL per-video HBC extractions, send ALL transcriptions to Gemini in a SINGLE batch call (user-specified)
- **D-31:** Detect cross-video patterns (user-specified list):
  - Hook patterns (first 3 seconds) — what hooks appear across multiple videos
  - Body structure — how they hold attention
  - CTA patterns — common calls to action
  - Dominant tone of voice — informative, entertaining, aggressive, etc.
  - Average duration that performs best
  - Recurring formulas across multiple videos
- **D-32:** Output is structured JSON (not prose) — follows Phase 7 decision for structured Gemini output
- **D-33:** Store cross-video patterns as `viral_patterns` JSONB field — either new column on `analyses` table or dedicated field
- **D-34:** This output feeds directly into Phase 7 (synthesis + script generation) as the pattern foundation

### Task Structure
- **D-35:** `extract-viral` is a single compound Trigger.dev task (already dispatched in orchestrator Batch 1)
- **D-36:** Pipeline stages within task are SEQUENTIAL:
  1. **Discover** — Call TikTok + Instagram Apify actors in parallel → collect candidate videos
  2. **Filter** — Apply duration/date/engagement filters, select top 5 per platform
  3. **Download** — Download videos to Bunny Storage in parallel → create DB records
  4. **Transcribe** — Transcribe all downloaded videos in parallel via AssemblyAI
  5. **Per-video HBC** — Extract hook/body/CTA per video in parallel via Gemini
  6. **Cross-video patterns** — Single batch Gemini call with all transcriptions
- **D-37:** Task maxDuration: 180s (already set in stub — may need increase given download + transcription time)
- **D-38:** Return follows established pattern: `{ status: "success" | "partial" | "unavailable", data: { viralContent: ViralContent[], patterns: ViralPatterns | null }, reason?: string }`

### Retry & Fallback Configuration (From Error Handling Strategy)
- **D-39:** Task-level retry: `retry: { maxAttempts: 2, minTimeoutInMs: 3000, maxTimeoutInMs: 8000, factor: 2 }` (per error handling memory)
- **D-40:** TIKTOK DISCOVERY FALLBACK: Primary: hashtag/trend actor → Fallback: keyword search with broader terms → Fallback 2: return 0 TikTok videos, continue with Instagram only
- **D-41:** INSTAGRAM DISCOVERY FALLBACK: Primary: hashtag/Reels actor → Fallback: keyword search → Fallback 2: return 0 Instagram videos, continue with TikTok only
- **D-42:** VIDEO DOWNLOAD FALLBACK: Primary: fetch from source URL → Fallback: skip video, try next candidate from discovery results → Fallback 2: proceed with fewer videos
- **D-43:** TRANSCRIPTION FALLBACK: Primary: Bunny CDN URL → AssemblyAI → Fallback: try direct source URL → Fallback 2: skip video, store metadata only
- **D-44:** HBC EXTRACTION FALLBACK: Primary: Gemini HBC analysis → Fallback: store null hookBodyCta, video still has transcription value
- **D-45:** THE GOLDEN RULE: An analysis with 3 transcribed viral videos is better than a failed analysis with 0. Always produce whatever was successfully extracted.

### Data Validation
- **D-46:** Follow Phase 4 `validateOrNull` pattern for all data stages
- **D-47:** Viral content record valid if: has at least `platform` + `sourceUrl` + `engagementMetrics` (transcription and HBC may be null)
- **D-48:** Cross-video patterns valid if: has at least 2 transcriptions to compare (1 video alone = skip pattern detection)
- **D-49:** Zod schemas for: discovery actor output, engagement metrics, HBC structure, cross-video patterns

### Progress Tracking
- **D-50:** Update Trigger.dev metadata per stage: `metadata.set('viralProgress', { discover: 'completed', download: '3/10', transcribe: 'running', hbc: 'pending', patterns: 'pending' })`
- **D-51:** All error messages in PT-BR per established convention

### Claude's Discretion
- Exact Apify actor IDs and input configurations for viral discovery (research needed)
- Gemini prompt design for per-video HBC extraction
- Gemini prompt design for cross-video pattern detection batch call
- ViralPatterns type structure (JSON schema for cross-video patterns output)
- Whether to add `viral_patterns` column to `analyses` table or store on existing field
- Video file naming convention details in Bunny Storage
- Whether maxDuration 180s is sufficient or needs increase (depends on video sizes)
- How to handle videos that have no audio (skip transcription, keep visual metadata)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product Definition
- `PRD-LUPAI.md` — Full product requirements, viral content section, transcription requirements
- `.planning/PROJECT.md` — Constraints: Apify free tier ($5/mo), Vercel 10s timeout, AssemblyAI limits
- `CLAUDE.md` — Stack versions, folder structure, Trigger.dev job naming (kebab-case), coding conventions

### Requirements
- `.planning/REQUIREMENTS.md` — VIRL-01 (viral discovery), VIRL-02 (Bunny download), TRNS-01 (transcription), TRNS-02 (HBC analysis)
- `.planning/REQUIREMENTS.md` — VIRL-03, TRNS-03 are frontend display requirements — SKIP per user feedback (backend only)

### Prior Phase Implementation (MUST READ)
- `src/trigger/extract-viral.ts` — Stub task to implement (has ExtractViralPayload with analysisId, niche, segment, region)
- `src/trigger/analyze-market.ts` — Orchestrator Batch 1 dispatches extractViral (line ~165)
- `src/lib/storage/bunny.ts` — Bunny Storage wrapper: uploadFile(), downloadFile(), getBunnyUrl() — ready to use
- `src/lib/transcription/transcribe.ts` — AssemblyAI wrapper: transcribeVideo(audioUrl) → { text, durationSeconds, language } — ready to use
- `src/lib/apify/tiktok.ts` — TikTok profile scraper (NOT for viral discovery — reference for Apify patterns only)
- `src/lib/apify/instagram.ts` — Instagram profile scraper (NOT for viral discovery — reference for Apify patterns only)
- `src/lib/supabase/queries.ts` — createViralContent(), getViralContentByAnalysis() — ready to use
- `src/types/viral.ts` — ViralContent, HookBodyCta, EngagementMetrics, ContentPlatform types — all defined
- `src/lib/ai/creative.ts` — generateCreativeScripts() accepts ViralContent[] with hookBodyCta — Phase 7 consumer

### Phase 4 Patterns to Follow
- `src/trigger/extract-website.ts` — Compound task pattern (multiple stages within one task)
- `src/trigger/extract-social.ts` — Parallel platform extraction pattern (Instagram + TikTok via Promise.allSettled)

### Stack Research
- `.planning/research/STACK.md` — Trigger.dev v4 task patterns, Apify client usage
- `.planning/research/PITFALLS.md` — Apify credits management, rate limits, AssemblyAI pricing

### Test Fixtures
- `tests/fixtures/assemblyai-transcription.json` — Sample transcription output (32s Portuguese dental content)
- `tests/fixtures/tiktok.json` — Sample TikTok data structure (profile-based, but useful for type reference)
- `tests/fixtures/instagram.json` — Sample Instagram data structure (profile-based)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `uploadFile(filePath, fileBuffer)` in `src/lib/storage/bunny.ts`: Uploads Buffer to Bunny Storage, returns CDN path — core of download pipeline
- `getBunnyUrl(filePath)` in `src/lib/storage/bunny.ts`: Constructs CDN URL from storage path — used for transcription input
- `transcribeVideo(audioUrl)` in `src/lib/transcription/transcribe.ts`: Full AssemblyAI integration, accepts URL, returns text + duration — ready to use
- `createViralContent()` in `src/lib/supabase/queries.ts`: Creates viral_content DB record — ready to use
- `ViralContent`, `HookBodyCta`, `EngagementMetrics` types in `src/types/viral.ts`: All fields defined including bunny_url, transcription, hookBodyCta
- Gemini AI client in `src/lib/ai/` — structured output with Zod schemas pattern established in Phase 2

### Established Patterns
- Trigger.dev compound task: multiple stages within a single task, each updating metadata for progress tracking
- Promise.allSettled for parallel independent operations (used in extract-social, extract-ads)
- Never-fail return pattern: `{ status: "success" | "partial" | "unavailable", data, reason? }`
- validateOrNull pattern from Phase 4: null raw = skip validation; non-null failing = store null with warning
- Apify calls: `client.actor(ACTOR_ID).call(input)` → `client.dataset().listItems()` → filter fields
- Error messages in PT-BR with descriptive context

### Integration Points
- `extract-viral` stub in `src/trigger/extract-viral.ts` — replace stub logic with full compound implementation
- Orchestrator at `src/trigger/analyze-market.ts` — already dispatches extractViral in Batch 1
- `viral_content` table in Supabase — schema ready (bunny_url, transcription, hook_body_cta columns exist)
- `analyses` table may need new `viral_patterns` JSONB column for cross-video pattern output
- New Apify wrapper functions needed: `searchViralTiktok()` and `searchViralInstagram()` for hashtag/trend search
- `src/lib/ai/` needs new function for HBC extraction prompt and cross-video pattern detection prompt

</code_context>

<specifics>
## Specific Ideas

- "Videos must be downloaded to Bunny Storage first, then Bunny URL sent to Assembly AI (Instagram/TikTok URLs are temporary and protected)" — user explicitly called out why direct URLs won't work
- "CROSS-VIDEO PATTERN DETECTION — send all 10 transcriptions to Gemini in a SINGLE batch" — user wants one comprehensive pattern analysis, not 10 separate ones
- "Hook patterns (first 3 seconds)" — user specified the exact hook window for detection
- "Recurring formulas across multiple videos" — cross-cutting patterns are the key deliverable, not just individual video analysis
- "Viral search is INDEPENDENT of competitors — searches the entire niche, any creator" — this is niche-level intelligence, not competitor tracking
- The existing Instagram/TikTok Apify wrappers scrape PROFILES (username-based) — Phase 6 needs TREND/HASHTAG search actors, which are fundamentally different API calls

</specifics>

<deferred>
## Deferred Ideas

- **Script generation (2-3 adapted scripts)** — User requested as Phase 6 but ROADMAP places this in Phase 7 (CRTV-01-04). Phase 6 outputs the cross-video patterns that Phase 7 uses to generate scripts. User's specific rules (hook with timing, body structure, CTA per script) are captured here and should be applied in Phase 7 context.
- **Facebook viral content** — User explicitly deferred for MVP ("TikTok + Instagram Reels ONLY, no Facebook"). Could be added post-MVP.
- **Video thumbnails to Bunny Storage** — Could store thumbnail images alongside videos for dashboard display. Not critical for backend pipeline.

</deferred>

---

*Phase: 06-viral-content-transcription*
*Context gathered: 2026-03-28*
