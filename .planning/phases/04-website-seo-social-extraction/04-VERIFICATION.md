---
phase: 04-website-seo-social-extraction
verified: 2026-03-28T22:10:00Z
status: passed
score: 15/15 must-haves verified
re_verification: false
human_verification:
  - test: "Confirm SITE-02, SEO-02, SOCL-03 display requirements are intentionally deferred"
    expected: "Data is stored in Supabase and will be rendered in Phase 9 dashboard"
    why_human: "Plans claim display requirements as complete based on backend extraction; actual UI rendering is Phase 9 scope — cannot verify programmatically whether this deferral is intentional"
---

# Phase 4: Website, SEO and Social Extraction Verification Report

**Phase Goal:** Competitor website positioning, SEO metrics, and social media presence are extracted and stored
**Verified:** 2026-03-28T22:10:00Z
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Social links can be extracted from website text/markdown content | VERIFIED | `src/utils/socialLinks.ts` — 105 lines, 6-platform regex extraction with NON_PROFILE_PATHS filter, 12 unit tests passing |
| 2 | Brand name fuzzy matching validates fallback social profile discoveries | VERIFIED | `src/utils/socialFallback.ts` — isBrandNameSimilar with NFD normalization + 50% word threshold, 7 tests passing |
| 3 | CNPJ and email domain are extractable from website text | VERIFIED | `src/utils/businessIdentifiers.ts` — regex-based extraction for masked/unmasked CNPJ and email domain, 8 tests passing |
| 4 | Zod schemas validate website, SEO, and social data before storage | VERIFIED | `src/lib/validation/extractionSchemas.ts` — websiteDataSchema (D-29), seoDataSchema (D-30), socialDataSchema (D-31), validateOrNull helper, 12 tests passing |
| 5 | Enhanced scrapeWebsite returns social links and raw pages text alongside WebsiteData | VERIFIED | `src/lib/apify/website.ts` — returns WebsiteScrapingResult with socialLinks, businessIdentifiers, rawPagesText |
| 6 | extract-website runs website scraping and SimilarWeb SEO in parallel via Promise.allSettled | VERIFIED | `src/trigger/extract-website.ts` line 51 — Promise.allSettled([scrapeWebsite(...), scrapeSimilarweb(...)]) |
| 7 | extract-website extracts social links from scraped content and returns them for the orchestrator | VERIFIED | `src/trigger/extract-website.ts` line 69 — socialLinks returned from websiteScrapingResult, included in ExtractWebsiteResult |
| 8 | extract-website stores website_data and seo_data in Supabase via updateCompetitor | VERIFIED | `src/trigger/extract-website.ts` line 94 — updateCompetitor called with `{ website_data, seo_data }` |
| 9 | extract-website validates data with Zod schemas before storing | VERIFIED | `src/trigger/extract-website.ts` lines 73-87 — validateOrNull called on both websiteData and seoData before updateCompetitor |
| 10 | extract-social runs Instagram and TikTok scraping in parallel | VERIFIED | `src/trigger/extract-social.ts` line 72 — Promise.allSettled([igPromise, ttPromise]) |
| 11 | extract-social skips platforms gracefully when profile URL is null | VERIFIED | `src/trigger/extract-social.ts` lines 44-61 — null profile guard + lines 64-69 conditional scraping promises |
| 12 | extract-social stores social_data in Supabase via updateCompetitor | VERIFIED | `src/trigger/extract-social.ts` line 100 — updateCompetitor called with `{ social_data }` |
| 13 | Both tasks never throw unhandled errors — they return status objects per D-36 | VERIFIED | Global try/catch in both tasks; extract-website (line 115) and extract-social (line 117) return fallback ExtractWebsiteResult/ExtractSocialResult on error |
| 14 | Orchestrator runs extraction in 2 sequential batches: Batch 1 (website+viral) then Batch 2 (social+ads) | VERIFIED | `src/trigger/analyze-market.ts` — batch.triggerByTaskAndWait called 3 times: discovery (line 47), batch1 (line 168), batch2 (line 242) |
| 15 | Between batches, social links from extract-website results are collected and merged with AI hints via Google Search fallback | VERIFIED | `src/trigger/analyze-market.ts` lines 170-212 — loop collects socialLinks from batch1Runs, calls findSocialProfilesViaSearch for missing platforms, calls mergeSocialSources, builds socialProfilesPerCompetitor for batch2 |

