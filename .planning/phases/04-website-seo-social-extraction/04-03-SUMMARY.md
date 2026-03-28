---
phase: 04-website-seo-social-extraction
plan: 03
subsystem: orchestration
tags: [trigger.dev, batch, social-fallback, google-search, extraction-pipeline]

# Dependency graph
requires:
  - phase: 04-website-seo-social-extraction/plan-01
    provides: "socialFallback utilities (findSocialProfilesViaSearch, mergeSocialSources)"
  - phase: 04-website-seo-social-extraction/plan-02
    provides: "extractWebsite and extractSocial tasks with SocialProfileInput payloads"
  - phase: 03-competitor-discovery
    provides: "analyze-market orchestrator with single-batch extraction pattern"
provides:
  - "2-batch sequential orchestrator: Batch 1 (website+viral) then Batch 2 (social+ads)"
  - "Social link collection from extract-website results between batches"
  - "Google Search fallback for missing social profiles between batches"
  - "mergeSocialSources integration with website > search_fallback > ai_hint priority"
  - "Per-competitor sub-task progress tracking via metadata (website, seo, social, ads)"
  - "Graceful partial failure handling across both batches"
affects: [05-viral-content-extraction, 06-ads-extraction, 07-synthesis, 09-dashboard]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "2-batch sequential extraction with data collection between batches"
    - "Social link merging with priority chain: website > search_fallback > ai_hint"
    - "Partial failure tolerance: Batch 1 failures do not block Batch 2"

key-files:
  created: []
  modified:
    - src/trigger/analyze-market.ts
    - tests/unit/analyze-market.test.ts

key-decisions:
  - "Split extraction into 2 sequential batches (not parallel) because extract-social needs social links from extract-website"
  - "Google Search fallback runs only for missing platforms (instagram/tiktok), not all"
  - "Batch 1 failure for a competitor produces empty SocialLinks, Batch 2 still runs with AI hints"

patterns-established:
  - "2-batch pattern: fan-out -> collect intermediate results -> fan-out again with enriched data"
  - "Between-batch processing: sequential loop per competitor for fallback + merge"

requirements-completed: [SITE-01, SITE-02, SEO-01, SEO-02, SOCL-01, SOCL-02, SOCL-03]

# Metrics
duration: 4min
completed: 2026-03-28
---

# Phase 04 Plan 03: Orchestrator 2-Batch Extraction Summary

**Refactored analyze-market from single-batch to 2-batch sequential extraction with social link collection, Google Search fallback, and mergeSocialSources between batches**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-28T01:02:04Z
- **Completed:** 2026-03-28T01:06:05Z
- **Tasks:** 1 (TDD: RED + GREEN)
- **Files modified:** 2

## Accomplishments
- Replaced single-batch extraction (all 4 task types in one batch) with 2-batch sequential pattern
- Batch 1 runs extractWebsite per competitor + extractViral in parallel, then waits
- Between batches: collects socialLinks from each extractWebsite result, runs Google Search fallback for missing instagram/tiktok, merges all sources via mergeSocialSources
- Batch 2 runs extractSocial (with merged social profiles) + extractAds in parallel
- Handles partial Batch 1 failures gracefully: empty social links for failed competitors, still runs Batch 2
- Handles findSocialProfilesViaSearch exceptions: catches and proceeds with website links + AI hints
- Per-competitor sub-task progress tracked with 4 statuses (website, seo, social, ads) via metadata.set
- All 192 tests pass (17 orchestrator tests including 6 new 2-batch-specific tests)

## Task Commits

Each task was committed atomically (TDD):

1. **Task 1 RED: Failing tests for 2-batch extraction** - `51d5b65` (test)
2. **Task 1 GREEN: Implement 2-batch orchestrator** - `1296913` (feat)

## Files Created/Modified
- `src/trigger/analyze-market.ts` - Orchestrator refactored from single-batch to 2-batch sequential extraction with social link collection between batches (283 lines)
- `tests/unit/analyze-market.test.ts` - Extended with 6 new tests in '2-batch extraction pattern' describe block plus updated existing tests for new batch structure (666 lines)

## Decisions Made
- Split extraction into 2 sequential batches because extract-social needs social links discovered by extract-website (Batch 1 output feeds Batch 2 input)
- Google Search fallback only runs for specifically missing platforms (not all), saving API calls
- Failed Batch 1 runs use empty SocialLinks object, allowing mergeSocialSources to fall through to AI hints
- Sub-task progress tracking uses 4 keys per competitor (website, seo, social, ads) instead of previous 3 (website, social, ads)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Known Stubs
None - all functionality is fully wired. The orchestrator correctly calls real functions (findSocialProfilesViaSearch, mergeSocialSources) and passes data between batches.

## Next Phase Readiness
- Phase 4 extraction pipeline is now fully wired end-to-end
- extract-website (Plan 02) produces socialLinks -> orchestrator collects them -> runs fallback -> merges -> passes to extract-social (Plan 02)
- Ready for Phase 5 (viral content extraction), Phase 6 (ads extraction), and Phase 7 (synthesis)
- extract-viral and extract-ads stubs from Phase 3 are correctly placed in their respective batches

---
*Phase: 04-website-seo-social-extraction*
*Completed: 2026-03-28*
