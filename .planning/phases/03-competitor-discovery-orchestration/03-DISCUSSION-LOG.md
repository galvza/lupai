# Phase 3: Competitor Discovery & Orchestration - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions captured in CONTEXT.md — this log preserves the analysis.

**Date:** 2026-03-27
**Phase:** 03-competitor-discovery-orchestration
**Mode:** discuss (auto)
**Areas analyzed:** Discovery sources, Filtering rules, Competitor scoring, Confirmation flow, Orchestration pattern, Progress tracking, Error handling

## Gray Areas Identified

| Area | Description | Resolution |
|------|-------------|------------|
| Discovery sources | Which Apify actors to use for raw candidate fetching | User pre-decided: Google Search, SimilarWeb, Facebook Ads Library, Google Maps |
| Filtering rules | How to exclude irrelevant results | User pre-decided: strict blocklist + independent digital presence requirement |
| Competitor scoring | How to rank and select final competitors | User pre-decided: Gemini AI scoring 0-100, threshold 70+, top 3-4 |
| Confirmation flow | How user approves competitors before extraction | Auto: API endpoint, user confirms list before fan-out |
| Orchestration pattern | How Trigger.dev structures the cascade | Auto: main orchestrator → discovery → confirmation gate → parallel fan-out |
| Progress tracking | How frontend shows real-time updates | Pre-decided (Phase 1): Trigger.dev metadata + Realtime API hooks |
| Error handling | What happens on partial/full failure | Auto: graceful degradation, proceed with available results |

## Auto-Resolved Decisions

All decisions were either:
1. **Pre-decided by user** (filtering rules, scoring system — provided in detail during session)
2. **Pre-decided in prior phases** (progress tracking via Trigger.dev Realtime API — Phase 1 D-04)
3. **Auto-selected recommended** (orchestration pattern, error handling, confirmation flow)

[auto] All gray areas resolved without interactive questions.

## Prior Decisions Applied

### From Phase 1
- Trigger.dev v4 with Realtime API (D-04) → progress tracking pattern locked
- Service clients use process.env directly → Apify wrappers follow same pattern
- Apify wrappers filter output at extraction time (D-15) → scoring receives filtered data

### From Phase 2
- API routes are thin dispatchers < 10s (D-11) → confirmation endpoint must be lightweight
- analyze-market task is stub ready for Phase 3 expansion (D-25 equivalent)
- Gemini structured output via Zod schema (understand.ts pattern) → scoring prompt reuses pattern

### From User Memory
- Detailed filtering rules with specific blocklist domains
- Scoring system with 5 match criteria
- Source list (Google, SimilarWeb, Facebook Ads Library, Google Maps)
