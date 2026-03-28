---
phase: 05-ads-intelligence
verified: 2026-03-28T11:02:00Z
status: passed
score: 10/10 must-haves verified
re_verification: false
---

# Phase 5: Ads Intelligence Verification Report

**Phase Goal:** Competitor advertising presence across Meta and Google is captured and stored
**Verified:** 2026-03-28T11:02:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | scrapeFacebookAds accepts pageUrl as primary parameter with companyName fallback | VERIFIED | `src/lib/apify/facebook-ads.ts` line 33-36: signature `(pageUrl: string \| null, companyName: string)`, startUrls primary path lines 43-64, `search: companyName` fallback line 69 |
| 2 | scrapeGoogleAds accepts domain as primary parameter with companyName fallback | VERIFIED | `src/lib/apify/google-ads.ts` line 38-41: signature `(domain: string, companyName: string)`, adstransparency.google.com primary path lines 47-63, topic fallback lines 66-76 |
| 3 | Zod schemas exist for MetaAdsData, GoogleAdsData, and GmbData validation | VERIFIED | `src/lib/validation/extractionSchemas.ts` lines 114-144: `metaAdsDataSchema`, `googleAdsDataSchema`, `gmbDataSchema` all exported with correct validation rules |
| 4 | Google Ads actor ID is updated to a verified actor | VERIFIED | `src/config/apify.ts` line 25: `googleAds: 'memo23/google-ad-transparency-scraper-cheerio'` |
| 5 | extract-ads task runs 3 parallel extractions (Meta, Google, GMB) via Promise.allSettled | VERIFIED | `src/trigger/extract-ads.ts` line 63: `const [metaResult, googleResult, gmbResult] = await Promise.allSettled([` |
| 6 | Failure in one extraction does not block the other two | VERIFIED | Promise.allSettled semantics + per-result settled-status checks on lines 70-83; 12 tests confirm partial failure paths |
| 7 | Each extraction result is validated with Zod via validateOrNull before storage | VERIFIED | Lines 86, 91, 97: `validateOrNull(metaAdsDataSchema, ...)`, `validateOrNull(googleAdsDataSchema, ...)`, `validateOrNull(gmbDataSchema, ...)` |
| 8 | All three results are stored in a single updateCompetitor call | VERIFIED | Lines 103-107: single `updateCompetitor(payload.competitorId, { meta_ads_data, google_ads_data, gmb_data })` |
| 9 | Orchestrator passes region from payload to extract-ads payload | VERIFIED | `src/trigger/analyze-market.ts` line 243: `region: payload.region,` in extractAds batch map |
| 10 | Task never throws unhandled exceptions — always returns a result | VERIFIED | Lines 129-140: outer try/catch returns fallback `ExtractAdsResult` with `status: 'unavailable'`; test 10 of 12 confirms this behavior |

