# Phase 10: History, Cache & PDF Export - Research

**Researched:** 2026-03-28
**Domain:** Backend API — Supabase queries, cursor pagination, JSONB cache matching, PDF generation with jsPDF
**Confidence:** HIGH

## Summary

Phase 10 delivers three backend-only capabilities: (1) a history API endpoint with cursor-based pagination, (2) a cache-check mechanism that intercepts repeated niche queries within 24 hours, and (3) a PDF report generation endpoint using jsPDF. All three are API Route Handlers in Next.js 15 App Router — no frontend/UI code.

The existing codebase provides strong foundations. `listAnalyses()` in queries.ts already queries analyses ordered by `created_at DESC` and needs only cursor/filter parameters added. The `POST /api/analyze` route is a clean insertion point for the cache check — add the JSONB ILIKE query before `createAnalysis()`. The PDF endpoint (`GET /api/report/[id]/route.ts`) reuses the same `safeQuery()` + parallel data-fetching pattern from `GET /api/analysis/[id]`.

The main technical risk is jsPDF's UTF-8 handling for Portuguese characters (accents like a, e, c, o). jsPDF's 14 standard fonts are ASCII-only — a custom TTF font must be embedded via `addFileToVFS()` + `addFont()`. The jspdf-autotable plugin (v5.0.7) is recommended for competitor comparison tables as it handles pagination, column sizing, and multi-page overflow automatically.

**Primary recommendation:** Install `jspdf@4.2.1` + `jspdf-autotable@5.0.7`. Embed a PT-BR-compatible TTF font (Roboto or Inter). Use Supabase's `->>` JSONB text extraction with `.ilike()` for cache matching. Add a composite expression index on the three niche_interpreted fields for cache query performance.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Match "same niche" using `niche_interpreted` JSONB fields (`niche` + `segment` + `region`), all normalized to lowercase — not raw `niche_input` string comparison
- **D-02:** Only completed analyses qualify for cache hits
- **D-03:** Cache window is 24 hours from `created_at` timestamp
- **D-04:** Cache check happens in `POST /api/analyze` before creating a new analysis record. Returns existing `analysisId`, `redirectUrl`, and `cached: true` flag
- **D-05:** Cache match query uses ILIKE on niche_interpreted->>niche, segment, region with status='completed' and created_at > NOW() - 24h
- **D-06:** Mode must also match for cache hits — quick != complete
- **D-07:** New endpoint `GET /api/history/route.ts` with paginated list sorted by `created_at DESC`
- **D-08:** Cursor-based pagination with `cursor` (ISO timestamp) and `limit` (default 20, max 50)
- **D-09:** `AnalysisSummary` type: lightweight subset — `id`, `nicheInput`, `nicheInterpreted`, `mode`, `status`, `createdAt`
- **D-10:** Optional `status` query param for filtering
- **D-11:** Extend existing `listAnalyses()` in queries.ts with cursor pagination and status filter
- **D-12:** New endpoint `GET /api/report/[id]/route.ts` for PDF generation
- **D-13:** Use `jspdf` with streaming response, `Content-Type: application/pdf`, `Content-Disposition: attachment`
- **D-14:** PDF sections in order: cover page, market overview, competitor comparison table, website/SEO, social media, ads, viral content, AI recommendations, creative scripts
- **D-15:** Only completed analyses can be exported as PDF (400 for non-completed)
- **D-16:** PDF text in PT-BR throughout

### Claude's Discretion
- Exact PDF typography, colors, and spacing
- Whether to add autoTable plugin for jspdf tables or build tables manually
- Query optimization for the cache match (may add a composite index)
- Error message wording in PT-BR

