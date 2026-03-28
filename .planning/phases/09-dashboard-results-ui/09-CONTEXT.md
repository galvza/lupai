# Phase 9: Dashboard & Results UI (Backend Only) - Context

**Gathered:** 2026-03-28 (auto mode, backend-only scope per user preference)
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the backend API layer that serves analysis results to the frontend. This includes: a comprehensive results API route that aggregates all data, Trigger.dev Realtime auth configuration for progress subscriptions, and a response shape that communicates partial/failed sections gracefully.

**Explicitly excluded:** React components, pages, layouts, CSS, and any frontend UI code. The user will build the frontend separately with their own design system. This phase delivers only what the frontend will consume.

</domain>

<decisions>
## Implementation Decisions

### Results API Route
- **D-01:** Create `GET /api/analysis/[id]/route.ts` that returns ALL analysis data in a single aggregated response — analysis metadata, competitors (with all JSONB columns), viral content, synthesis (recommendations + creative scripts + comparative analysis), and viral patterns
- **D-02:** Response shape uses section-level status indicators (`available`, `partial`, `unavailable`, `failed`) so the frontend knows which sections to render vs show fallback states — maps directly to DASH-03 requirement
- **D-03:** Return a flat `AnalysisResultsResponse` type (not nested) with clearly named fields: `analysis`, `competitors[]`, `userBusiness` (nullable), `viralContent[]`, `synthesis` (nullable), `viralPatterns` (nullable), `sectionStatuses`

### Trigger.dev Realtime Configuration
- **D-04:** The `publicAccessToken` is already returned by `POST /api/analyze` (line 56 of route.ts). No additional auth endpoint needed — frontend uses this token directly with `@trigger.dev/react-hooks`'s `useRealtimeRun`
- **D-05:** Add a `GET /api/analysis/[id]/status/route.ts` fallback route that reads from Supabase (`analysis.status`) for clients that can't use Trigger.dev Realtime (e.g., curl, external integrations). This is a simple DB read, not a replacement for Realtime

### Response Types
- **D-06:** Create an `AnalysisResultsResponse` interface in `src/types/analysis.ts` that bundles all sections with their status indicators
- **D-07:** Create a `SectionStatus` type: `{ section: string; status: 'available' | 'partial' | 'unavailable' | 'failed'; message?: string }` — one per dashboard section (overview, competitors, website, seo, social, ads, viral, recommendations, scripts, comparative)
- **D-08:** Section status is derived at query time from actual data presence (null checks, empty arrays), not stored in DB — keeps the DB schema clean and status always accurate

### Claude's Discretion
- Query batching strategy (parallel Promise.all vs sequential)
- Error handling granularity in the aggregation route
- Whether to add response caching headers (Cache-Control) for completed analyses

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing API routes
- `src/app/api/analyze/route.ts` — POST endpoint that creates analysis and triggers job (returns publicAccessToken + runId)
- `src/app/api/analyze/[id]/confirm-competitors/route.ts` — Waitpoint confirmation route pattern

### Data access layer
- `src/lib/supabase/queries.ts` — All existing query functions (getAnalysis, getCompetitorsByAnalysis, getUserBusinessByAnalysis, getSynthesisByAnalysis, getViralContentByAnalysis, updateCompetitor)

### Types
- `src/types/analysis.ts` — Analysis, AnalysisStatus, StartAnalysisResponse types
- `src/types/competitor.ts` — Competitor type with all JSONB fields (websiteData, seoData, socialData, adsData)
- `src/types/database.ts` — Synthesis, Recommendation, CreativeScript, ComparativeAnalysis types
- `src/types/viral.ts` — ViralContent, ViralPatterns, HookBodyCta types

### Trigger.dev orchestrator (metadata keys for Realtime)
- `src/trigger/analyze-market.ts` — Sets metadata: status, step, progress, warnings, error, modoCompleto, modoCompletoReason

### Requirements
- `.planning/REQUIREMENTS.md` §Dashboard & Results (DASH-01 through DASH-06) — DASH-01/02/03 have backend implications; DASH-04/05/06 are frontend-only

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `getAnalysis()`, `getCompetitorsByAnalysis()`, `getUserBusinessByAnalysis()`, `getSynthesisByAnalysis()`, `getViralContentByAnalysis()` — all data retrieval queries exist and are tested
- `publicAccessToken` already returned by POST /api/analyze — Trigger.dev Realtime auth is pre-wired
- `metadata.set()` calls in analyze-market.ts provide granular progress: `status`, `step`, `progress` (0-100), `warnings`, `error`

### Established Patterns
- Route Handlers use NextResponse.json() with typed responses
- Zod validation on request input (see analyze/route.ts)
- Error responses follow `{ error: string }` pattern with PT-BR messages
- Row mappers convert snake_case DB → camelCase TS in queries.ts

### Integration Points
- New route at `src/app/api/analysis/[id]/route.ts` — note: different path from existing `src/app/api/analyze/` (analyze = action, analysis = resource)
- Status fallback route at `src/app/api/analysis/[id]/status/route.ts`
- New response type in `src/types/analysis.ts`

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches for API design. The key constraint is that all response data must be sufficient for a frontend to render a complete dashboard without additional API calls.

</specifics>

<deferred>
## Deferred Ideas

- React components for dashboard sections — user builds frontend separately
- Real-time progress UI components (`useRealtimeRun` hook usage) — frontend concern
- Responsive layout and CSS — frontend concern
- PT-BR labels and formatting in UI — frontend concern (API returns raw data, frontend localizes)
- DASH-04, DASH-05, DASH-06 requirements — entirely frontend, deferred

</deferred>

---

*Phase: 09-dashboard-results-ui*
*Context gathered: 2026-03-28*
