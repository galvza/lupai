# Phase 9: Dashboard & Results UI (Backend Only) - Research

**Researched:** 2026-03-28
**Domain:** Next.js Route Handlers, Trigger.dev Realtime API, API aggregation patterns
**Confidence:** HIGH

## Summary

Phase 9 builds the backend API layer that serves analysis results to a frontend dashboard. The scope is strictly backend: a results aggregation API route, a status fallback route, and the TypeScript response types that define the contract between backend and frontend. No React components, pages, or UI code.

The existing codebase has all query functions already implemented (`getAnalysis`, `getCompetitorsByAnalysis`, `getUserBusinessByAnalysis`, `getSynthesisByAnalysis`, `getViralContentByAnalysis`) and the Trigger.dev Realtime infrastructure is pre-wired (the `POST /api/analyze` route already returns `publicAccessToken` and `runId`). The primary work is: (1) creating a `GET /api/analysis/[id]` route that aggregates all data from these queries with section-level status indicators, (2) a `GET /api/analysis/[id]/status` fallback, and (3) the `AnalysisResultsResponse` type.

**Primary recommendation:** Use `Promise.all` to run all five Supabase queries in parallel inside the results route, derive section statuses from actual data presence at query time (not stored in DB), and return a flat response shape with clearly named fields.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Create `GET /api/analysis/[id]/route.ts` that returns ALL analysis data in a single aggregated response -- analysis metadata, competitors (with all JSONB columns), viral content, synthesis (recommendations + creative scripts + comparative analysis), and viral patterns
- **D-02:** Response shape uses section-level status indicators (`available`, `partial`, `unavailable`, `failed`) so the frontend knows which sections to render vs show fallback states -- maps directly to DASH-03 requirement
- **D-03:** Return a flat `AnalysisResultsResponse` type (not nested) with clearly named fields: `analysis`, `competitors[]`, `userBusiness` (nullable), `viralContent[]`, `synthesis` (nullable), `viralPatterns` (nullable), `sectionStatuses`
- **D-04:** The `publicAccessToken` is already returned by `POST /api/analyze` (line 56 of route.ts). No additional auth endpoint needed -- frontend uses this token directly with `@trigger.dev/react-hooks`'s `useRealtimeRun`
- **D-05:** Add a `GET /api/analysis/[id]/status/route.ts` fallback route that reads from Supabase (`analysis.status`) for clients that can't use Trigger.dev Realtime (e.g., curl, external integrations). This is a simple DB read, not a replacement for Realtime
- **D-06:** Create an `AnalysisResultsResponse` interface in `src/types/analysis.ts` that bundles all sections with their status indicators
- **D-07:** Create a `SectionStatus` type: `{ section: string; status: 'available' | 'partial' | 'unavailable' | 'failed'; message?: string }` -- one per dashboard section (overview, competitors, website, seo, social, ads, viral, recommendations, scripts, comparative)
- **D-08:** Section status is derived at query time from actual data presence (null checks, empty arrays), not stored in DB -- keeps the DB schema clean and status always accurate

### Claude's Discretion
- Query batching strategy (parallel Promise.all vs sequential)
- Error handling granularity in the aggregation route
- Whether to add response caching headers (Cache-Control) for completed analyses

