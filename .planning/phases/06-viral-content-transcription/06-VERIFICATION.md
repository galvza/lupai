---
phase: 06-viral-content-transcription
verified: 2026-03-28T12:20:00Z
status: passed
score: 4/4 success criteria verified
re_verification: false
human_verification:
  - test: "Run a real analysis and confirm viral videos appear in Supabase viral_content with bunny_url, transcription, and hook_body_cta fields populated"
    expected: "viral_content rows have non-null bunny_url (CDN URL), transcription text, and hookBodyCta JSON after extract-viral task completes"
    why_human: "Requires live Apify, Bunny, AssemblyAI, and Gemini API credentials — cannot verify against real services programmatically"
  - test: "Confirm AssemblyAI transcription accepts Bunny CDN URLs"
    expected: "transcribeVideo() accepts the Bunny CDN URL format and returns non-empty TranscriptionResult"
    why_human: "Requires live AssemblyAI credentials and a real Bunny CDN URL to test"
---

# Phase 6: Viral Content & Transcription Verification Report

**Phase Goal:** Viral niche content is discovered, downloaded, transcribed, and structurally analyzed
**Verified:** 2026-03-28T12:20:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (from ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Viral content is discovered across TikTok and Instagram for the niche (niche-wide, not limited to competitors; Facebook deferred per D-01) | VERIFIED | `searchViralTiktok` and `searchViralInstagram` in `src/lib/apify/tiktok-viral.ts` and `src/lib/apify/instagram-viral.ts` use Apify hashtag scrapers (`clockworks/tiktok-hashtag-scraper`, `apify/instagram-hashtag-scraper`) derived from niche keywords, not competitor profiles. Both are called in parallel via `Promise.allSettled` in `extract-viral.ts`. 13 tests cover filtering, sorting, and fallback behavior. |
| 2 | Viral videos are downloaded to Bunny Storage and accessible via CDN URL | VERIFIED | `downloadAndStoreVideo` in `extract-viral.ts` (line 80) builds path `viral/${analysisId}/${candidate.platform}/${paddedIndex}.mp4`, calls `uploadFile()` from `src/lib/storage/bunny.ts`, then immediately creates a `viral_content` DB record with the returned CDN URL per D-19. `DOWNLOAD_BATCH_SIZE = 5` (line 51) limits memory usage while maintaining parallelism. |
| 3 | Videos in Bunny Storage are transcribed via AssemblyAI and transcriptions are stored | VERIFIED | `transcribeVideoSafe` (line 106) calls `transcribeVideo(bunnyUrl)` from `src/lib/transcription/transcribe.ts` using the Bunny CDN URL as input per D-21. On success, `updateViralContent(id, { transcription })` persists the text. Batched at 5 with 2s delay for AssemblyAI rate limits. |
| 4 | AI identifies hook, body, and CTA structure in each transcribed video and the breakdown is stored per video | VERIFIED | `extractHbcSafe` (line 128) calls `extractHookBodyCta(transcription, durationSeconds)` from `src/lib/ai/hbc-extraction.ts` which calls Gemini with `HBC_EXTRACTION_PROMPT` and validates the response against `hookBodyCtaSchema`. On success, `updateViralContent(id, { hookBodyCta })` persists the structured breakdown per D-27. Cross-video pattern detection additionally runs via `detectViralPatterns` when >= 2 transcriptions exist (D-30, D-48). |

**Score:** 4/4 success criteria verified

### Required Artifacts

#### Plan 01: Foundation

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/types/viral.ts` | ViralContent, ViralVideoCandidate, ViralPatterns, HookBodyCta, EngagementMetrics, ContentPlatform types | VERIFIED | All types confirmed present. `ViralPatterns` (line 90+) includes hookPatterns, bodyStructures, ctaPatterns, dominantTone, bestPerformingDuration, recurringFormulas. `ViralVideoCandidate` (line 53+) is the pre-download intermediate type. |
| `supabase/migrations/20260328200000_add_viral_fields.sql` | DB schema extension for viral fields | VERIFIED | ALTER TABLE adds caption, creator_handle, duration_seconds, post_date to viral_content; adds viral_patterns JSONB to analyses. |
| `src/lib/validation/extractionSchemas.ts` | Zod schemas for viral data | VERIFIED | engagementMetricsSchema (line 149), viralVideoCandidateSchema (line 158), hookBodyCtaSchema (line 169), viralPatternsSchema (line 204), validateOrNull (line 87) all confirmed. |
| `src/lib/supabase/queries.ts` | updateViralContent and updateAnalysisViralPatterns queries | VERIFIED | createViralContent (line 151), updateViralContent (line 202), updateAnalysisViralPatterns (line 223) all confirmed. |
| `tests/fixtures/tiktok-viral.json` | TikTok hashtag scraper mock output | VERIFIED | File exists with 7 items including edge cases (duration > 240s, isAd = true). |
| `tests/fixtures/instagram-viral.json` | Instagram hashtag scraper mock output | VERIFIED | File exists with 6 items including Sidecar type edge case. |
| `tests/fixtures/hbc-extraction.json` | Gemini HBC response mock | VERIFIED | File exists. |
| `tests/fixtures/viral-patterns.json` | Gemini cross-video patterns response mock | VERIFIED | File exists. |
| `src/lib/ai/prompts.ts` | HBC_EXTRACTION_PROMPT and VIRAL_PATTERNS_PROMPT | VERIFIED | Both constants confirmed at lines 47 and 63, both enforce JSON-only responses in PT-BR. |
| `src/config/apify.ts` | viralTiktok and viralInstagram actor IDs | VERIFIED | viralTiktok: 'clockworks/tiktok-hashtag-scraper' (line 27), viralInstagram: 'apify/instagram-hashtag-scraper' (line 28). |

#### Plan 02: Library Modules

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/apify/tiktok-viral.ts` | searchViralTiktok with 3-tier D-40 fallback | VERIFIED | 162 lines. Exports: calculateEngagementRate, deriveHashtags, mapTiktokItem, filterAndSortCandidates, searchViralTiktok. Filters isAd (line 46) and duration > 240 (line 50). 3-tier fallback: primary hashtags -> broader niche word -> empty array. |
| `src/lib/apify/instagram-viral.ts` | searchViralInstagram, Video-only filter | VERIFIED | 75 lines. Exports: mapInstagramItem, searchViralInstagram. Filters type !== 'Video' (line 16), Math.max for hidden likes (line 30). Imports shared utilities from tiktok-viral.ts. |
| `src/lib/ai/hbc-extraction.ts` | extractHookBodyCta via Gemini | VERIFIED | 49 lines. Exports: extractHookBodyCta. Imports HBC_EXTRACTION_PROMPT (line 6), hookBodyCtaSchema (line 5), validateOrNull (line 5). Returns null for empty transcription (early return). |
| `src/lib/ai/viral-patterns.ts` | detectViralPatterns via single Gemini batch | VERIFIED | 60 lines. Exports: PatternDetectionInput interface, detectViralPatterns. Imports VIRAL_PATTERNS_PROMPT (line 6), viralPatternsSchema (line 5). Returns null when inputs.length < 2 (line 29). |
| `tests/unit/tiktok-viral.test.ts` | 10+ tests for TikTok wrapper | VERIFIED | 13 tests covering mapTiktokItem, filterAndSortCandidates, calculateEngagementRate, searchViralTiktok, deriveHashtags, D-40 fallback. |
| `tests/unit/instagram-viral.test.ts` | 7 tests for Instagram wrapper | VERIFIED | 7 tests covering mapInstagramItem, searchViralInstagram, hidden likes, empty results. |
| `tests/unit/hbc-extraction.test.ts` | 7 tests for HBC extraction | VERIFIED | 7 tests covering valid extraction, empty transcription, invalid JSON, schema validation, duration context, model name. |
| `tests/unit/viral-patterns.test.ts` | 8 tests for pattern detection | VERIFIED | 8 tests covering valid detection, < 2 inputs guard, batch call verification, invalid JSON, metadata context, model name. |

#### Plan 03: Compound Task

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/trigger/extract-viral.ts` | Full 6-stage compound task (min 100 lines) | VERIFIED | 400 lines. Exports: ExtractViralPayload, ExtractViralResult, extractViral task. maxDuration: 300, retry: maxAttempts: 2. Stub text completely removed. All 6 stages implemented. |
| `tests/unit/extract-viral.test.ts` | 10+ tests for compound task (min 80 lines) | VERIFIED | 411 lines, 10 test cases covering full success, platform failures, download failures, transcription failures, HBC failures, < 2 transcriptions guard, progress metadata, Bunny path format, DB record timing. |

### Key Link Verification

#### Plan 02 Key Links

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/lib/apify/tiktok-viral.ts` | `src/config/apify.ts` | APIFY_ACTORS.viralTiktok | WIRED | `APIFY_ACTORS.viralTiktok` used at line 105 via import from `@/config/apify` (line 3). |
| `src/lib/apify/instagram-viral.ts` | `src/config/apify.ts` | APIFY_ACTORS.viralInstagram | WIRED | `APIFY_ACTORS.viralInstagram` used at line 55 via import from `@/config/apify` (line 3). |
| `src/lib/ai/hbc-extraction.ts` | `src/lib/ai/prompts.ts` | HBC_EXTRACTION_PROMPT import | WIRED | `import { HBC_EXTRACTION_PROMPT } from './prompts'` at line 6; used in generateContent call at line 34. |
| `src/lib/ai/viral-patterns.ts` | `src/lib/ai/prompts.ts` | VIRAL_PATTERNS_PROMPT import | WIRED | `import { VIRAL_PATTERNS_PROMPT } from './prompts'` at line 6; used in generateContent call at line 45. |

#### Plan 03 Key Links

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/trigger/extract-viral.ts` | `src/lib/apify/tiktok-viral.ts` | searchViralTiktok import | WIRED | `import { searchViralTiktok } from '@/lib/apify/tiktok-viral'` at line 3; called at line 201. |
| `src/trigger/extract-viral.ts` | `src/lib/apify/instagram-viral.ts` | searchViralInstagram import | WIRED | `import { searchViralInstagram } from '@/lib/apify/instagram-viral'` at line 4; called at line 202. |
| `src/trigger/extract-viral.ts` | `src/lib/storage/bunny.ts` | uploadFile import | WIRED | `import { uploadFile } from '@/lib/storage/bunny'` at line 6; called at line 82. |
| `src/trigger/extract-viral.ts` | `src/lib/transcription/transcribe.ts` | transcribeVideo import | WIRED | `import { transcribeVideo } from '@/lib/transcription/transcribe'` at line 7; called at line 110. |
| `src/trigger/extract-viral.ts` | `src/lib/ai/hbc-extraction.ts` | extractHookBodyCta import | WIRED | `import { extractHookBodyCta } from '@/lib/ai/hbc-extraction'` at line 8; called at line 129. |
| `src/trigger/extract-viral.ts` | `src/lib/ai/viral-patterns.ts` | detectViralPatterns import | WIRED | `import { detectViralPatterns, type PatternDetectionInput } from '@/lib/ai/viral-patterns'` at line 9; called at line 366. |
| `src/trigger/extract-viral.ts` | `src/lib/supabase/queries.ts` | createViralContent import | WIRED | `import { createViralContent, updateViralContent, updateAnalysisViralPatterns }` at lines 10-14; all three called (lines 84, 301, 339, 369). |
| `src/trigger/analyze-market.ts` | `src/trigger/extract-viral.ts` | extractViral task dispatch | WIRED | `import { extractViral } from './extract-viral'` at line 7 in orchestrator; dispatched in Batch 1 at line 165. |

### Data-Flow Trace (Level 4)

Data-flow for the compound task pipeline:

| Stage | Data Variable | Source | Produces Real Data | Status |
|-------|--------------|--------|--------------------|--------|
| Discover | `candidates: ViralVideoCandidate[]` | Apify actor runs via `searchViralTiktok`/`searchViralInstagram` | Yes — real Apify actor calls with `client.actor().call()` + `dataset.listItems()` | FLOWING |
| Download | `downloadedRecords: ViralContent[]` | `fetch(candidate.videoUrl)` -> `uploadFile()` -> `createViralContent()` | Yes — DB records created immediately per D-19 | FLOWING |
| Transcribe | `transcription: string` | `transcribeVideo(bunnyUrl)` -> AssemblyAI SDK -> `updateViralContent` | Yes — Bunny CDN URL passed to AssemblyAI, result stored in DB | FLOWING |
| HBC | `hookBodyCta: HookBodyCta` | `extractHookBodyCta(transcription)` -> Gemini `generateContent` -> `updateViralContent` | Yes — Gemini call with structured schema, result stored per video | FLOWING |
| Patterns | `patterns: ViralPatterns` | `detectViralPatterns(inputs)` -> single Gemini batch call -> `updateAnalysisViralPatterns` | Yes — all transcriptions sent in one call, patterns stored on analyses row | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| All Phase 6 tests pass (46 total) | `npx vitest run tests/unit/tiktok-viral.test.ts tests/unit/instagram-viral.test.ts tests/unit/hbc-extraction.test.ts tests/unit/viral-patterns.test.ts tests/unit/extract-viral.test.ts` | 5 test files, 46 tests — all passed in 372ms | PASS |
| No TypeScript errors in src/ | `npx tsc --noEmit 2>&1 \| grep "src/"` | No output — zero errors in src/ files | PASS |
| extract-viral stub replaced | `grep "Stub - Phase 6" src/trigger/extract-viral.ts` | No matches — stub completely replaced | PASS |
| extractViral wired in orchestrator | `grep "extractViral" src/trigger/analyze-market.ts` | Found at lines 7 (import) and 165 (dispatch in Batch 1) | PASS |

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|-------------|----------------|-------------|--------|----------|
| VIRL-01 | 06-01, 06-02, 06-03 | System searches for viral content in the niche across TikTok, Instagram (Facebook deferred per D-01) | SATISFIED | `searchViralTiktok` and `searchViralInstagram` search niche-wide via hashtag scrapers, not limited to competitors. Both called in extract-viral.ts Stage 1. |
| VIRL-02 | 06-01, 06-03 | System downloads viral videos to Bunny Storage for transcription | SATISFIED | `downloadAndStoreVideo` in extract-viral.ts fetches video buffer, uploads to `viral/{analysisId}/{platform}/{NN}.mp4` via `uploadFile()`, stores CDN URL in DB. |
| VIRL-03 | 06-01, 06-02, 06-03 | Results display viral content gallery with engagement metrics | HUMAN NEEDED / DEFERRED | Phase 6 CONTEXT explicitly states "Frontend/UI components are out of scope." User memory `feedback_skip_frontend.md` confirms all frontend deferred to user-built design system. Backend data (viral_content records with engagement metrics) is available in Supabase for frontend consumption. Display implementation is Phase 9 scope. |
| TRNS-01 | 06-01, 06-03 | System transcribes viral videos using Assembly AI | SATISFIED | `transcribeVideo(bunnyUrl)` in `src/lib/transcription/transcribe.ts` called for all downloaded videos; transcription stored via `updateViralContent`. |
| TRNS-02 | 06-01, 06-02, 06-03 | AI identifies hook, body, and CTA structure in each transcribed video | SATISFIED | `extractHookBodyCta(transcription, durationSeconds)` sends each transcription to Gemini with `HBC_EXTRACTION_PROMPT` and `hookBodyCtaSchema`; result stored as hookBodyCta per video via `updateViralContent`. |
| TRNS-03 | 06-01, 06-02, 06-03 | Results display transcription with hook/body/CTA breakdown per video | HUMAN NEEDED / DEFERRED | Same as VIRL-03 — frontend display is explicitly out of scope for Phase 6 per CONTEXT.md and user memory. hookBodyCta data is stored in DB per video and ready for Phase 9 dashboard consumption. |

**Note on VIRL-03 and TRNS-03:** REQUIREMENTS.md maps these to Phase 6 and marks them complete, but Phase 6 CONTEXT.md explicitly excludes frontend/display work, and the user's memory rule (`feedback_skip_frontend.md`) confirms all frontend is deferred. The ROADMAP success criteria for Phase 6 contain zero display requirements — they are purely backend. These requirements will be fulfilled in Phase 9 (dashboard). The backend data layer needed by VIRL-03 and TRNS-03 is fully in place.

### Anti-Patterns Found

No blockers or warnings found.

| File | Pattern | Severity | Assessment |
|------|---------|----------|------------|
| All implementation files | No TODO, FIXME, placeholder, or stub patterns detected | — | Clean |
| `src/trigger/extract-viral.ts` | `return []` and `return null` exist but are intentional pipeline fallbacks (D-18, D-24, D-29, D-48) for graceful degradation, not stubs | — | Not a stub — all cases have real upstream data sources |

### Human Verification Required

#### 1. End-to-End Pipeline with Live APIs

**Test:** Trigger a real analysis for a niche (e.g., "odontologia estetica"). Observe the extract-viral Trigger.dev task run to completion.
**Expected:** viral_content rows in Supabase have: non-null bunny_url (Bunny CDN URL), non-null transcription text, non-null hook_body_cta JSON; analyses row has non-null viral_patterns JSONB.
**Why human:** Requires live credentials for APIFY_API_TOKEN, BUNNY_STORAGE_API_KEY, ASSEMBLY_AI_API_KEY, GEMINI_API_KEY, and NEXT_PUBLIC_SUPABASE_URL — cannot verify against real services programmatically without these.

#### 2. AssemblyAI Accepts Bunny CDN URLs

**Test:** Call `transcribeVideo(bunnyUrl)` with a real Bunny CDN URL from a downloaded viral video.
**Expected:** Returns `TranscriptionResult` with non-empty `text` field.
**Why human:** Requires a real Bunny CDN URL and AssemblyAI API key to verify the integration end-to-end. The code passes the URL correctly (line 110) but the external service acceptance can only be confirmed live.

### Gaps Summary

No gaps found. All 4 ROADMAP success criteria are verified with substantive, wired, and flowing implementations.

VIRL-03 and TRNS-03 (display requirements) are intentionally deferred to Phase 9 per Phase 6 context scope and user preference. The backend data required by these requirements is fully implemented — viral_content records with engagement metrics, transcriptions, and hookBodyCta are all stored in Supabase and ready for the frontend to consume.

---

_Verified: 2026-03-28T12:20:00Z_
_Verifier: Claude (gsd-verifier)_
