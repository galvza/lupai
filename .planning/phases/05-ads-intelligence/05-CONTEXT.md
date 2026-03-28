# Phase 5: Ads Intelligence - Context

**Gathered:** 2026-03-28 (auto mode)
**Status:** Ready for planning

<domain>
## Phase Boundary

Implement the full extraction logic for competitor advertising presence: Meta Ads Library, Google Ads, and Google My Business data. This fills in the `extract-ads` Trigger.dev task stub created in Phase 3. The task runs in Batch 2 of the orchestrator (alongside extract-social), receiving websiteUrl from Batch 1 results. Each ads source (Meta, Google, GMB) runs in parallel within the task. Frontend/UI components are out of scope — backend extraction only.

</domain>

<decisions>
## Implementation Decisions

### Meta Ads Library Extraction (Prior User Decision)
- **D-01:** Search Meta Ads Library by PAGE URL (websiteUrl), NOT generic keyword/company name — produces more accurate, targeted results
- **D-02:** Enhance `scrapeFacebookAds()` to accept `pageUrl` as primary search parameter; use `companyName` only as fallback
- **D-03:** Extract up to 20 active ads per competitor: adId, creativeUrl, copyText, format, startedAt, isActive
- **D-04:** Store results in `meta_ads_data` JSONB column via `updateCompetitor()`

### Google Ads Detection (Prior User Decision)
- **D-05:** Search Google Ads by DOMAIN (extracted from websiteUrl), not company name — detects actual search ad presence
- **D-06:** Enhance `scrapeGoogleAds()` to accept `domain` as primary search parameter; extract domain from websiteUrl
- **D-07:** Extract: hasSearchAds boolean, up to 20 paid keywords, estimatedBudget (null if unavailable)
- **D-08:** Store results in `google_ads_data` JSONB column via `updateCompetitor()`

### Google My Business Extraction
- **D-09:** Include GMB extraction inside `extract-ads` task as a parallel call alongside Meta and Google Ads — compound task pattern (mirrors extract-website from Phase 4)
- **D-10:** Run GMB for ALL competitors — the Google Maps API call is cheap and returns null gracefully when no listing exists
- **D-11:** Region for GMB search comes from `NicheInterpreted.region` (Phase 2 AI understanding), passed through orchestrator payload
- **D-12:** Extract: name, rating, reviewCount, address, phone, categories (up to 5) — using existing `GmbData` type
- **D-13:** Store results in `gmb_data` JSONB column via `updateCompetitor()`

### Extract-Ads Task Structure
- **D-14:** `extract-ads` is a compound task running 3 parallel extractions: (1) Meta Ads Library, (2) Google Ads, (3) Google My Business
- **D-15:** All 3 run via `Promise.allSettled()` — failure in one does not block others
- **D-16:** Task returns combined result: `{ metaAds: MetaAdsData | null, googleAds: GoogleAdsData | null, gmb: GmbData | null, status: StatusObject }`
- **D-17:** After all 3 resolve, store each non-null result to Supabase via `updateCompetitor()` in a single call

### Payload Enhancement
- **D-18:** Enhance `ExtractAdsPayload` to include `region` field: `{ analysisId, competitorId, competitorName, websiteUrl, region }`
- **D-19:** Orchestrator passes `region` from `NicheInterpreted.region` (available in orchestrator payload since Phase 2)
- **D-20:** Domain is extracted from `websiteUrl` at task level (no need for separate payload field)

### Retry & Fallback Chains (Extends Phase 4 Pattern)
- **D-21:** Task-level retry: `retry: { maxAttempts: 3, minTimeoutInMs: 2000, maxTimeoutInMs: 10000, factor: 2 }` — per established convention
- **D-22:** META ADS FALLBACK: Primary: Apify Facebook Ads actor with pageUrl → Fallback 1: retry with companyName keyword → Fallback 2: return `{ status: "unavailable", data: null }`
- **D-23:** GOOGLE ADS FALLBACK: Primary: Apify Google Ads actor with domain → Fallback 1: retry with companyName → Fallback 2: return `{ status: "unavailable", data: null }`
- **D-24:** GMB FALLBACK: Primary: Google Maps actor with name+region → Fallback: return null (no GMB presence is a valid business state, not an error)
- **D-25:** Task-level return follows established pattern: `{ status: "success" | "partial" | "fallback" | "unavailable", data: T | null, reason?: string }`
- **D-26:** "partial" status when at least one of Meta/Google/GMB succeeds but others fail

### Data Validation
- **D-27:** Follow Phase 4 `validateOrNull` pattern: null raw data skips validation; non-null failing data stores null with warning
- **D-28:** Meta Ads data: valid if `activeAdsCount >= 0` AND `ads` is an array (even empty — "no ads" is valid data)
- **D-29:** Google Ads data: valid if `hasSearchAds` is a boolean (false = no presence, which is valid data)
- **D-30:** GMB data: valid if at least `name` is non-null
- **D-31:** Zod schemas for all 3 data types at validation boundary

### Error Handling & Progress
- **D-32:** THE GOLDEN RULE applies: partial ads data > no ads data. Always produce a result.
- **D-33:** Update Trigger.dev metadata for granular progress: `metadata.set('adsProgress', { meta: 'running', google: 'running', gmb: 'running' })`
- **D-34:** All error messages in PT-BR per established convention
- **D-35:** Circuit breaker applies if Apify errors on 3+ consecutive calls (shared with other extraction tasks)

