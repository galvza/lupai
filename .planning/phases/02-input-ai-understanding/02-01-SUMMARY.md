---
phase: 02-input-ai-understanding
plan: 01
subsystem: api
tags: [gemini, classification, trigger.dev, next.js-route, zod, vitest]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: Types (analysis.ts), validators (validators.ts), Supabase queries (queries.ts), Trigger.dev config, Gemini client (understand.ts), prompts
provides:
  - Input classification function (classifyInput) with 5 categories
  - POST /api/analyze/understand route with Gemini integration
  - POST /api/analyze route with Supabase + Trigger.dev integration
  - Trigger.dev analyze-market task stub
  - Enhanced types (InputClassification, FlowStep, UnderstandResponse, StartAnalysisResponse)
  - 34 unit tests covering all backend logic
affects: [02-02-frontend-flow, 03-competitor-extraction, 09-dashboard]

# Tech tracking
tech-stack:
  added: [zod-to-json-schema (responseJsonSchema for Gemini structured output)]
  patterns: [API route classification branching, Gemini token savings via pre-classification, Trigger.dev task stub pattern]

key-files:
  created:
    - src/lib/ai/classify.ts
    - src/app/api/analyze/understand/route.ts
    - src/app/api/analyze/route.ts
    - src/trigger/analyze-market.ts
    - tests/unit/classify.test.ts
    - tests/unit/understand-route.test.ts
    - tests/unit/analyze-route.test.ts
  modified:
    - src/types/analysis.ts
    - src/lib/ai/understand.ts
    - src/utils/validators.ts

key-decisions:
  - "classifyInput uses letterCount <= 3 threshold (not < 3) to reject 3-letter gibberish inputs like 'asd'"
  - "NONSENSE and MINIMAL inputs never call Gemini — saves API tokens on invalid/insufficient input"
  - "URL inputs get default interpretation without Gemini call — site analysis happens in Phase 3 extraction"
  - "analyze-market task is an intentional stub — full orchestration deferred to Phase 3"
  - "responseJsonSchema added to understandNiche via zod-to-json-schema for type-safe Gemini output"

patterns-established:
  - "API route pattern: parse body -> validate with Zod -> business logic -> typed NextResponse"
  - "Classification branching: pre-filter inputs before expensive AI calls"
  - "Test pattern: vi.mock external deps, test route handler directly with Request objects"
  - "Trigger.dev task stub: export interface + task with metadata.set for future realtime progress"

requirements-completed: [INPT-02, ORCH-03]

# Metrics
duration: 5min
completed: 2026-03-27
---

# Phase 2 Plan 1: Input Classification & API Routes Summary

**Input classification with 5 categories (MINIMAL/MEDIUM/URL/EXCESSIVE/NONSENSE), understand route with Gemini branching, analyze route with Supabase + Trigger.dev, and analyze-market task stub**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-27T20:44:31Z
- **Completed:** 2026-03-27T20:49:19Z
- **Tasks:** 3
- **Files modified:** 10

## Accomplishments
- classifyInput function correctly categorizes all 5 input types with 17 test cases
- POST /api/analyze/understand route branches on classification — NONSENSE/MINIMAL never call Gemini (token savings)
- POST /api/analyze route creates DB record, triggers Trigger.dev job, returns redirectUrl
- Trigger.dev analyze-market stub ready for Phase 3 orchestration
- 34 total unit tests passing with zero TypeScript errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Create input classification function and enhanced types** - `d4ad3ec` (feat)
2. **Task 2: Create POST /api/analyze/understand route** - `c9e1e77` (feat)
3. **Task 3: Create POST /api/analyze route and Trigger.dev stub** - `920611c` (feat)

**Plan metadata:** (pending docs commit)

_Note: Task 1 used TDD (test RED -> implementation GREEN)_

## Files Created/Modified
- `src/lib/ai/classify.ts` - Input classification function with 5 categories
- `src/types/analysis.ts` - Enhanced with InputClassification, FlowStep, UnderstandResponse, StartAnalysisResponse
- `src/app/api/analyze/understand/route.ts` - POST endpoint for niche understanding with classification branching
- `src/app/api/analyze/route.ts` - POST endpoint to start analysis with Supabase + Trigger.dev
- `src/trigger/analyze-market.ts` - Trigger.dev task stub for analysis orchestration
- `src/lib/ai/understand.ts` - Enhanced with responseJsonSchema for structured Gemini output
- `src/utils/validators.ts` - Added understandRequestSchema
- `tests/unit/classify.test.ts` - 17 tests for classifyInput
- `tests/unit/understand-route.test.ts` - 8 tests for understand route
- `tests/unit/analyze-route.test.ts` - 9 tests for analyze route

## Decisions Made
- Used `letterCount <= 3` threshold instead of `< 3` to match behavior spec (3-letter gibberish like "asd" is NONSENSE)
- NONSENSE and MINIMAL inputs never call Gemini, saving API tokens on invalid/insufficient input
- URL inputs get a default interpretation without calling Gemini — actual site analysis happens during Phase 3 extraction
- analyze-market task is an intentional stub — full orchestration with sub-tasks deferred to Phase 3
- Added responseJsonSchema via zod-to-json-schema for more reliable structured output from Gemini

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Adjusted letterCount threshold from < 3 to <= 3**
- **Found during:** Task 1 (TDD GREEN phase)
- **Issue:** Plan action text said "fewer than 3 letter characters" but behavior spec explicitly expects classifyInput("asd") to return NONSENSE. "asd" has exactly 3 letters, so `< 3` would miss it.
- **Fix:** Changed threshold to `letterCount <= 3` to match behavior specification
- **Files modified:** src/lib/ai/classify.ts
- **Verification:** All 17 classify tests pass
- **Committed in:** d4ad3ec (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minor threshold adjustment to match behavior spec. No scope creep.

## Known Stubs

- `src/trigger/analyze-market.ts` (line 25): Intentional stub — returns immediately with success message. Full orchestration (competitor extraction, viral content, synthesis) will be implemented in Phase 3. This does not block the plan's goal.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Backend API routes ready for frontend integration (Plan 02-02)
- classify, understand, and analyze endpoints fully tested
- Trigger.dev task stub ready for Phase 3 orchestration expansion
- No blockers for next plan

## Self-Check: PASSED

- All 10 files: FOUND
- All 3 commits: FOUND (d4ad3ec, c9e1e77, 920611c)
- 34 tests: ALL PASSING
- TypeScript typecheck: ZERO ERRORS

---
*Phase: 02-input-ai-understanding*
*Completed: 2026-03-27*
