---
phase: 06-viral-content-transcription
plan: 01
subsystem: database, types, validation
tags: [zod, supabase, apify, gemini, typescript, viral-content, transcription]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: "Base types (ViralContent, EngagementMetrics, HookBodyCta), Supabase queries, Apify config, extractionSchemas"
  - phase: 05-ads-intelligence
    provides: "Zod schema patterns (metaAdsDataSchema, gmbDataSchema), validateOrNull pattern"
provides:
  - "ViralVideoCandidate, ViralPatterns, HookPattern, BodyStructure, CtaPattern, RecurringFormula types"
  - "DB migration adding caption, creator_handle, duration_seconds, post_date to viral_content and viral_patterns to analyses"
  - "Zod schemas: engagementMetricsSchema, viralVideoCandidateSchema, hookBodyCtaSchema, viralPatternsSchema"
  - "Query functions: updateViralContent, updateAnalysisViralPatterns"
  - "Gemini prompts: HBC_EXTRACTION_PROMPT, VIRAL_PATTERNS_PROMPT"
  - "Fixtures: tiktok-viral.json, instagram-viral.json, hbc-extraction.json, viral-patterns.json"
  - "Apify actor IDs: viralTiktok, viralInstagram"
affects: [06-viral-content-transcription, 07-synthesis, 09-dashboard]

# Tech tracking
tech-stack:
  added: []
  patterns: ["ViralPatterns JSONB column on analyses for cross-video pattern storage", "ViralVideoCandidate as pre-download filtering type"]

key-files:
  created:
    - "supabase/migrations/20260328200000_add_viral_fields.sql"
    - "tests/fixtures/tiktok-viral.json"
    - "tests/fixtures/instagram-viral.json"
    - "tests/fixtures/hbc-extraction.json"
    - "tests/fixtures/viral-patterns.json"
  modified:
    - "src/types/viral.ts"
    - "src/types/analysis.ts"
    - "src/types/database.ts"
    - "src/config/apify.ts"
    - "src/lib/validation/extractionSchemas.ts"
    - "src/lib/supabase/queries.ts"
    - "src/lib/ai/prompts.ts"
    - "tests/fixtures/factories.ts"
    - "tests/unit/analyze-route.test.ts"
    - "tests/unit/confirm-competitors-route.test.ts"

key-decisions:
  - "ViralPatterns stored as JSONB on analyses table (not separate table) for simpler queries"
  - "ViralVideoCandidate as intermediate type between raw Apify output and DB-stored ViralContent"
  - "HBC and viral patterns prompts both enforce JSON-only responses in PT-BR"

patterns-established:
  - "Cross-video pattern analysis stored at analysis level (not per-video)"
  - "Pre-download filtering type (ViralVideoCandidate) separates scraping from storage"

requirements-completed: [VIRL-01, VIRL-02, VIRL-03, TRNS-01, TRNS-02, TRNS-03]

# Metrics
duration: 6min
completed: 2026-03-28
---

# Phase 06 Plan 01: Viral Content Foundation Summary

**Extended type system with ViralPatterns/ViralVideoCandidate, DB migration, Zod schemas, query functions, Gemini prompts, and 4 fixture files for viral content pipeline**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-28T14:48:29Z
- **Completed:** 2026-03-28T14:54:57Z
- **Tasks:** 2
- **Files modified:** 15

## Accomplishments
- Extended ViralContent type with caption, creatorHandle, durationSeconds, postDate fields and added ViralVideoCandidate, ViralPatterns types with full sub-type hierarchy
- Created DB migration adding 4 columns to viral_content and viral_patterns JSONB to analyses
- Added 4 Zod schemas (engagementMetrics, viralVideoCandidate, hookBodyCta, viralPatterns) for downstream validation
- Added updateViralContent and updateAnalysisViralPatterns query functions with row mapper updates
- Created HBC_EXTRACTION_PROMPT and VIRAL_PATTERNS_PROMPT for Gemini structured output
- Created 4 fixture files with realistic PT-BR dental niche data including edge cases (duration>240s, isAd, Sidecar type)

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend types, DB migration, config, Zod schemas, and queries** - `02ee320` (feat)
2. **Task 2: Create Gemini prompts and all fixture files** - `6ce5146` (feat)

