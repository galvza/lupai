# Phase 2: Input & AI Understanding - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-27
**Phase:** 02-Input & AI Understanding
**Mode:** auto (all decisions auto-selected with recommended defaults)
**Areas discussed:** Input experience, Confirmation flow, API route design, Mode selection, Loading & error states

---

## Input Experience

| Option | Description | Selected |
|--------|-------------|----------|
| Single prominent textarea | Clean, matches "input simples" from PRD, minimal friction | ✓ |
| Structured form (niche + segment + region fields) | More control but contradicts "input simples" design | |
| Multi-step wizard | Overkill for a single text input | |

**User's choice:** [auto] Single prominent textarea with placeholder example
**Notes:** Recommended default — the PRD explicitly says "input simples" and the product's core UX is simplicity.

| Option | Description | Selected |
|--------|-------------|----------|
| Button click with "Analisar" CTA | Explicit user intent, standard form pattern | ✓ |
| Auto-submit after typing pause | Surprising behavior, could trigger unwanted API calls | |

**User's choice:** [auto] Button click with "Analisar" CTA
**Notes:** Recommended default — explicit action is more predictable and avoids accidental Gemini calls.

---

## Confirmation Flow

| Option | Description | Selected |
|--------|-------------|----------|
| Inline below input on same page | Fastest flow, no navigation needed, context preserved | ✓ |
| Modal dialog | Interrupts flow, extra click to dismiss | |
| Separate /confirm page | Unnecessary navigation for a 3-field review | |

**User's choice:** [auto] Inline below input on same page
**Notes:** Recommended default — keeps the user in context, fastest path to confirmation.

| Option | Description | Selected |
|--------|-------------|----------|
| Editable fields for niche, segment, region | Satisfies INPT-04 requirement for adjustment | ✓ |
| Re-type the entire input | Loses context, poor UX | |
| Dropdown corrections | Too rigid for freeform niche descriptions | |

**User's choice:** [auto] Editable fields for niche, segment, region individually
**Notes:** Recommended default — INPT-04 explicitly requires user can "adjust the interpretation."

| Option | Description | Selected |
|--------|-------------|----------|
| Redirect to /analysis/[id] | Clean URL, follows CLAUDE.md structure, bookmarkable | ✓ |
| Stay on homepage with results | Breaks URL structure, not bookmarkable | |

**User's choice:** [auto] Redirect to /analysis/[id]
**Notes:** Recommended default — the analysis page already exists in CLAUDE.md folder structure.

---

## API Route Design

| Option | Description | Selected |
|--------|-------------|----------|
| Two separate endpoints (understand + create) | Clean separation, each under 10s Vercel limit | ✓ |
| Single combined endpoint | Could exceed 10s if Gemini is slow + DB write | |

**User's choice:** [auto] Two endpoints: POST /api/analyze/understand + POST /api/analyze
**Notes:** Recommended default — separation keeps each route well under Vercel 10s timeout and allows retry of interpretation without creating orphan DB records.

| Option | Description | Selected |
|--------|-------------|----------|
| Create record only when user confirms | No orphan records, clean data | ✓ |
| Create record immediately, update later | Orphan pending records if user abandons | |

**User's choice:** [auto] Create only when user confirms
**Notes:** Recommended default — avoids accumulating abandoned analysis records in Supabase.

---

## Mode Selection

| Option | Description | Selected |
|--------|-------------|----------|
| Toggle/radio below input, Rapido default | Visible but non-blocking, progressive disclosure | ✓ |
| Above the input | Breaks reading order | |
| Separate step | Unnecessary complexity | |

**User's choice:** [auto] Below input as toggle, Modo Rapido default
**Notes:** Recommended default — visible without overwhelming the input area.

| Option | Description | Selected |
|--------|-------------|----------|
| Show URL field only when Completo selected | Progressive disclosure, less visual noise | ✓ |
| Always visible with disabled state | Clutters the simple input for most users | |

**User's choice:** [auto] Show URL input only when Completo selected
**Notes:** Recommended default — most users will use Modo Rapido; no need to show the URL field by default.

---

## Claude's Discretion

- Exact visual design and spacing of input area
- Loading animation style
- Card styling for confirmation display
- Mode toggle visual treatment
- Transition animations

## User Correction (mid-auto)

**Original assumption:** AI interpretation handles all inputs the same way — single Gemini call for any text.
**User correction:** Input handling must cover 5 distinct scenarios (MINIMAL, MEDIUM, URL, EXCESSIVE, NONSENSE) with classification BEFORE calling Gemini. Each scenario has different UI confirmation behavior.
**Decisions added:** D-19 through D-26 in CONTEXT.md — input classification, branching logic, scenario-specific confirmation flows.

## Deferred Ideas

None — analysis stayed within phase scope.
