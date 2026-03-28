# Phase 05: Ads Intelligence - Research

**Researched:** 2026-03-28
**Domain:** Apify-based competitor advertising extraction (Meta Ads Library, Google Ads Transparency, Google My Business)
**Confidence:** HIGH

## Summary

Phase 5 implements the `extract-ads` Trigger.dev compound task that runs three parallel extractions per competitor: Meta Ads Library, Google Ads Transparency Center, and Google My Business data. The task stub already exists at `src/trigger/extract-ads.ts` and is called in Batch 2 of the orchestrator. All three Apify wrapper functions exist (`scrapeFacebookAds`, `scrapeGoogleAds`, `scrapeGoogleMaps`) and need parameter signature enhancements to support domain/pageUrl-based searching per the locked decisions.

The established Phase 4 compound task pattern (`extract-website.ts` and `extract-social.ts`) provides the exact template: `Promise.allSettled()` for parallel extraction, `validateOrNull` for Zod validation, `updateCompetitor()` for single-call DB storage, and try/catch wrapping for never-fail behavior. The `ExtractAdsPayload` interface needs a `region` field, and the orchestrator needs to pass it.

**Primary recommendation:** Follow the Phase 4 compound task pattern exactly. Enhance the three Apify wrappers to accept domain/pageUrl parameters, add Zod schemas for validation, implement the fallback chains, and wire everything together in the `extract-ads` task.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- D-01: Search Meta Ads Library by PAGE URL (websiteUrl), NOT generic keyword/company name
- D-02: Enhance `scrapeFacebookAds()` to accept `pageUrl` as primary search parameter; use `companyName` only as fallback
- D-03: Extract up to 20 active ads per competitor: adId, creativeUrl, copyText, format, startedAt, isActive
- D-04: Store results in `meta_ads_data` JSONB column via `updateCompetitor()`
- D-05: Search Google Ads by DOMAIN (extracted from websiteUrl), not company name
- D-06: Enhance `scrapeGoogleAds()` to accept `domain` as primary search parameter
- D-07: Extract: hasSearchAds boolean, up to 20 paid keywords, estimatedBudget (null if unavailable)
- D-08: Store results in `google_ads_data` JSONB column via `updateCompetitor()`
- D-09: Include GMB extraction inside `extract-ads` task as parallel call
- D-10: Run GMB for ALL competitors (Google Maps API call is cheap)
- D-11: Region for GMB search comes from `NicheInterpreted.region`, passed through orchestrator
- D-12: Extract: name, rating, reviewCount, address, phone, categories (up to 5)
- D-13: Store results in `gmb_data` JSONB column via `updateCompetitor()`
- D-14: `extract-ads` is a compound task running 3 parallel extractions
- D-15: All 3 run via `Promise.allSettled()` -- failure in one does not block others
- D-16: Task returns combined result: `{ metaAds, googleAds, gmb, status }`
- D-17: After all 3 resolve, store each non-null result to Supabase in a single call
- D-18: Enhance `ExtractAdsPayload` to include `region` field
- D-19: Orchestrator passes `region` from `NicheInterpreted.region`
- D-20: Domain is extracted from `websiteUrl` at task level
- D-21: Task-level retry: maxAttempts 3, minTimeout 2s, maxTimeout 10s, factor 2
- D-22: META ADS FALLBACK: pageUrl -> companyName keyword -> unavailable
- D-23: GOOGLE ADS FALLBACK: domain -> companyName -> unavailable
- D-24: GMB FALLBACK: name+region -> null (no GMB is valid state)
- D-25: Task-level return follows `{ status, data, reason? }` pattern
- D-26: "partial" status when at least one succeeds but others fail
- D-27: Follow Phase 4 `validateOrNull` pattern
- D-28: Meta Ads valid if `activeAdsCount >= 0` AND `ads` is array
- D-29: Google Ads valid if `hasSearchAds` is boolean
- D-30: GMB valid if at least `name` is non-null
- D-31: Zod schemas for all 3 data types at validation boundary
- D-32: THE GOLDEN RULE: partial ads data > no ads data
- D-33: Update Trigger.dev metadata for granular progress
- D-34: All error messages in PT-BR
- D-35: Circuit breaker applies if Apify errors on 3+ consecutive calls

