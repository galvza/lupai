---
phase: 05-ads-intelligence
plan: 01
subsystem: api
tags: [apify, meta-ads, google-ads, zod, validation, scraping]

# Dependency graph
requires:
  - phase: 01-foundation-project-setup
    provides: Apify wrappers, config, types, extractionSchemas with validateOrNull
  - phase: 04-website-seo-social-extraction
    provides: Enhanced wrapper patterns, extractionSchemas with existing schemas
provides:
  - Enhanced scrapeFacebookAds with pageUrl-first + companyName fallback chain
  - Enhanced scrapeGoogleAds with domain-first + companyName topic fallback chain
  - Verified Google Ads actor ID (memo23/google-ad-transparency-scraper-cheerio)
  - Zod schemas metaAdsDataSchema, googleAdsDataSchema, gmbDataSchema
  - ExtractAdsPayload interface with region field
  - ExtractAdsResult interface with ExtractionStatus
affects: [05-02-PLAN extract-ads task, Phase 8 synthesis]

# Tech tracking
tech-stack:
  added: []
  patterns: [two-attempt fallback chain for Apify wrappers, Zod refine for conditional validation]

key-files:
  created: []
  modified:
    - src/lib/apify/facebook-ads.ts
    - src/lib/apify/google-ads.ts
    - src/config/apify.ts
    - src/lib/validation/extractionSchemas.ts
    - src/types/competitor.ts

key-decisions:
  - "Google Ads actor changed from apify/google-ads-scraper to memo23/google-ad-transparency-scraper-cheerio (Cheerio-based, cheaper on credits)"
  - "Facebook Ads uses search field (not searchQuery) for keyword fallback -- corrected from original wrapper"
  - "GMB schema uses .refine() for name-not-null rule rather than .min(1) on the field"

patterns-established:
  - "Two-attempt fallback: primary call with specific identifier, catch/empty -> fallback with broader keyword"
  - "Helper mapper functions extracted from main wrapper to keep functions under 30 lines"

requirements-completed: [ADS-01, GADS-01, GMB-01]

# Metrics
duration: 3min
completed: 2026-03-28
---

# Phase 5 Plan 1: Ads Intelligence Wrappers and Schemas Summary

**Enhanced Meta Ads and Google Ads Apify wrappers with pageUrl/domain-first fallback chains, plus 3 Zod validation schemas for ads data boundary validation**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-28T13:47:17Z
- **Completed:** 2026-03-28T13:50:13Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- scrapeFacebookAds now accepts (pageUrl, companyName) with URL-first search and keyword fallback per D-01/D-22
- scrapeGoogleAds now accepts (domain, companyName) with Google Ads Transparency domain and topic fallback per D-05/D-23
- Google Ads actor updated to verified Cheerio-based scraper (memo23/google-ad-transparency-scraper-cheerio)
- Three Zod schemas (metaAdsDataSchema, googleAdsDataSchema, gmbDataSchema) ready for validateOrNull pattern
- ExtractAdsPayload and ExtractAdsResult types centralized in competitor.ts for Plan 02 consumption

## Task Commits

Each task was committed atomically:

1. **Task 1: Enhance Apify wrappers for pageUrl/domain-based search with fallback chains** - `4972d89` (feat)
2. **Task 2: Add Zod validation schemas for MetaAdsData, GoogleAdsData, and GmbData** - `d7f4c52` (feat)

## Files Created/Modified
- `src/lib/apify/facebook-ads.ts` - Enhanced with pageUrl primary + companyName keyword fallback, APIFY_ACTORS import, extracted mapMetaAdsItems helper
- `src/lib/apify/google-ads.ts` - Enhanced with domain primary + companyName topic fallback, Google Ads Transparency URLs, extracted mapGoogleAdsItems helper
- `src/config/apify.ts` - Updated googleAds actor ID to memo23/google-ad-transparency-scraper-cheerio
- `src/lib/validation/extractionSchemas.ts` - Added metaAdsDataSchema, googleAdsDataSchema, gmbDataSchema with D-28/D-29/D-30 validation rules
- `src/types/competitor.ts` - Added ExtractAdsPayload (with region field per D-18) and ExtractAdsResult interfaces

## Decisions Made
- Changed Google Ads actor from `apify/google-ads-scraper` (unverified) to `memo23/google-ad-transparency-scraper-cheerio` (Cheerio-based, cheaper on Apify credits)
- Corrected Facebook Ads actor input field from `searchQuery` to `search` (correct actor field name)
- GMB schema uses `.refine()` for conditional name-not-null validation rather than making name non-nullable at the field level

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Pre-existing TypeScript errors in test files (extract-social.test.ts, extract-website.test.ts) related to tuple destructuring -- not caused by this plan's changes, out of scope per deviation rules

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All building blocks ready for Plan 05-02 (extract-ads Trigger.dev task)
- scrapeFacebookAds, scrapeGoogleAds, and scrapeGoogleMaps wrappers ready for parallel invocation
- Zod schemas ready for validateOrNull pattern at extraction boundary
- ExtractAdsPayload and ExtractAdsResult types available for import

## Self-Check: PASSED

- All 5 modified files exist on disk
- Commit 4972d89 (Task 1) verified in git log
- Commit d7f4c52 (Task 2) verified in git log
- All 192 tests pass with no regressions

---
*Phase: 05-ads-intelligence*
*Completed: 2026-03-28*