### Deferred Ideas (OUT OF SCOPE)
None
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| HIST-01 | Analysis results are saved in Supabase by niche category | Already satisfied by existing schema — `analyses` table stores `niche_interpreted` JSONB. Cache query leverages this. No new schema needed. |
| HIST-02 | User can access a list of past analyses (history page) | `GET /api/history` endpoint with cursor pagination. Extends existing `listAnalyses()`. Backend-only (no page). |
| HIST-03 | User can view a previous analysis result | Already satisfied — `GET /api/analysis/[id]` exists from Phase 9. No new work needed. |
| HIST-04 | 24h cache: same niche within 24h serves cached results | Cache check in `POST /api/analyze` using JSONB ILIKE query on `niche_interpreted` fields + status + mode + created_at window. |
| PDF-01 | User can export complete analysis as PDF report | `GET /api/report/[id]/route.ts` using jsPDF + jspdf-autotable. Returns binary PDF with Content-Disposition header. |
| PDF-02 | PDF includes all dashboard sections in clean, printable layout | PDF generation function assembles cover page + 8 content sections from analysis data using the same `safeQuery()` pattern as the analysis results endpoint. |
| PDF-03 | PDF has cover with logo, date, and niche name | Cover page section in jsPDF with text positioning, brand colors, niche name, and generation date. |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **Backend only:** Skip ALL frontend/UI work per user preference — this phase builds API endpoints only
- **Approved deps:** `jspdf` 2.x is listed in CLAUDE.md approved deps. Current latest is 4.2.1 (breaking changes are security-related, not API-breaking for our usage). `jspdf-autotable` is NOT in the approved list but CONTEXT.md D-13 explicitly approves jspdf and Claude's Discretion allows autoTable decision
- **Error messages in PT-BR:** All error responses must use Portuguese
- **No `any` types** without justification
- **Functions > 30 lines must be split**
- **Atomic commits per task**
- **JSDoc on all public functions**
- **Imports organized:** external libs first, then internal, then types
- **Arrow functions for components** (not relevant for this backend-only phase)
- **Test after each significant change**
- **Vercel 10s timeout:** PDF generation in Route Handler must be fast (data already in DB)

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| jspdf | 4.2.1 | Server-side PDF generation | Approved in CLAUDE.md. v4 is current stable. Security improvements (fs restrictions). Same API as v2 for core operations (text, addPage, addFont, output). |
| jspdf-autotable | 5.0.7 | Table rendering in PDFs | Handles column sizing, multi-page overflow, cell wrapping. Compatible with jsPDF 2/3/4 (peer dep `^2 || ^3 || ^4`). Eliminates hand-rolling table layout. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @supabase/supabase-js | ^2 (2.100.x) | Database queries for cache, history, PDF data | Already installed. Used for cache-match query, paginated history, PDF data fetching. |
| zod | 3.25.76 | Query param validation on history endpoint | Already installed. Validate `cursor`, `limit`, `status` params. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| jspdf-autotable | Manual table drawing with jsPDF lines/text | Manual approach requires calculating column widths, row heights, page breaks, cell wrapping. AutoTable handles all this. Use autoTable. |
| jsPDF 4.2.1 | jsPDF 2.x (CLAUDE.md listed version) | v2 works but v4 has security fixes. API is backwards-compatible for our usage (text, tables, output). v4 recommended. |
| Expression index on JSONB | GIN index on niche_interpreted | GIN is for containment operators (@>), not for ->> text extraction + ILIKE. Expression B-tree index on `lower(niche_interpreted->>'niche')` etc. is correct for ILIKE queries. |

**Installation:**
```bash
npm install jspdf@4.2.1 jspdf-autotable@5.0.7
```

