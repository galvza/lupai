# Phase 8: Modo Completo - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-28
**Phase:** 08-modo-completo
**Mode:** auto (discuss workflow)
**Areas discussed:** User extraction pipeline, User data storage, Comparative synthesis design, Orchestrator flow, Graceful degradation

---

## User Extraction Pipeline Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Reuse same extraction tasks | Run extract-website, extract-social, extract-ads on user URL — no new extraction code | ✓ |
| Create separate extract-user compound task | New task that wraps all 3 extractions for user | |
| Minimal extraction (website only) | Only scrape user website, skip social/ads for user | |

**User's choice:** [auto] Reuse same extraction tasks (recommended default — user explicitly confirmed same pipeline in context)
**Notes:** User provided explicit context: "The user's own URL goes through the SAME extraction chain as competitors"

---

## User Extraction Ordering

| Option | Description | Selected |
|--------|-------------|----------|
| Extract user FIRST | Before competitor discovery — ensures synthesis has both sides | ✓ |
| Extract user in parallel with competitors | Concurrent with competitor extraction for speed | |
| Extract user after competitors | Standard pipeline + user extraction appended | |

**User's choice:** [auto] Extract user FIRST (user explicitly specified this ordering)
**Notes:** User context: "Extract user first so the synthesis has both sides of the comparison"

---

## User Data Storage Model

| Option | Description | Selected |
|--------|-------------|----------|
| Add role column to competitors table | 'competitor' | 'user_business' flag, reuse entire data model | ✓ |
| Separate user_businesses table | New table with same columns as competitors | |
| Store in analysis record as JSONB | Inline in analyses table | |

**User's choice:** [auto] Add role column (recommended — same data shape, minimal code changes, user context confirms "stored separately with different flag/role")
**Notes:** User context: "The user's data is stored separately from competitors (different flag/role in the DB)"

---

## Comparative Synthesis Design

| Option | Description | Selected |
|--------|-------------|----------|
| Extend existing synthesis call | Add user data to prompt when mode='complete', add comparative sections to output | ✓ |
| Third separate Gemini call | Keep synthesis + creative calls unchanged, add third call for comparison | |
| Separate comparative endpoint | New API route for comparative analysis only | |

**User's choice:** [auto] Extend existing synthesis call (recommended — Phase 7 D-04 already defined this approach)
**Notes:** Phase 7 D-04 already decided: "Output sections (Modo Completo): all Modo Rapido sections + user vs market comparative section"

---

## Graceful Degradation

| Option | Description | Selected |
|--------|-------------|----------|
| Degrade to Modo Rapido + warning | If user extraction fails, show competitor analysis without comparison | ✓ |
| Block analysis until user extraction succeeds | Retry user extraction, fail if unrecoverable | |
| Partial comparison with available data | Show whatever user data was extracted, skip failed sections | ✓ |

**User's choice:** [auto] Degrade to Modo Rapido + warning AND partial comparison when partial data available
**Notes:** User context: "If user URL extraction fails, gracefully degrade to Modo Rapido results + warning". Golden rule from Phase 4 applies.

---

## Claude's Discretion

- Exact Gemini prompt design for comparative sections
- User business name derivation from URL
- Progress percentage allocations for user extraction step
- Exact ComparativeAnalysis type structure

## Deferred Ideas

None — analysis stayed within phase scope
