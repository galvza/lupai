# Phase 4: Website, SEO & Social Extraction - Context

**Gathered:** 2026-03-27 (auto mode)
**Status:** Ready for planning

<domain>
## Phase Boundary

Implement the full extraction logic for competitor website data, SEO metrics, and social media presence. This fills in the `extract-website` and `extract-social` Trigger.dev task stubs created in Phase 3. Website scraping must happen FIRST to discover social media links, then social extraction runs in parallel using those discovered links. SEO (SimilarWeb) runs alongside website scraping since it only needs the URL. Each sub-task validates its output and stores only filtered, relevant fields in Supabase JSONB columns. Frontend/UI components are out of scope — backend extraction only.

</domain>

<decisions>
## Implementation Decisions

### Extraction Chain Order (User-Specified)
- **D-01:** Website scraping is SEQUENTIAL — must complete before social extraction begins
- **D-02:** Extract ALL social media links from scraped website pages (footer, header, sidebar, contact page): instagram.com, facebook.com, tiktok.com, youtube.com, linkedin.com, twitter.com/x.com
- **D-03:** Also extract business name, CNPJ if visible, and email domain from website content
- **D-04:** Google Search fallback when social links NOT found on site: search "[brand name] instagram", "[brand name] facebook", "[brand name] tiktok"
- **D-05:** Match Google search fallback results by brand name similarity to avoid false positives
- **D-06:** Social media extraction (Instagram + TikTok) runs in PARALLEL after website data is available
- **D-07:** SEO extraction (SimilarWeb) runs in PARALLEL with website scraping — it only needs the URL, not scraped content

### Extract-Website Task Implementation
- **D-08:** `extract-website` becomes a compound task that does 3 things: (1) scrape website content via Apify, (2) extract social links from HTML, (3) run SimilarWeb for SEO data — steps 1+3 in parallel, step 2 after step 1
- **D-09:** Enhance `scrapeWebsite()` to return social links alongside website data — add a `socialLinks` field to the return type with `{ instagram: string | null, tiktok: string | null, facebook: string | null, youtube: string | null, linkedin: string | null, twitter: string | null }`
- **D-10:** Social link extraction uses regex/pattern matching on all crawled pages (not just homepage): look for `href` attributes containing social media domains
- **D-11:** Website content analysis should extract: positioning text (first 500 chars), meta tags (title, description, keywords), detected social links, business identifiers (CNPJ regex, email domain)
- **D-12:** Store `website_data` AND `seo_data` JSONB columns on the competitor record via `updateCompetitor()`
- **D-13:** `extract-website` RETURNS the discovered social links (or null) so the orchestrator can pass them to `extract-social`

### Social Profile Fallback Mechanism
- **D-14:** When website scraping finds NO social links for a given platform, activate Google Search fallback
- **D-15:** Use existing Google Search Apify actor (`src/lib/apify/google-search.ts`) to search "[competitor name] instagram" etc.
- **D-16:** Parse Google search results for URLs matching social media platform domains
- **D-17:** Validate found profiles by brand name similarity (fuzzy match competitor name against profile name/handle)
- **D-18:** Fallback has a lower confidence than website-discovered links — store a `source` field per social profile ("website" | "search_fallback" | "ai_hint")
- **D-19:** Phase 3 AI-scored `socialProfiles` are treated as HINTS only — actual extraction uses website-discovered or search-fallback links

