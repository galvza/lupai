# Phase 4: Website, SEO & Social Extraction - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions captured in CONTEXT.md — this log preserves the analysis.

**Date:** 2026-03-27
**Phase:** 04-Website, SEO & Social Extraction
**Mode:** auto (discuss mode with --auto flag)
**Areas analyzed:** Extraction Chain Architecture, Social Link Discovery, Social Profile Fallback, SEO Extraction Timing, Orchestrator Modification, Data Validation Strategy

---

## User-Provided Context

The user provided detailed extraction order instructions before invoking discuss-phase:

1. **STEP 1 — SCRAPE WEBSITE FIRST (master key):** Extract ALL social media links from the site (footer, header, sidebar, contact page). Also extract business name, CNPJ if visible, email domain. This step MUST complete before steps 2-3.
2. **STEP 2 — FALLBACK if social links not found:** Google search "[brand name] instagram/facebook/tiktok". Match results by brand name similarity.
3. **STEP 3 — ADS DISCOVERY (depends on step 1/2):** Facebook Ad Library search by PAGE URL found in step 1 (not generic keyword). Google Ads search by DOMAIN found in step 1.

User emphasized: "Website scraping is sequential (must finish first), social media + ads extraction is parallel AFTER website data is available."

---

## Assumptions Presented

### Extraction Chain Architecture
| Assumption | Confidence | Evidence |
|------------|-----------|----------|
| Website scraping runs FIRST, then social extraction uses discovered links | Confident | User explicitly specified; orchestrator needs modification |

### Social Link Discovery
| Assumption | Confidence | Evidence |
|------------|-----------|----------|
| Enhance scrapeWebsite to extract social links from crawled HTML | Confident | Current `src/lib/apify/website.ts` only extracts positioning/meta tags |

### Social Profile Fallback
| Assumption | Confidence | Evidence |
|------------|-----------|----------|
| Use Google Search Apify actor for "[brand] platform" search | Likely | User specified mechanism; `src/lib/apify/google-search.ts` exists |

### SEO Extraction Timing
| Assumption | Confidence | Evidence |
|------------|-----------|----------|
| SimilarWeb runs parallel with website (only needs URL) | Confident | `src/lib/apify/similarweb.ts` takes websiteUrl only |

### Orchestrator Modification
| Assumption | Confidence | Evidence |
|------------|-----------|----------|
| 2-batch sequential: website+SEO first, then social+ads | Likely | Required by user's extraction order; current single batch at line 174 |

### Data Validation Strategy
| Assumption | Confidence | Evidence |
|------------|-----------|----------|
| Zod validation per sub-task, partial results OK, null on failure | Likely | Consistent with Phase 3 error handling pattern (D-28 through D-31) |

## Corrections Made

No corrections — all assumptions confirmed via auto mode.

## Auto-Resolved

- Extraction chain: auto-confirmed (user explicitly specified order)
- Social link discovery: auto-confirmed (user specified footer/header/sidebar/contact page)
- Social profile fallback: auto-confirmed (user specified Google search pattern)
- SEO timing: auto-selected parallel with website (no dependency on scraped content)
- Orchestrator: auto-selected 2-batch approach (cleanest fit for user's sequential requirement)
- Validation: auto-selected Zod schemas with partial results (consistent with Phase 3 patterns)
