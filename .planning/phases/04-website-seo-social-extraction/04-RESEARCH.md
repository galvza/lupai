# Phase 4: Website, SEO & Social Extraction - Research

**Researched:** 2026-03-27
**Domain:** Web scraping pipeline, SEO data extraction, social media discovery, Trigger.dev orchestration
**Confidence:** HIGH

## Summary

Phase 4 implements the core extraction logic for three data categories (website, SEO, social media) by filling in the `extract-website` and `extract-social` Trigger.dev task stubs created in Phase 3. The key architectural challenge is the **2-batch sequential orchestrator pattern**: website scraping and SimilarWeb SEO run in parallel (Batch 1), then social media extraction runs using the social links discovered from website scraping (Batch 2). This dependency chain requires modifying the existing `analyze-market.ts` orchestrator.

The existing codebase already provides ready-to-use Apify wrappers (`scrapeWebsite`, `scrapeSimilarweb`, `scrapeInstagram`, `scrapeTiktok`, `scrapeGoogleSearch`), type definitions (`WebsiteData`, `SeoData`, `SocialData`), and the database layer (`updateCompetitor`). The main new code to write is: (1) social link extraction from crawled website content, (2) Google Search fallback for missing social profiles, (3) brand name fuzzy matching for fallback validation, (4) Zod validation schemas for all extracted data, and (5) the orchestrator refactoring to 2-batch sequential.

