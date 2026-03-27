---
phase: 03-competitor-discovery-orchestration
plan: 01
subsystem: api, database, ai
tags: [apify, gemini, zod, competitor-discovery, scoring, blocklist]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: Apify wrapper pattern, Gemini client pattern, TypeScript types, test infrastructure
  - phase: 02-input-understanding
    provides: AnalysisStatus type, prompts.ts, analyze-market stub
provides:
  - Expanded AnalysisStatus with orchestration states (discovering, waiting_confirmation, extracting)
  - Google Search Apify wrapper (scrapeGoogleSearch)
  - Domain blocklist filtering and deduplication utilities
  - Gemini competitor scoring function (scoreCompetitorsWithAI)
  - RawCompetitorCandidate and ScoredCompetitor types
  - SCORE_COMPETITORS_PROMPT
  - Test fixtures for Google Search and Gemini scoring
  - createRawCandidate factory function
affects: [03-02-PLAN, competitor extraction, orchestrator implementation]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Class-based vi.mock for constructor mocking (ApifyClient, GoogleGenAI)"
    - "Blocklist domain filtering using URL hostname normalization"
    - "Gemini structured output with Zod schema for competitor scoring"

key-files:
  created:
    - supabase/migrations/20260327210000_add_orchestration_statuses.sql
    - src/lib/apify/google-search.ts
    - src/utils/competitors.ts
    - src/lib/ai/score-competitors.ts
    - tests/fixtures/google-search.json
    - tests/fixtures/gemini-score-competitors.json
    - tests/unit/competitors-utils.test.ts
    - tests/unit/google-search-wrapper.test.ts
    - tests/unit/score-competitors.test.ts
  modified:
    - src/types/analysis.ts
    - src/lib/ai/prompts.ts
    - tests/fixtures/factories.ts

key-decisions:
  - "Used class syntax in vi.mock for ApifyClient and GoogleGenAI to support new constructor calls"
  - "Blocklist uses domain.includes() matching for subdomain coverage (e.g., pt.wikipedia.org matches wikipedia.org)"
  - "extractOrganicResults helper splits Google Search response parsing from the main wrapper function"

patterns-established:
  - "Apify Google Search wrapper: flatMap organicResults, filter by url/title presence"
  - "Domain blocklist: centralized BLOCKED_DOMAINS array with extractBaseDomain + isBlockedDomain utilities"
  - "AI scoring: Zod schema with sub-scores, filter >= 70 threshold, sort desc, limit 4"

requirements-completed: [COMP-01]

# Metrics
duration: 4min
completed: 2026-03-27
---

# Phase 03 Plan 01: Competitor Discovery Building Blocks Summary

**Google Search Apify wrapper, domain blocklist/deduplication utilities, Gemini competitor scoring with 70+ threshold, and orchestration status migration**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-27T21:31:11Z
- **Completed:** 2026-03-27T21:35:37Z
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments
- SQL migration adds 3 new orchestration statuses (discovering, waiting_confirmation, extracting) to analysis_status enum
- Google Search Apify wrapper with organic results extraction following established pattern
- Competitor utilities: 21-domain blocklist, domain extraction, blocklist filtering, deduplication by normalized domain
- Gemini scoring function with 5-criteria Zod schema (segment, product, size, region, digital presence)
- 42 new tests across 3 test files, all passing with 99 total tests in suite

## Task Commits

Each task was committed atomically:

1. **Task 1: DB migration, AnalysisStatus expansion, Google Search wrapper, competitor utilities** - `96ccb6c` (feat)
2. **Task 2: Gemini scoring, prompt, fixtures, and all unit tests** - `5413516` (feat)

## Files Created/Modified
- `supabase/migrations/20260327210000_add_orchestration_statuses.sql` - Adds discovering, waiting_confirmation, extracting to analysis_status enum
- `src/types/analysis.ts` - AnalysisStatus expanded from 4 to 7 values
- `src/lib/apify/google-search.ts` - Google Search Apify actor wrapper with filtered organic results
- `src/utils/competitors.ts` - BLOCKED_DOMAINS, RawCompetitorCandidate, extractBaseDomain, isBlockedDomain, filterBlockedDomains, deduplicateCandidates
- `src/lib/ai/score-competitors.ts` - scoreCompetitorsWithAI with scoredCompetitorSchema and ScoredCompetitor type
- `src/lib/ai/prompts.ts` - SCORE_COMPETITORS_PROMPT added with 5 scoring criteria
- `tests/fixtures/google-search.json` - Google Search actor output fixture with 6 results (mix of valid and blocked)
- `tests/fixtures/gemini-score-competitors.json` - Gemini scoring response fixture with 3 scored competitors
- `tests/fixtures/factories.ts` - createRawCandidate factory added
- `tests/unit/competitors-utils.test.ts` - 26 tests for blocklist, domain extraction, filtering, deduplication
- `tests/unit/google-search-wrapper.test.ts` - 7 tests for Google Search wrapper
- `tests/unit/score-competitors.test.ts` - 9 tests for Gemini competitor scoring

## Decisions Made
- Used class syntax in vi.mock for constructor mocking (ApifyClient, GoogleGenAI) instead of vi.fn() which fails with `new`
- Blocklist uses `domain.includes(blocked)` for subdomain coverage (e.g., pt.wikipedia.org matches wikipedia.org)
- Split extractOrganicResults into a helper function to keep scrapeGoogleSearch under 30 lines per CLAUDE.md

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed vi.mock constructor pattern for ApifyClient and GoogleGenAI**
- **Found during:** Task 2 (test execution)
- **Issue:** `vi.fn(() => ...)` creates arrow functions that cannot be used with `new` keyword, causing "not a constructor" errors in all tests
- **Fix:** Changed mock factories to use `class MockApifyClient {}` and `class MockGoogleGenAI {}` syntax which supports `new` calls
- **Files modified:** tests/unit/google-search-wrapper.test.ts, tests/unit/score-competitors.test.ts
- **Verification:** All 42 tests pass
- **Committed in:** 5413516 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Mock pattern fix was necessary for tests to execute. No scope creep.

## Issues Encountered
None beyond the mock constructor fix documented above.

## User Setup Required
None - no external service configuration required.

## Known Stubs
None - all functions are fully implemented with real logic.

## Next Phase Readiness
- All building blocks ready for Plan 02 to compose into the Trigger.dev orchestrator
- Types, utilities, wrappers, and scoring function are tested and exported
- Plan 02 can import: scrapeGoogleSearch, filterBlockedDomains, deduplicateCandidates, scoreCompetitorsWithAI
- AnalysisStatus supports full orchestrator flow progression

## Self-Check: PASSED

- All 12 files verified present on disk
- Commit 96ccb6c (Task 1) verified in git log
- Commit 5413516 (Task 2) verified in git log
- 99/99 tests passing (42 new + 57 existing)
- TypeScript compilation: zero errors

---
*Phase: 03-competitor-discovery-orchestration*
*Completed: 2026-03-27*