**Version verification:**
- jspdf: 4.2.1 (verified via `npm view jspdf version` on 2026-03-28)
- jspdf-autotable: 5.0.7 (verified via `npm view jspdf-autotable version` on 2026-03-28, peer dep jspdf `^2 || ^3 || ^4` confirmed)

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/api/
│   ├── analyze/route.ts          # MODIFY: add cache check before createAnalysis()
│   ├── history/route.ts          # NEW: paginated history endpoint
│   └── report/[id]/route.ts     # NEW: PDF generation endpoint
├── lib/
│   ├── supabase/queries.ts       # MODIFY: add findCachedAnalysis(), extend listAnalyses()
│   └── pdf/
│       ├── generate.ts           # REPLACE: actual jsPDF implementation
│       ├── fonts.ts              # NEW: embedded TTF font as base64
│       └── sections.ts           # NEW: individual PDF section renderers
├── types/
│   └── analysis.ts               # MODIFY: add AnalysisSummary type, extend StartAnalysisResponse
supabase/
└── migrations/
    └── 20260328220000_add_cache_index.sql  # NEW: composite expression index
tests/
└── unit/
    ├── history-route.test.ts     # NEW
    ├── cache-check.test.ts       # NEW
    └── pdf-generate.test.ts      # NEW
```

### Pattern 1: Cache Check in POST /api/analyze
**What:** Before creating a new analysis, query for existing completed analysis with matching niche_interpreted fields within 24h
**When to use:** Every POST /api/analyze request
**Example:**
```typescript
// In POST /api/analyze route, before createAnalysis():
const cached = await findCachedAnalysis({
  niche: validated.nicheInterpreted.niche,
  segment: validated.nicheInterpreted.segment,
  region: validated.nicheInterpreted.region,
  mode: validated.mode,
});

if (cached) {
  return NextResponse.json({
    analysisId: cached.id,
    runId: cached.triggerRunId ?? '',
    publicAccessToken: '',
    redirectUrl: `/analysis/${cached.id}`,
    cached: true,
  });
}
// ... existing createAnalysis + trigger flow
```

### Pattern 2: Cursor-Based Pagination
**What:** Use `created_at` timestamp as cursor with `.lt()` filter for stable pagination
**When to use:** History endpoint
**Example:**
```typescript
// In queries.ts
export const listAnalysesPaginated = async (options: {
  cursor?: string;
  limit?: number;
  status?: AnalysisStatus;
}): Promise<{ analyses: AnalysisSummary[]; nextCursor: string | null }> => {
  const supabase = createServerClient();
  const limit = Math.min(options.limit ?? 20, 50);

  let query = supabase
    .from('analyses')
    .select('id, niche_input, niche_interpreted, mode, status, created_at')
    .order('created_at', { ascending: false })
    .limit(limit + 1); // fetch one extra to detect next page

  if (options.cursor) {
    query = query.lt('created_at', options.cursor);
  }
  if (options.status) {
    query = query.eq('status', options.status);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Erro ao listar analises: ${error.message}`);

  const rows = (data ?? []).map(mapAnalysisSummaryRow);
  const hasMore = rows.length > limit;
  const analyses = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? analyses[analyses.length - 1].createdAt : null;

  return { analyses, nextCursor };
};
```

### Pattern 3: PDF Generation with jsPDF + autoTable
**What:** Generate PDF server-side in Route Handler, return as binary response
**When to use:** GET /api/report/[id]
**Example:**
```typescript
import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';

// In route handler:
const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

// Must add custom font for PT-BR characters
doc.addFileToVFS('Roboto-Regular.ttf', ROBOTO_BASE64);
doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
doc.setFont('Roboto');

// Add sections...
addCoverPage(doc, analysis);
addMarketOverview(doc, synthesis);
addCompetitorTable(doc, competitors);
// ... etc

// Return as binary response
const pdfBuffer = doc.output('arraybuffer');
return new Response(pdfBuffer, {
  headers: {
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="lupai-${nicheSlug}-${dateStr}.pdf"`,
    'Content-Length': String(pdfBuffer.byteLength),
  },
});
```

### Pattern 4: Supabase JSONB ILIKE for Cache Matching
**What:** Use `->>` operator to extract JSONB text fields and compare with ILIKE
**When to use:** findCachedAnalysis query
**Example:**
```typescript
const { data } = await supabase
  .from('analyses')
  .select()
  .ilike('niche_interpreted->>niche', nicheNormalized)
  .ilike('niche_interpreted->>segment', segmentNormalized)
  .ilike('niche_interpreted->>region', regionNormalized)
  .eq('status', 'completed')
  .eq('mode', mode)
  .gt('created_at', twentyFourHoursAgo)
  .order('created_at', { ascending: false })
  .limit(1)
  .single();