### Claude's Discretion
- Exact domain extraction logic from websiteUrl (URL parsing approach)
- Apify Facebook Ads actor input format for page URL search vs keyword search
- Apify Google Ads actor input format for domain search
- How to combine pageUrl and companyName in Meta Ads fallback logic
- Zod schema strictness levels for each data type
- Whether to use shared circuit breaker state or per-task counters
- Progress metadata key naming within the extract-ads task

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product Definition
- `PRD-LUPAI.md` — Full product requirements, ads intelligence section, data model
- `.planning/PROJECT.md` — Constraints: Apify free tier ($5/mo), Vercel 10s timeout, cascata independente
- `CLAUDE.md` — Stack versions, folder structure, Trigger.dev job naming (kebab-case), coding conventions

### Requirements
- `.planning/REQUIREMENTS.md` — ADS-01 (Meta ads extraction), ADS-02 (display — SKIP per backend-only), GADS-01 (Google Ads detection), GADS-02 (display — SKIP), GMB-01 (Google My Business), GMB-02 (display — SKIP)

### Prior Phase Implementation (MUST READ)
- `src/trigger/extract-ads.ts` — Stub task to implement (has ExtractAdsPayload interface to enhance)
- `src/trigger/analyze-market.ts` — Orchestrator Batch 2 calls extractAds (lines 236-239), passes websiteUrl
- `src/lib/apify/facebook-ads.ts` — Meta Ads Library wrapper to enhance (currently searches by companyName, needs pageUrl)
- `src/lib/apify/google-ads.ts` — Google Ads wrapper to enhance (currently searches by companyName, needs domain)
- `src/lib/apify/google-maps.ts` — Google Maps/GMB wrapper (ready to use, takes businessName + region)
- `src/lib/supabase/queries.ts` — updateCompetitor() for storing meta_ads_data, google_ads_data, gmb_data JSONB columns
- `src/types/competitor.ts` — MetaAdsData, GoogleAdsData, GmbData types (already defined, may need minor enhancement)

### Phase 4 Patterns to Follow
- `src/trigger/extract-website.ts` — Compound task pattern (website + SEO in parallel) — same approach for extract-ads
- `src/trigger/extract-social.ts` — Parallel platform extraction pattern (Instagram + TikTok) — same approach for Meta + Google + GMB
- `src/lib/apify/website.ts` — Apify wrapper enhancement pattern (adding parameters to existing wrapper)

### Stack Research
- `.planning/research/STACK.md` — Trigger.dev v4 batch API, Apify client patterns
- `.planning/research/PITFALLS.md` — Apify credits management, rate limits

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `scrapeFacebookAds()` in `src/lib/apify/facebook-ads.ts`: Uses `apify/facebook-ads-scraper` actor, currently searches by companyName — needs pageUrl parameter addition
- `scrapeGoogleAds()` in `src/lib/apify/google-ads.ts`: Uses `apify/google-ads-scraper` actor, currently searches by companyName — needs domain parameter addition
- `scrapeGoogleMaps()` in `src/lib/apify/google-maps.ts`: Uses `compass/google-maps-scraper` actor, takes businessName + region — ready to use as-is
- `updateCompetitor()` in `src/lib/supabase/queries.ts`: Updates any JSONB column on competitor record — ready for storing meta_ads_data, google_ads_data, gmb_data
- `MetaAdsData`, `GoogleAdsData`, `GmbData` types in `src/types/competitor.ts` — already defined with all needed fields
- `validateOrNull` pattern from Phase 4 — reuse for ads data validation

### Established Patterns
- Trigger.dev tasks: `task({ id: 'kebab-case', maxDuration: 120, retry: { maxAttempts: 3, ... }, run: async (payload) => {} })` with `metadata.set()` for progress
- Compound task pattern: `Promise.allSettled()` for parallel independent extractions within a single task
- Apify calls: `client.actor(ACTOR_ID).call(input)` → `client.dataset().listItems()` → filter fields
- DB updates: `updateCompetitor(id, { meta_ads_data: data, google_ads_data: gData, gmb_data: gmbData })` single call
- Error messages in PT-BR with descriptive context
- Never-fail return pattern: `{ status, data, reason? }`

### Integration Points
- `extract-ads` stub in `src/trigger/extract-ads.ts` needs full implementation replacing stub logic
- Orchestrator at `src/trigger/analyze-market.ts` line 238 already passes websiteUrl — needs `region` added to payload
- `ExtractAdsPayload` interface needs `region` field added
- New Zod schemas needed for validation of Meta, Google, and GMB data
- Facebook Ads and Google Ads wrappers need parameter signature enhancement (backward-compatible)

</code_context>

<specifics>
## Specific Ideas

- Meta Ads Library search by page URL is more accurate than keyword search because it finds the exact advertiser's page, not just keyword matches
- Google Ads search by domain detects if the competitor is running search ads on their actual domain
- GMB extraction provides local business context (ratings, reviews, address) that enriches the synthesis phase
- The 3-way parallel structure (Meta + Google + GMB) mirrors how Phase 4's extract-social runs Instagram + TikTok in parallel
- "No ads found" and "no GMB listing" are VALID business intelligence — store as structured data (not null) so the synthesis phase can report "competitor X has no active Meta ads"

</specifics>

<deferred>
## Deferred Ideas

None — analysis stayed within phase scope

</deferred>

---

*Phase: 05-ads-intelligence*
*Context gathered: 2026-03-28*
