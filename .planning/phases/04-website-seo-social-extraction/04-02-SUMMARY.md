---
phase: 04-website-seo-social-extraction
plan: 02
subsystem: extraction
tags: [trigger.dev, apify, website-scraping, similarweb, instagram, tiktok, zod, supabase, promise-allsettled]

# Dependency graph
requires:
  - phase: 04-website-seo-social-extraction-01
    provides: "Apify wrappers (website, similarweb, instagram, tiktok), extraction schemas, social links extractor, business identifiers"
  - phase: 03-competitor-discovery-01
    provides: "analyze-market orchestrator with extraction stub fan-out"
provides:
  - "extract-website compound Trigger.dev task (website+SEO parallel, social links extraction)"
  - "extract-social Trigger.dev task (Instagram+TikTok parallel extraction)"
  - "ExtractWebsitePayload and ExtractSocialPayload interfaces"
affects: [05-ads-gmb-extraction, 06-viral-transcription, 08-synthesis-recommendations]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Promise.allSettled for parallel sub-task execution with independent failure handling", "Global try/catch in Trigger.dev tasks returning status objects instead of throwing", "Zod validateOrNull for defensive data validation before DB storage"]

key-files:
  created:
    - tests/unit/extract-website.test.ts
    - tests/unit/extract-social.test.ts
  modified:
    - src/trigger/extract-website.ts
    - src/trigger/extract-social.ts

key-decisions:
  - "ExtractSocialPayload uses SocialProfileInput type (username+source) instead of raw string URLs for traceability"
  - "Both tasks use retry config with 3 attempts and exponential backoff (2s-10s, factor 2)"
  - "validateOrNull pattern: null data from scraping skips validation, non-null data that fails validation stores null with warning"

patterns-established:
  - "Extraction task pattern: metadata.set('status','running') -> parallel scraping -> validate -> store -> metadata.set('status','completed') -> return result"
  - "Never-throw pattern: all extraction tasks wrap run in try/catch, returning fallback result with warnings on unhandled errors"

requirements-completed: [SITE-01, SITE-02, SEO-01, SEO-02, SOCL-01, SOCL-02, SOCL-03]

# Metrics
duration: 3min
completed: 2026-03-28
---

# Phase 04 Plan 02: Extract-Website and Extract-Social Summary

**Parallel website+SEO compound extraction and Instagram+TikTok social extraction as Trigger.dev tasks with Zod validation and independent failure handling**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-28T00:56:50Z
- **Completed:** 2026-03-28T00:60:06Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Implemented extract-website compound task that runs website scraping and SimilarWeb SEO in parallel via Promise.allSettled, extracts social links from crawled content, and returns structured result for the orchestrator
- Implemented extract-social task that runs Instagram and TikTok scraping in parallel, gracefully skipping platforms with null profiles
- Both tasks validate data with Zod schemas (websiteDataSchema, seoDataSchema, socialDataSchema) before storing in Supabase
- Both tasks never throw unhandled errors -- global try/catch returns fallback results with descriptive warnings
- 19 test cases covering all behavior scenarios (10 for extract-website, 9 for extract-social)

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement extract-website compound task** - `5dbbb07` (feat)
2. **Task 2: Implement extract-social task** - `e156dc5` (feat)

_Note: TDD tasks - tests written first (RED), then implementation (GREEN), committed together_

## Files Created/Modified
- `src/trigger/extract-website.ts` - Compound task: parallel website+SEO extraction with social links discovery
- `src/trigger/extract-social.ts` - Social task: parallel Instagram+TikTok extraction with null-profile skipping
- `tests/unit/extract-website.test.ts` - 10 test cases for extract-website compound task
- `tests/unit/extract-social.test.ts` - 9 test cases for extract-social task

## Decisions Made
- ExtractSocialPayload uses SocialProfileInput (username+source) instead of raw strings for source traceability
- Both tasks use retry config: 3 attempts, 2s min / 10s max timeout, factor 2 exponential backoff
- validateOrNull pattern: null raw data from scraping skips validation entirely; non-null data that fails schema validation stores null in DB with a warning

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- extract-website and extract-social are fully wired and tested, ready for orchestrator fan-out
- Social links extracted by extract-website flow to the orchestrator which passes them to extract-social
- Remaining extraction stubs (extract-ads, extract-viral) to be implemented in Phases 5 and 6

---
*Phase: 04-website-seo-social-extraction*
*Completed: 2026-03-28*