### Claude's Discretion
- Exact domain extraction logic from websiteUrl (URL parsing approach)
- Apify Facebook Ads actor input format for page URL search vs keyword search
- Apify Google Ads actor input format for domain search
- How to combine pageUrl and companyName in Meta Ads fallback logic
- Zod schema strictness levels for each data type
- Whether to use shared circuit breaker state or per-task counters
- Progress metadata key naming within the extract-ads task

### Deferred Ideas (OUT OF SCOPE)
None -- analysis stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ADS-01 | System extracts active ads from Meta Ads Library per competitor (creatives, copy, format, time running) | Apify `facebook-ads-scraper` actor with `startUrls` approach using Meta Ad Library URL with `view_all_page_id`; fallback to `search` keyword parameter. Existing wrapper at `src/lib/apify/facebook-ads.ts` needs pageUrl parameter added. |
| ADS-02 | Results display active ads per competitor with creative previews | SKIP per backend-only scope (CONTEXT.md). Backend stores `meta_ads_data` JSONB for future frontend consumption. |
| GADS-01 | System detects competitor presence in Google Ads (search ads, paid keywords) | Google Ads Transparency Center URL-based scraping via `startUrls` with `adstransparency.google.com/?domain={domain}`. Actor ID needs validation -- `apify/google-ads-scraper` may not exist as first-party actor; use `scrapers-hub/google-ads-transparency-scraper` or `silva95gustavo/google-ads-scraper` instead. |
| GADS-02 | Results display Google Ads presence per competitor | SKIP per backend-only scope. Backend stores `google_ads_data` JSONB. |
| GMB-01 | System analyzes Google My Business presence when applicable | Existing `scrapeGoogleMaps()` wrapper using `compass/google-maps-scraper` is ready to use as-is. Takes `businessName + region`. |
| GMB-02 | Results display GMB data when available, gracefully handles absence | SKIP per backend-only scope. Backend stores `gmb_data` JSONB with null for businesses without GMB presence. |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **Stack pinned:** Apify actors via `apify-client` v2.22.x, Trigger.dev v4.3.x tasks, Zod v3.24.x validation, Supabase v2 for storage
- **Trigger.dev tasks:** Must use `task()` from `@trigger.dev/sdk`, kebab-case IDs, `maxDuration` required, `metadata.set()` for progress
- **Apify credit conservation:** Use fixtures in dev, reserve credits for demo ($5/mo free tier)
- **Error messages:** All in PT-BR
- **Functions:** Arrow functions, max 30 lines per function, JSDoc on public functions
- **Imports:** External libs first, then internal, then types
- **No `any` type** without justification
- **Filter Apify output immediately** -- store only relevant fields (per D-15 convention)
- **Independent cascade steps** -- failure in one extraction does not block others
- **Commit pattern:** One feature per commit, run tests first

## Standard Stack

### Core (already installed -- no new dependencies needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@trigger.dev/sdk` | 4.3.x | Task definition, metadata, retry config | Already used in Phase 4 tasks |
| `apify-client` | 2.22.x | Actor invocation for Meta Ads, Google Ads, Google Maps | Already used for all Apify integrations |
| `zod` | 3.24.x | Schema validation for extraction results | Already used in `extractionSchemas.ts` |
| `@supabase/supabase-js` | 2.100.x | Storing validated data via `updateCompetitor()` | Already used throughout |

### Supporting (no new installs)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Node.js `URL` API | built-in | Domain extraction from websiteUrl | At task level per D-20 |

**Installation:** No new packages needed. Phase 5 uses only existing dependencies.

## Architecture Patterns

### Extract-Ads Task Structure
```
src/trigger/extract-ads.ts (ENHANCE existing stub)
  |-- Receives: { analysisId, competitorId, competitorName, websiteUrl, region }
  |-- Extracts domain from websiteUrl using new URL(websiteUrl).hostname
  |-- Runs 3 parallel extractions via Promise.allSettled:
  |   |-- scrapeFacebookAds(websiteUrl, competitorName) -> MetaAdsData | null
  |   |-- scrapeGoogleAds(domain, competitorName) -> GoogleAdsData | null
  |   |-- scrapeGoogleMaps(competitorName, region) -> GmbData | null
  |-- Validates each result with Zod via validateOrNull
  |-- Stores all 3 results in single updateCompetitor() call
  |-- Returns: { competitorId, metaAds, googleAds, gmb, warnings, status }
```

### File Changes Required

