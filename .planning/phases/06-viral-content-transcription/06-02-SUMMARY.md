---
phase: 06-viral-content-transcription
plan: 02
subsystem: api
tags: [apify, gemini, tiktok, instagram, viral-content, hbc, pattern-detection, zod]

# Dependency graph
requires:
  - phase: 06-viral-content-transcription/01
    provides: Types (ViralVideoCandidate, HookBodyCta, ViralPatterns), Zod schemas, Gemini prompts, Apify actor config
provides:
  - searchViralTiktok with 3-tier D-40 fallback (primary hashtags, broader niche, empty array)
  - searchViralInstagram filtering Videos only, duration <= 240s, top 5 by engagement
  - extractHookBodyCta for per-video HBC extraction via Gemini with Zod validation
  - detectViralPatterns for cross-video pattern detection via single Gemini batch call
  - calculateEngagementRate, deriveHashtags, filterAndSortCandidates shared utilities
affects: [06-viral-content-transcription/03, 07-synthesis-recommendations]

# Tech tracking
tech-stack:
  added: []
  patterns: [apify-hashtag-search-with-fallback, gemini-batch-analysis, engagement-rate-sorting]

key-files:
  created:
    - src/lib/apify/tiktok-viral.ts
    - src/lib/apify/instagram-viral.ts
    - src/lib/ai/hbc-extraction.ts
    - src/lib/ai/viral-patterns.ts
    - tests/unit/tiktok-viral.test.ts
    - tests/unit/instagram-viral.test.ts
    - tests/unit/hbc-extraction.test.ts
    - tests/unit/viral-patterns.test.ts
  modified: []

key-decisions:
  - "instagram-viral.ts imports calculateEngagementRate, deriveHashtags, filterAndSortCandidates from tiktok-viral.ts to avoid duplication"
  - "TikTok D-40 fallback: primary combined hashtags -> broader single niche word -> empty array (never throws)"
  - "detectViralPatterns requires minimum 2 transcriptions (D-48) to have meaningful cross-video comparison"

patterns-established:
  - "Apify hashtag search pattern: derive hashtags -> call actor -> map items -> filter invalid -> sort by engagement -> top N"
  - "Gemini batch analysis: send all inputs in single call for cross-item pattern detection"
  - "Never-throw viral search: TikTok returns [] on all failures, Instagram throws only on unexpected errors"

requirements-completed: [VIRL-01, TRNS-02]

# Metrics
duration: 4min
completed: 2026-03-28
---

# Phase 06 Plan 02: Viral Library Modules Summary

**TikTok/Instagram viral search Apify wrappers + Gemini HBC extraction and cross-video pattern detection with 36 tests**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-28T14:57:25Z
- **Completed:** 2026-03-28T15:01:30Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- TikTok viral search with 3-tier fallback (primary hashtags, broader niche, graceful empty) filtering ads, duration > 240s
- Instagram viral search filtering non-Video types, hidden likes (-1 as 0), duration > 240s, top 5 by engagement rate
- Per-video HBC extraction via Gemini with Zod schema validation, null for empty transcriptions
- Cross-video pattern detection via single Gemini batch call, minimum 2 transcriptions threshold
- 36 unit tests covering happy paths, edge cases, filtering, sorting, and error handling

## Task Commits

Each task was committed atomically:

1. **Task 1: TikTok and Instagram viral search Apify wrappers with tests** - `9133698` (feat)
2. **Task 2: Gemini HBC extraction and cross-video pattern detection with tests** - `74a4928` (feat)

## Files Created/Modified
- `src/lib/apify/tiktok-viral.ts` - TikTok viral hashtag search with D-40 3-tier fallback, mapping, filtering, engagement sorting
- `src/lib/apify/instagram-viral.ts` - Instagram viral hashtag search, Video-only filter, hidden likes handling
- `src/lib/ai/hbc-extraction.ts` - Per-video Hook/Body/CTA extraction via Gemini with Zod validation
- `src/lib/ai/viral-patterns.ts` - Cross-video pattern detection via batch Gemini call with 2-input minimum
- `tests/unit/tiktok-viral.test.ts` - 10 tests: mapping, filtering ads/duration, engagement rate, hashtag derivation, D-40 fallback
- `tests/unit/instagram-viral.test.ts` - 7 tests: mapping, type filtering, hidden likes, empty results
- `tests/unit/hbc-extraction.test.ts` - 7 tests: valid extraction, empty transcription, invalid JSON, schema validation
- `tests/unit/viral-patterns.test.ts` - 8 tests: valid detection, < 2 inputs, batch call verification, metadata context

## Decisions Made
- instagram-viral.ts imports shared utilities from tiktok-viral.ts (calculateEngagementRate, deriveHashtags, filterAndSortCandidates) to avoid code duplication
- TikTok search never throws -- returns empty array on all failures (D-40 tier 3)
- detectViralPatterns requires minimum 2 transcriptions for meaningful comparison (D-48)

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None - all 4 library modules are fully implemented with real logic.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 4 library modules ready for Plan 03 compound task orchestration
- searchViralTiktok and searchViralInstagram provide ViralVideoCandidate[] for download pipeline
- extractHookBodyCta ready for per-video transcription analysis
- detectViralPatterns ready for cross-video synthesis after transcription batch

---
*Phase: 06-viral-content-transcription*
*Completed: 2026-03-28*
