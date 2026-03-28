# Phase 10: History, Cache & PDF Export - Context

**Gathered:** 2026-03-28 (auto mode, backend-only scope per user preference)
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the backend API layer for search history, 24-hour niche caching, and PDF report generation. This includes: a history API endpoint listing past analyses with pagination, a cache-check mechanism that detects repeated niche queries within 24 hours and returns existing results without re-running the extraction cascade, and a PDF generation endpoint that produces downloadable reports from analysis data using jspdf.

**Explicitly excluded:** React components, pages, layouts, CSS, and any frontend UI code. The user will build the frontend separately. This phase delivers only API endpoints and server-side logic.

</domain>

<decisions>
## Implementation Decisions

### Cache Matching Strategy
- **D-01:** Match "same niche" using `niche_interpreted` JSONB fields (`niche` + `segment` + `region`), all normalized to lowercase — not raw `niche_input` string comparison. The AI understanding layer already normalizes different phrasings to the same structured output, making this more robust.
- **D-02:** Only completed analyses qualify for cache hits. Analyses in `failed`, `processing`, `pending`, or other non-terminal states are never served as cached results.
- **D-03:** Cache window is 24 hours from the original analysis `created_at` timestamp. Analyses older than 24h are ignored even if they match.

### Cache Behavior
- **D-04:** Cache check happens in `POST /api/analyze` before creating a new analysis record. If a matching completed analysis exists within 24h, return the existing `analysisId`, `redirectUrl`, and a `cached: true` flag — same `StartAnalysisResponse` shape plus the cache indicator. No Trigger.dev job is triggered.
- **D-05:** The cache match query: `SELECT * FROM analyses WHERE niche_interpreted->>'niche' ILIKE $1 AND niche_interpreted->>'segment' ILIKE $2 AND niche_interpreted->>'region' ILIKE $3 AND status = 'completed' AND created_at > NOW() - INTERVAL '24 hours' ORDER BY created_at DESC LIMIT 1`
- **D-06:** Mode must also match for cache hits — a `quick` analysis should not be served to a `complete` request (different data scope). User business URL match is not required for quick mode cache hits.

### History API
- **D-07:** New endpoint `GET /api/history/route.ts` returns a paginated list of past analyses sorted by `created_at DESC`
- **D-08:** Pagination uses cursor-based approach with `cursor` (ISO timestamp of last item) and `limit` (default 20, max 50) query params. Returns `{ analyses: AnalysisSummary[], nextCursor: string | null }`
- **D-09:** `AnalysisSummary` type: lightweight subset of `Analysis` — `id`, `nicheInput`, `nicheInterpreted`, `mode`, `status`, `createdAt`. Does not include heavy fields like `viralPatterns`.
- **D-10:** Optional `status` query param filters by analysis status (e.g., `?status=completed` to show only finished analyses)
- **D-11:** Existing `listAnalyses()` in queries.ts serves as foundation — extend with cursor pagination and status filter support

### PDF Generation
- **D-12:** New endpoint `GET /api/report/[id]/route.ts` generates and returns a PDF report for a completed analysis
- **D-13:** Use `jspdf` (approved dependency) for server-side PDF generation in the Route Handler. Return as streaming response with `Content-Type: application/pdf` and `Content-Disposition: attachment; filename="lupai-{niche}-{date}.pdf"`
- **D-14:** PDF sections in order: cover page (LupAI branding, niche name, date, mode), market overview, competitor comparison table, website/SEO highlights, social media summary, ads intelligence, viral content highlights, AI recommendations, creative scripts
- **D-15:** Only completed analyses can be exported as PDF. Return 400 for non-completed analyses with PT-BR error message.
- **D-16:** PDF text in Portuguese (PT-BR) throughout, matching the interface language requirement

### Claude's Discretion
- Exact PDF typography, colors, and spacing
- Whether to add autoTable plugin for jspdf tables or build tables manually
- Query optimization for the cache match (may add a composite index)
- Error message wording in PT-BR

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing API routes
- `src/app/api/analyze/route.ts` — POST endpoint that creates analysis and triggers job (cache check will be added here)
- `src/app/api/analysis/[id]/route.ts` — GET aggregated results (PDF endpoint reuses same data fetching pattern)

### Data access layer
- `src/lib/supabase/queries.ts` — `listAnalyses()` (history foundation), `getAnalysis()`, all sub-data queries for PDF data
- `src/lib/supabase/client.ts` — Server client for Supabase

### Types
- `src/types/analysis.ts` — Analysis, AnalysisStatus, NicheInterpreted, StartAnalysisResponse, AnalysisResultsResponse, SectionStatus
- `src/types/database.ts` — Synthesis, Recommendation, CreativeScript, ComparativeAnalysis
- `src/types/competitor.ts` — Competitor type with all JSONB fields
- `src/types/viral.ts` — ViralContent, ViralPatterns, HookBodyCta

### PDF placeholder
- `src/lib/pdf/generate.ts` — Placeholder stub, to be replaced with actual jspdf implementation

### Database schema
- `supabase/migrations/20260327200000_create_initial_schema.sql` — Base schema with idx_analyses_niche_input and idx_analyses_created_at indexes already in place

### Requirements
- `.planning/REQUIREMENTS.md` §History & Persistence (HIST-01 through HIST-04) — History and cache requirements
- `.planning/REQUIREMENTS.md` §PDF Export (PDF-01 through PDF-03) — PDF report requirements

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `listAnalyses(limit)` in queries.ts: already returns analyses ordered by created_at DESC — extend for cursor pagination
- `safeQuery<T>()` pattern in analysis/[id]/route.ts: safe parallel data fetching for PDF generation
- `deriveSectionStatuses()` in lib/api/section-statuses.ts: can inform which PDF sections have data
- `mapAnalysisRow()`, `mapCompetitorRow()`, etc.: row mappers convert DB rows to typed objects
- `src/lib/pdf/generate.ts`: placeholder stub ready for implementation

### Established Patterns
- Route Handlers use `NextResponse.json()` with typed responses
- Error responses follow `{ error: string }` pattern with PT-BR messages
- Zod validation on request input (analyze/route.ts pattern)
- `safeQuery()` wrapper: sub-query errors return fallback, never crash aggregation
- Cache-Control headers based on analysis status (completed vs non-completed)

### Integration Points
- `POST /api/analyze` route: add cache check BEFORE `createAnalysis()` call
- `GET /api/analysis/[id]/route.ts`: PDF endpoint reuses same data aggregation pattern
- `src/types/analysis.ts`: add `AnalysisSummary` type and extend `StartAnalysisResponse` with optional `cached` field
- DB indexes `idx_analyses_niche_input` and `idx_analyses_created_at`: already exist, support cache and history queries

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — analysis stayed within phase scope

</deferred>

---

*Phase: 10-history-cache-pdf-export*
*Context gathered: 2026-03-28*