### Deferred Ideas (OUT OF SCOPE)
- React components for dashboard sections -- user builds frontend separately
- Real-time progress UI components (`useRealtimeRun` hook usage) -- frontend concern
- Responsive layout and CSS -- frontend concern
- PT-BR labels and formatting in UI -- frontend concern (API returns raw data, frontend localizes)
- DASH-04, DASH-05, DASH-06 requirements -- entirely frontend, deferred
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DASH-01 | Dashboard displays all analysis results in organized, scannable sections | Results API aggregates ALL data (analysis + competitors + viralContent + synthesis + viralPatterns) in a single GET endpoint. Section statuses tell frontend which sections have data. |
| DASH-02 | Real-time progress indicator during cascade execution (step-by-step) | Trigger.dev Realtime already wired: `publicAccessToken` returned by POST /api/analyze, metadata keys (`status`, `step`, `progress`, `subTasks`, `warnings`) set by analyze-market.ts. Status fallback route provides DB-level polling. |
| DASH-03 | Dashboard handles partial data gracefully (if one extraction fails, shows what succeeded) | `SectionStatus` type with `available`/`partial`/`unavailable`/`failed` statuses derived from actual data presence. Per-section granularity covering all 10 dashboard sections. |
| DASH-04 | Interface is responsive (desktop + mobile 375px+) | DEFERRED -- frontend concern, out of backend scope |
| DASH-05 | Interface is in Portuguese (PT-BR) throughout | DEFERRED -- frontend concern. API returns raw data; AI-generated content already in PT-BR from synthesis phase. |
| DASH-06 | Interface is clean, professional, and self-explanatory | DEFERRED -- frontend concern |
</phase_requirements>

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 15.5.14 | Route Handlers for API endpoints | Already installed; App Router pattern with async params |
| @supabase/supabase-js | ^2 | Database queries | Already installed; all query functions exist in queries.ts |
| @trigger.dev/sdk | ^4 | Realtime metadata access (server-side) | Already installed; publicAccessToken already returned |
| @trigger.dev/react-hooks | ^4 | Frontend Realtime subscription | Already installed; frontend uses useRealtimeRun (not this phase's work) |
| zod | 3.25.76 | Response validation (optional) | Already installed; pinned for Trigger.dev compatibility |

### Supporting
No additional libraries needed. This phase uses only existing dependencies.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Promise.all for parallel queries | Sequential queries | Sequential is simpler but ~3-5x slower. Promise.all is correct here since all queries are independent reads |
| Deriving status at query time | Storing status in DB | DB status would be stale. Query-time derivation is always accurate |
| Single aggregation route | Multiple endpoint calls | Single call = one round trip. Frontend complexity is lower with one endpoint |

## Architecture Patterns

### New Files to Create
```
src/
├── app/
│   └── api/
│       └── analysis/
│           └── [id]/
│               ├── route.ts          # GET - Aggregated results
│               └── status/
│                   └── route.ts      # GET - Simple status fallback
└── types/
    └── analysis.ts                   # ADD: AnalysisResultsResponse, SectionStatus types
```

### Pattern 1: Parallel Query Aggregation
**What:** Run all 5 Supabase queries in parallel using `Promise.all`, then assemble response
**When to use:** When queries are independent reads (no data dependency between them)
**Example:**
```typescript
// Source: established project pattern from queries.ts + Next.js Route Handler docs
export const GET = async (
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<AnalysisResultsResponse | { error: string }>> => {
  const { id } = await params; // Next.js 15 async params pattern

  const analysis = await getAnalysis(id);
  if (!analysis) {
    return NextResponse.json({ error: 'Analise nao encontrada.' }, { status: 404 });
  }

  const [competitors, userBusiness, viralContent, synthesis] = await Promise.all([
    getCompetitorsByAnalysis(id),
    getUserBusinessByAnalysis(id),
    getViralContentByAnalysis(id),
    getSynthesisByAnalysis(id),
  ]);

  const sectionStatuses = deriveSectionStatuses(analysis, competitors, viralContent, synthesis);

  return NextResponse.json({
    analysis,
    competitors,
    userBusiness,
    viralContent,
    synthesis,
    viralPatterns: analysis.viralPatterns,
    sectionStatuses,
  });
};
```

### Pattern 2: Section Status Derivation
**What:** Pure function that examines actual data to determine section status
**When to use:** To compute per-section availability without storing status in DB
**Example:**
```typescript
// Derive from data presence, never from stored flags
const deriveSectionStatuses = (
  analysis: Analysis,
  competitors: Competitor[],
  viralContent: ViralContent[],
  synthesis: Synthesis | null
): SectionStatus[] => {
  const statuses: SectionStatus[] = [];

  // Overview: available if analysis has nicheInterpreted
  statuses.push({
    section: 'overview',
    status: analysis.nicheInterpreted ? 'available' : 'unavailable',
  });

  // Competitors: check count and data completeness
  if (competitors.length === 0) {
    statuses.push({ section: 'competitors', status: 'unavailable' });
  } else {
    statuses.push({ section: 'competitors', status: 'available' });
  }

  // Per-dimension: website, seo, social, ads
  // Check across all competitors -- partial if some have data, some don't
  const hasWebsite = competitors.some(c => c.websiteData !== null);
  const allWebsite = competitors.every(c => c.websiteData !== null);
  statuses.push({
    section: 'website',
    status: allWebsite ? 'available' : hasWebsite ? 'partial' : 'unavailable',
  });

  // ... similar for seo, social, ads sections

  // Viral: check array length
  statuses.push({
    section: 'viral',
    status: viralContent.length > 0 ? 'available' : 'unavailable',
  });

  // Recommendations, scripts, comparative: check synthesis sub-fields
  if (synthesis) {
    statuses.push({
      section: 'recommendations',
      status: synthesis.recommendations.length > 0 ? 'available' : 'unavailable',
    });
    statuses.push({
      section: 'scripts',
      status: synthesis.creativeScripts.length > 0 ? 'available' : 'unavailable',
    });
    statuses.push({
      section: 'comparative',
      status: synthesis.comparativeAnalysis
        ? synthesis.comparativeAnalysis.comparativeStatus === 'full' ? 'available' : 'partial'
        : 'unavailable',
    });
  } else {
    statuses.push({ section: 'recommendations', status: 'unavailable' });
    statuses.push({ section: 'scripts', status: 'unavailable' });
    statuses.push({ section: 'comparative', status: 'unavailable' });
  }

  return statuses;
};
```

### Pattern 3: Next.js 15 Async Params in Route Handlers
**What:** In Next.js 15, route handler `params` is a Promise that must be awaited
**When to use:** Every dynamic route handler (`[id]` segments)
**Example:**
```typescript
// Source: Next.js 15 docs - https://nextjs.org/docs/app/api-reference/file-conventions/route
export const GET = async (
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> => {
  const { id } = await params; // MUST await in Next.js 15
  // ...
};
```

### Pattern 4: Status Fallback Route
**What:** Simple DB read returning just analysis status for non-Realtime clients
**When to use:** For curl, external integrations, or any client that can't use Trigger.dev Realtime WebSocket
**Example:**
```typescript
// GET /api/analysis/[id]/status
export const GET = async (
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> => {
  const { id } = await params;
  const analysis = await getAnalysis(id);
  if (!analysis) {
    return NextResponse.json({ error: 'Analise nao encontrada.' }, { status: 404 });
  }
  return NextResponse.json({
    analysisId: analysis.id,
    status: analysis.status,
    mode: analysis.mode,
    createdAt: analysis.createdAt,
    updatedAt: analysis.updatedAt,
  });
};
```

### Pattern 5: Trigger.dev Realtime Metadata Keys (Documentation for Frontend)
**What:** The analyze-market.ts orchestrator sets metadata keys that the frontend subscribes to via `useRealtimeRun`
**Existing metadata keys (already implemented in analyze-market.ts):**

| Key | Type | Description | Set When |
|-----|------|-------------|----------|
| `status` | string | `discovering`, `waiting_confirmation`, `extracting`, `completed`, `failed` | Each phase transition |
| `step` | string | PT-BR human-readable step description | Each phase transition |
| `progress` | number (0-100) | Numeric progress percentage | Each phase transition |
| `warnings` | string | Warning messages (e.g., failed sources) | On partial failures |
| `error` | string | Error message | On fatal failure |
| `candidates` | ScoredCompetitor[] | Discovered competitor candidates | After scoring, before confirmation |
| `confirmationTokenId` | string | Waitpoint token for competitor confirmation | When waiting for user |
| `subTasks` | Record<string, Record<string, string>> | Per-competitor per-dimension extraction status | During extraction |
| `extractionSummary` | { success, failed, total } | Summary of extraction results | After extraction completes |
| `synthesisStatus` | string | `success`, `partial`, `unavailable`, `skipped` | After synthesis |
| `modoCompleto` | string | `degraded` if user business extraction failed | On user business failure |
| `modoCompletoReason` | string | PT-BR explanation of degradation | On user business failure |

**Frontend consumption pattern (documentation only -- not implemented in this phase):**
```typescript
// This is what the frontend team will use -- NOT built in this phase
"use client";
import { useRealtimeRun } from "@trigger.dev/react-hooks";
import type { analyzeMarket } from "@/trigger/analyze-market";

const { run, error } = useRealtimeRun<typeof analyzeMarket>(runId, {
  accessToken: publicAccessToken, // from POST /api/analyze response
  onComplete: (completedRun) => {
    // Fetch full results from GET /api/analysis/[id]
  },
});
// run.metadata contains all keys above
```

### Anti-Patterns to Avoid
- **Storing section status in DB:** Status becomes stale. Always derive from actual data at query time per D-08.
- **Multiple API calls for dashboard sections:** One round trip is better. Aggregate everything in a single GET route per D-01.
- **Building a custom polling endpoint:** Trigger.dev Realtime already handles real-time updates. The status fallback route is only for non-WebSocket clients, not the primary mechanism per D-04/D-05.
- **Nesting response deeply:** Use a flat response shape per D-03. Frontend should not have to navigate deep nesting.
- **Returning raw DB rows (snake_case):** All existing query functions already map to camelCase. Maintain this pattern.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Real-time progress tracking | Custom SSE/WebSocket/polling | Trigger.dev Realtime + useRealtimeRun | Already wired with publicAccessToken. metadata.set() calls already exist in orchestrator |
| Data aggregation queries | Custom SQL joins or RPC | Existing query functions in queries.ts | All 5 query functions already exist, tested, and map snake_case to camelCase |
| Status tracking in DB | New DB column for section status | Runtime derivation from data presence | Always accurate, no migration needed, no staleness |
| Response types | Manual interface typing | Extend existing types in analysis.ts | Competitor, Synthesis, ViralContent, Analysis types already exist |

**Key insight:** This phase is primarily about assembling existing pieces into a clean API contract. All data retrieval functions exist. The Trigger.dev Realtime infrastructure is pre-wired. The work is creating two thin route handlers and one type definition.

## Common Pitfalls

### Pitfall 1: Query Errors Breaking the Entire Response
**What goes wrong:** If one of the parallel queries throws (e.g., getViralContentByAnalysis), Promise.all rejects and the entire response fails.
**Why it happens:** Promise.all fails fast on first rejection.
**How to avoid:** Wrap each query in a try-catch or use Promise.allSettled. Since `getUserBusinessByAnalysis` already returns null on error, the others may throw. Consider wrapping each in a safe function that returns null/[] on error.
**Warning signs:** 500 errors on the results route when one table has issues.

### Pitfall 2: Route Path Confusion (analyze vs analysis)
**What goes wrong:** New routes at `/api/analysis/[id]` conflict or confuse with existing `/api/analyze/[id]`.
**Why it happens:** Similar naming, different purposes (analyze = action verb, analysis = resource noun).
**How to avoid:** The CONTEXT.md already addresses this: `analyze` = action endpoints, `analysis` = resource endpoints. Document this distinction in the route files.
**Warning signs:** 404s or wrong route matches.

### Pitfall 3: Returning Incomplete Data During Processing
**What goes wrong:** Frontend calls GET /api/analysis/[id] while the cascade is still running and gets an empty response.
**Why it happens:** Analysis status is 'processing' but some data may already be saved (e.g., competitors created but not yet extracted).
**How to avoid:** The section status derivation handles this naturally -- sections with no data show 'unavailable'. The frontend should check `analysis.status` to know if the analysis is still running and show progress via Realtime hooks.
**Warning signs:** Frontend showing "no data" when analysis is actually in progress.

### Pitfall 4: Missing await on params (Next.js 15)
**What goes wrong:** `params.id` is undefined because params is a Promise.
**Why it happens:** Next.js 15 changed params to be async. Forgetting `await` is a common migration error.
**How to avoid:** Always destructure after await: `const { id } = await params;`
**Warning signs:** Runtime error "Cannot read property 'id' of Promise" or `id` is undefined.

### Pitfall 5: Not Handling analysis.status === 'failed'
**What goes wrong:** Frontend receives a 200 OK with a failed analysis and tries to render empty data.
**Why it happens:** The results route returns data regardless of status.
**How to avoid:** Include `analysis.status` prominently in the response. Section statuses will naturally show 'unavailable' for everything. Frontend checks status first.
**Warning signs:** Dashboard shows blank cards for a failed analysis.

## Code Examples

### AnalysisResultsResponse Type Definition
```typescript
// Source: derived from D-03, D-06, D-07 decisions + existing types
import type { Analysis } from './analysis';
import type { Competitor } from './competitor';
import type { ViralContent, ViralPatterns } from './viral';
import type { Synthesis } from './database';

/** Status de uma secao individual do dashboard (per D-07) */
export interface SectionStatus {
  section: string;
  status: 'available' | 'partial' | 'unavailable' | 'failed';
  message?: string;
}

/** Resposta completa do endpoint GET /api/analysis/[id] (per D-03, D-06) */
export interface AnalysisResultsResponse {
  analysis: Analysis;
  competitors: Competitor[];
  userBusiness: Competitor | null;
  viralContent: ViralContent[];
  synthesis: Synthesis | null;
  viralPatterns: ViralPatterns | null;
  sectionStatuses: SectionStatus[];
}
```

### Section Status Derivation Logic (Complete)
```typescript
// 10 sections per D-07: overview, competitors, website, seo, social, ads, viral,
// recommendations, scripts, comparative
export const deriveSectionStatuses = (
  analysis: Analysis,
  competitors: Competitor[],
  viralContent: ViralContent[],
  synthesis: Synthesis | null
): SectionStatus[] => {
  const statuses: SectionStatus[] = [];

  // 1. Overview
  statuses.push({
    section: 'overview',
    status: analysis.nicheInterpreted ? 'available' : 'unavailable',
  });

  // 2. Competitors
  statuses.push({
    section: 'competitors',
    status: competitors.length > 0 ? 'available' : 'unavailable',
  });

  // Helper: check data presence across competitors
  const hasAny = (field: keyof Competitor) => competitors.some(c => c[field] !== null);
  const hasAll = (field: keyof Competitor) => competitors.length > 0 && competitors.every(c => c[field] !== null);

  // 3. Website
  statuses.push({
    section: 'website',
    status: hasAll('websiteData') ? 'available' : hasAny('websiteData') ? 'partial' : 'unavailable',
  });

  // 4. SEO
  statuses.push({
    section: 'seo',
    status: hasAll('seoData') ? 'available' : hasAny('seoData') ? 'partial' : 'unavailable',
  });

  // 5. Social
  statuses.push({
    section: 'social',
    status: hasAll('socialData') ? 'available' : hasAny('socialData') ? 'partial' : 'unavailable',
  });

  // 6. Ads (combined meta + google + gmb)
  const hasAnyAds = competitors.some(c =>
    c.metaAdsData !== null || c.googleAdsData !== null || c.gmbData !== null
  );
  const hasAllAds = competitors.length > 0 && competitors.every(c =>
    c.metaAdsData !== null || c.googleAdsData !== null
  );
  statuses.push({
    section: 'ads',
    status: hasAllAds ? 'available' : hasAnyAds ? 'partial' : 'unavailable',
  });

  // 7. Viral
  statuses.push({
    section: 'viral',
    status: viralContent.length > 0 ? 'available' : 'unavailable',
  });

  // 8-10. Synthesis-dependent sections
  if (synthesis) {
    statuses.push({
      section: 'recommendations',
      status: synthesis.recommendations.length > 0 ? 'available' : 'unavailable',
    });
    statuses.push({
      section: 'scripts',
      status: synthesis.creativeScripts.length > 0 ? 'available' : 'unavailable',
    });
    statuses.push({
      section: 'comparative',
      status: synthesis.comparativeAnalysis
        ? synthesis.comparativeAnalysis.comparativeStatus === 'full'
          ? 'available'
          : 'partial'
        : 'unavailable',
    });
  } else {
    statuses.push({ section: 'recommendations', status: 'unavailable' });
    statuses.push({ section: 'scripts', status: 'unavailable' });
    statuses.push({ section: 'comparative', status: 'unavailable' });
  }

  return statuses;
};
```

### Error-Safe Query Aggregation
```typescript
// Wrap queries to prevent Promise.all failure cascading
const safeQuery = async <T>(fn: () => Promise<T>, fallback: T): Promise<T> => {
  try {
    return await fn();
  } catch {
    return fallback;
  }
};

// Usage in route handler:
const [competitors, userBusiness, viralContent, synthesis] = await Promise.all([
  safeQuery(() => getCompetitorsByAnalysis(id), []),
  safeQuery(() => getUserBusinessByAnalysis(id), null),
  safeQuery(() => getViralContentByAnalysis(id), []),
  safeQuery(() => getSynthesisByAnalysis(id), null),
]);
```

### Cache-Control for Completed Analyses
```typescript
// For completed analyses, data is immutable -- cache aggressively
const headers: Record<string, string> = {};
if (analysis.status === 'completed') {
  headers['Cache-Control'] = 'public, max-age=3600, stale-while-revalidate=86400';
} else {
  headers['Cache-Control'] = 'no-cache, no-store';
}

return NextResponse.json(response, { headers });
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Custom SSE/polling for progress | Trigger.dev Realtime with React hooks | Trigger.dev v4 (2025) | Eliminates all custom progress infrastructure |
| Synchronous params in Route Handlers | Async params (Promise) | Next.js 15 (2024) | Must await params in all dynamic routes |
| Multiple API calls per dashboard section | Single aggregation endpoint | Standard REST pattern | One round trip, simpler frontend |

**Deprecated/outdated:**
- Custom SSE endpoints for job progress: Replaced by Trigger.dev Realtime hooks
- Synchronous params access: Deprecated in Next.js 15, removed in 16

## Open Questions

1. **Cache-Control headers**
   - What we know: Completed analyses are immutable data. Caching would reduce Supabase reads.
   - What's unclear: Whether Vercel CDN will respect Cache-Control headers from Route Handlers.
   - Recommendation: Add headers for completed analyses (`max-age=3600`). Low effort, potential gain. Skip if time is tight.

2. **Error response consistency**
   - What we know: Existing routes use `{ error: string }` pattern with PT-BR messages.
   - What's unclear: Whether a more structured error response is needed (error code + message).
   - Recommendation: Keep the existing `{ error: string }` pattern for consistency. Two error cases: 404 (not found) and 500 (server error).

## Project Constraints (from CLAUDE.md)

Key directives affecting this phase:

- **Route Handlers pattern:** Use NextResponse.json() with typed responses (established pattern in analyze/route.ts)
- **Error messages in PT-BR:** All error messages must be in Portuguese (e.g., "Analise nao encontrada.")
- **No `any` type:** TypeScript types must be explicit. AnalysisResultsResponse must be fully typed.
- **Functions < 30 lines:** deriveSectionStatuses can be split into helper functions
- **JSDoc on public functions:** All exported functions need documentation
- **camelCase response fields:** Row mappers already handle snake_case DB -> camelCase TS
- **Atomic commits per task:** Each task (type definition, results route, status route) gets its own commit
- **Test after changes:** Vitest tests required for new route handlers and derivation logic
- **No frontend work:** Per user preference, skip ALL React components/pages/layouts

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.x |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run --reporter=verbose` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DASH-01 | Results API returns all analysis sections | unit | `npx vitest run tests/unit/analysis-results-route.test.ts -x` | Wave 0 |
| DASH-02 | Status fallback route returns current status | unit | `npx vitest run tests/unit/analysis-status-route.test.ts -x` | Wave 0 |
| DASH-03 | Section statuses derived correctly from partial data | unit | `npx vitest run tests/unit/section-statuses.test.ts -x` | Wave 0 |
| DASH-04 | Responsive layout | manual-only | N/A -- frontend deferred | N/A |
| DASH-05 | PT-BR throughout | manual-only | N/A -- frontend deferred | N/A |
| DASH-06 | Clean professional UI | manual-only | N/A -- frontend deferred | N/A |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run --reporter=verbose`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/unit/analysis-results-route.test.ts` -- covers DASH-01 (results API aggregation)
- [ ] `tests/unit/analysis-status-route.test.ts` -- covers DASH-02 (status fallback)
- [ ] `tests/unit/section-statuses.test.ts` -- covers DASH-03 (section status derivation logic)

## Sources

### Primary (HIGH confidence)
- `src/lib/supabase/queries.ts` -- All 5 query functions verified: getAnalysis, getCompetitorsByAnalysis, getUserBusinessByAnalysis, getViralContentByAnalysis, getSynthesisByAnalysis
- `src/app/api/analyze/route.ts` -- Confirmed publicAccessToken returned at line 56
- `src/trigger/analyze-market.ts` -- All metadata keys verified: status, step, progress, warnings, error, candidates, confirmationTokenId, subTasks, extractionSummary, synthesisStatus, modoCompleto, modoCompletoReason
- `src/types/analysis.ts`, `src/types/competitor.ts`, `src/types/database.ts`, `src/types/viral.ts` -- All domain types verified
- [Next.js 15 Route Handler docs](https://nextjs.org/docs/app/api-reference/file-conventions/route) -- Async params pattern confirmed
- [Next.js 15 async params migration](https://nextjs.org/docs/messages/sync-dynamic-apis) -- Promise params required in Next.js 15+

### Secondary (MEDIUM confidence)
- [Trigger.dev Realtime hooks docs](https://trigger.dev/docs/realtime/react-hooks/triggering) -- useRealtimeRun API verified, useTaskTrigger returns publicAccessToken
- [Trigger.dev v4 Realtime rules](https://github.com/triggerdotdev/trigger.dev/blob/main/rules/4.0.0/realtime.md) -- Metadata, auth, and subscription patterns
- [Trigger.dev Next.js Realtime demo](https://github.com/triggerdotdev/nextjs-realtime-simple-demo) -- Reference architecture for Realtime + Next.js App Router

### Tertiary (LOW confidence)
- None. All findings verified against primary sources.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All dependencies already installed and verified in package.json
- Architecture: HIGH - Pattern follows existing established codebase conventions (analyze route, confirm-competitors route)
- Pitfalls: HIGH - Pitfalls derived from verified Next.js 15 breaking change (async params) and standard Promise.all behavior

**Research date:** 2026-03-28
**Valid until:** 2026-04-15 (stable domain, existing codebase patterns)