**Primary recommendation:** Implement the 2-batch pattern in the orchestrator first, then fill in extract-website (compound task: scrape + social links + SEO in parallel), then extract-social, then add Google Search fallback logic. All new utility functions should be in `src/utils/` to keep Trigger.dev tasks thin.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Website scraping is SEQUENTIAL -- must complete before social extraction begins
- **D-02:** Extract ALL social media links from scraped website pages (footer, header, sidebar, contact page): instagram.com, facebook.com, tiktok.com, youtube.com, linkedin.com, twitter.com/x.com
- **D-03:** Also extract business name, CNPJ if visible, and email domain from website content
- **D-04:** Google Search fallback when social links NOT found on site: search "[brand name] instagram", "[brand name] facebook", "[brand name] tiktok"
- **D-05:** Match Google search fallback results by brand name similarity to avoid false positives
- **D-06:** Social media extraction (Instagram + TikTok) runs in PARALLEL after website data is available
- **D-07:** SEO extraction (SimilarWeb) runs in PARALLEL with website scraping -- it only needs the URL, not scraped content
- **D-08:** `extract-website` becomes a compound task that does 3 things: (1) scrape website content via Apify, (2) extract social links from HTML, (3) run SimilarWeb for SEO data -- steps 1+3 in parallel, step 2 after step 1
- **D-09:** Enhance `scrapeWebsite()` to return social links alongside website data -- add a `socialLinks` field to the return type with `{ instagram: string | null, tiktok: string | null, facebook: string | null, youtube: string | null, linkedin: string | null, twitter: string | null }`
- **D-10:** Social link extraction uses regex/pattern matching on all crawled pages (not just homepage): look for `href` attributes containing social media domains
- **D-11:** Website content analysis should extract: positioning text (first 500 chars), meta tags (title, description, keywords), detected social links, business identifiers (CNPJ regex, email domain)
- **D-12:** Store `website_data` AND `seo_data` JSONB columns on the competitor record via `updateCompetitor()`
- **D-13:** `extract-website` RETURNS the discovered social links (or null) so the orchestrator can pass them to `extract-social`
- **D-14:** When website scraping finds NO social links for a given platform, activate Google Search fallback
- **D-15:** Use existing Google Search Apify actor (`src/lib/apify/google-search.ts`) to search "[competitor name] instagram" etc.
- **D-16:** Parse Google search results for URLs matching social media platform domains
- **D-17:** Validate found profiles by brand name similarity (fuzzy match competitor name against profile name/handle)
- **D-18:** Fallback has a lower confidence than website-discovered links -- store a `source` field per social profile ("website" | "search_fallback" | "ai_hint")
- **D-19:** Phase 3 AI-scored `socialProfiles` are treated as HINTS only -- actual extraction uses website-discovered or search-fallback links
- **D-20:** `extract-social` receives social profile URLs/usernames from the orchestrator (sourced from website discovery or fallback)
- **D-21:** Run Instagram and TikTok scraping in PARALLEL within the task (both are independent Apify calls)
- **D-22:** Use existing `scrapeInstagram()` and `scrapeTiktok()` wrappers -- they already filter fields per D-15 from Phase 1
- **D-23:** Store `social_data` JSONB column on the competitor record via `updateCompetitor()`
- **D-24:** If a social profile URL is null/not found, skip that platform gracefully (don't fail the whole task)
- **D-25:** Modify `analyze-market.ts` orchestrator to run extraction in 2 sequential batches: Batch 1 = extractWebsite (all competitors parallel) + extractViral (independent); Batch 2 = extractSocial (all competitors parallel, using social links from Batch 1) + extractAds (using website URLs from Batch 1)
- **D-26:** Between batches, collect social links from each `extractWebsite` result and merge with Phase 3 AI hints (website-discovered links take priority)
- **D-27:** This 2-batch pattern also benefits Phase 5 (ads extraction depends on website page URLs for Meta Ads Library search)
- **D-28:** Each sub-task validates extracted data with Zod schemas before storing to Supabase
- **D-29:** Website data: must have at least one non-null field (positioning OR metaTags.title OR metaTags.description) to be considered valid
- **D-30:** SEO data: must have at least one of (estimatedAuthority, topKeywords.length > 0, estimatedTraffic) to be valid
- **D-31:** Social data: platform-level validation -- each platform (instagram, tiktok) validates independently; partial success is OK
- **D-32:** On invalid/empty extraction: store null for that data category, update metadata with warning, do NOT fail the task
- **D-33:** If website scraping fails for a competitor, still attempt social extraction using Phase 3 AI hints and Google search fallback
- **D-34:** If SimilarWeb fails, store null for seo_data and proceed (non-blocking)
- **D-35:** Update Trigger.dev metadata per-competitor for granular progress: `metadata.set('subTasks', { [competitorName]: { website: 'completed', seo: 'completed', social: 'running' } })`
- **D-36:** All error messages in PT-BR per established convention

### Claude's Discretion
- Social link regex patterns and parsing implementation details
- Exact brand name fuzzy matching algorithm for fallback validation
- CNPJ regex pattern and business identifier extraction approach
- SimilarWeb data mapping nuances (global rank to estimated authority)
- Zod schema strictness levels for validation
- How to parse Google Search results for social profile URLs

### Deferred Ideas (OUT OF SCOPE)
None -- analysis stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SITE-01 | System extracts competitor website data (positioning, offer, pricing when visible, meta tags) | Existing `scrapeWebsite()` wrapper handles crawling; needs enhancement for social link extraction. Website data stored via `updateCompetitor()` in `website_data` JSONB column. |
| SITE-02 | Results display website analysis per competitor in organized cards | SKIPPED -- frontend display requirement, backend only per user feedback |
| SEO-01 | System extracts SEO data per competitor (estimated authority, top keywords, estimated traffic) | Existing `scrapeSimilarweb()` wrapper is ready to use. Runs in parallel with website scraping (D-07). Stored in `seo_data` JSONB column. |
| SEO-02 | Results display SEO analysis per competitor with key metrics | SKIPPED -- frontend display requirement, backend only per user feedback |
| SOCL-01 | System discovers and analyzes competitor social media presence (Instagram, TikTok) | Three-tier discovery: (1) website scraping finds social links, (2) Google Search fallback, (3) Phase 3 AI hints. Priority: website > search_fallback > ai_hint. |
| SOCL-02 | System extracts posting frequency, follower counts, engagement rates, top recent posts | Existing `scrapeInstagram()` and `scrapeTiktok()` wrappers return these fields. Run in parallel within `extract-social` task. |
| SOCL-03 | Results display social media overview per competitor | SKIPPED -- frontend display requirement, backend only per user feedback |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **Stack:** Trigger.dev v4 tasks for all extraction (not API routes), `apify-client` v2 for actors, Zod v3.24 for validation, TypeScript 5.x
- **File structure:** Trigger.dev tasks in `src/trigger/`, Apify wrappers in `src/lib/apify/`, utils in `src/utils/`, types in `src/types/`
- **Naming:** Tasks use kebab-case IDs, files use camelCase, types use PascalCase, DB columns use snake_case
- **Error messages:** All in PT-BR
- **No `any` type** without justification
- **Functions > 30 lines** must be split
- **Each cascade step independent** -- failure in one does not block others
- **Filter Apify output at extraction time** -- never store raw actor responses
- **JSDoc on all public functions**
- **Skip frontend/UI** -- backend only per user memory
- **Commit per feature/task** -- atomic commits

## Standard Stack

### Core (Already Installed)
| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| `@trigger.dev/sdk` | ^4 (4.3.x) | Task orchestration, batch API, metadata | Installed |
| `apify-client` | ^2 (2.22.x) | Apify actor calls | Installed |
| `zod` | 3.25.76 (pinned) | Schema validation for extracted data | Installed |
| `@supabase/supabase-js` | ^2 | Database operations | Installed |

### New Utilities Needed (No New Dependencies)
| Utility | Location | Purpose |
|---------|----------|---------|
| Social link extractor | `src/utils/socialLinks.ts` | Parse social media URLs from website content |
| Social profile finder (fallback) | `src/utils/socialFallback.ts` | Google Search fallback + brand name matching |
| CNPJ/business ID extractor | `src/utils/businessIdentifiers.ts` | Extract CNPJ, email domain from text |
| Validation schemas | `src/lib/validation/extractionSchemas.ts` | Zod schemas for website, SEO, social data |

### No New Dependencies Required
The phase does not need any external libraries beyond what is already installed. Fuzzy string matching for brand name similarity (D-05, D-17) can be implemented with a simple Levenshtein distance function (~15 lines) or normalized inclusion check rather than adding a library like `fuse.js` or `fastest-levenshtein`. This keeps the dependency footprint minimal per project constraints.

## Architecture Patterns

### Recommended File Structure
```
src/
  trigger/
    analyze-market.ts         # MODIFY: 2-batch sequential orchestrator
    extract-website.ts        # IMPLEMENT: compound website+SEO+social-links task
    extract-social.ts         # IMPLEMENT: Instagram+TikTok parallel extraction
    extract-ads.ts            # UNTOUCHED (Phase 5 stub)
    extract-viral.ts          # UNTOUCHED (Phase 6 stub)
  lib/
    apify/
      website.ts              # ENHANCE: return social links from crawled pages
      similarweb.ts           # UNTOUCHED (ready to use)
      instagram.ts            # UNTOUCHED (ready to use)
      tiktok.ts               # UNTOUCHED (ready to use)
      google-search.ts        # UNTOUCHED (ready to use for fallback)
    validation/
      extractionSchemas.ts    # NEW: Zod schemas for website, SEO, social validation
    supabase/
      queries.ts              # UNTOUCHED (updateCompetitor already works)
  utils/
    socialLinks.ts            # NEW: extract social links from text/markdown
    socialFallback.ts         # NEW: Google Search fallback + fuzzy matching
    businessIdentifiers.ts    # NEW: CNPJ regex, email domain extraction
    competitors.ts            # UNTOUCHED (existing URL utilities)
  types/
    competitor.ts             # ENHANCE: add SocialLinks type, extend WebsiteData
tests/
  unit/
    extract-website.test.ts   # NEW
    extract-social.test.ts    # NEW
    social-links.test.ts      # NEW
    social-fallback.test.ts   # NEW
    business-identifiers.test.ts # NEW
    extraction-schemas.test.ts   # NEW
    analyze-market-batches.test.ts # NEW (or extend existing)
```

### Pattern 1: Compound Task with Internal Parallelism
**What:** `extract-website` runs website scraping + SimilarWeb in parallel using `Promise.allSettled()`, then extracts social links from the scraping result.
**When to use:** When a single logical task needs multiple independent sub-operations before a dependent final step.
**Example:**
```typescript
// Inside extract-website task run function
const [websiteResult, seoResult] = await Promise.allSettled([
  scrapeWebsite(payload.websiteUrl),
  scrapeSimilarweb(payload.websiteUrl),
]);

// Extract social links from website result (depends on scraping completing)
const websiteData = websiteResult.status === 'fulfilled' ? websiteResult.value : null;
const socialLinks = websiteData ? extractSocialLinksFromText(websiteData.rawText) : null;
const seoData = seoResult.status === 'fulfilled' ? seoResult.value : null;

// Store both results
await updateCompetitor(payload.competitorId, {
  website_data: websiteData ? validateWebsiteData(websiteData) : null,
  seo_data: seoData ? validateSeoData(seoData) : null,
});

return { competitorId: payload.competitorId, socialLinks, websiteData, seoData };
```

### Pattern 2: 2-Batch Sequential Orchestrator
**What:** The orchestrator runs two sequential `batch.triggerByTaskAndWait()` calls. Batch 1 collects data needed by Batch 2.
**When to use:** When later extraction tasks depend on outputs from earlier tasks.
**Example:**
```typescript
// Batch 1: Website + Viral (parallel, no dependencies on each other)
const { runs: batch1Runs } = await batch.triggerByTaskAndWait([
  ...competitors.map(c => ({
    task: extractWebsite,
    payload: { analysisId, competitorId: c.id, competitorName: c.name, websiteUrl: c.websiteUrl }
  })),
  { task: extractViral, payload: { analysisId, niche, segment, region } },
]);

// Collect social links from Batch 1 results
const socialLinksPerCompetitor = collectSocialLinks(batch1Runs, competitors, aiHints);

// Batch 2: Social + Ads (parallel, depend on Batch 1 results)
const { runs: batch2Runs } = await batch.triggerByTaskAndWait([
  ...competitors.map((c, i) => ({
    task: extractSocial,
    payload: { analysisId, competitorId: c.id, competitorName: c.name, socialProfiles: socialLinksPerCompetitor[i] }
  })),
  ...competitors.map(c => ({
    task: extractAds,
    payload: { analysisId, competitorId: c.id, competitorName: c.name, websiteUrl: c.websiteUrl }
  })),
]);
```

### Pattern 3: Social Link Extraction from Markdown/Text
**What:** Parse social media URLs from crawled website text content using regex.
**When to use:** After Apify Website Content Crawler returns page text/markdown.
**Example:**
```typescript
const SOCIAL_DOMAINS: Record<string, RegExp> = {
  instagram: /(?:https?:\/\/)?(?:www\.)?instagram\.com\/([a-zA-Z0-9_.]+)/g,
  tiktok: /(?:https?:\/\/)?(?:www\.)?tiktok\.com\/@?([a-zA-Z0-9_.]+)/g,
  facebook: /(?:https?:\/\/)?(?:www\.)?(?:facebook|fb)\.com\/([a-zA-Z0-9_.]+)/g,
  youtube: /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:c\/|channel\/|@)?|youtu\.be\/)([a-zA-Z0-9_-]+)/g,
  linkedin: /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/(?:company|in)\/([a-zA-Z0-9_-]+)/g,
  twitter: /(?:https?:\/\/)?(?:www\.)?(?:twitter|x)\.com\/([a-zA-Z0-9_]+)/g,
};

export const extractSocialLinksFromText = (text: string): SocialLinks => {
  const links: SocialLinks = { instagram: null, tiktok: null, facebook: null, youtube: null, linkedin: null, twitter: null };
  for (const [platform, regex] of Object.entries(SOCIAL_DOMAINS)) {
    const match = regex.exec(text);
    if (match) links[platform as keyof SocialLinks] = match[1];
  }
  return links;
};
```

### Pattern 4: Google Search Fallback for Social Profiles
**What:** When website scraping finds no social links for a platform, search Google for "[brand name] instagram" and validate results.
**When to use:** After Batch 1 completes, before constructing Batch 2 social payloads.
**Example:**
```typescript
export const findSocialProfileViaSearch = async (
  competitorName: string,
  platform: string
): Promise<{ username: string; source: 'search_fallback' } | null> => {
  const results = await scrapeGoogleSearch([`${competitorName} ${platform}`]);
  const platformDomain = PLATFORM_DOMAINS[platform]; // e.g., 'instagram.com'

  for (const result of results) {
    if (!result.url.includes(platformDomain)) continue;
    const username = extractUsernameFromUrl(result.url, platform);
    if (!username) continue;
    if (isBrandNameSimilar(competitorName, username)) {
      return { username, source: 'search_fallback' };
    }
  }
  return null;
};
```

### Anti-Patterns to Avoid
- **Running social extraction without waiting for website data:** The orchestrator MUST wait for Batch 1 before starting Batch 2. Never use `Promise.all` to run both batches simultaneously.
- **Failing the entire task on one sub-operation failure:** Use `Promise.allSettled` inside compound tasks, not `Promise.all`. Individual failures (SimilarWeb down, Instagram rate-limited) should produce null for that data category, not crash the task.
- **Storing raw Apify output:** Always filter fields before storing. The existing wrappers already do this, but new code must follow the same pattern.
- **Hardcoding social media URLs in task payloads:** The social profile discovery is dynamic -- website scraping, fallback, or AI hints. The orchestrator must merge these sources before passing to `extract-social`.
- **Running Google Search fallback for every platform unconditionally:** Only search for platforms where website scraping found NO link. This saves Apify credits.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Social link regex matching | Custom HTML parser with DOM traversal | Regex on text/markdown content | The Website Content Crawler returns text, not DOM. Regex on text is simpler and covers all crawled pages. |
| Website scraping | Custom fetch + cheerio pipeline | `scrapeWebsite()` Apify wrapper (existing) | Already built in Phase 1, handles pagination, rate limits, anti-bot. |
| SEO data extraction | Custom SimilarWeb API integration | `scrapeSimilarweb()` Apify wrapper (existing) | Already built, filters fields. |
| Instagram/TikTok scraping | Custom social media API calls | `scrapeInstagram()` / `scrapeTiktok()` wrappers (existing) | Already built, handle anti-bot, filter fields. |
| Google Search | Custom search API | `scrapeGoogleSearch()` wrapper (existing) | Already built, handles pagination. |
| Database updates | Custom SQL queries | `updateCompetitor()` (existing) | Already handles JSONB column updates. |
| Batch task orchestration | Custom Promise management | `batch.triggerByTaskAndWait()` from Trigger.dev | Handles retries, timeouts, and provides typed results per task. |

**Key insight:** Phase 4 is primarily a **wiring phase** -- connecting existing components in the correct order with proper data flow. The new code is mostly utility functions (social link extraction, fuzzy matching, validation schemas) and orchestrator logic. Resist the urge to refactor existing wrappers.

## Common Pitfalls

### Pitfall 1: Website Content Crawler Returns Text, Not HTML
**What goes wrong:** Developer assumes the Apify Website Content Crawler returns raw HTML with `<a href>` tags, then tries to use DOM parsing or cheerio to extract links. The actor actually returns cleaned text or markdown by default, stripping most HTML structure.
**Why it happens:** The existing `scrapeWebsite()` wrapper already processes items as text (line 27-30 in website.ts). The crawler's default output format is markdown/text, not HTML.
**How to avoid:** Extract social links from the **text content** (which preserves URLs in markdown `[text](url)` format) or request the crawler to also save HTML via `saveHtml: true` input parameter. The text/markdown approach is cheaper (no extra storage) and sufficient for URL extraction via regex.
**Warning signs:** Trying to `import cheerio` or use `DOMParser` on the crawler output.

### Pitfall 2: Regex Matches Non-Profile Social URLs
**What goes wrong:** The social link regex matches URLs like `instagram.com/explore` or `facebook.com/sharer/share.php` or `twitter.com/intent/tweet` instead of actual profile URLs. These are navigation/sharing URLs, not competitor profiles.
**Why it happens:** A naive regex matching `instagram.com/anything` will match sharing widgets, embed codes, and navigation links alongside actual profiles.
**How to avoid:** Maintain an exclusion list of known non-profile paths: `explore`, `p/`, `reel/`, `stories/`, `sharer/`, `intent/`, `share`, `login`, `signup`, `help`, `about`, `legal`, `privacy`, `terms`. Only accept matches where the captured username is a plausible profile handle (alphanumeric + underscores, 1-30 chars, not in the exclusion list).
**Warning signs:** Every website returning 6+ social links when most only have 2-3 actual profiles.

### Pitfall 3: SimilarWeb Returns Empty Data for Small Sites
**What goes wrong:** SimilarWeb only tracks sites with significant traffic. Small/local businesses (which are common competitors in many niches) return null or zero data, making the SEO section look empty for most analyses.
**Why it happens:** SimilarWeb's free/scraper tier has limited coverage. The PITFALLS.md document explicitly calls this out.
**How to avoid:** Per D-34, store null for `seo_data` and proceed. Do NOT treat this as an error. The validation schema (D-30) already allows partial data. In the orchestrator, log a metadata warning but continue normally.
**Warning signs:** Test data always using well-known brands that SimilarWeb tracks. Test with a small local business URL to verify graceful degradation.

### Pitfall 4: Google Search Fallback Consumes Excessive Apify Credits
**What goes wrong:** For 4 competitors x 3 platforms (Instagram, TikTok, Facebook) = 12 Google Search actor calls in the worst case. Each call consumes credits. If website scraping rarely finds social links, the fallback fires for almost every competitor/platform combination.
**Why it happens:** Google Search is treated as a cheap operation, but at Apify free tier ($5/month), 12 additional actor calls per analysis adds up fast.
**How to avoid:** (1) Only run fallback for platforms where website scraping found NO link (D-14). (2) Batch multiple search queries into a single `scrapeGoogleSearch()` call -- the existing wrapper accepts an array of queries. (3) Limit fallback to Instagram and TikTok only (the platforms we actually scrape), not all 6 social platforms. (4) Use Phase 3 AI hints as the FIRST fallback before burning a Google Search call.
**Warning signs:** More than 2 Google Search actor calls per analysis in logs.

### Pitfall 5: ExtractWebsitePayload Interface Too Narrow
**What goes wrong:** The existing `ExtractWebsitePayload` has `{ analysisId, competitorId, competitorName, websiteUrl }`. But `extract-website` now needs to return social links. If the return type isn't updated, the orchestrator can't access social links from Batch 1 results.
**Why it happens:** The stub was designed for simple extraction. The compound task needs a richer return type.
**How to avoid:** Define a clear `ExtractWebsiteResult` return interface that includes `socialLinks`, `websiteData`, `seoData`, and status per sub-operation. The orchestrator then destructures the Batch 1 runs to collect social links.
**Warning signs:** TypeScript errors when trying to access `.socialLinks` on batch run outputs.

### Pitfall 6: Orchestrator Becomes a Monolithic Function
**What goes wrong:** Adding 2-batch logic, social link merging, fallback orchestration, and progress tracking inflates `analyze-market.ts` beyond readability. The existing orchestrator is already ~200 lines.
**Why it happens:** All orchestration logic naturally lives in one place, and it grows with each phase.
**How to avoid:** Extract helper functions: `collectSocialLinksFromBatch1()`, `mergeSocialSources()`, `buildBatch2Payloads()`. Keep the orchestrator as a high-level sequence of named steps. Helper functions can live in `src/utils/` or as module-level functions in the same file.
**Warning signs:** The run function exceeding 50 lines without extracted helpers.

## Code Examples

### Social Link Extraction with Exclusion List
```typescript
// src/utils/socialLinks.ts

/** Caminhos conhecidos que nao sao perfis de usuario */
const NON_PROFILE_PATHS = new Set([
  'explore', 'reels', 'stories', 'p', 'reel', 'tv',
  'sharer', 'share', 'intent', 'hashtag',
  'login', 'signup', 'register', 'help', 'about',
  'legal', 'privacy', 'terms', 'settings',
]);

/** Links de redes sociais extraidos de um site */
export interface SocialLinks {
  instagram: string | null;
  tiktok: string | null;
  facebook: string | null;
  youtube: string | null;
  linkedin: string | null;
  twitter: string | null;
}

const SOCIAL_PATTERNS: Record<keyof SocialLinks, RegExp> = {
  instagram: /(?:https?:\/\/)?(?:www\.)?instagram\.com\/([a-zA-Z0-9_.]{1,30})/gi,
  tiktok: /(?:https?:\/\/)?(?:www\.)?tiktok\.com\/@([a-zA-Z0-9_.]{1,30})/gi,
  facebook: /(?:https?:\/\/)?(?:www\.)?(?:facebook|fb)\.com\/([a-zA-Z0-9_.]{1,50})/gi,
  youtube: /(?:https?:\/\/)?(?:www\.)?youtube\.com\/(?:c\/|channel\/|@)([a-zA-Z0-9_-]{1,50})/gi,
  linkedin: /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/(?:company|in)\/([a-zA-Z0-9_-]{1,100})/gi,
  twitter: /(?:https?:\/\/)?(?:www\.)?(?:twitter|x)\.com\/([a-zA-Z0-9_]{1,15})/gi,
};

/**
 * Extrai links de redes sociais do texto/markdown de paginas crawleadas.
 * @param pagesText - Texto concatenado de todas as paginas crawleadas
 * @returns Links encontrados por plataforma (username ou null)
 */
export const extractSocialLinksFromText = (pagesText: string): SocialLinks => {
  const links: SocialLinks = {
    instagram: null, tiktok: null, facebook: null,
    youtube: null, linkedin: null, twitter: null,
  };

  for (const [platform, regex] of Object.entries(SOCIAL_PATTERNS)) {
    const allMatches: string[] = [];
    let match;
    // Reset regex lastIndex
    regex.lastIndex = 0;
    while ((match = regex.exec(pagesText)) !== null) {
      const username = match[1].toLowerCase();
      if (!NON_PROFILE_PATHS.has(username)) {
        allMatches.push(username);
      }
    }
    // Take the most frequent match (handles repeated footer links)
    if (allMatches.length > 0) {
      links[platform as keyof SocialLinks] = getMostFrequent(allMatches);
    }
  }

  return links;
};
```

### Brand Name Similarity for Fallback Validation
```typescript
// src/utils/socialFallback.ts

/**
 * Verifica similaridade entre nome da marca e handle de rede social.
 * Usa comparacao normalizada: remove acentos, lowercase, verifica inclusao.
 * @param brandName - Nome do concorrente
 * @param handle - Handle/username encontrado na busca
 * @returns true se os nomes sao similares o suficiente
 */
export const isBrandNameSimilar = (brandName: string, handle: string): boolean => {
  const normalizedBrand = normalize(brandName);
  const normalizedHandle = normalize(handle);

  // Exact inclusion check (brand in handle or handle in brand)
  if (normalizedHandle.includes(normalizedBrand) || normalizedBrand.includes(normalizedHandle)) {
    return true;
  }

  // Word overlap: at least 50% of brand words present in handle
  const brandWords = normalizedBrand.split(/[\s_.-]+/).filter(w => w.length > 2);
  const matchingWords = brandWords.filter(w => normalizedHandle.includes(w));
  return brandWords.length > 0 && matchingWords.length / brandWords.length >= 0.5;
};

/** Normaliza string: remove acentos, lowercase, remove caracteres especiais */
const normalize = (str: string): string =>
  str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
```

### CNPJ Extraction
```typescript
// src/utils/businessIdentifiers.ts

/** Regex para CNPJ com ou sem mascara: XX.XXX.XXX/XXXX-XX ou XXXXXXXXXXXXXX */
const CNPJ_REGEX = /\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/g;

/** Regex para email (extrair dominio) */
const EMAIL_REGEX = /[\w.-]+@([\w-]+\.[\w.-]+)/gi;

export interface BusinessIdentifiers {
  cnpj: string | null;
  emailDomain: string | null;
}

/**
 * Extrai identificadores de negocio do texto de um site.
 * @param text - Texto do site crawleado
 * @returns CNPJ e dominio de email encontrados
 */
export const extractBusinessIdentifiers = (text: string): BusinessIdentifiers => {
  const cnpjMatch = CNPJ_REGEX.exec(text);
  const emailMatch = EMAIL_REGEX.exec(text);

  return {
    cnpj: cnpjMatch ? cnpjMatch[0] : null,
    emailDomain: emailMatch ? emailMatch[1] : null,
  };
};
```

### Validation Schemas
```typescript
// src/lib/validation/extractionSchemas.ts
import { z } from 'zod';

/** Schema para validacao de dados de website (D-29) */
export const websiteDataSchema = z.object({
  positioning: z.string().nullable(),
  offer: z.string().nullable(),
  pricing: z.string().nullable(),
  metaTags: z.object({
    title: z.string().nullable(),
    description: z.string().nullable(),
    keywords: z.array(z.string()),
  }),
}).refine(
  (data) => data.positioning !== null || data.metaTags.title !== null || data.metaTags.description !== null,
  { message: 'Dados do website insuficientes: nenhum campo relevante encontrado' }
);

/** Schema para validacao de dados de SEO (D-30) */
export const seoDataSchema = z.object({
  estimatedAuthority: z.number().nullable(),
  topKeywords: z.array(z.string()),
  estimatedTraffic: z.number().nullable(),
  backlinks: z.number().nullable(),
}).refine(
  (data) => data.estimatedAuthority !== null || data.topKeywords.length > 0 || data.estimatedTraffic !== null,
  { message: 'Dados de SEO insuficientes: nenhuma metrica encontrada' }
);

/** Schema para validacao de dados sociais por plataforma (D-31) */
export const socialPlatformSchema = z.object({
  followers: z.number().nullable(),
  postingFrequency: z.string().nullable(),
  engagementRate: z.number().nullable(),
  topPosts: z.array(z.object({
    url: z.string(),
    caption: z.string().nullable(),
    likes: z.number(),
    comments: z.number(),
    shares: z.number().nullable(),
    postedAt: z.string().nullable(),
  })),
}).nullable();

export const socialDataSchema = z.object({
  instagram: socialPlatformSchema,
  tiktok: socialPlatformSchema,
});
```

### Enhanced scrapeWebsite Return Type
```typescript
// Enhancement to src/lib/apify/website.ts

import type { WebsiteData } from '@/types/competitor';
import type { SocialLinks } from '@/utils/socialLinks';
import type { BusinessIdentifiers } from '@/utils/businessIdentifiers';

/** Resultado completo da extracao de website incluindo social links */
export interface WebsiteScrapingResult {
  websiteData: WebsiteData | null;
  socialLinks: SocialLinks;
  businessIdentifiers: BusinessIdentifiers;
  rawPagesText: string; // Concatenated text from all crawled pages
}
```

## Type Enhancements Required

### WebsiteData Extension
The existing `WebsiteData` interface in `src/types/competitor.ts` needs to be extended with business identifiers per D-03:

```typescript
export interface WebsiteData {
  positioning: string | null;
  offer: string | null;
  pricing: string | null;
  metaTags: {
    title: string | null;
    description: string | null;
    keywords: string[];
  };
  businessIdentifiers?: {
    cnpj: string | null;
    emailDomain: string | null;
  };
}
```

### SocialLinks Type (New)
```typescript
export interface SocialLinks {
  instagram: string | null;
  tiktok: string | null;
  facebook: string | null;
  youtube: string | null;
  linkedin: string | null;
  twitter: string | null;
}
```

### ExtractWebsiteResult (New Return Type)
```typescript
export interface ExtractWebsiteResult {
  competitorId: string;
  websiteData: WebsiteData | null;
  seoData: SeoData | null;
  socialLinks: SocialLinks;
  warnings: string[];
}
```

### ExtractSocialPayload Enhancement
The existing `ExtractSocialPayload` needs the `source` field per D-18:
```typescript
export interface SocialProfileInput {
  username: string | null;
  source: 'website' | 'search_fallback' | 'ai_hint';
}

export interface ExtractSocialPayload {
  analysisId: string;
  competitorId: string;
  competitorName: string;
  socialProfiles: {
    instagram: SocialProfileInput | null;
    tiktok: SocialProfileInput | null;
  };
}
```

## Apify Website Content Crawler Output Reference

The crawler returns items with these relevant fields per page crawled:

| Field | Type | Description |
|-------|------|-------------|
| `url` | string | URL of the crawled page |
| `title` | string | Page title |
| `text` | string | Cleaned text content (markdown or plain text depending on config) |
| `metadata.description` | string | Meta description |
| `metadata.languageCode` | string | Detected language code |
| `crawl.depth` | number | Crawling depth from start URL |
| `crawl.loadedAt` | string | ISO timestamp of page load |

**Key insight:** The crawler does NOT return a parsed `links` array. Social links must be extracted from the `text` field using regex. If `text` is in markdown format, links appear as `[text](url)`. If plain text, URLs appear inline. The regex patterns above handle both formats.

**Input parameters used:**
```typescript
{
  startUrls: [{ url: websiteUrl }],
  maxCrawlPages: 5,          // Already set in existing wrapper
  // Consider adding:
  // crawlerType: 'cheerio',  // Cheaper than playwright, sufficient for link extraction
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single-batch extraction (all tasks parallel) | 2-batch sequential (website first, then social) | Phase 4 design decision | Social extraction gets accurate links from website discovery instead of AI guesses |
| AI-only social profile discovery | 3-tier: website > search fallback > AI hints | Phase 4 design decision | Much higher accuracy for social profile URLs |
| HTML DOM parsing for link extraction | Regex on text/markdown output | Apify crawler default | Simpler, no cheerio dependency, works across all page formats |

## Open Questions

1. **Website Content Crawler `crawlerType` for social link extraction**
   - What we know: `cheerio` is cheaper and faster; `playwright` handles JS-rendered content
   - What's unclear: Whether social links in footers are always in the static HTML or sometimes rendered by JavaScript
   - Recommendation: Use `cheerio` by default (existing wrapper doesn't specify, which defaults to auto-detection by the actor). If social link extraction yields poor results in testing, switch to `playwright:chrome`.

2. **Apify credit budget for Google Search fallback**
   - What we know: Free tier is $5/month. Each Google Search actor call consumes credits.
   - What's unclear: Exact credit cost per Google Search call on the Apify free plan.
   - Recommendation: Batch queries (multiple platforms in one call) and limit fallback to Instagram + TikTok only. Use AI hints before spending credits on search.

3. **ExtractSocialPayload backward compatibility**
   - What we know: The existing stub has `socialProfiles: { instagram: string | null; tiktok: string | null; facebook: string | null; }`.
   - What's unclear: Whether changing the payload type breaks the existing test mocks.
   - Recommendation: Extend the type to include `source` field while keeping backward compatibility. Update test mocks accordingly.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.x |
| Config file | `vitest.config.ts` |
| Quick run command | `npm test -- --run` |
| Full suite command | `npm test` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SITE-01 | Website data extracted and stored | unit | `npx vitest run tests/unit/extract-website.test.ts -t "website"` | No -- Wave 0 |
| SEO-01 | SEO data extracted and stored | unit | `npx vitest run tests/unit/extract-website.test.ts -t "seo"` | No -- Wave 0 |
| SOCL-01 | Social profiles discovered from website + fallback | unit | `npx vitest run tests/unit/social-links.test.ts` | No -- Wave 0 |
| SOCL-02 | Instagram + TikTok data extracted in parallel | unit | `npx vitest run tests/unit/extract-social.test.ts` | No -- Wave 0 |
| D-25 | Orchestrator runs 2 sequential batches | unit | `npx vitest run tests/unit/analyze-market.test.ts -t "batches"` | Partially (existing test needs extension) |
| D-28-32 | Validation schemas reject invalid data | unit | `npx vitest run tests/unit/extraction-schemas.test.ts` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `npm test -- --run`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/unit/extract-website.test.ts` -- covers SITE-01, SEO-01 (compound task with mock Apify calls)
- [ ] `tests/unit/extract-social.test.ts` -- covers SOCL-02 (parallel Instagram + TikTok with mocks)
- [ ] `tests/unit/social-links.test.ts` -- covers SOCL-01 (regex extraction, exclusion list, edge cases)
- [ ] `tests/unit/social-fallback.test.ts` -- covers D-14 to D-19 (Google Search fallback, fuzzy matching)
- [ ] `tests/unit/business-identifiers.test.ts` -- covers D-03 (CNPJ regex, email extraction)
- [ ] `tests/unit/extraction-schemas.test.ts` -- covers D-28 to D-32 (Zod validation)

## Sources

### Primary (HIGH confidence)
- Existing codebase analysis: `src/trigger/extract-website.ts`, `src/trigger/extract-social.ts`, `src/trigger/analyze-market.ts` -- current stub implementations and orchestrator logic
- Existing Apify wrappers: `src/lib/apify/website.ts`, `src/lib/apify/similarweb.ts`, `src/lib/apify/instagram.ts`, `src/lib/apify/tiktok.ts`, `src/lib/apify/google-search.ts` -- ready-to-use functions
- Existing types: `src/types/competitor.ts` -- WebsiteData, SeoData, SocialData, SocialPost interfaces
- Existing queries: `src/lib/supabase/queries.ts` -- `updateCompetitor()` function
- [Trigger.dev v4 batch API docs](https://trigger.dev/docs/triggering) -- `batch.triggerByTaskAndWait()` signature and return types
- `.planning/phases/04-website-seo-social-extraction/04-CONTEXT.md` -- 36 locked decisions for this phase

### Secondary (MEDIUM confidence)
- [Apify Website Content Crawler](https://apify.com/apify/website-content-crawler) -- Output fields confirmed: url, title, text, metadata.description, crawl.depth
- [Apify Website Content Crawler guide](https://use-apify.com/docs/how-to-use-apify/scrape-website-content) -- Output schema with field types
- [CNPJ regex patterns](https://regex101.com/library/yA2yC4) -- Brazilian CNPJ format regex verified
- `.planning/research/PITFALLS.md` -- SimilarWeb empty data for small sites, Apify credit management

### Tertiary (LOW confidence)
- Fuzzy string matching approach: custom normalized inclusion check. No external library used. May need tuning thresholds if false positives/negatives appear in testing.
- Website Content Crawler `saveHtml` parameter: confirmed deprecated in favor of `saveHtmlAsFile`. Markdown text extraction approach is recommended.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already installed, wrappers already built
- Architecture: HIGH -- 2-batch pattern is well-defined in CONTEXT.md, Trigger.dev batch API is documented
- Pitfalls: HIGH -- verified against PITFALLS.md research and codebase analysis
- Social link extraction: MEDIUM -- regex approach is standard but edge cases (JS-rendered links, non-profile paths) need testing
- Fuzzy matching: MEDIUM -- simple normalized inclusion check; may need refinement in practice

**Research date:** 2026-03-27
**Valid until:** 2026-04-10 (stable domain, no fast-moving dependencies)
