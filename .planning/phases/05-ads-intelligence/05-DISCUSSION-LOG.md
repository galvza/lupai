# Phase 5: Ads Intelligence - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-28
**Phase:** 05-Ads Intelligence
**Mode:** auto (all areas auto-selected, recommended defaults chosen)
**Areas discussed:** Meta Ads search strategy, Google Ads search strategy, GMB placement & applicability, Task structure, Payload enhancement, Retry/fallback chains, Data validation

---

## Meta Ads Search Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Page URL search | Search by websiteUrl for exact advertiser match | ✓ |
| Company name keyword | Search by company name (current implementation) | |
| Both combined | Search page URL first, keyword as broadening fallback | |

**User's choice:** [auto] Page URL from websiteUrl, fallback to company name (recommended default, aligns with prior user decision from Phase 4 memory)
**Notes:** User previously decided "Facebook Ad Library search by PAGE URL (not generic keyword)" during Phase 4 context gathering

---

## Google Ads Search Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Domain search | Extract domain from websiteUrl, search by domain | ✓ |
| Company name search | Search by company name (current implementation) | |
| Both combined | Domain first, name as fallback | |

**User's choice:** [auto] Domain extracted from websiteUrl (recommended default, aligns with prior user decision from Phase 4 memory)
**Notes:** User previously decided "Google Ads by DOMAIN" during Phase 4 context gathering

---

## GMB Placement & Applicability

| Option | Description | Selected |
|--------|-------------|----------|
| Inside extract-ads | Compound task with Meta + Google + GMB in parallel | ✓ |
| Separate extract-gmb task | Own Trigger.dev task in orchestrator | |
| Inside extract-website | Run alongside website scraping | |

**User's choice:** [auto] Include in extract-ads as parallel call (recommended — compound task pattern from Phase 4, reduces task proliferation)
**Notes:** GMB runs for ALL competitors (cheap call, graceful null return). Region from NicheInterpreted.

---

## Task Structure

| Option | Description | Selected |
|--------|-------------|----------|
| All parallel (Promise.allSettled) | Meta + Google + GMB run simultaneously | ✓ |
| Sequential | Meta → Google → GMB one after another | |
| Meta+Google parallel, GMB conditional | Only run GMB if region suggests local business | |

**User's choice:** [auto] All 3 parallel via Promise.allSettled (recommended — mirrors extract-social pattern, maximizes throughput)
**Notes:** Independent failures handled per golden rule

---

## Payload Enhancement

| Option | Description | Selected |
|--------|-------------|----------|
| Add region field | ExtractAdsPayload gets region from NicheInterpreted | ✓ |
| Add region + domain fields | Separate domain field for Google Ads | |
| No changes | Extract domain at task level from websiteUrl | |

**User's choice:** [auto] Add region field only, extract domain at task level (recommended — minimal payload change)
**Notes:** Domain extraction is a simple URL parse, no need for orchestrator to pre-compute

---

## Retry & Fallback Chains

| Option | Description | Selected |
|--------|-------------|----------|
| Phase 4 pattern | 3 attempts, exponential backoff, never-fail returns | ✓ |
| Aggressive retry | 5 attempts with longer backoff | |
| Minimal retry | 1 attempt, fast fail to unavailable | |

**User's choice:** [auto] Follow Phase 4 pattern exactly (recommended — established and user-approved convention)
**Notes:** Specific fallback chains per service defined in memory: Meta (pageUrl → name → unavailable), Google (domain → name → unavailable), GMB (name+region → null)

---

## Data Validation

| Option | Description | Selected |
|--------|-------------|----------|
| Phase 4 validateOrNull pattern | Zod schemas, null raw skips, failing stores null with warning | ✓ |
| Strict validation | Reject and retry on invalid data | |
| No validation | Store whatever comes back | |

**User's choice:** [auto] Follow Phase 4 validateOrNull pattern (recommended — established convention)
**Notes:** "No ads" and "no GMB" are valid intelligence, not errors

---

## Claude's Discretion

- Domain extraction logic from websiteUrl
- Exact Apify actor input formats for page URL vs keyword search
- Zod schema strictness levels
- Circuit breaker state management
- Progress metadata key naming

## Deferred Ideas

None — analysis stayed within phase scope