### Extract-Social Task Implementation
- **D-20:** `extract-social` receives social profile URLs/usernames from the orchestrator (sourced from website discovery or fallback)
- **D-21:** Run Instagram and TikTok scraping in PARALLEL within the task (both are independent Apify calls)
- **D-22:** Use existing `scrapeInstagram()` and `scrapeTiktok()` wrappers — they already filter fields per D-15 from Phase 1
- **D-23:** Store `social_data` JSONB column on the competitor record via `updateCompetitor()`
- **D-24:** If a social profile URL is null/not found, skip that platform gracefully (don't fail the whole task)

### Orchestrator Modification
- **D-25:** Modify `analyze-market.ts` orchestrator to run extraction in 2 sequential batches:
  - **Batch 1:** `extractWebsite` for all competitors (parallel across competitors) + `extractViral` (independent)
  - **Batch 2:** `extractSocial` for all competitors (parallel across competitors, using social links from Batch 1 results) + `extractAds` for all competitors (using website URLs from Batch 1)
- **D-26:** Between batches, collect social links from each `extractWebsite` result and merge with Phase 3 AI hints (website-discovered links take priority)
- **D-27:** This 2-batch pattern also benefits Phase 5 (ads extraction depends on website page URLs for Meta Ads Library search)

### Data Validation Strategy
- **D-28:** Each sub-task validates extracted data with Zod schemas before storing to Supabase
- **D-29:** Website data: must have at least one non-null field (positioning OR metaTags.title OR metaTags.description) to be considered valid
- **D-30:** SEO data: must have at least one of (estimatedAuthority, topKeywords.length > 0, estimatedTraffic) to be valid
- **D-31:** Social data: platform-level validation — each platform (instagram, tiktok) validates independently; partial success is OK
- **D-32:** On invalid/empty extraction: store null for that data category, update metadata with warning, do NOT fail the task

### Trigger.dev Retry Configuration (User-Specified)
- **D-33:** Orchestrator (`analyze-market`): `retry: { maxAttempts: 1 }` — orchestrator must NOT retry (would restart everything); individual sub-tasks handle their own retries
- **D-34:** Extraction sub-tasks (`extract-website`, `extract-social`): `retry: { maxAttempts: 3, minTimeoutInMs: 2000, maxTimeoutInMs: 10000, factor: 2 }` — try 3 times, 2s→4s→10s exponential backoff
- **D-35:** On final failure, sub-tasks return `{ status: "unavailable", data: null, reason: error.message }` — NEVER throw unhandled errors
- **D-36:** Sub-task return type is always `{ status: "success" | "partial" | "fallback" | "unavailable" | "skipped", data: T | null, reason?: string }`

### Fallback Chains (User-Specified)
- **D-37:** WEBSITE SCRAPING: Primary: Apify Website Content Crawler → Fallback 1: simple fetch + cheerio parse (basic HTML) → Fallback 2: mark "site_unavailable", continue with other sources
- **D-38:** SOCIAL DISCOVERY: Primary: extract links from website HTML → Fallback 1: Google Search "[brand] instagram/tiktok" → Fallback 2: mark "not_found" for that competitor, continue
- **D-39:** SEO/SIMILARWEB: Primary: SimilarWeb actor → Fallback 1: use basic data from website scrape (meta tags) → Fallback 2: mark "seo_limited" with partial data
- **D-40:** INSTAGRAM: Primary: Apify Instagram Scraper → Fallback 1: if rate limited, wait 10s retry once → Fallback 2: return basic profile only (no posts), mark "partial" → Fallback 3: mark "unavailable", continue with other platforms
- **D-41:** TIKTOK: Same pattern as Instagram (D-40)

### Error Handling & Resilience (User-Specified)
- **D-42:** THE GOLDEN RULE: An analysis with partial data is INFINITELY better than a failed analysis with no data. System ALWAYS produces a result.
- **D-43:** Every extraction step reports status to DB: "success" | "partial" | "fallback" | "unavailable" | "skipped"
- **D-44:** If website scraping fails for a competitor, still attempt social extraction using Phase 3 AI hints and Google search fallback
- **D-45:** If SimilarWeb fails, store null for seo_data and proceed (non-blocking)
- **D-46:** Circuit breaker: if Apify returns errors on 3+ consecutive actor calls, stop new Apify calls for 30 seconds, show "Servico de analise temporariamente lento. Tentando novamente...", resume after cooldown
- **D-47:** Update Trigger.dev metadata per-competitor for granular progress: `metadata.set('subTasks', { [competitorName]: { website: 'completed', seo: 'completed', social: 'running' } })`
- **D-48:** All error messages in PT-BR per established convention
- **D-49:** Orchestrator uses batch.triggerByTaskAndWait and handles results where some may be "unavailable" — passes whatever data it has to downstream tasks

### Claude's Discretion
- Social link regex patterns and parsing implementation details
- Exact brand name fuzzy matching algorithm for fallback validation
- CNPJ regex pattern and business identifier extraction approach
- SimilarWeb data mapping nuances (global rank → estimated authority)
- Zod schema strictness levels for validation
- How to parse Google Search results for social profile URLs
- Exact cheerio fallback implementation for website scraping
- Circuit breaker implementation details (in-memory counter vs shared state)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product Definition
- `PRD-LUPAI.md` — Full product requirements, extraction pipeline, data model
- `.planning/PROJECT.md` — Constraints: Apify free tier ($5/mo), Vercel 10s timeout, cascata independente
- `CLAUDE.md` — Stack versions, folder structure, Trigger.dev job naming (kebab-case), coding conventions

### Requirements
- `.planning/REQUIREMENTS.md` — SITE-01 (website data extraction), SEO-01 (SEO data extraction), SOCL-01 (social discovery), SOCL-02 (social metrics extraction)
- `.planning/REQUIREMENTS.md` — SITE-02, SEO-02, SOCL-03 are frontend display requirements — SKIP per user feedback (backend only)

### Prior Phase Implementation (MUST READ)
- `src/trigger/extract-website.ts` — Stub task to implement (has ExtractWebsitePayload interface)
- `src/trigger/extract-social.ts` — Stub task to implement (has ExtractSocialPayload interface)
- `src/trigger/analyze-market.ts` — Orchestrator with fan-out pattern to modify (2-batch sequential)
- `src/lib/apify/website.ts` — Website content crawler wrapper to enhance (add social link extraction)
- `src/lib/apify/instagram.ts` — Instagram scraper wrapper (ready to use)
- `src/lib/apify/tiktok.ts` — TikTok scraper wrapper (ready to use)
- `src/lib/apify/similarweb.ts` — SimilarWeb SEO data wrapper (ready to use)
- `src/lib/apify/google-search.ts` — Google Search wrapper (for social profile fallback)
- `src/lib/supabase/queries.ts` — updateCompetitor() for storing extracted JSONB data
- `src/types/competitor.ts` — WebsiteData, SeoData, SocialData, SocialPost types (may need enhancement)
- `src/lib/ai/score-competitors.ts` — ScoredCompetitor type with socialProfiles field (AI hints)

### Stack Research
- `.planning/research/STACK.md` — Trigger.dev v4 batch API, Apify client patterns
- `.planning/research/PITFALLS.md` — Apify credits management, rate limits

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `scrapeWebsite()` in `src/lib/apify/website.ts`: Crawls up to 5 pages, extracts positioning and meta tags — needs enhancement for social link extraction
- `scrapeSimilarweb()` in `src/lib/apify/similarweb.ts`: Returns SEO data (authority, keywords, traffic, backlinks) — ready to use as-is
- `scrapeInstagram()` in `src/lib/apify/instagram.ts`: Takes username, returns followers, engagement rate, top 6 posts — ready to use
- `scrapeTiktok()` in `src/lib/apify/tiktok.ts`: Takes username, returns followers, top 6 videos — ready to use
- `updateCompetitor()` in `src/lib/supabase/queries.ts`: Updates any JSONB column on competitor record — ready for storing website_data, seo_data, social_data
- `filterBlockedDomains()` and `deduplicateCandidates()` in `src/utils/competitors.ts`: URL parsing utilities — may be useful for social link extraction
- `scoreCompetitorsWithAI()` returns `socialProfiles` per competitor — these serve as fallback hints

### Established Patterns
- Trigger.dev tasks: `task({ id: 'kebab-case', maxDuration: 120, run: async (payload) => {} })` with `metadata.set()` for progress
- Apify calls: `client.actor(ACTOR_ID).call(input)` → `client.dataset().listItems()` → filter fields
- DB updates: `updateCompetitor(id, { website_data: data, seo_data: seoData })` using snake_case keys
- Error messages in PT-BR with descriptive context
- Orchestrator uses `batch.triggerByTaskAndWait()` for parallel fan-out

### Integration Points
- `extract-website` and `extract-social` stubs in `src/trigger/` need full implementation
- Orchestrator at `src/trigger/analyze-market.ts` lines 162-174 needs modification for 2-batch sequential pattern
- Types in `src/types/competitor.ts` may need enhancement (add socialLinks to WebsiteData or create new type)
- New utility function needed: social link extractor from HTML content
- New utility function needed: Google search social profile finder (fallback)

</code_context>

<specifics>
## Specific Ideas

- The website is the "master key" — it's the most reliable source for discovering a competitor's actual social media presence, not AI guesses
- Social link extraction should look for `href` attributes containing known social media domains across ALL crawled pages (not just homepage — many sites put social links only in footer/contact page)
- Phase 3's AI-scored `socialProfiles` are hints but NOT authoritative — actual website scraping takes priority
- The 2-batch orchestrator pattern benefits both Phase 4 (social needs website data) and Phase 5 (ads needs page URLs/domains)
- CNPJ extraction from website content is a Brazilian business identifier (format: XX.XXX.XXX/XXXX-XX) — useful for the synthesis phase
- SimilarWeb free tier may return limited data — handle gracefully with null fields

</specifics>

<deferred>
## Deferred Ideas

None — analysis stayed within phase scope

</deferred>

---

*Phase: 04-website-seo-social-extraction*
*Context gathered: 2026-03-27*
