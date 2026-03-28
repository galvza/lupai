---
phase: 06-viral-content-transcription
plan: 03
subsystem: pipeline
tags: [trigger.dev, apify, bunny, assemblyai, gemini, viral-content, transcription, hbc]

# Dependency graph
requires:
  - phase: 06-viral-content-transcription-01
    provides: "Supabase queries, viral types, DB schema extensions"
  - phase: 06-viral-content-transcription-02
    provides: "TikTok/Instagram Apify wrappers, HBC extraction, viral patterns detection"
provides:
  - "Full extract-viral compound Trigger.dev task (6-stage pipeline)"
  - "Parallel TikTok + Instagram viral discovery"
  - "Batched video download to Bunny Storage"
  - "AssemblyAI transcription with rate limit batching"
  - "Per-video HBC extraction via Gemini"
  - "Cross-video pattern detection via Gemini batch call"
  - "Progress metadata for real-time UI tracking"
affects: [07-synthesis, 09-dashboard, analyze-market-orchestrator]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "6-stage sequential pipeline with parallel ops within each stage"
    - "DOWNLOAD_BATCH_SIZE for memory-conscious parallel downloads"
    - "discoveryPartial flag for accurate status determination"
    - "Safe wrappers (transcribeVideoSafe, extractHbcSafe) for non-throwing parallel ops"

key-files:
  created: []
  modified:
    - src/trigger/extract-viral.ts
    - tests/unit/extract-viral.test.ts

key-decisions:
  - "discoveryPartial flag tracks platform failures for accurate partial status"
  - "Download batch size 5 to limit memory while maintaining parallelism"
  - "Transcription batched at 5 with 2s delay for AssemblyAI rate limits"

patterns-established:
  - "Compound task pattern: 6-stage sequential with parallel within each"
  - "determineStatus helper with discoveryPartial for multi-source pipelines"
  - "downloadAndStoreVideo creates DB record immediately after upload (per D-19)"

requirements-completed: [VIRL-01, VIRL-02, VIRL-03, TRNS-01, TRNS-02, TRNS-03]

# Metrics
duration: 5min
completed: 2026-03-28
---

# Phase 6 Plan 3: Extract-Viral Compound Task Summary

**Full 6-stage extract-viral Trigger.dev task: discover (TikTok+Instagram), filter, download to Bunny, transcribe via AssemblyAI, HBC extraction via Gemini, cross-video pattern detection -- replacing stub**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-28T15:03:39Z
- **Completed:** 2026-03-28T15:08:47Z
- **Tasks:** 1 (TDD: RED + GREEN)
- **Files modified:** 2

## Accomplishments
- Replaced extract-viral stub with full 6-stage compound pipeline (400 lines)
- Parallel TikTok + Instagram discovery with graceful per-platform failure handling
- Batched download (5 at a time) to Bunny Storage with DB record creation per D-19
- Parallel transcription with AssemblyAI rate limit compliance (5 per batch, 2s delay)
- Parallel HBC extraction and single-batch cross-video pattern detection
- Status determination: success (all stages clean), partial (any stage had failures), unavailable (no data)
- 10 comprehensive tests covering all failure scenarios, 46 total Phase 6 tests passing

## Task Commits

Each task was committed atomically:

1. **Task 1 RED: Failing tests for extract-viral** - `140c5d0` (test)
2. **Task 1 GREEN: Full implementation + test fix** - `52c25ea` (feat)

## Files Created/Modified
- `src/trigger/extract-viral.ts` - Full 6-stage compound task replacing stub (400 lines)
- `tests/unit/extract-viral.test.ts` - 10 test cases covering success/partial/unavailable scenarios (411 lines)

## Decisions Made
- Added `discoveryPartial` flag to `determineStatus` so that if either TikTok or Instagram fails at discovery, status is always "partial" even if remaining videos all process successfully
- Download batch size set to 5 (DOWNLOAD_BATCH_SIZE) to avoid holding all 10 video buffers in memory simultaneously
- Transcription batched at 5 with 2s delay between batches to respect AssemblyAI free tier rate limit (5 streams/min)
- Safe wrappers (`transcribeVideoSafe`, `extractHbcSafe`) used for parallel operations to ensure Promise.allSettled never gets rejections that bypass the pipeline

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Added discoveryPartial tracking for accurate status**
- **Found during:** Task 1 GREEN phase
- **Issue:** When TikTok fails but Instagram succeeds and all Instagram videos process fully, `determineStatus` returned "success" instead of "partial" because downloaded === totalCandidates
- **Fix:** Added `discoveryPartial` boolean flag set when either platform rejects, passed to `determineStatus` which returns "partial" when flag is true
- **Files modified:** src/trigger/extract-viral.ts
- **Verification:** Test 2 ("TikTok fails, Instagram works") passes with "partial" status
- **Committed in:** 52c25ea

---

**Total deviations:** 1 auto-fixed (1 bug fix)
**Impact on plan:** Essential for correct status reporting. No scope creep.

## Issues Encountered
- Vitest 4 does not support `-x` flag (was in plan's verify command). Used `--bail 1` equivalent. No impact.
- TypeScript strict typing on mock.calls required explicit casting (`as Array<[string, unknown]>`) for progress metadata assertions.

## User Setup Required
None - no external service configuration required.

## Known Stubs
None - all pipeline stages are fully wired to real library modules from Plans 01 and 02.

## Next Phase Readiness
- Phase 6 is complete: all 3 plans executed, viral content pipeline fully functional
- The orchestrator (`analyze-market.ts`) already dispatches `extractViral` in Batch 1
- Phase 7 (synthesis) can consume `viral_content` records and `viral_patterns` from the database
- Phase 9 (dashboard) can subscribe to `viralProgress` metadata for real-time stage tracking

## Self-Check: PASSED

- FOUND: src/trigger/extract-viral.ts
- FOUND: tests/unit/extract-viral.test.ts
- FOUND: 06-03-SUMMARY.md
- FOUND: commit 140c5d0
- FOUND: commit 52c25ea
- Tests: 10 passed (10)

---
*Phase: 06-viral-content-transcription*
*Completed: 2026-03-28*