```
MODIFY src/trigger/extract-ads.ts       -- Full implementation replacing stub
MODIFY src/lib/apify/facebook-ads.ts    -- Add pageUrl parameter, fallback logic
MODIFY src/lib/apify/google-ads.ts      -- Add domain parameter, change actor approach
MODIFY src/lib/apify/google-maps.ts     -- No changes needed (already ready)
MODIFY src/lib/validation/extractionSchemas.ts -- Add metaAdsDataSchema, googleAdsDataSchema, gmbDataSchema
MODIFY src/trigger/analyze-market.ts    -- Add region to ExtractAds payload (line 238)
MODIFY src/types/competitor.ts          -- No changes needed (types already defined)
CREATE tests/unit/extract-ads.test.ts   -- Full test suite following extract-website.test.ts pattern
```

### Pattern 1: Enhanced Apify Wrapper with Fallback (Meta Ads)
**What:** Two-attempt Apify call with primary (pageUrl) and fallback (keyword) search strategies
**When to use:** When the primary search parameter may not work for all competitors
**Example:**
```typescript
// Source: Established pattern from src/lib/apify/website.ts + Apify docs
export const scrapeFacebookAds = async (
  pageUrl: string | null,
  companyName: string
): Promise<MetaAdsData> => {
  const client = new ApifyClient({ token: process.env.APIFY_API_TOKEN });

  // Primary: Search by page URL using startUrls with Meta Ad Library URL format
  if (pageUrl) {
    try {
      const run = await client.actor(ACTOR_ID).call({
        startUrls: [{
          url: `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=BR&q=${encodeURIComponent(pageUrl)}&search_type=keyword_unordered`
        }],
        maxItems: 20,
        country: 'BR',
      });
      const { items } = await client.dataset(run.defaultDatasetId).listItems();
      if (items.length > 0) return mapMetaAdsItems(items);
    } catch {
      // Fallback to keyword search below
    }
  }

  // Fallback: Search by company name keyword
  try {
    const run = await client.actor(ACTOR_ID).call({
      search: companyName,
      country: 'BR',
      adType: 'all',
      maxItems: 20,
    });
    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    return mapMetaAdsItems(items);
  } catch (error) {
    throw new Error(
      `Erro ao extrair anuncios Meta para "${companyName}": ${(error as Error).message}`
    );
  }
};
```