```

### Anti-Patterns to Avoid
- **Raw niche_input string comparison for cache:** Different phrasings ("loja de suplementos" vs "suplementos esportivos") would miss cache hits. Always use the AI-normalized `niche_interpreted` fields.
- **Offset pagination:** Offset-based pagination (`OFFSET 40 LIMIT 20`) is unstable when new rows are inserted between pages. Use cursor-based with `created_at`.
- **Generating PDF in Trigger.dev tasks:** PDF generation reads pre-computed data from Supabase — it runs in under 1-2 seconds. No need for background jobs. Route Handler is appropriate.
- **Serving non-completed analyses as PDF:** The data may be incomplete or empty. Always check `status === 'completed'` before generating.
- **Using standard jsPDF fonts for PT-BR text:** Standard 14 PDF fonts are ASCII-only. Portuguese accents (a, e, c, o) will render as garbled characters. Must embed a TTF font.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PDF table layout | Manual line/text positioning for tabular data | `jspdf-autotable` `autoTable()` | Column width calculation, cell wrapping, multi-page overflow, header repetition on new pages — all solved by the plugin |
| PT-BR font support | Custom character encoding or HTML-to-PDF pipeline | Embed TTF font (Roboto/Inter) via `addFileToVFS()` + `addFont()` | The only reliable way to render accented characters in jsPDF |
| Cursor pagination logic | Custom SQL offset tracking | Supabase `.lt('created_at', cursor)` + `limit + 1` pattern | Standard cursor pagination pattern that handles concurrent inserts correctly |
| PDF page break management | Manual Y-position tracking and page breaks | `autoTable` handles this; for text sections use jsPDF `doc.internal.pageSize.height` check | Manual page break logic is fragile and error-prone across varying content lengths |

**Key insight:** The PDF generation is the most complex piece. jspdf-autotable eliminates ~60% of the complexity by handling table rendering. The remaining 40% is text sections (cover page, recommendations, scripts) which are straightforward with basic jsPDF text/positioning API. Embedding a TTF font is a one-time setup that solves all PT-BR rendering.

## Common Pitfalls

### Pitfall 1: jsPDF Standard Fonts Cannot Render Portuguese
**What goes wrong:** Accented characters (a, c, e, o, u) render as empty boxes or question marks
**Why it happens:** jsPDF's 14 built-in fonts (Helvetica, Courier, Times) only support ASCII/Latin-1 codepage. Portuguese diacritics need Unicode
**How to avoid:** Embed a TTF font that includes Latin Extended characters. Roboto and Inter both cover full Portuguese character set. Convert TTF to base64 string, store in `src/lib/pdf/fonts.ts`, load with `doc.addFileToVFS()` + `doc.addFont()`
**Warning signs:** If you see `?` or rectangles in PDF output, the font is missing the glyph

### Pitfall 2: jsPDF v4 File System Restrictions
**What goes wrong:** `addFont()` or `addImage()` calls that reference local file paths throw permission errors in Node.js
**Why it happens:** jsPDF v4.0.0 added security restrictions — file system access is restricted by default to prevent path traversal
**How to avoid:** Use `addFileToVFS()` with base64-encoded font data instead of file paths. This bypasses the fs restriction entirely since the font data is in memory
**Warning signs:** Error messages mentioning "permission" or "file access" when loading fonts

### Pitfall 3: Cursor Pagination with Non-Unique Timestamps
**What goes wrong:** If multiple analyses have the exact same `created_at` timestamp, cursor pagination may skip or duplicate rows
**Why it happens:** `lt('created_at', cursor)` excludes the cursor row and any rows with the same timestamp
**How to avoid:** Use `(created_at, id)` compound cursor if needed. However, at the project's expected volume (<50 analyses), timestamp collisions are extremely unlikely. The `created_at` column uses `TIMESTAMPTZ` with microsecond precision. This is a LOW risk for this project.
**Warning signs:** Duplicated items across pages, or items appearing to skip

### Pitfall 4: Cache Query Performance on JSONB ILIKE
**What goes wrong:** The cache-match query scans the entire `analyses` table because there is no index on `niche_interpreted` JSONB subfields
**Why it happens:** Existing indexes (`idx_analyses_niche_input`, `idx_analyses_created_at`) don't cover the JSONB `niche_interpreted->>niche/segment/region` access pattern
**How to avoid:** Add a composite expression index: `CREATE INDEX idx_analyses_cache_match ON analyses (lower(niche_interpreted->>'niche'), lower(niche_interpreted->>'segment'), lower(niche_interpreted->>'region'), mode, status, created_at DESC)`. At current volume (<50 rows) this is optional but good practice.
**Warning signs:** Slow cache-check responses (>500ms)

### Pitfall 5: PDF Size with Embedded Fonts
**What goes wrong:** Embedding a full font file (Roboto Regular is ~160KB as base64) inflates the font module significantly
**Why it happens:** The entire TTF font is stored as a base64 string in the JavaScript source
**How to avoid:** Use a subset font that only includes Latin characters (shrinks to ~30-50KB). Tools like `fonttools`/`pyftsubset` can create subsets. Alternatively, accept the size — 160KB in a server-side module is acceptable (not sent to client).
**Warning signs:** Large bundle size warnings (but since this runs server-side in a Route Handler, it's not a client bundle concern)

### Pitfall 6: jsPDF autoTable Import Pattern Changed in v5
**What goes wrong:** Using `doc.autoTable()` throws "autoTable is not a function"
**Why it happens:** In jspdf-autotable 5.x, the import pattern changed from side-effect import to explicit function import
**How to avoid:** Use the new pattern: `import { autoTable } from 'jspdf-autotable'; autoTable(doc, { ... })` instead of the old `import 'jspdf-autotable'; doc.autoTable({ ... })`
**Warning signs:** Method not found on jsPDF document instance

## Code Examples

### Cache Match Query in queries.ts
```typescript
// Source: CONTEXT.md D-05 + Supabase docs for JSONB filter pattern
export const findCachedAnalysis = async (params: {
  niche: string;
  segment: string;
  region: string;
  mode: 'quick' | 'complete';
}): Promise<Analysis | null> => {
  const supabase = createServerClient();
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('analyses')
    .select()
    .ilike('niche_interpreted->>niche', params.niche.toLowerCase())
    .ilike('niche_interpreted->>segment', params.segment.toLowerCase())
    .ilike('niche_interpreted->>region', params.region.toLowerCase())
    .eq('status', 'completed')
    .eq('mode', params.mode)
    .gt('created_at', twentyFourHoursAgo)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return mapAnalysisRow(data);
};
```

### History API Route Handler
```typescript
// Source: established pattern from analysis/[id]/route.ts + CONTEXT.md D-07 to D-11
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { listAnalysesPaginated } from '@/lib/supabase/queries';

