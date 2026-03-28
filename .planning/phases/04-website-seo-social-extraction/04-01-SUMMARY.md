---
phase: 04-website-seo-social-extraction
plan: 01
subsystem: api
tags: [regex, zod, social-links, apify, scraping, validation, tdd]

# Dependency graph
requires:
  - phase: 03-competitor-discovery
    provides: scrapeGoogleSearch, ScoredCompetitor with socialProfiles, scrapeWebsite base
provides:
  - SocialLinks type and extractSocialLinksFromText utility (6-platform regex extraction)
  - SocialProfileInput, ExtractWebsiteResult, ExtractSocialResult types
  - isBrandNameSimilar fuzzy matching for brand-to-handle validation
  - findSocialProfilesViaSearch Google fallback with brand validation
  - mergeSocialSources priority merge (website > search > ai_hint)
  - extractBusinessIdentifiers (CNPJ + email domain from text)
  - websiteDataSchema, seoDataSchema, socialDataSchema Zod validation
  - validateOrNull defensive helper
  - Enhanced scrapeWebsite returning WebsiteScrapingResult with socialLinks and rawPagesText
affects: [04-02-PLAN, 04-03-PLAN, 05-meta-google-gmb-extraction, 06-viral-content-extraction]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Regex-based social link extraction with non-profile path filtering"
    - "Brand name fuzzy matching via normalized inclusion + word-level 50% threshold"
    - "Zod .refine() for cross-field validation (D-29, D-30 rules)"
    - "validateOrNull pattern for defensive schema validation"
    - "getMostFrequent for deduplicating repeated footer links across pages"

key-files:
  created:
    - src/utils/socialLinks.ts
    - src/utils/socialFallback.ts
    - src/utils/businessIdentifiers.ts
    - src/lib/validation/extractionSchemas.ts
    - tests/unit/social-links.test.ts
    - tests/unit/social-fallback.test.ts
    - tests/unit/business-identifiers.test.ts
    - tests/unit/extraction-schemas.test.ts
  modified:
    - src/types/competitor.ts
    - src/lib/apify/website.ts

key-decisions:
  - "Brand similarity uses 50% length ratio for inclusion check to avoid false positives on short handles"
  - "getMostFrequent preserves original case while deduplicating case-insensitively (YouTube channel IDs)"
  - "socialFallback only merges instagram and tiktok (2 scrape-able platforms per D-21)"

patterns-established:
  - "Regex extraction with NON_PROFILE_PATHS exclusion set"
  - "Normalized brand matching: NFD accent removal + alphanumeric-only + inclusion/word-split strategy"
  - "Zod refine() for at-least-one-field validation"

requirements-completed: [SITE-01, SEO-01, SOCL-01]

# Metrics
duration: 6min
completed: 2026-03-28
---

# Phase 4 Plan 01: Types, Utilities, and Schemas Summary

**Social link regex extraction for 6 platforms, brand fuzzy matching, CNPJ/email extraction, Zod validation schemas, and enhanced scrapeWebsite returning WebsiteScrapingResult**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-28T00:47:44Z
- **Completed:** 2026-03-28T00:54:04Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments
- Social link extraction from website text covering Instagram, TikTok, Facebook, YouTube, LinkedIn, Twitter/X with non-profile path filtering
- Brand name fuzzy matching for validating fallback social profile discoveries (handles accented Portuguese names)
- CNPJ and email domain extraction from crawled page text
- Zod validation schemas enforcing D-29 (website), D-30 (SEO), D-31 (social) rules
- Enhanced scrapeWebsite returning WebsiteScrapingResult with socialLinks, businessIdentifiers, and rawPagesText

## Task Commits

Each task was committed atomically:

1. **Task 1: Type contracts, utility functions, and validation schemas**
   - `cf5e55c` (test: failing tests - TDD RED)
   - `01b6d0e` (feat: implementations - TDD GREEN)
2. **Task 2: Enhance scrapeWebsite** - `cc2c4d0` (feat)

## Files Created/Modified
- `src/types/competitor.ts` - Added SocialLinks, SocialProfileInput, ExtractWebsiteResult, ExtractSocialResult, ExtractionStatus; businessIdentifiers to WebsiteData
- `src/utils/socialLinks.ts` - extractSocialLinksFromText with 6-platform regex and NON_PROFILE_PATHS filter
- `src/utils/socialFallback.ts` - isBrandNameSimilar, findSocialProfilesViaSearch, mergeSocialSources
- `src/utils/businessIdentifiers.ts` - extractBusinessIdentifiers for CNPJ and email domain
- `src/lib/validation/extractionSchemas.ts` - websiteDataSchema, seoDataSchema, socialDataSchema, validateOrNull
- `src/lib/apify/website.ts` - Enhanced to return WebsiteScrapingResult
- `tests/unit/social-links.test.ts` - 12 tests for social link extraction
- `tests/unit/social-fallback.test.ts` - 11 tests for brand matching and merge logic
- `tests/unit/business-identifiers.test.ts` - 8 tests for CNPJ and email extraction
- `tests/unit/extraction-schemas.test.ts` - 12 tests for Zod schema validation

## Decisions Made
- Brand similarity uses 50% length ratio for inclusion check to avoid false positives on short handles (e.g., "bomp" matching inside "padariabompao")
- getMostFrequent preserves original case while deduplicating case-insensitively (important for YouTube channel IDs like UCxyz123)
- socialFallback only produces merged results for instagram and tiktok (the 2 platforms we scrape per D-21)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed case-preserving username deduplication**
- **Found during:** Task 1 (GREEN phase)
- **Issue:** getMostFrequent lowercased all usernames, breaking YouTube channel IDs (UCxyz123 became ucxyz123)
- **Fix:** Track original case in separate Map, return first original form for the most frequent lowercased key
- **Files modified:** src/utils/socialLinks.ts
- **Verification:** YouTube channel URL test passes
- **Committed in:** 01b6d0e (Task 1 GREEN commit)

**2. [Rule 1 - Bug] Fixed brand similarity false positive on short handles**
- **Found during:** Task 1 (GREEN phase)
- **Issue:** isBrandNameSimilar("Padaria Bom Pao", "bomp") returned true because "bomp" appeared as substring in normalized brand "padariabompao"
- **Fix:** Added 50% length ratio requirement for inclusion matching (shorter string must be >= 50% of longer)
- **Files modified:** src/utils/socialFallback.ts
- **Verification:** Brand partial match test passes
- **Committed in:** 01b6d0e (Task 1 GREEN commit)

---

**Total deviations:** 2 auto-fixed (2 bugs)
**Impact on plan:** Both fixes necessary for correctness. No scope creep.

## Issues Encountered
None beyond the 2 auto-fixed bugs above.

## User Setup Required
None - no external service configuration required.

## Known Stubs
None - all functions are fully implemented with real logic.

## Next Phase Readiness
- Type contracts ready for extract-website and extract-social tasks (Plan 02 and 03)
- Validation schemas ready for data quality enforcement
- Enhanced scrapeWebsite provides social links and raw text for downstream extraction
- All 167 tests passing with zero regressions

## Self-Check: PASSED

All 10 created/modified files verified to exist. All 3 commit hashes verified (cf5e55c, 01b6d0e, cc2c4d0). All 167 tests passing.

---
*Phase: 04-website-seo-social-extraction*
*Completed: 2026-03-28*