**Score:** 10/10 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/apify/facebook-ads.ts` | Enhanced Meta Ads wrapper with pageUrl primary + companyName fallback | VERIFIED | 87 lines, substantive two-attempt fallback chain, imports APIFY_ACTORS from config, JSDoc present |
| `src/lib/apify/google-ads.ts` | Enhanced Google Ads wrapper with domain primary + companyName topic fallback | VERIFIED | 82 lines, substantive two-attempt fallback chain, adstransparency.google.com URLs, imports APIFY_ACTORS from config, JSDoc present |
| `src/lib/validation/extractionSchemas.ts` | Zod schemas for ads data validation | VERIFIED | 145 lines, exports `metaAdsDataSchema`, `googleAdsDataSchema`, `gmbDataSchema`; gmbDataSchema uses `.refine()` for name-not-null rule; `z.number().min(0)` on activeAdsCount |
| `src/config/apify.ts` | Updated Google Ads actor ID | VERIFIED | `googleAds: 'memo23/google-ad-transparency-scraper-cheerio'` at line 25 |
| `src/trigger/extract-ads.ts` | Full compound task replacing stub | VERIFIED | 143 lines (above 80-line minimum), no stub string, full implementation with parallel extraction, validation, DB storage, and never-throw pattern |
| `src/trigger/analyze-market.ts` | Updated orchestrator passing region in extractAds payload | VERIFIED | Line 243 contains `region: payload.region` inside the extractAds batch map |
| `tests/unit/extract-ads.test.ts` | Full test suite for extract-ads compound task | VERIFIED | 315 lines (above 150-line minimum), 12 test cases, all 12 pass |
| `src/types/competitor.ts` | ExtractAdsPayload with region field and ExtractAdsResult | VERIFIED | Lines 84-101: `ExtractAdsPayload` with `region: string`, `ExtractAdsResult` with `status: ExtractionStatus` |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/lib/apify/facebook-ads.ts` | `apify-client` | `client.actor(APIFY_ACTORS.facebookAds).call()` | WIRED | Lines 43, 68: `client.actor(APIFY_ACTORS.facebookAds).call(...)` |
| `src/lib/apify/google-ads.ts` | `apify-client` | `client.actor(APIFY_ACTORS.googleAds).call()` | WIRED | Lines 47, 66: `client.actor(APIFY_ACTORS.googleAds).call(...)` |
| `src/lib/validation/extractionSchemas.ts` | `src/types/competitor.ts` | Zod schemas matching MetaAdsData, GoogleAdsData, GmbData types | WIRED | Schema shapes match interfaces in competitor.ts exactly; all three schemas export from extractionSchemas.ts |
| `src/trigger/extract-ads.ts` | `src/lib/apify/facebook-ads.ts` | `scrapeFacebookAds(websiteUrl, competitorName)` | WIRED | Line 64: `scrapeFacebookAds(payload.websiteUrl, payload.competitorName)` |
| `src/trigger/extract-ads.ts` | `src/lib/apify/google-ads.ts` | `scrapeGoogleAds(domain, competitorName)` | WIRED | Line 65: `scrapeGoogleAds(domain, payload.competitorName)` |
| `src/trigger/extract-ads.ts` | `src/lib/apify/google-maps.ts` | `scrapeGoogleMaps(competitorName, region)` | WIRED | Line 66: `scrapeGoogleMaps(payload.competitorName, payload.region)` |
| `src/trigger/extract-ads.ts` | `src/lib/supabase/queries.ts` | `updateCompetitor(id, { meta_ads_data, google_ads_data, gmb_data })` | WIRED | Lines 103-107: single atomic updateCompetitor call with all three JSONB columns |
| `src/trigger/extract-ads.ts` | `src/lib/validation/extractionSchemas.ts` | `validateOrNull` with all three schemas | WIRED | Lines 86, 91, 97: all three validateOrNull calls present |
| `src/trigger/analyze-market.ts` | `src/trigger/extract-ads.ts` | `batch.triggerByTaskAndWait` with `region: payload.region` | WIRED | Lines 236-245: extractAds in batch2Items, `region: payload.region` at line 243 |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `src/trigger/extract-ads.ts` | `validatedMetaAds`, `validatedGoogleAds`, `validatedGmb` | `Promise.allSettled([scrapeFacebookAds, scrapeGoogleAds, scrapeGoogleMaps])` | Yes — live Apify actor calls with real input parameters; results pass through Zod validation before DB write | FLOWING |
| `src/lib/apify/facebook-ads.ts` | `items` from dataset | `client.actor(APIFY_ACTORS.facebookAds).call(...)` + `client.dataset(run.defaultDatasetId).listItems()` | Yes — real Apify actor invocation; no static returns | FLOWING |
| `src/lib/apify/google-ads.ts` | `items` from dataset | `client.actor(APIFY_ACTORS.googleAds).call(...)` + `client.dataset(run.defaultDatasetId).listItems()` | Yes — real Apify actor invocation; no static returns | FLOWING |

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| All 12 extract-ads unit tests pass | `npx vitest run tests/unit/extract-ads.test.ts` | 12/12 passed, 233ms | PASS |
| Full test suite passes with no regressions | `npx vitest run` | 17 files, 204 tests passed | PASS |
| Stub string removed from extract-ads.ts | `grep "Stub - Phase 5" src/trigger/extract-ads.ts` | NOT FOUND | PASS |
| Orchestrator region wiring present | `grep "region: payload.region" src/trigger/analyze-market.ts` | Found at line 243 | PASS |
| TypeScript errors in source files (non-test) | `npx tsc --noEmit 2>&1 \| grep "\.ts(" \| grep -v "tests/"` | No output — zero errors in source files | PASS |

