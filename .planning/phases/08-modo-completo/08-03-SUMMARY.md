---
phase: 08-modo-completo
plan: 03
subsystem: ai
tags: [gemini, synthesis, comparative-analysis, prompt-engineering, zod, trigger-dev]

# Dependency graph
requires:
  - phase: 08-modo-completo
    provides: ComparativeAnalysis type, getUserBusinessByAnalysis query, role column, comparative fixture
provides:
  - Extended synthesisOutputSchema with 3 optional comparative sections
  - comparativeAnalysisSchema for DB validation
  - COMPARATIVE_SYNTHESIS_SECTION prompt constant for Modo Completo
  - synthesizeAnalysis with optional userBusiness parameter and conditional prompt extension
  - buildComparativeAnalysis pure function for status determination (full/partial/unavailable)
  - synthesizeTask fetches user business for mode='complete' and stores ComparativeAnalysis
affects: [08-modo-completo, 09-dashboard]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Optional Zod schema fields (.optional()) to validate both Modo Rapido and Completo with same schema"
    - "Conditional prompt extension: append COMPARATIVE_SYNTHESIS_SECTION only when userBusiness present"
    - "buildComparativeAnalysis as pure function for testability, extracting comparative status from synthesis output"
    - "Comparative recommendation filtering: match 'concorrente' or 'voce' keywords in action/reason"

key-files:
  created:
    - tests/unit/synthesize-comparative.test.ts
  modified:
    - src/lib/validation/synthesisSchemas.ts
    - src/lib/ai/prompts.ts
    - src/lib/ai/synthesize.ts
    - src/trigger/synthesize.ts

key-decisions:
  - "Optional comparative fields on synthesisOutputSchema instead of separate schema, so single Gemini call returns both base and comparative"
  - "buildComparativeAnalysis as exported pure function for independent unit testing and reuse"
  - "Comparative recommendation filtering uses keyword matching ('concorrente', 'voce') to select personalized recs from full set"
  - "Truncation re-appends comparative section after viralContent reduction to preserve user context"

patterns-established:
  - "Conditional prompt composition: base prompt + optional sections based on analysis mode"
  - "ComparativeAnalysis status cascade: full (all 3 sections) > partial (some) > unavailable (none or null inputs)"
  - "Mode-based branching in Trigger.dev tasks: payload.mode === 'complete' gates user business fetch and comparative analysis build"

requirements-completed: [MODO-03, MODO-04]

# Metrics
duration: 7min
completed: 2026-03-28
---

# Phase 08 Plan 03: Comparative Synthesis Summary

**Extended synthesis pipeline with conditional comparative analysis: Gemini prompt includes user-vs-market sections when Modo Completo data available, buildComparativeAnalysis determines status (full/partial/unavailable), synthesizeTask wires mode-aware flow end-to-end**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-28T19:04:26Z
- **Completed:** 2026-03-28T19:11:12Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Extended synthesisOutputSchema with 3 optional comparative sections (userVsMarket, gapsVsCompetitors, competitiveAdvantages) that validate both Modo Rapido and Completo outputs
- Added COMPARATIVE_SYNTHESIS_SECTION prompt with PT-BR instructions for user-vs-competitor comparison
- Implemented synthesizeAnalysis userBusiness parameter that conditionally appends comparative prompt with user data context
- Created buildComparativeAnalysis pure function with 3-state status determination (full/partial/unavailable) and comparative recommendation filtering
- Updated synthesizeTask to fetch user business for mode='complete', pass to synthesis, build ComparativeAnalysis, and store via upsertSynthesis
- 13 comprehensive tests covering both modes, graceful degradation, and all status paths

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend synthesis schema and add comparative prompt section** - `4ed2b3c` (feat)
2. **Task 2 RED: Add failing tests for comparative synthesis flow** - `229eb14` (test)
3. **Task 2 GREEN: Implement comparative synthesis** - `2941ff0` (feat - bundled with 08-02 commit)

**Plan metadata:** pending (docs: complete plan)

_Note: Task 2 GREEN implementation was committed alongside plan 08-02 changes in commit 2941ff0 due to concurrent execution. All code changes are verified present and tested._

## Files Created/Modified
- `src/lib/validation/synthesisSchemas.ts` - Extended synthesisOutputSchema with 3 optional comparative fields, added comparativeAnalysisSchema
- `src/lib/ai/prompts.ts` - Added COMPARATIVE_SYNTHESIS_SECTION constant for Modo Completo prompt
- `src/lib/ai/synthesize.ts` - Updated synthesizeAnalysis with userBusiness parameter, added buildComparativeAnalysis function
- `src/trigger/synthesize.ts` - Added getUserBusinessByAnalysis fetch for mode='complete', buildComparativeAnalysis call, comparativeAnalysis in upsertSynthesis
- `tests/unit/synthesize-comparative.test.ts` - 13 tests across 3 groups: synthesizeAnalysis behavior, synthesizeTask flow, buildComparativeAnalysis unit tests

## Decisions Made
- Used optional fields on existing synthesisOutputSchema rather than a separate schema so a single Gemini call produces both base and comparative sections
- buildComparativeAnalysis exported as pure function for independent testability and potential reuse
- Comparative recommendations filtered by keyword matching ('concorrente', 'voce') to identify user-specific recs from the full set
- When context truncation occurs, comparative section is re-appended after viralContent reduction to preserve user business context priority

## Deviations from Plan

None - plan executed exactly as written. Implementation code was already present from a concurrent execution but verified and validated with all 13 new tests passing.

## Issues Encountered
- Task 2 GREEN implementation was committed bundled with plan 08-02 changes (commit 2941ff0 includes synthesize.ts and trigger/synthesize.ts modifications). All code verified present and functional via test suite (295/295 tests pass).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Comparative synthesis pipeline fully wired for Modo Completo
- mode='quick' flow completely unchanged (zero regression)
- Ready for plan 08-04 (if exists) or Phase 09 dashboard integration
- ComparativeAnalysis data available in Supabase for dashboard rendering

## Self-Check: PASSED

All 5 created/modified files exist. All 3 commit hashes verified in git log. All 7 content assertions confirmed (optional fields, schemas, prompts, parameters, imports).

---
*Phase: 08-modo-completo*
*Completed: 2026-03-28*