## Files Created/Modified
- `src/types/viral.ts` - Added ViralVideoCandidate, ViralPatterns, HookPattern, BodyStructure, CtaPattern, RecurringFormula types; extended ViralContent and ViralContentInput
- `src/types/analysis.ts` - Added viralPatterns field to Analysis interface
- `src/types/database.ts` - Added viral_patterns to analyses and caption/creator_handle/duration_seconds/post_date to viral_content table types
- `supabase/migrations/20260328200000_add_viral_fields.sql` - ALTER TABLE for new columns
- `src/config/apify.ts` - Added viralTiktok and viralInstagram actor IDs
- `src/lib/validation/extractionSchemas.ts` - Added engagementMetricsSchema, viralVideoCandidateSchema, hookBodyCtaSchema, viralPatternsSchema
- `src/lib/supabase/queries.ts` - Added updateViralContent, updateAnalysisViralPatterns; updated createViralContent and mappers
- `src/lib/ai/prompts.ts` - Added HBC_EXTRACTION_PROMPT and VIRAL_PATTERNS_PROMPT
- `tests/fixtures/tiktok-viral.json` - 7-item TikTok hashtag scraper mock with edge cases
- `tests/fixtures/instagram-viral.json` - 6-item Instagram hashtag scraper mock with Sidecar edge case
- `tests/fixtures/hbc-extraction.json` - Gemini HBC response mock
- `tests/fixtures/viral-patterns.json` - Gemini cross-video patterns response mock
- `tests/fixtures/factories.ts` - Updated createAnalysis and createViralContent factories with new fields
- `tests/unit/analyze-route.test.ts` - Added viralPatterns to inline mock
- `tests/unit/confirm-competitors-route.test.ts` - Added viralPatterns to inline mock

## Decisions Made
- ViralPatterns stored as JSONB on analyses table rather than a separate table, keeping the query model simple (one query returns analysis + patterns)
- ViralVideoCandidate serves as intermediate filtering type between raw Apify scraper output and DB-stored ViralContent, enabling pre-download filtering by duration, engagement, and ad status
- Both new Gemini prompts enforce JSON-only responses and PT-BR language output

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed factory and test files missing viralPatterns field**
- **Found during:** Task 1
- **Issue:** Adding viralPatterns to Analysis type broke factory functions and inline test mocks that construct Analysis objects
- **Fix:** Added `viralPatterns: null` to createAnalysis factory, createViralContent factory (for caption/creatorHandle/durationSeconds/postDate), and inline mocks in analyze-route.test.ts and confirm-competitors-route.test.ts
- **Files modified:** tests/fixtures/factories.ts, tests/unit/analyze-route.test.ts, tests/unit/confirm-competitors-route.test.ts
- **Verification:** TypeScript compilation shows 0 new errors (9 pre-existing errors in unrelated test files remain)
- **Committed in:** 02ee320 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Essential fix to maintain type safety. No scope creep.

## Issues Encountered
- 9 pre-existing TypeScript errors in analyze-market.test.ts, extract-ads.test.ts, extract-social.test.ts, and extract-website.test.ts related to destructuring patterns in array callbacks. These are out of scope for this plan and do not affect the viral content pipeline.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All types, schemas, queries, prompts, and fixtures ready for Plan 02 (Apify wrappers + Bunny + AssemblyAI + Gemini functions)
- All types, schemas, queries, prompts, and fixtures ready for Plan 03 (compound Trigger.dev task)
- DB migration ready to apply on Supabase

## Self-Check: PASSED

All 13 files verified as present. Both commits (02ee320, 6ce5146) found in git log.

---
*Phase: 06-viral-content-transcription*
*Completed: 2026-03-28*