Note: `npx tsc --noEmit` reports errors only in test files (`tests/unit/analyze-market.test.ts` and `tests/unit/extract-ads.test.ts`) involving tuple destructuring in mock `.mock.calls` filtering patterns. These are pre-existing issues documented in the Phase 5 Plan 01 SUMMARY ("Pre-existing TypeScript errors in test files — not caused by this plan's changes, out of scope"). They do not affect runtime behavior — Vitest runs all 204 tests successfully.

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| ADS-01 | 05-01-PLAN, 05-02-PLAN | System extracts active ads from Meta Ads Library per competitor (creatives, copy, format, time running) | SATISFIED | `scrapeFacebookAds` extracts adId, creativeUrl, copyText, format, startedAt, isActive; `extractAds` stores via `meta_ads_data`; 12 tests validate extraction pipeline |
| ADS-02 | 05-02-PLAN | Results display active ads per competitor with creative previews | SATISFIED (backend) | Ads data is stored in Supabase `meta_ads_data` JSONB column per competitor; display is deferred to Phase 9 (dashboard). Backend pipeline complete and functional. |
| GADS-01 | 05-01-PLAN, 05-02-PLAN | System detects competitor presence in Google Ads (search ads, paid keywords) | SATISFIED | `scrapeGoogleAds` returns `hasSearchAds: boolean`, `paidKeywords: string[]`; `extractAds` stores via `google_ads_data` |
| GADS-02 | 05-02-PLAN | Results display Google Ads presence per competitor | SATISFIED (backend) | Google Ads data stored in Supabase `google_ads_data` JSONB column; display deferred to Phase 9 |
| GMB-01 | 05-01-PLAN, 05-02-PLAN | System analyzes Google My Business presence when applicable (local businesses) | SATISFIED | `scrapeGoogleMaps` called with `(competitorName, region)` per payload; null from scraper is valid (no listing); data stored via `gmb_data` |
| GMB-02 | 05-02-PLAN | Results display GMB data when available, gracefully handles absence | SATISFIED (backend) | GMB null handling explicit: no warning when scraper returns null (valid no-listing), `status: 'partial'` instead of failure; display deferred to Phase 9 |

**Coverage note on ADS-02, GADS-02, GMB-02:** The "Results display" requirements have a display/frontend component that maps to Phase 9 (dashboard). Phase 5's scope covers the backend pipeline — extraction, validation, and storage. All three "display" requirements are listed as `[x]` Complete in REQUIREMENTS.md, indicating the traceability document treats the backend pipeline as satisfying these requirements for Phase 5. No orphaned requirements found.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `tests/unit/analyze-market.test.ts` | 410, 421-422 | TypeScript tuple destructuring incompatible with `any[][]` type from vi mock — pre-existing | Info | Does not affect test execution; Vitest passes all tests |
| `tests/unit/extract-ads.test.ts` | 292 | Same tuple destructuring TS error as above — pre-existing | Info | Does not affect test execution; all 12 tests pass |

No blockers or warnings found. The two Info-level items are pre-existing TypeScript issues in test files only, noted in Plan 01 SUMMARY as out of scope.

---

### Human Verification Required

None — all goal truths are fully verifiable programmatically for this phase. The display/frontend portions of ADS-02, GADS-02, and GMB-02 are deferred to Phase 9 and will require human verification at that phase.

---

### Gaps Summary

No gaps. All 10 must-have truths are VERIFIED, all 8 artifacts exist and are substantive and wired, all 9 key links are confirmed, and data flows from Apify actors through validation to Supabase storage. The full test suite (204 tests across 17 files) passes with no regressions.

---

_Verified: 2026-03-28T11:02:00Z_
_Verifier: Claude (gsd-verifier)_