### Pattern 2: Google Ads Transparency via startUrls
**What:** Use Google Ads Transparency Center URL format with domain parameter
**When to use:** For detecting Google Ads presence by competitor domain
**Example:**
```typescript
// Source: Google Ads Transparency URL format + Apify scraper pattern
export const scrapeGoogleAds = async (
  domain: string,
  companyName: string
): Promise<GoogleAdsData> => {
  const client = new ApifyClient({ token: process.env.APIFY_API_TOKEN });

  // Primary: Search by domain via Google Ads Transparency Center URL
  try {
    const run = await client.actor(ACTOR_ID).call({
      startUrls: [{
        url: `https://adstransparency.google.com/?region=BR&domain=${encodeURIComponent(domain)}`
      }],
      maxItems: 20,
    });
    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    return mapGoogleAdsItems(items);
  } catch {
    // Fallback: search by company name
  }

  // Fallback: Search by company name
  try {
    const run = await client.actor(ACTOR_ID).call({
      startUrls: [{
        url: `https://adstransparency.google.com/?region=BR&topic=${encodeURIComponent(companyName)}`
      }],
      maxItems: 20,
    });
    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    return mapGoogleAdsItems(items);
  } catch (error) {
    throw new Error(
      `Erro ao extrair dados do Google Ads para "${companyName}": ${(error as Error).message}`
    );
  }
};
```

### Pattern 3: Domain Extraction from URL
**What:** Clean domain extraction using Node.js built-in URL API
**When to use:** At task level before passing domain to Google Ads wrapper
**Example:**
```typescript
// Source: Node.js URL API (built-in)
const extractDomain = (websiteUrl: string): string => {
  try {
    const url = new URL(websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`);
    // Remove 'www.' prefix for cleaner domain matching
    return url.hostname.replace(/^www\./, '');
  } catch {
    // If URL parsing fails, return the raw input stripped of protocol
    return websiteUrl.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
  }
};
```

### Pattern 4: Compound Task with Three-Way Parallel + Fallback
**What:** Full extract-ads task following the established extract-website compound pattern
**When to use:** The entire task implementation
**Example:**
```typescript
// Source: Established pattern from src/trigger/extract-website.ts
export const extractAds = task({
  id: 'extract-ads',
  maxDuration: 120,
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 2000,
    maxTimeoutInMs: 10000,
    factor: 2,
  },
  run: async (payload: ExtractAdsPayload): Promise<ExtractAdsResult> => {
    try {
      metadata.set('status', 'running');
      metadata.set('competitor', payload.competitorName);
      metadata.set('adsProgress', { meta: 'running', google: 'running', gmb: 'running' });

      const warnings: string[] = [];
      const domain = extractDomain(payload.websiteUrl);

      // Three-way parallel extraction
      const [metaResult, googleResult, gmbResult] = await Promise.allSettled([
        scrapeFacebookAds(payload.websiteUrl, payload.competitorName),
        scrapeGoogleAds(domain, payload.competitorName),
        scrapeGoogleMaps(payload.competitorName, payload.region),
      ]);

      // Extract results + build warnings (same pattern as extract-website)
      const rawMetaAds = metaResult.status === 'fulfilled' ? metaResult.value : null;
      const rawGoogleAds = googleResult.status === 'fulfilled' ? googleResult.value : null;
      const rawGmb = gmbResult.status === 'fulfilled' ? gmbResult.value : null;

      // ... validation, warnings, DB storage, return
    } catch (error) {
      // Global catch -- never throw
      metadata.set('status', 'failed');
      return fallbackResult(payload.competitorId, error);
    }
  },
});
```

### Anti-Patterns to Avoid
- **Sequential Apify calls:** Never call Meta, then Google, then GMB sequentially. Always use `Promise.allSettled()`.
- **Throwing on empty results:** "No ads found" and "no GMB listing" are valid business intelligence, not errors. Return structured data with `activeAdsCount: 0` or `null`.
- **Hardcoding actor IDs inline:** Use `APIFY_ACTORS` from `src/config/apify.ts`.
- **Storing raw Apify output:** Always filter to relevant fields immediately per D-15 convention.
- **Using `companyName` as primary search:** Per locked decisions, always try domain/pageUrl first.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| URL domain extraction | Custom regex parser | `new URL().hostname` | Handles edge cases (ports, paths, query strings, IDN domains) |
| Parallel with independent failure | Manual Promise chains | `Promise.allSettled()` | Built-in, handles rejection without stopping others |
| Data validation at boundary | Manual field checks | `validateOrNull()` with Zod schema | Already established pattern, consistent with Phase 4 |
| Retry with backoff | Custom retry loop | Trigger.dev `retry` config | Built into task definition, handles backoff automatically |
| Apify actor invocation | Raw HTTP calls | `apify-client` `.actor().call()` | Handles auth, polling for completion, dataset retrieval |

## Common Pitfalls

### Pitfall 1: Actor ID `apify/google-ads-scraper` May Not Exist
**What goes wrong:** The code references `apify/google-ads-scraper` in `APIFY_ACTORS` config and `src/lib/apify/google-ads.ts`, but research found NO first-party Apify actor with this ID. Third-party alternatives exist: `scrapers-hub/google-ads-transparency-scraper`, `silva95gustavo/google-ads-scraper`, `memo23/google-ad-transparency-scraper-cheerio`.
**Why it happens:** Actor ID was assumed during Phase 1 setup without verification.
**How to avoid:** Before implementation, validate the actor ID by attempting a call in dev. If `apify/google-ads-scraper` fails, switch to a verified third-party actor. The `startUrls` approach using `adstransparency.google.com/?domain=X` URLs works across most Google Ads scrapers on Apify.
**Warning signs:** `ApifyApiError: Actor with ID 'apify/google-ads-scraper' was not found` at runtime.
**Recommendation:** Use `scrapers-hub/google-ads-transparency-scraper` or `silva95gustavo/google-ads-scraper` (both confirmed to exist). Update `APIFY_ACTORS.googleAds` in `src/config/apify.ts`.

### Pitfall 2: Meta Ad Library Only Shows Ad Creative, NOT Spend Data
**What goes wrong:** Developer expects to extract ad spend, impressions, and targeting data from Meta Ads Library. Meta only provides spend/impression data for political/issue ads. Commercial ads show: creative, copy text, format, start date, and active status -- nothing more.
**Why it happens:** Confusion between Meta Ads Library (public transparency tool) and Meta Ads API (requires advertiser access).
**How to avoid:** The existing `MetaAdsData` type already has the correct fields (adId, creativeUrl, copyText, format, startedAt, isActive). Do not add spend or impression fields. The `estimatedBudget` field on Google Ads side is correctly nullable.
**Warning signs:** Empty spend fields, temptation to add Meta spend data.

### Pitfall 3: Facebook Ads Scraper Input Format Mismatch
**What goes wrong:** The existing code uses `{ searchQuery: companyName, country: 'BR' }` as input, but the actual `apify/facebook-ads-scraper` actor uses `{ search: keyword, country: 'BR', adType: 'all' }` for keyword search, or `{ startUrls: [{ url: '...' }] }` for URL-based search.
**Why it happens:** Input parameter names were guessed during Phase 1 stub creation.
**How to avoid:** Use the correct actor input format. For keyword search: `{ search: companyName, country: 'BR', adType: 'all', maxItems: 20 }`. For URL-based search: `{ startUrls: [{ url: metaAdLibraryUrl }], maxItems: 20 }`.
**Warning signs:** Apify actor returns 0 results despite the competitor having active ads.

### Pitfall 4: Domain Extraction Edge Cases
**What goes wrong:** `websiteUrl` may come in various formats: `https://www.example.com`, `http://example.com/path`, `example.com`, `www.example.com`. Simple string manipulation misses edge cases.
**Why it happens:** Assuming all URLs come in normalized format.
**How to avoid:** Use `new URL()` with a protocol prefix fallback. Strip `www.` prefix since Google Ads Transparency uses bare domains. Handle the `catch` case for malformed URLs by falling back to string splitting.
**Warning signs:** Google Ads search returning 0 results because domain includes `www.` or a path.

### Pitfall 5: Three Apify Calls per Competitor Burns Credits Fast
**What goes wrong:** With 3-4 competitors, each running 3 Apify actors = 9-12 actor calls per analysis. On the $5/mo free tier, this can exhaust credits in 3-5 full analyses.
**Why it happens:** No awareness of cumulative credit consumption across the extraction cascade.
**How to avoid:** Always use fixtures during development. Set `maxItems: 20` on Meta and Google Ads calls. Google Maps scraper is relatively cheap (Cheerio-based). Reserve real actor calls for integration testing.
**Warning signs:** More than 2 full real-actor runs during Phase 5 development.

### Pitfall 6: Google Maps Returns Wrong Business
**What goes wrong:** `scrapeGoogleMaps("Clinica Sorriso", "Sao Paulo, SP")` returns a different "Clinica Sorriso" in a different city, or a similarly-named but unrelated business.
**Why it happens:** Business name search is fuzzy. Common names like "Clinica Sorriso" exist in many cities.
**How to avoid:** The existing implementation already concatenates `businessName + region` in the search string, which helps. No additional changes needed per D-24 -- if the result is wrong, it is still valid data (downstream synthesis can handle it). The `name` field in the response can be compared to the expected competitor name for confidence.
**Warning signs:** GMB data showing addresses in wrong cities.

## Code Examples

### Zod Schemas for Ads Data Validation

```typescript
// Source: Established pattern from src/lib/validation/extractionSchemas.ts
import { z } from 'zod';

/** Schema for individual Meta ad */
const metaAdSchema = z.object({
  adId: z.string(),
  creativeUrl: z.string().nullable(),
  copyText: z.string().nullable(),
  format: z.string().nullable(),
  startedAt: z.string().nullable(),
  isActive: z.boolean(),
});

/**
 * Schema Zod para dados de Meta Ads.
 * Regra D-28: valido se activeAdsCount >= 0 AND ads e array.
 */
export const metaAdsDataSchema = z.object({
  activeAdsCount: z.number().min(0),
  ads: z.array(metaAdSchema),
});

/**
 * Schema Zod para dados de Google Ads.
 * Regra D-29: valido se hasSearchAds e boolean.
 */
export const googleAdsDataSchema = z.object({
  hasSearchAds: z.boolean(),
  paidKeywords: z.array(z.string()),
  estimatedBudget: z.string().nullable(),
});

/**
 * Schema Zod para dados do Google Meu Negocio.
 * Regra D-30: valido se ao menos name e nao-null.
 */
export const gmbDataSchema = z
  .object({
    name: z.string().nullable(),
    rating: z.number().nullable(),
    reviewCount: z.number().nullable(),
    address: z.string().nullable(),
    phone: z.string().nullable(),
    categories: z.array(z.string()),
  })
  .refine((data) => data.name !== null, {
    message: 'Dados de GMB invalidos: name deve estar presente',
  });
```

### ExtractAdsResult Type

```typescript
// Source: Follows ExtractWebsiteResult / ExtractSocialResult pattern
export interface ExtractAdsResult {
  competitorId: string;
  metaAds: MetaAdsData | null;
  googleAds: GoogleAdsData | null;
  gmb: GmbData | null;
  warnings: string[];
  status: ExtractionStatus;
}
```

### Enhanced ExtractAdsPayload

```typescript
// Source: D-18, D-19, D-20 from CONTEXT.md
export interface ExtractAdsPayload {
  analysisId: string;
  competitorId: string;
  competitorName: string;
  websiteUrl: string;
  region: string;  // NEW: from NicheInterpreted.region
}
```

### Orchestrator Payload Update (line 236-239 in analyze-market.ts)

```typescript
// Current (needs region added):
...savedCompetitors.map((comp) => ({
  task: extractAds,
  payload: {
    analysisId: payload.analysisId,
    competitorId: comp.id,
    competitorName: comp.name,
    websiteUrl: comp.websiteUrl ?? '',
    region: payload.region,  // NEW: pass from orchestrator payload
  },
})),
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `searchQuery` input field for Meta Ads actor | `search` + `startUrls` input fields | Actor update (2025) | Existing code uses wrong input field name |
| Generic `apify/google-ads-scraper` | Google Ads Transparency Center URL-based scraping | 2025 | Need to use verified third-party actor or URL-based approach |
| Keyword-only search for competitor ads | Domain/pageUrl primary with keyword fallback | Phase 5 decision | More accurate targeting of specific competitors |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.x |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run tests/unit/extract-ads.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ADS-01 | Meta Ads extraction with pageUrl primary, keyword fallback | unit | `npx vitest run tests/unit/extract-ads.test.ts -t "meta ads"` | No -- Wave 0 |
| GADS-01 | Google Ads detection by domain, keyword fallback | unit | `npx vitest run tests/unit/extract-ads.test.ts -t "google ads"` | No -- Wave 0 |
| GMB-01 | GMB extraction, graceful null for absent listings | unit | `npx vitest run tests/unit/extract-ads.test.ts -t "gmb"` | No -- Wave 0 |
| D-15 | Three-way Promise.allSettled parallel execution | unit | `npx vitest run tests/unit/extract-ads.test.ts -t "paralelo"` | No -- Wave 0 |
| D-22 | Meta Ads fallback chain (pageUrl -> keyword -> unavailable) | unit | `npx vitest run tests/unit/extract-ads.test.ts -t "fallback"` | No -- Wave 0 |
| D-27 | validateOrNull Zod validation on all 3 data types | unit | `npx vitest run tests/unit/extract-ads.test.ts -t "validacao"` | No -- Wave 0 |
| D-32 | Never-throw global catch, always returns result | unit | `npx vitest run tests/unit/extract-ads.test.ts -t "nunca"` | No -- Wave 0 |
| D-17 | Single updateCompetitor call with all 3 JSONB columns | unit | `npx vitest run tests/unit/extract-ads.test.ts -t "supabase"` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/unit/extract-ads.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/unit/extract-ads.test.ts` -- Full test suite for extract-ads compound task (follow `extract-website.test.ts` pattern exactly)
- [ ] Zod schemas in `extractionSchemas.ts` for metaAdsData, googleAdsData, gmbData -- needed for validation tests

## Open Questions

1. **Google Ads Actor ID Verification**
   - What we know: `apify/google-ads-scraper` is listed in `src/config/apify.ts` but no first-party Apify actor with this ID was found. Third-party alternatives exist: `scrapers-hub/google-ads-transparency-scraper`, `silva95gustavo/google-ads-scraper`, `memo23/google-ad-transparency-scraper-cheerio`.
   - What's unclear: Which third-party actor has the best reliability and lowest cost on the free tier.
   - Recommendation: During implementation, test `apify/google-ads-scraper` first (it may exist as an unlisted/internal actor). If it fails with "not found", switch to `silva95gustavo/google-ads-scraper` which uses `startUrls` with Google Ads Transparency Center URLs. Update `APIFY_ACTORS.googleAds` accordingly.

2. **Facebook Ads Scraper Input Field Names**
   - What we know: The existing code uses `{ searchQuery: companyName }` but the actual actor uses `{ search: keyword }` or `{ startUrls: [...] }`. The `searchQuery` field name may be wrong.
   - What's unclear: Whether the actor silently ignores unknown fields or returns empty results.
   - Recommendation: Update to use the documented field names (`search`, `startUrls`, `maxItems`, `adType`). Test with a single real call to confirm the input format works.

3. **Circuit Breaker Scope**
   - What we know: D-35 says circuit breaker applies if Apify errors on 3+ consecutive calls. Phase 5 runs alongside Phase 4 tasks in the same orchestrator.
   - What's unclear: Whether the circuit breaker counter should be shared across all extraction tasks (global) or per-task.
   - Recommendation: Use per-task counters initially (simpler). A global circuit breaker requires shared state across Trigger.dev tasks which adds complexity without proportional benefit for the expected volume (<50 analyses).

## Environment Availability

Step 2.6: SKIPPED (no external dependencies beyond what Phase 4 already validated -- same Apify client, same Trigger.dev runtime, same Supabase client, same Node.js 20 LTS).

## Sources

### Primary (HIGH confidence)
- `src/trigger/extract-website.ts` -- Compound task pattern with Promise.allSettled, validateOrNull, updateCompetitor
- `src/trigger/extract-social.ts` -- Parallel platform extraction pattern
- `src/trigger/analyze-market.ts` -- Orchestrator Batch 2 calling extractAds (lines 236-239)
- `src/lib/apify/facebook-ads.ts` -- Existing Meta Ads wrapper (needs enhancement)
- `src/lib/apify/google-ads.ts` -- Existing Google Ads wrapper (needs enhancement)
- `src/lib/apify/google-maps.ts` -- Existing GMB wrapper (ready to use)
- `src/lib/validation/extractionSchemas.ts` -- validateOrNull pattern and existing schemas
- `src/types/competitor.ts` -- MetaAdsData, GoogleAdsData, GmbData types (already defined)
- `src/config/apify.ts` -- Actor IDs (needs googleAds verification)
- `tests/unit/extract-website.test.ts` -- Test pattern to follow
- `tests/fixtures/facebook-ads.json` -- Existing fixture for Meta Ads data
- `tests/fixtures/google-ads.json` -- Existing fixture for Google Ads data
- `tests/fixtures/google-maps.json` -- Existing fixture for GMB data

### Secondary (MEDIUM confidence)
- [Meta Ad Library API](https://www.facebook.com/ads/library/api) -- URL format with `view_all_page_id` parameter
- [Google Ads Transparency Center](https://adstransparency.google.com/) -- URL format `?domain=X&region=BR`
- [Apify Facebook Ads Scraper](https://apify.com/apify/facebook-ads-scraper) -- Actor input: `startUrls`, `search`, `country`, `maxItems`, `adType`
- [Apify Facebook Ads GitHub](https://github.com/epctex-support/facebookads-scraper) -- Confirmed input schema: `startURLs`, `maxItems`, `search`, `country`, `adType`, `endPage`
- [Apify Google Maps Scraper](https://apify.com/compass/crawler-google-places) -- `searchStringsArray` input format
- [Google Ads Transparency Scraper Cheerio](https://apify.com/memo23/google-ad-transparency-scraper-cheerio) -- Domain-based search via URL
- [Meta Ad Library Limitations](https://apify.com/apify/facebook-ads-scraper) -- No spend data on commercial ads

### Tertiary (LOW confidence)
- Google Ads actor alternatives (`scrapers-hub/google-ads-transparency-scraper`, `silva95gustavo/google-ads-scraper`) -- Found via search, not verified with actual API calls. Need runtime validation.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- No new dependencies; all libraries already in use from Phase 4
- Architecture: HIGH -- Direct extension of Phase 4 compound task pattern; all patterns established
- Pitfalls: HIGH -- Actor ID issue and input format mismatch identified from code analysis and Apify docs
- Apify actor input formats: MEDIUM -- Some field names derived from third-party docs, not first-party API schemas (Apify pages are JS-rendered and couldn't be fully scraped)

**Research date:** 2026-03-28
**Valid until:** 2026-04-07 (Apify actors can change without notice; actor IDs should be verified at implementation time)
