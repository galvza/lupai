---
phase: 05-ads-intelligence
plan: 02
subsystem: extraction
tags: [trigger.dev, apify, meta-ads, google-ads, google-maps, gmb, promise-allsettled, zod]

# Dependency graph
requires:
  - phase: 05-ads-intelligence/01
    provides: Enhanced Apify wrappers (facebook-ads, google-ads), Zod schemas (metaAdsDataSchema, googleAdsDataSchema, gmbDataSchema), ExtractAdsPayload/Result types
  - phase: 04-extraction-pipeline/01
    provides: Compound task pattern (extract-website), validateOrNull utility, updateCompetitor query
provides:
  - Working extract-ads compound task with 3-way parallel extraction (Meta Ads, Google Ads, GMB)
  - Orchestrator wired to pass region to extractAds for location-based GMB search
  - Comprehensive test suite (12 tests) covering success, partial, failure, validation, and metadata
affects: [07-synthesis, 09-dashboard]

# Tech tracking
tech-stack:
  added: []
  patterns: [3-way Promise.allSettled extraction, domain extraction from URL with www stripping, determineStatus helper for 3-result aggregation]

key-files:
  created:
    - tests/unit/extract-ads.test.ts
  modified:
    - src/trigger/extract-ads.ts
    - src/trigger/analyze-market.ts

key-decisions:
  - "Domain extraction uses new URL().hostname.replace(/^www\\./, '') with fallback regex for malformed URLs"
  - "GMB null from scraper is valid (no listing found) -- no warning added, status counts as null for determineStatus"
  - "Single updateCompetitor call stores all 3 JSONB columns (meta_ads_data, google_ads_data, gmb_data) atomically"

patterns-established:
  - "3-way parallel extraction pattern: Promise.allSettled with per-result warnings and validation"
  - "determineStatus aggregation: success (3/3), partial (1-2/3), unavailable (0/3)"

requirements-completed: [ADS-01, ADS-02, GADS-01, GADS-02, GMB-01, GMB-02]

# Metrics
duration: 3min
completed: 2026-03-28
---

# Phase 5 Plan 2: Extract-Ads Compound Task Summary

**3-way parallel ads extraction (Meta + Google + GMB) via Promise.allSettled with Zod validation and single-call DB persistence**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-28T13:52:37Z
- **Completed:** 2026-03-28T13:55:57Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Full extract-ads compound task replacing Phase 3 stub, running Meta Ads, Google Ads, and GMB extraction in parallel
- Orchestrator now passes region to extractAds for location-based Google My Business search
- 12-test comprehensive suite covering all extraction outcomes (success, partial, unavailable, validation, metadata)

## Task Commits

Each task was committed atomically:

1. **Task 1a: Failing tests (TDD RED)** - `e775679` (test)
2. **Task 1b: Extract-ads implementation (TDD GREEN)** - `6f7e1c8` (feat)
3. **Task 2: Orchestrator region wiring** - `56706ec` (feat)

_Note: Task 1 used TDD flow with separate RED and GREEN commits_

## Files Created/Modified
- `src/trigger/extract-ads.ts` - Full compound task: 3-way parallel extraction, Zod validation, single DB update, never-throw pattern
- `src/trigger/analyze-market.ts` - Added region: payload.region to extractAds batch payload
- `tests/unit/extract-ads.test.ts` - 12 test cases following extract-website test pattern with hoisted mocks

## Decisions Made
- Domain extraction uses new URL().hostname with www. stripping and regex fallback for malformed URLs
- GMB null from scraper is valid (no listing) -- no warning, counts as null in status determination
- Single updateCompetitor call for all 3 JSONB columns (atomic persistence)

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None - all stubs from Phase 3 have been replaced with working implementations.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Ads intelligence pipeline fully operational (Plan 01 wrappers + Plan 02 compound task)
- Phase 5 complete: extract-ads consumes enhanced Apify wrappers and produces validated data in Supabase
- Ready for Phase 7 (synthesis) which reads competitor data including ads from Supabase

## Self-Check: PASSED

- All 3 files exist on disk (src/trigger/extract-ads.ts, src/trigger/analyze-market.ts, tests/unit/extract-ads.test.ts)
- All 3 commits found in git log (e775679, 6f7e1c8, 56706ec)
- 12/12 extract-ads tests passing

---
*Phase: 05-ads-intelligence*
*Completed: 2026-03-28*