const historyParamsSchema = z.object({
  cursor: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  status: z.enum(['pending', 'processing', 'completed', 'failed']).optional(),
});

export const GET = async (request: Request) => {
  try {
    const { searchParams } = new URL(request.url);
    const params = historyParamsSchema.parse({
      cursor: searchParams.get('cursor') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
      status: searchParams.get('status') ?? undefined,
    });

    const result = await listAnalysesPaginated(params);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Parametros invalidos.' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Erro ao buscar historico de analises.' },
      { status: 500 }
    );
  }
};
```

### PDF Route Handler Skeleton
```typescript
// Source: CONTEXT.md D-12 to D-16 + jsPDF docs
import { NextResponse } from 'next/server';
import { getAnalysis } from '@/lib/supabase/queries';
import { generateAnalysisPdf } from '@/lib/pdf/generate';

export const GET = async (
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params;
    const analysis = await getAnalysis(id);

    if (!analysis) {
      return NextResponse.json(
        { error: 'Analise nao encontrada.' },
        { status: 404 }
      );
    }

    if (analysis.status !== 'completed') {
      return NextResponse.json(
        { error: 'Somente analises concluidas podem ser exportadas como PDF.' },
        { status: 400 }
      );
    }

    const pdfBuffer = await generateAnalysisPdf(id);
    const nicheSlug = (analysis.nicheInterpreted?.niche ?? 'analise')
      .toLowerCase().replace(/\s+/g, '-');
    const dateStr = new Date().toISOString().split('T')[0];

    return new Response(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="lupai-${nicheSlug}-${dateStr}.pdf"`,
        'Content-Length': String(pdfBuffer.byteLength),
      },
    });
  } catch {
    return NextResponse.json(
      { error: 'Erro ao gerar relatorio PDF.' },
      { status: 500 }
    );
  }
};
```

### jsPDF Custom Font Loading
```typescript
// Source: jsPDF docs + Medium article on UTF-8 support
import { jsPDF } from 'jspdf';
import { ROBOTO_REGULAR_BASE64 } from './fonts';

export const createPdfDoc = (): jsPDF => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // Load custom font for PT-BR character support
  doc.addFileToVFS('Roboto-Regular.ttf', ROBOTO_REGULAR_BASE64);
  doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
  doc.setFont('Roboto');

  return doc;
};
```

### AnalysisSummary Type
```typescript
// Source: CONTEXT.md D-09
export interface AnalysisSummary {
  id: string;
  nicheInput: string;
  nicheInterpreted: NicheInterpreted | null;
  mode: AnalysisMode;
  status: AnalysisStatus;
  createdAt: string;
}
```

### Extended StartAnalysisResponse
```typescript
// Source: CONTEXT.md D-04
export interface StartAnalysisResponse {
  analysisId: string;
  runId: string;
  publicAccessToken: string;
  redirectUrl: string;
  cached?: boolean; // true when served from cache
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| jsPDF v2 side-effect import for autoTable | jspdf-autotable v5 explicit function import `autoTable(doc, {...})` | jspdf-autotable 5.0 (2024) | Must use new import pattern |
| jsPDF v2 unrestricted fs access | jsPDF v4 restricted fs by default | jsPDF 4.0 (Jan 2026) | Use `addFileToVFS()` with base64 data, not file paths |
| Offset pagination | Cursor-based pagination | Industry standard since ~2020 | More stable for lists with concurrent inserts |

**Deprecated/outdated:**
- `doc.autoTable({...})` instance method: Removed in jspdf-autotable 5.0. Use `autoTable(doc, {...})` instead.
- jsPDF `save()` for server-side: `save()` writes to filesystem. Use `output('arraybuffer')` for in-memory generation.

## Open Questions

1. **Font file selection and licensing**
   - What we know: Roboto (Apache 2.0) and Inter (OFL) are both free, both cover full Portuguese character set
   - What's unclear: Which font looks better in the PDF context, whether to subset or embed full font
   - Recommendation: Use Roboto Regular — it's the most widely used free font, excellent PT-BR support, Apache 2.0 license. Embed full font (~160KB) since it's server-side only. If file size is a concern, use `pyftsubset` to create a Latin-only subset (~40KB).

2. **Supabase ILIKE on JSONB ->> performance without index**
   - What we know: At <50 rows, any query is fast. Expression index on `lower(niche_interpreted->>'niche')` etc. would optimize it.
   - What's unclear: Whether Supabase free tier supports creating expression indexes on JSONB fields (it should — it's standard PostgreSQL)
   - Recommendation: Create the index in a migration. Even if unnecessary for current volume, it documents the intended access pattern and prevents future degradation.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.x |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| HIST-01 | Analysis results saved by niche in Supabase | unit (mock query) | `npx vitest run tests/unit/cache-check.test.ts -x` | No - Wave 0 |
| HIST-02 | History API returns paginated list | unit | `npx vitest run tests/unit/history-route.test.ts -x` | No - Wave 0 |
| HIST-03 | Can view previous analysis result | unit | `npx vitest run tests/unit/analysis-results-route.test.ts -x` | Yes (existing) |
| HIST-04 | 24h cache returns cached results | unit | `npx vitest run tests/unit/cache-check.test.ts -x` | No - Wave 0 |
| PDF-01 | Export analysis as PDF | unit | `npx vitest run tests/unit/pdf-generate.test.ts -x` | No - Wave 0 |
| PDF-02 | PDF includes all dashboard sections | unit | `npx vitest run tests/unit/pdf-generate.test.ts -x` | No - Wave 0 |
| PDF-03 | PDF has cover with logo, date, niche | unit | `npx vitest run tests/unit/pdf-generate.test.ts -x` | No - Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/unit/{changed-test}.test.ts -x`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/unit/history-route.test.ts` -- covers HIST-02, D-07 to D-11
- [ ] `tests/unit/cache-check.test.ts` -- covers HIST-01, HIST-04, D-01 to D-06
- [ ] `tests/unit/pdf-generate.test.ts` -- covers PDF-01, PDF-02, PDF-03, D-12 to D-16
- [ ] `tests/unit/pdf-route.test.ts` -- covers PDF-01, D-12, D-15 (route handler level)

## Sources

### Primary (HIGH confidence)
- Existing codebase: `src/app/api/analyze/route.ts`, `src/app/api/analysis/[id]/route.ts`, `src/lib/supabase/queries.ts`, `src/types/analysis.ts` -- established patterns
- [jsPDF npm](https://www.npmjs.com/package/jspdf) -- v4.2.1 confirmed current
- [jsPDF GitHub](https://github.com/parallax/jsPDF) -- v4 breaking changes, Node.js build, security restrictions
- [jspdf-autotable npm](https://www.npmjs.com/package/jspdf-autotable) -- v5.0.7, peer dep `^2 || ^3 || ^4`
- [jsPDF API docs](https://raw.githack.com/MrRio/jsPDF/master/docs/jsPDF.html) -- output() method: 'arraybuffer' returns ArrayBuffer
- [Supabase JavaScript filters](https://supabase.com/docs/reference/javascript/using-filters) -- JSONB `->>`  operator with `.ilike()` filter

### Secondary (MEDIUM confidence)
- [jsPDF UTF-8 Support article](https://medium.com/@berkayyyulguel/jspdf-utf-8-support-b7df7a76e593) -- Custom TTF font embedding for non-ASCII characters
- [Supabase cursor pagination discussion](https://github.com/orgs/supabase/discussions/3938) -- `.lt('created_at', cursor)` pattern
- [jspdf-autotable GitHub releases](https://github.com/simonbengtsson/jsPDF-AutoTable/releases) -- v5.0.5+ allows jsPDF 4.0 as peer dep

### Tertiary (LOW confidence)
- None -- all findings verified with primary or secondary sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- jspdf 4.2.1 and jspdf-autotable 5.0.7 verified on npm registry, peer dep compatibility confirmed
- Architecture: HIGH -- patterns directly extend existing codebase patterns (Route Handlers, queries.ts, safeQuery)
- Pitfalls: HIGH -- UTF-8/font issue is well-documented and solution is proven. autoTable v5 import change is from official releases. JSONB ILIKE pattern verified in Supabase docs.

**Research date:** 2026-03-28
**Valid until:** 2026-04-28 (30 days -- stable libraries, no fast-moving dependencies)