**Score:** 15/15 truths verified

---

### Required Artifacts

| Artifact | Provides | Status | Lines | Details |
|----------|----------|--------|-------|---------|
| `src/types/competitor.ts` | SocialLinks, SocialProfileInput, ExtractWebsiteResult, ExtractSocialResult, ExtractionStatus types; businessIdentifiers on WebsiteData | VERIFIED | 141 | All 5 new interfaces/types present; businessIdentifiers? added to WebsiteData |
| `src/utils/socialLinks.ts` | extractSocialLinksFromText function | VERIFIED | 105 | NON_PROFILE_PATHS set, SOCIAL_PATTERNS for 6 platforms, getMostFrequent helper, exported function |
| `src/utils/socialFallback.ts` | findSocialProfilesViaSearch, isBrandNameSimilar, mergeSocialSources | VERIFIED | 165 | All 3 exported; Google Search fallback wired; priority merge implemented |
| `src/utils/businessIdentifiers.ts` | extractBusinessIdentifiers function | VERIFIED | 32 | CNPJ_REGEX, EMAIL_REGEX, BusinessIdentifiers interface, exported function |
| `src/lib/validation/extractionSchemas.ts` | websiteDataSchema, seoDataSchema, socialDataSchema, validateOrNull | VERIFIED | 97 | All 4 exports present; .refine() D-29/D-30 rules implemented |
| `src/lib/apify/website.ts` | Enhanced scrapeWebsite returning WebsiteScrapingResult | VERIFIED | 79 | WebsiteScrapingResult exported, returns socialLinks + businessIdentifiers + rawPagesText |
| `src/trigger/extract-website.ts` | Compound Trigger.dev task for website+SEO+social links extraction | VERIFIED | 129 | ExtractWebsitePayload exported, retry config, Promise.allSettled, Zod validation, updateCompetitor call |
| `src/trigger/extract-social.ts` | Trigger.dev task for parallel Instagram+TikTok extraction | VERIFIED | 128 | ExtractSocialPayload with SocialProfileInput, retry config, Promise.allSettled, null-profile skipping |
| `src/trigger/analyze-market.ts` | 2-batch sequential orchestrator with social link collection between batches | VERIFIED | 283 | 3 batch.triggerByTaskAndWait calls, findSocialProfilesViaSearch + mergeSocialSources between batches |
| `tests/unit/social-links.test.ts` | Tests for social link extraction | VERIFIED | 12 tests | All passing |
| `tests/unit/social-fallback.test.ts` | Tests for brand matching and merge logic | VERIFIED | 11 tests | All passing |
| `tests/unit/business-identifiers.test.ts` | Tests for CNPJ and email extraction | VERIFIED | 8 tests | All passing |
| `tests/unit/extraction-schemas.test.ts` | Tests for Zod schemas | VERIFIED | 12 tests | All passing |
| `tests/unit/extract-website.test.ts` | Tests for extract-website compound task | VERIFIED | 10 tests | All passing |
| `tests/unit/extract-social.test.ts` | Tests for extract-social task | VERIFIED | 9 tests | All passing |
| `tests/unit/analyze-market.test.ts` | Extended tests covering 2-batch pattern, social link merging, fallback | VERIFIED | 192 tests (17 orchestrator, 6 new 2-batch) | All passing |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/utils/socialLinks.ts` | `src/types/competitor.ts` | `import type { SocialLinks }` | WIRED | Line 1: `import type { SocialLinks } from '@/types/competitor'` |
| `src/lib/apify/website.ts` | `src/utils/socialLinks.ts` | `extractSocialLinksFromText` call | WIRED | Line 4 import, line 46 call on allText |
| `src/lib/validation/extractionSchemas.ts` | — | `websiteDataSchema` defined and exported | WIRED | Line 7: `export const websiteDataSchema` |
| `src/trigger/extract-website.ts` | `src/lib/apify/website.ts` | `scrapeWebsite()` call | WIRED | Line 3 import, line 52 call in Promise.allSettled |
| `src/trigger/extract-website.ts` | `src/lib/apify/similarweb.ts` | `scrapeSimilarweb()` call | WIRED | Line 4 import, line 53 call in Promise.allSettled |
| `src/trigger/extract-website.ts` | `src/lib/supabase/queries.ts` | `updateCompetitor()` for storing JSONB data | WIRED | Line 5 import, line 94 call with `{ website_data, seo_data }` |
| `src/trigger/extract-social.ts` | `src/lib/apify/instagram.ts` | `scrapeInstagram()` call | WIRED | Line 3 import, line 65 conditional call |
| `src/trigger/extract-social.ts` | `src/lib/apify/tiktok.ts` | `scrapeTiktok()` call | WIRED | Line 4 import, line 68 conditional call |
| `src/trigger/analyze-market.ts` | `src/trigger/extract-website.ts` | Batch 1 fan-out | WIRED | Line 4 import, line 162 task in batch1Items |
| `src/trigger/analyze-market.ts` | `src/trigger/extract-social.ts` | Batch 2 fan-out with collected social links | WIRED | Line 5 import, line 228 task in batch2Items |
| `src/trigger/analyze-market.ts` | `src/utils/socialFallback.ts` | `findSocialProfilesViaSearch` and `mergeSocialSources` between batches | WIRED | Line 10 import, line 203 + 210 calls between batch1 and batch2 |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `src/trigger/extract-website.ts` | `websiteData`, `seoData` | `scrapeWebsite()` via Apify + `scrapeSimilarweb()` via Apify | Real Apify actor calls (ACTOR_ID: apify/website-content-crawler, SimilarWeb actor) | FLOWING |
| `src/trigger/extract-social.ts` | `socialData` | `scrapeInstagram()` and `scrapeTiktok()` via Apify | Real Apify actor calls conditional on non-null social profiles | FLOWING |
| `src/lib/apify/website.ts` | `websiteData`, `socialLinks`, `businessIdentifiers` | `client.actor(ACTOR_ID).call()` + `client.dataset().listItems()` | Real Apify API call, extracts from crawled items | FLOWING |
| `src/lib/supabase/queries.ts:updateCompetitor` | `updates` (website_data, seo_data, social_data) | Supabase `.update(updates).eq('id', id)` | Real DB write to `competitors` table JSONB columns | FLOWING |

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| All Phase 4 unit tests pass | `npx vitest run [7 test files]` | 87 tests passed | PASS |
| Full test suite passes (no regressions) | `npx vitest run` | 192 tests passed across 16 test files | PASS |
| Production source files have no TypeScript errors | `npx tsc --noEmit \| grep "^src/"` | 0 errors in `src/` | PASS |
| TypeScript errors in test files only | `npx tsc --noEmit` | 3 type errors in test files (destructuring patterns) — tests still pass at runtime | INFO |

---

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|-------------|---------------|-------------|--------|----------|
| SITE-01 | 04-01, 04-02, 04-03 | System extracts competitor website data (positioning, offer, pricing when visible, meta tags) | SATISFIED | `scrapeWebsite` returns WebsiteData with positioning, metaTags; stored via `updateCompetitor(website_data)` in extract-website task |
| SITE-02 | 04-02, 04-03 | Results display website analysis per competitor in organized cards | NEEDS HUMAN | Backend: data stored in `website_data` JSONB column in Supabase. Frontend display is Phase 9 scope. REQUIREMENTS.md marks this [x] — user memory instructs skipping frontend. Verify this deferral is intentional. |
| SEO-01 | 04-01, 04-02, 04-03 | System extracts SEO data per competitor (estimated authority, top keywords, estimated traffic) | SATISFIED | `scrapeSimilarweb` returns SeoData; validated by seoDataSchema; stored via `updateCompetitor(seo_data)` |
| SEO-02 | 04-02, 04-03 | Results display SEO analysis per competitor with key metrics | NEEDS HUMAN | Same as SITE-02: data stored, display is Phase 9. REQUIREMENTS.md marks [x]. |
| SOCL-01 | 04-01, 04-02, 04-03 | System discovers and analyzes competitor social media presence (Instagram, TikTok) | SATISFIED | Social profile discovery pipeline: website regex → Google Search fallback → AI hints merged via mergeSocialSources; profiles passed to extract-social |
| SOCL-02 | 04-02, 04-03 | System extracts posting frequency, follower counts, engagement rates, top recent posts | SATISFIED | `scrapeInstagram` and `scrapeTiktok` return SocialData with followers, postingFrequency, engagementRate, topPosts; stored via `updateCompetitor(social_data)` |
| SOCL-03 | 04-02, 04-03 | Results display social media overview per competitor | NEEDS HUMAN | Same as SITE-02: data stored, display is Phase 9. REQUIREMENTS.md marks [x]. |

**Note on SITE-02, SEO-02, SOCL-03:** REQUIREMENTS.md marks all three as `[x]` complete and maps them to Phase 4. The plans claim these as completed requirements. However, the requirement text says "Results display ... per competitor" which implies a UI component. The user profile memory explicitly instructs skipping frontend work. The extracted data is stored in Supabase and ready for consumption by the Phase 9 dashboard — this appears to be an intentional reinterpretation of "complete" to mean "data is available for display" rather than "UI exists." Flagged for human confirmation.

**Orphaned requirements check:** No REQUIREMENTS.md entries mapped to Phase 4 outside the 7 claimed requirement IDs.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `tests/unit/analyze-market.test.ts` | 410, 421, 422 | TypeScript destructuring pattern mismatch (`[key]: [string]`) | INFO | Test file only — tests pass at runtime via Vitest. No impact on production behavior. |
| `tests/unit/extract-social.test.ts` | 215 | Same TypeScript destructuring pattern | INFO | Test file only — tests pass at runtime. |
| `src/utils/socialFallback.ts` | 73 | `return null` | INFO | Not a stub — intentional return for unrecognized platform in extractUsernameFromUrl |
| `src/lib/validation/extractionSchemas.ts` | 92, 94 | `return null` | INFO | Not a stub — intentional defensive pattern in validateOrNull on ZodError |

No blocker or warning anti-patterns found in any production source files.

---

### Human Verification Required

#### 1. SITE-02 / SEO-02 / SOCL-03 — Display Requirements Deferral

**Test:** Confirm that marking SITE-02, SEO-02, and SOCL-03 as complete in Phase 4 is intentional, based on the understanding that "results display" means data available in Supabase (not a rendered UI component).
**Expected:** The team's definition of "complete" for these requirements = data extracted and stored in structured JSONB columns, ready for Phase 9 dashboard rendering.
**Why human:** Cannot programmatically determine intent. REQUIREMENTS.md marks these `[x]` and the plans claim them as completed, but the actual UI rendering has not been built (user memory says skip frontend work). This could be correct (backend-first, display deferred to Phase 9) or an overcount of completed requirements.

---

### Gaps Summary

No technical gaps found. All 15 must-have truths are verified against the actual codebase. All artifacts exist with real implementations (not stubs), are substantive, and are wired end-to-end. The entire extraction pipeline flows:

1. `analyze-market.ts` (orchestrator) fans out `extractWebsite` in Batch 1
2. `extract-website.ts` calls `scrapeWebsite` + `scrapeSimilarweb` in parallel, extracts social links, validates with Zod, stores in Supabase
3. Orchestrator collects social links from Batch 1, runs `findSocialProfilesViaSearch` for missing profiles, merges via `mergeSocialSources`
4. `analyze-market.ts` fans out `extractSocial` in Batch 2 with merged social profiles
5. `extract-social.ts` calls `scrapeInstagram` + `scrapeTiktok` in parallel, validates with Zod, stores `social_data` in Supabase
6. All tasks never throw unhandled errors — global try/catch returns fallback result objects

The only item flagged for human review is the semantic question of whether "Results display" requirements (SITE-02, SEO-02, SOCL-03) are correctly marked complete based on backend data availability alone.

---

_Verified: 2026-03-28T22:10:00Z_
_Verifier: Claude (gsd-verifier)_
