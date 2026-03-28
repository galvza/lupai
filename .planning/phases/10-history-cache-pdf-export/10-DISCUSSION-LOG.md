# Phase 10: History, Cache & PDF Export - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-28
**Phase:** 10-History, Cache & PDF Export
**Mode:** auto (all decisions auto-selected with recommended defaults)
**Areas discussed:** Cache matching strategy, Cache behavior, History API, PDF generation

---

## Cache Matching Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Match on nicheInterpreted fields (niche+segment+region) lowercase | More robust — AI normalizes different phrasings to same structured output | ✓ |
| Exact niche_input string match | Simpler but misses similar inputs phrased differently | |
| Fuzzy/similarity matching | Overkill for MVP, complex to implement and test | |

**User's choice:** [auto] Match on nicheInterpreted fields (recommended default)
**Notes:** The AI understanding layer (Phase 2) already normalizes user input to structured niche/segment/region. Matching on these normalized fields catches cache hits even when users phrase the same niche differently.

---

## Cache Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Return existing analysis ID without re-running | Saves API credits, instant response, same response shape + cached flag | ✓ |
| Create new record pointing to same data | More complex, duplicates DB rows unnecessarily | |
| Always re-run with shorter TTL | Defeats the purpose of caching, burns credits | |

**User's choice:** [auto] Return existing analysis ID (recommended default)
**Notes:** Cache check added to POST /api/analyze before creating new record. Only completed analyses within 24h qualify. Mode must match (quick vs complete).

---

## History API

| Option | Description | Selected |
|--------|-------------|----------|
| GET /api/history with cursor pagination | Scalable, uses existing listAnalyses() as base | ✓ |
| GET /api/history with offset pagination | Simpler but poor performance on large datasets | |
| Include full analysis data in list | Heavy response, unnecessary for a list view | |

**User's choice:** [auto] Cursor pagination with lightweight summaries (recommended default)
**Notes:** Returns AnalysisSummary (id, nicheInput, nicheInterpreted, mode, status, createdAt). Optional status filter. Default limit 20, max 50.

---

## PDF Generation

| Option | Description | Selected |
|--------|-------------|----------|
| jspdf server-side in Route Handler | Approved dep, server-side avoids client bundle bloat | ✓ |
| @react-pdf/renderer | Heavier, requires React rendering overhead for simple report | |
| HTML-to-PDF with puppeteer | Heavy dependency, complex setup, not in approved list | |

**User's choice:** [auto] jspdf server-side (recommended default)
**Notes:** GET /api/report/[id] generates PDF with cover page + all sections. Only completed analyses. PT-BR text. Returns as attachment with Content-Disposition header.

---

## Claude's Discretion

- PDF typography, colors, spacing
- jspdf-autotable plugin decision
- Cache query optimization (composite index)
- PT-BR error message wording
