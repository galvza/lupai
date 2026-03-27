# Phase 3: Competitor Discovery & Orchestration - Research

**Researched:** 2026-03-27
**Domain:** Trigger.dev v4 orchestration, Apify actor discovery, Gemini AI scoring, waitpoint-based confirmation flow
**Confidence:** HIGH

## Summary

Phase 3 transforms the existing `analyze-market` task stub into a full orchestrator that discovers competitors via multiple Apify sources, scores them with Gemini AI, pauses for user confirmation via Trigger.dev's `wait.forToken`, then fans out to parallel extraction sub-tasks. The key architectural decisions are: (1) using Trigger.dev v4's waitpoint tokens for the human-in-the-loop confirmation pause, (2) using `batch.triggerByTaskAndWait` for parallel sub-task fan-out, (3) using `metadata.set` and `metadata.parent.set` for real-time progress tracking, and (4) creating a new API route `POST /api/analyze/[id]/confirm-competitors` that calls `wait.completeToken` to resume the paused orchestrator.

The AnalysisStatus enum needs to expand from 4 to 7 values to represent the new orchestration states (discovering, waiting_confirmation, extracting). A new Supabase migration must add `'discovering'`, `'waiting_confirmation'`, and `'extracting'` to the `analysis_status` enum. The Apify Google Search actor (`apify/google-search-scraper`) provides web search results; combined with existing Google Maps, Facebook Ads, and SimilarWeb wrappers, this creates the multi-source discovery pipeline. Deduplication uses URL domain normalization, and a hardcoded domain blocklist filters marketplaces and generic portals before AI scoring.

**Primary recommendation:** Use Trigger.dev v4 `wait.forToken` / `wait.completeToken` for the confirmation pause. This avoids splitting the orchestrator into two separate tasks and keeps the entire flow in a single durable task execution with checkpoint/restore.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Fetch 15-20 raw competitor candidates from multiple Apify sources: Google Search, SimilarWeb, Facebook Ads Library, Google Maps
- **D-02:** Each source runs as a separate Trigger.dev sub-task so failures are independent
- **D-03:** Aggregate and deduplicate results across all sources before sending to Gemini for scoring
- **D-04:** EXCLUDE all marketplaces entirely -- both platforms AND sellers within them
- **D-05:** Blocklist domains: amazon.com.br, mercadolivre.com.br, shopee.com.br, magazineluiza.com.br, americanas.com.br, aliexpress.com, casasbahia.com.br
- **D-06:** Blocklist generic portals: wikipedia, youtube.com, reddit.com, reclameaqui.com.br, review/list blogs
- **D-07:** ONLY include competitors with independent digital presence: own website/landing page + active social media
- **D-08:** If a result has no detectable website or social profile, discard it
- **D-09:** The AI must validate: "Does this business have its own site AND at least one active social media profile?"
- **D-10:** Send aggregated raw results to Gemini for intelligent filtering and scoring
- **D-11:** Gemini scores each result 0-100 using match criteria: segment match, product match, size match, region match, active digital presence
- **D-12:** Threshold: 70+ score to qualify as a competitor
- **D-13:** Return top 3-4 qualifying competitors, sorted by score descending
- **D-14:** Present discovered competitors to user for confirmation before full extraction begins
- **D-15:** User can remove competitors they don't want analyzed (satisfies COMP-02, COMP-03)
- **D-16:** After confirmation, persist selected competitors to Supabase via createCompetitor()
- **D-17:** Confirmation happens via API endpoint -- frontend sends confirmed competitor list, backend proceeds to fan-out
- **D-18:** Expand existing `analyze-market` task stub into full orchestrator with step progression
- **D-19:** Orchestrator flow: discovery -> AI scoring/filtering -> pause for user confirmation -> fan-out extraction
- **D-20:** Fan-out uses Trigger.dev's `trigger.batchTriggerAndWait()` or parallel task triggers for sub-tasks
- **D-21:** Sub-task IDs follow kebab-case per CLAUDE.md: `extract-website`, `extract-social`, `extract-ads`, `extract-viral`
- **D-22:** Each sub-task receives a single competitor + analysis context as payload
- **D-23:** Each sub-task is fully independent -- failure in one does not block others (ORCH-02)
- **D-24:** Use Trigger.dev `metadata.set()` for step-by-step progress updates
- **D-25:** Progress steps: "Descobrindo concorrentes..." -> "Filtrando resultados..." -> "Aguardando confirmacao..." -> "Extraindo dados de [Competitor]..." (per sub-task)
- **D-26:** Frontend subscribes via `@trigger.dev/react-hooks` useRealtimeRun (established in Phase 1 stack decisions)
- **D-27:** Each sub-task updates its own metadata independently so the frontend can show per-competitor progress
- **D-28:** If ALL discovery sources fail, report error with PT-BR message: "Nao foi possivel encontrar concorrentes para este nicho. Tente descrever de outra forma."
- **D-29:** If SOME discovery sources fail but others succeed, proceed with available results (log failures silently)
- **D-30:** If Gemini scoring fails, fall back to returning top results by source relevance without scoring
- **D-31:** If fewer than 3 competitors pass the 70+ threshold, return whatever passed (even 1-2) with a note

### Claude's Discretion
- Exact Apify actor IDs for Google Search (web search actor selection)
- Deduplication algorithm (domain matching, fuzzy name matching)
- Gemini prompt structure for competitor scoring
- How to structure the confirmation API endpoint (polling vs webhook vs SSE)
- Exact metadata keys and progress percentage calculations

### Deferred Ideas (OUT OF SCOPE)
None -- analysis stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| COMP-01 | System automatically discovers 3-4 relevant competitors for the given niche | Discovery pipeline: 4 Apify sources (Google Search, SimilarWeb, Facebook Ads, Google Maps) -> dedup -> Gemini scoring -> top 3-4 with score >= 70 |
| COMP-02 | System presents discovered competitors to user for confirmation | Trigger.dev `wait.forToken` pauses orchestrator; metadata exposes candidates; API route serves them |
| COMP-03 | User can remove or adjust competitors before full extraction | `POST /api/analyze/[id]/confirm-competitors` receives confirmed list; calls `wait.completeToken` to resume |
| ORCH-01 | Cascade of extraction runs as background jobs via Trigger.dev (not in API routes) | `analyze-market` orchestrator task uses `batch.triggerByTaskAndWait` for parallel sub-task fan-out |
| ORCH-02 | Each extraction step is independent -- failure in one does not block others | Each sub-task is a separate Trigger.dev task; `batch.triggerByTaskAndWait` returns per-run ok/error status; orchestrator handles partial failures gracefully |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **Stack:** Next.js 15.5, TypeScript 5.7, Trigger.dev v4, @google/genai, apify-client v2, Supabase v2, Zod 3.25 pinned
- **Trigger.dev tasks:** `task({ id: 'kebab-case', maxDuration: 300, run: async (payload) => {} })`
- **Gemini calls:** `genai.models.generateContent()` with `responseMimeType: 'application/json'` and `responseJsonSchema` via zod-to-json-schema
- **Apify calls:** `client.actor(ACTOR_ID).call(input)` -> `client.dataset(run.defaultDatasetId).listItems()` -> filter fields
- **DB pattern:** snake_case DB columns -> camelCase TS types via row mappers
- **Error messages:** PT-BR with descriptive context
- **Imports organization:** external libs first, then internal, then types
- **Functions > 30 lines:** must be split into smaller functions
- **JSDoc:** required for all public functions
- **No `any`:** TypeScript strict, no `any` without justification
- **Independent cascade steps:** failure in one does not block others
- **Service clients:** use `process.env` directly (not Zod config imports) to avoid parse errors in Trigger.dev edge environment
- **Skip ALL frontend/UI work:** Only backend, API routes, integrations, Trigger.dev jobs, database, and business logic

## Standard Stack

### Core (Phase 3 Specific)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@trigger.dev/sdk` | ^4 (v4.3.x) | Task definitions, batch, wait, metadata | Already installed. Provides `task`, `batch`, `wait`, `metadata` imports |
| `@google/genai` | ^1 (v1.46.x) | Gemini AI for competitor scoring | Already installed. Pattern established in `understand.ts` |
| `apify-client` | ^2 (v2.22.x) | Google Search scraper actor calls | Already installed. Pattern established in all `lib/apify/*.ts` wrappers |
| `zod` | 3.25.76 | Schema validation for discovery results and Gemini responses | Already installed and pinned |
| `zod-to-json-schema` | ^3 | Convert Zod schemas to JSON Schema for Gemini structured output | Already installed. Pattern in `understand.ts` |

### Apify Actors for Discovery

| Actor ID | Purpose | Input | Key Output Fields |
|----------|---------|-------|-------------------|
| `apify/google-search-scraper` | Web search for competitors in niche | `{ queries: [...], countryCode: 'BR', languageCode: 'pt-BR', maxPagesPerQuery: 1 }` | `organicResults[].url`, `organicResults[].title`, `organicResults[].description` |
| `compass/google-maps-scraper` | Local business discovery | `{ searchStringsArray: [...] }` | `title`, `website`, `categories`, `totalScore` -- already wrapped in `google-maps.ts` |
| `apify/facebook-ads-scraper` | Discover competitors running Meta ads | `{ searchQuery: niche, country: 'BR' }` | Advertiser names, ad URLs, page names -- already wrapped in `facebook-ads.ts` |
| `tri_angle/similarweb-scraper` | Discover competitors by similar sites | `{ urls: [known_competitor_url] }` | `similarSites[].url`, `similarSites[].name` -- already wrapped in `similarweb.ts` |

**New wrapper needed:** `src/lib/apify/google-search.ts` for the Google Search actor. All other actors have existing wrappers.

## Architecture Patterns

### Recommended New Files

```
src/
├── trigger/
│   ├── analyze-market.ts        # MODIFY: expand stub into full orchestrator
│   ├── discover-competitors.ts  # NEW: discovery from single Apify source
│   ├── extract-website.ts       # NEW: stub for Phase 4
│   ├── extract-social.ts        # NEW: stub for Phase 4
│   ├── extract-ads.ts           # NEW: stub for Phase 5
│   └── extract-viral.ts         # NEW: stub for Phase 6
├── lib/
│   ├── apify/
│   │   └── google-search.ts     # NEW: Google Search actor wrapper
│   └── ai/
│       ├── prompts.ts           # MODIFY: add SCORE_COMPETITORS_PROMPT
│       └── score-competitors.ts # NEW: Gemini scoring function
├── app/
│   └── api/
│       └── analyze/
│           └── [id]/
│               └── confirm-competitors/
│                   └── route.ts # NEW: confirmation endpoint
├── types/
│   └── analysis.ts              # MODIFY: expand AnalysisStatus enum
└── utils/
    └── competitors.ts           # NEW: dedup + blocklist filtering
```

### Pattern 1: Waitpoint-Based Confirmation Flow

**What:** The orchestrator discovers competitors, exposes them via metadata, pauses via `wait.forToken`, and resumes when the user confirms via an API endpoint that calls `wait.completeToken`.

**When to use:** Whenever a background task needs human input before proceeding.

**Why this approach:**
- Avoids splitting the orchestrator into two separate tasks (discover + extract) with complex state management between them
- Trigger.dev checkpoints the task state during the wait, so no compute charges
- The token has a configurable timeout (default 10m) -- if user abandons, task fails gracefully
- Single task with a clear linear flow is easier to debug than multi-task coordination

**Example:**
```typescript
// Source: https://trigger.dev/docs/wait-for-token
import { task, metadata, wait } from '@trigger.dev/sdk';

export const analyzeMarket = task({
  id: 'analyze-market',
  maxDuration: 300,
  run: async (payload: AnalyzeMarketPayload) => {
    // Step 1: Discover competitors
    metadata.set('status', 'discovering');
    metadata.set('step', 'Descobrindo concorrentes...');
    const rawCandidates = await discoverCompetitors(payload);

    // Step 2: Score with Gemini
    metadata.set('step', 'Filtrando resultados...');
    const scored = await scoreCompetitors(rawCandidates, payload);

    // Step 3: Pause for user confirmation
    metadata.set('status', 'waiting_confirmation');
    metadata.set('step', 'Aguardando confirmacao...');
    metadata.set('candidates', scored); // Expose to frontend

    const token = await wait.createToken({
      timeout: '10m',
    });

    // Store token ID so the API route can complete it
    metadata.set('confirmationTokenId', token.id);

    const result = await wait.forToken<ConfirmedCompetitors>(token.id);

    if (!result.ok) {
      throw new Error('Confirmacao expirou. Tente iniciar nova analise.');
    }

    // Step 4: Persist confirmed competitors
    const confirmedCompetitors = result.output.competitors;
    // ... createCompetitor() calls ...

    // Step 5: Fan-out to extraction sub-tasks
    metadata.set('status', 'extracting');
    const { runs } = await batch.triggerByTaskAndWait([
      ...confirmedCompetitors.flatMap(comp => [
        { task: extractWebsite, payload: { analysisId, competitor: comp } },
        { task: extractSocial, payload: { analysisId, competitor: comp } },
        { task: extractAds, payload: { analysisId, competitor: comp } },
      ]),
      { task: extractViral, payload: { analysisId, niche: payload.niche } },
    ]);

    // Handle results...
  },
});
```

### Pattern 2: Confirmation API Route

**What:** A Next.js Route Handler that receives the user's confirmed competitor list and calls `wait.completeToken` to resume the paused orchestrator task.

**When to use:** The `POST /api/analyze/[id]/confirm-competitors` endpoint.

**Example:**
```typescript
// Source: https://trigger.dev/docs/wait-for-token
import { wait } from '@trigger.dev/sdk/v3';
import { NextResponse } from 'next/server';

// POST /api/analyze/[id]/confirm-competitors
export const POST = async (
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id: analysisId } = await params;
  const body = await request.json();

  // Validate body.competitors and body.tokenId
  // ...

  await wait.completeToken<ConfirmedCompetitors>(body.tokenId, {
    competitors: body.competitors,
  });

  return NextResponse.json({ status: 'confirmed' });
};
```

**Key insight:** `wait.completeToken` is callable from anywhere in the codebase (API routes, server actions, external services) -- it is NOT limited to inside task run functions. Import from `@trigger.dev/sdk/v3` in Next.js server code.

### Pattern 3: Multi-Source Discovery with Independent Failure

**What:** Each Apify discovery source runs as a separate sub-task via `batch.triggerByTaskAndWait`. If one source fails, others still return results.

**When to use:** The discovery phase of the orchestrator.

**Example:**
```typescript
import { task, batch, metadata } from '@trigger.dev/sdk';

// Each discovery source is a separate task
export const discoverFromGoogleSearch = task({
  id: 'discover-google-search',
  maxDuration: 120,
  run: async (payload: { niche: string; region: string }) => {
    const results = await scrapeGoogleSearch(
      `${payload.niche} ${payload.region} concorrentes`
    );
    return results; // Array of raw candidates
  },
});

// Orchestrator calls all discovery tasks in parallel
const { runs } = await batch.triggerByTaskAndWait([
  { task: discoverFromGoogleSearch, payload: { niche, region } },
  { task: discoverFromGoogleMaps, payload: { niche, region } },
  { task: discoverFromFacebookAds, payload: { niche, region } },
  { task: discoverFromSimilarWeb, payload: { niche, region, seedUrl } },
]);

// Collect results from successful runs only
const allCandidates = runs
  .filter(r => r.ok)
  .flatMap(r => r.output);

if (allCandidates.length === 0) {
  throw new Error(
    'Nao foi possivel encontrar concorrentes para este nicho. Tente descrever de outra forma.'
  );
}
```

### Pattern 4: Metadata-Driven Progress Tracking

**What:** Use `metadata.set()` in the orchestrator and `metadata.parent.set()` in sub-tasks to create a hierarchical progress view that the frontend can subscribe to.

**When to use:** Throughout the orchestrator and all sub-tasks.

**Metadata structure:**
```typescript
// Orchestrator metadata shape
{
  status: 'discovering' | 'scoring' | 'waiting_confirmation' | 'extracting' | 'completed' | 'failed',
  step: string,           // PT-BR human-readable step description
  progress: number,       // 0-100
  candidates: ScoredCandidate[], // Exposed during waiting_confirmation
  confirmationTokenId: string,   // Token ID for the confirmation API route
  errors: string[],       // Accumulated non-fatal errors
  subTasks: {             // Per-competitor extraction progress
    [competitorName: string]: {
      website: 'pending' | 'running' | 'completed' | 'failed',
      social: 'pending' | 'running' | 'completed' | 'failed',
      ads: 'pending' | 'running' | 'completed' | 'failed',
    },
  },
}
```

**Important:** Metadata is limited to 256KB per run. With 4 competitors and their discovery data, this is well within limits.

### Anti-Patterns to Avoid

- **Promise.all with triggerAndWait:** Never use `Promise.all([task1.triggerAndWait(), task2.triggerAndWait()])`. Use `batch.triggerByTaskAndWait` instead. Trigger.dev's checkpoint/restore mechanism does not handle concurrent wait points correctly.
- **Splitting orchestrator into two tasks for confirmation:** Do NOT create a "discover-competitors" task that finishes, then trigger a separate "extract-competitors" task after confirmation. Use `wait.forToken` to keep the flow in a single durable task.
- **Polling for confirmation:** Do NOT create a polling loop inside the task that checks Supabase for a "confirmed" flag. Use `wait.forToken` which is purpose-built for this pattern.
- **Storing raw Apify discovery output:** Filter discovery results to essential fields (name, URL, description) before storing or sending to Gemini. Keep the data lean.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Human-in-the-loop pause/resume | Custom polling loop or Supabase flag checking | Trigger.dev `wait.forToken` / `wait.completeToken` | Checkpoints task state, zero compute during wait, built-in timeout, HTTP callback URL |
| Parallel task fan-out | `Promise.all` with multiple `triggerAndWait` | `batch.triggerByTaskAndWait` | Official API handles checkpoint/restore correctly; Promise.all can deadlock |
| Real-time progress | Custom SSE/WebSocket server | Trigger.dev `metadata.set()` + `@trigger.dev/react-hooks` `useRealtimeRun` | Built on Electric SQL, automatic reconnection, React hooks provided |
| Parent metadata update from child | Custom Supabase writes from child tasks | `metadata.parent.set()` | Synchronous, no DB round-trip, immediately visible to Realtime subscribers |
| URL domain extraction | Custom regex parser | `new URL(url).hostname` | Handles edge cases (ports, paths, protocols) correctly |

**Key insight:** Trigger.dev v4 provides native primitives for every coordination pattern in this phase. The codebase should use `wait.forToken` for confirmation, `batch.triggerByTaskAndWait` for fan-out, and `metadata` for progress. No custom infrastructure needed.

## Common Pitfalls

### Pitfall 1: Apify Google Search Actor Returns Too Many Irrelevant Results

**What goes wrong:** Querying "clinicas odontologicas SP concorrentes" returns directories, review sites, blog posts, and informational pages instead of actual competitor websites.
**Why it happens:** Google Search results for generic niche queries are dominated by SEO-optimized directories (Yelp, Reclame Aqui, listas de "melhores") and informational content, not competitor business websites.
**How to avoid:**
1. Use multiple search queries with different intents: `"clinicas odontologicas SP"`, `"dentista SP site"`, `"clinica dental sao paulo"`
2. Apply the domain blocklist BEFORE sending to Gemini (saves tokens)
3. Use SimilarWeb and Google Maps as higher-signal sources for actual businesses; Google Search is supplementary
4. Set `maxPagesPerQuery: 1` and `resultsPerPage: 10` to control cost
**Warning signs:** Discovery results dominated by directories, review sites, and blog posts.

### Pitfall 2: wait.forToken Timeout Too Short

**What goes wrong:** The orchestrator creates a token with the default 10-minute timeout. The user steps away or is slow to review competitors. Token expires, task fails.
**Why it happens:** Default timeout of 10 minutes may not be enough for users who need time to review.
**How to avoid:** Set timeout to `'30m'` or `'1h'`. The task is checkpointed (no compute cost during wait). Better to wait longer than fail prematurely. Include a clear timeout message in PT-BR if it does expire.
**Warning signs:** `result.ok === false` on `wait.forToken` returns.

### Pitfall 3: Gemini Scoring Returns Invalid or Inconsistent Scores

**What goes wrong:** Gemini returns scores outside 0-100 range, or gives high scores to irrelevant results because the prompt is vague.
**Why it happens:** Without strict JSON schema and examples, Gemini may interpret scoring criteria differently each time.
**How to avoid:**
1. Use structured output with Zod schema that constrains `score` to `z.number().min(0).max(100)`
2. Include 2-3 few-shot examples in the scoring prompt (a good competitor scored 85, a marketplace scored 10, a blog scored 20)
3. Validate Gemini output with Zod before processing
4. If Gemini fails entirely, fall back to returning candidates sorted by source quality (Google Maps > Facebook Ads > SimilarWeb > Google Search)
**Warning signs:** Competitors with scores of 95+ that are clearly irrelevant when manually inspected.

### Pitfall 4: Deduplication Misses Variations of Same Competitor

**What goes wrong:** The same competitor appears from multiple sources with slightly different names/URLs: "Clinica Sorriso", "Clinica Sorriso SP", "clinicasorriso.com.br", "www.clinicasorriso.com.br".
**Why it happens:** Each Apify source formats results differently. Some include "www.", some don't. Some include the full business name with location, some just the brand.
**How to avoid:**
1. Primary dedup: normalize URLs by stripping `www.`, trailing slashes, protocol, and extracting the base domain
2. Secondary dedup: fuzzy name matching -- lowercase, remove common suffixes ("ltda", "me", "eireli", "sa"), compare with simple string similarity
3. When merging duplicates, keep the entry with the most complete data (has both URL and social profiles)
**Warning signs:** Same competitor appearing twice in the final list with slightly different names.

### Pitfall 5: AnalysisStatus Enum Migration Breaks Existing Records

**What goes wrong:** Adding new values to the PostgreSQL `analysis_status` enum requires an ALTER TYPE statement. If done incorrectly, existing records with old status values may cause issues.
**Why it happens:** PostgreSQL enums are strict -- you can only add new values, not remove or rename existing ones.
**How to avoid:**
1. Use `ALTER TYPE analysis_status ADD VALUE IF NOT EXISTS 'discovering';` (idempotent)
2. Add new values one at a time, not in a transaction (PostgreSQL restriction for enum additions)
3. Update TypeScript types to match
4. Test that existing records with 'pending', 'processing', 'completed', 'failed' still work
**Warning signs:** Migration errors mentioning "unsafe use of new value" or enum constraint violations.

### Pitfall 6: batch.triggerByTaskAndWait Import Path

**What goes wrong:** Importing `batch` from the wrong path or using the wrong API signature.
**Why it happens:** The existing codebase uses `@trigger.dev/sdk` in task files and `@trigger.dev/sdk/v3` in API routes. Confusion about which path to use where.
**How to avoid:**
1. Inside task definitions (src/trigger/\*.ts): `import { task, batch, metadata, wait } from '@trigger.dev/sdk'`
2. In API routes / server code (src/app/api/\*.ts): `import { tasks, wait } from '@trigger.dev/sdk/v3'`
3. This matches the existing pattern established in Phase 1/2
**Warning signs:** TypeScript errors about `batch` not being exported, or runtime errors about undefined methods.

## Code Examples

### Google Search Apify Wrapper

```typescript
// src/lib/apify/google-search.ts
// Source: https://apify.com/apify/google-search-scraper
import { ApifyClient } from 'apify-client';

const ACTOR_ID = 'apify/google-search-scraper';

/** Resultado organico do Google Search filtrado */
export interface GoogleSearchResult {
  title: string;
  url: string;
  description: string;
}

/**
 * Busca resultados organicos do Google para descoberta de concorrentes.
 * @param queries - Array de queries de busca
 * @param countryCode - Codigo do pais (default: 'BR')
 * @returns Array de resultados organicos filtrados
 */
export const scrapeGoogleSearch = async (
  queries: string[],
  countryCode = 'BR'
): Promise<GoogleSearchResult[]> => {
  const client = new ApifyClient({ token: process.env.APIFY_API_TOKEN });

  try {
    const run = await client.actor(ACTOR_ID).call({
      queries,
      countryCode,
      languageCode: 'pt-BR',
      maxPagesPerQuery: 1,
      resultsPerPage: 10,
    });

    const { items } = await client.dataset(run.defaultDatasetId).listItems();

    // Filter to organic results only, extract relevant fields
    return (items as Array<Record<string, unknown>>)
      .flatMap((page) => {
        const organic = (page.organicResults ?? []) as Array<Record<string, unknown>>;
        return organic.map((result) => ({
          title: (result.title as string) ?? '',
          url: (result.url as string) ?? (result.link as string) ?? '',
          description: (result.description as string) ?? '',
        }));
      })
      .filter((r) => r.url && r.title);
  } catch (error) {
    throw new Error(
      `Erro ao buscar resultados do Google para "${queries.join(', ')}": ${(error as Error).message}`
    );
  }
};
```

### Domain Blocklist and Deduplication

```typescript
// src/utils/competitors.ts

/** Dominios bloqueados -- marketplaces e portais genericos */
const BLOCKED_DOMAINS = [
  'amazon.com.br', 'mercadolivre.com.br', 'shopee.com.br',
  'magazineluiza.com.br', 'americanas.com.br', 'aliexpress.com',
  'casasbahia.com.br',
  'wikipedia.org', 'youtube.com', 'reddit.com',
  'reclameaqui.com.br', 'yelp.com',
  'facebook.com', 'instagram.com', 'tiktok.com', 'twitter.com', 'x.com',
  'linkedin.com', 'pinterest.com',
  'google.com', 'google.com.br',
];

/**
 * Extrai dominio base de uma URL, removendo www. e subdominio.
 */
export const extractBaseDomain = (url: string): string => {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
};

/**
 * Verifica se um dominio esta na blocklist.
 */
export const isBlockedDomain = (url: string): boolean => {
  const domain = extractBaseDomain(url);
  if (!domain) return true;
  return BLOCKED_DOMAINS.some((blocked) => domain.includes(blocked));
};

/** Candidato a concorrente de qualquer fonte de descoberta */
export interface RawCompetitorCandidate {
  name: string;
  url: string;
  description: string;
  source: 'google-search' | 'google-maps' | 'facebook-ads' | 'similarweb';
}

/**
 * Remove duplicatas por dominio base, mantendo o candidato com mais dados.
 */
export const deduplicateCandidates = (
  candidates: RawCompetitorCandidate[]
): RawCompetitorCandidate[] => {
  const seen = new Map<string, RawCompetitorCandidate>();

  for (const candidate of candidates) {
    const domain = extractBaseDomain(candidate.url);
    if (!domain) continue;

    const existing = seen.get(domain);
    if (!existing || candidate.description.length > existing.description.length) {
      seen.set(domain, candidate);
    }
  }

  return Array.from(seen.values());
};
```

### Gemini Competitor Scoring Prompt

```typescript
// Addition to src/lib/ai/prompts.ts

export const SCORE_COMPETITORS_PROMPT = `Voce e um analista de mercado especializado em identificar concorrentes diretos.

Dado um nicho de mercado e uma lista de empresas candidatas, avalie cada candidato como potencial concorrente.

Para cada candidato, atribua uma pontuacao de 0 a 100 baseada nos criterios:
- Correspondencia de segmento (0-25): O negocio atua no MESMO segmento?
- Correspondencia de produto/servico (0-25): Oferece produtos/servicos similares?
- Correspondencia de porte (0-20): E de tamanho comparavel (nao e uma multinacional vs micro)?
- Correspondencia de regiao (0-15): Atua na mesma regiao geografica?
- Presenca digital ativa (0-15): Tem site proprio funcional E redes sociais ativas?

REGRAS:
- Marketplaces (Amazon, Mercado Livre, Shopee) devem receber 0
- Portais de avaliacao (Reclame Aqui, Yelp) devem receber 0
- Blogs e listas genericas devem receber 0
- Apenas negocios com site PROPRIO E pelo menos uma rede social ativa devem pontuar acima de 50
- Retorne APENAS candidatos com pontuacao >= 70, ordenados por pontuacao descendente
- Retorne no maximo 4 candidatos

EXEMPLO DE BOA AVALIACAO:
- "Clinica Sorriso SP" (site: clinicasorriso.com.br, Instagram ativo) -> 85
- "Amazon" -> 0 (marketplace)
- "Top 10 dentistas SP blog" -> 0 (blog/lista)

Responda em JSON conforme o schema fornecido.`;
```

### Gemini Scoring Function

```typescript
// src/lib/ai/score-competitors.ts
import { GoogleGenAI } from '@google/genai';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { z } from 'zod';
import type { RawCompetitorCandidate } from '@/utils/competitors';
import { SCORE_COMPETITORS_PROMPT } from './prompts';

const scoredCompetitorSchema = z.object({
  competitors: z.array(z.object({
    name: z.string(),
    url: z.string(),
    score: z.number().min(0).max(100),
    segmentMatch: z.number().min(0).max(25),
    productMatch: z.number().min(0).max(25),
    sizeMatch: z.number().min(0).max(20),
    regionMatch: z.number().min(0).max(15),
    digitalPresence: z.number().min(0).max(15),
    reasoning: z.string(),
    socialProfiles: z.object({
      instagram: z.string().nullable(),
      tiktok: z.string().nullable(),
      facebook: z.string().nullable(),
    }),
  })),
});

export type ScoredCompetitor = z.infer<typeof scoredCompetitorSchema>['competitors'][number];

/**
 * Envia candidatos ao Gemini para scoring inteligente de concorrentes.
 * @param candidates - Candidatos brutos de todas as fontes
 * @param niche - Nicho interpretado
 * @param segment - Segmento dentro do nicho
 * @param region - Regiao geografica
 * @returns Array de concorrentes pontuados (score >= 70), ordenados por score desc
 */
export const scoreCompetitorsWithAI = async (
  candidates: RawCompetitorCandidate[],
  niche: string,
  segment: string,
  region: string
): Promise<ScoredCompetitor[]> => {
  const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

  const candidateList = candidates
    .map((c, i) => `${i + 1}. "${c.name}" - URL: ${c.url} - ${c.description} (fonte: ${c.source})`)
    .join('\n');

  const response = await genai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: `${SCORE_COMPETITORS_PROMPT}\n\nNicho: ${niche}\nSegmento: ${segment}\nRegiao: ${region}\n\nCandidatos:\n${candidateList}`,
    config: {
      responseMimeType: 'application/json',
      responseJsonSchema: zodToJsonSchema(scoredCompetitorSchema),
    },
  });

  const text = response.text ?? '';
  const parsed = scoredCompetitorSchema.parse(JSON.parse(text));

  return parsed.competitors
    .filter((c) => c.score >= 70)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);
};
```

### AnalysisStatus Expansion

```typescript
// Updated src/types/analysis.ts
export type AnalysisStatus =
  | 'pending'
  | 'processing'
  | 'discovering'           // NEW: discovery sources running
  | 'waiting_confirmation'  // NEW: waiting for user to confirm competitors
  | 'extracting'            // NEW: extraction sub-tasks running
  | 'completed'
  | 'failed';
```

```sql
-- New migration: add status values to enum
ALTER TYPE analysis_status ADD VALUE IF NOT EXISTS 'discovering';
ALTER TYPE analysis_status ADD VALUE IF NOT EXISTS 'waiting_confirmation';
ALTER TYPE analysis_status ADD VALUE IF NOT EXISTS 'extracting';
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Custom polling for task progress | Trigger.dev Realtime via metadata + React hooks | Trigger.dev v4 GA (2025) | Eliminates custom SSE/WebSocket code |
| Split long task into multiple tasks with state DB | `wait.forToken` for durable pause/resume | Trigger.dev v4 (waitpoints feature) | Single task maintains execution context across pauses |
| `Promise.all` with `triggerAndWait` | `batch.triggerByTaskAndWait` | Trigger.dev v3.3+ | Prevents checkpoint deadlocks in parallel fan-out |
| `metadata.set` only in current task | `metadata.parent.set` / `metadata.root.set` | Trigger.dev v3.3.9+ | Sub-tasks can update parent progress directly |
| `@google/generative-ai` for Gemini | `@google/genai` | Late 2024 | Old package deprecated, no Gemini 2.0+ support |

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.x |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| COMP-01 | Discovery returns 3-4 competitors from multi-source pipeline | unit | `npx vitest run tests/unit/discover-competitors.test.ts -x` | No -- Wave 0 |
| COMP-02 | Candidates exposed via metadata for confirmation | unit | `npx vitest run tests/unit/orchestrator-metadata.test.ts -x` | No -- Wave 0 |
| COMP-03 | Confirmation API resumes task with selected competitors | unit | `npx vitest run tests/unit/confirm-competitors-route.test.ts -x` | No -- Wave 0 |
| ORCH-01 | Orchestrator runs as Trigger.dev background task | unit | `npx vitest run tests/unit/analyze-market.test.ts -x` | No -- Wave 0 |
| ORCH-02 | Sub-tasks independent -- failure in one does not block others | unit | `npx vitest run tests/unit/fan-out-independence.test.ts -x` | No -- Wave 0 |
| -- | Blocklist filtering excludes marketplaces | unit | `npx vitest run tests/unit/blocklist.test.ts -x` | No -- Wave 0 |
| -- | Deduplication merges URL variants | unit | `npx vitest run tests/unit/deduplication.test.ts -x` | No -- Wave 0 |
| -- | Gemini scoring validates response schema | unit | `npx vitest run tests/unit/score-competitors.test.ts -x` | No -- Wave 0 |
| -- | Google Search Apify wrapper filters output | unit | `npx vitest run tests/unit/google-search-wrapper.test.ts -x` | No -- Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/unit/discover-competitors.test.ts` -- covers discovery pipeline with mocked Apify actors
- [ ] `tests/unit/blocklist.test.ts` -- covers domain blocklist filtering and deduplication
- [ ] `tests/unit/score-competitors.test.ts` -- covers Gemini scoring with mocked AI responses
- [ ] `tests/unit/confirm-competitors-route.test.ts` -- covers confirmation API route
- [ ] `tests/unit/analyze-market.test.ts` -- covers orchestrator flow (mocked sub-tasks)
- [ ] `tests/fixtures/google-search.json` -- fixture data for Google Search actor output
- [ ] `tests/fixtures/gemini-score-competitors.json` -- fixture data for Gemini scoring response

## Open Questions

1. **SimilarWeb as discovery source: does it return "similar sites"?**
   - What we know: The existing `scrapeSimilarweb` wrapper extracts SEO/traffic data for a given URL. The CONTEXT.md decision D-01 lists SimilarWeb as a discovery source.
   - What's unclear: The SimilarWeb actor (`tri_angle/similarweb-scraper`) may or may not return a `similarSites` field. The existing wrapper only maps SEO fields.
   - Recommendation: Check the SimilarWeb actor output for `similarSites` during implementation. If not available, treat SimilarWeb as a validation source (verify a discovered URL has traffic) rather than a discovery source. This has LOW impact -- Google Search and Google Maps are the primary discovery sources.

2. **Token ID delivery to frontend**
   - What we know: The orchestrator creates a waitpoint token and stores its ID in metadata. The frontend needs this token ID to send to the confirmation API route.
   - What's unclear: The exact mechanism for the frontend to read the token ID from metadata and use it in the confirmation POST.
   - Recommendation: The frontend reads the `confirmationTokenId` from `useRealtimeRun` metadata. When the user confirms, the frontend POSTs to `/api/analyze/[id]/confirm-competitors` with `{ tokenId, competitors }`. This is a clean REST pattern -- no additional complexity needed. The frontend implementation is Phase 9 scope, but the backend must expose the token ID via metadata (this phase).

3. **Apify credit cost per discovery run**
   - What we know: Apify free tier is $5/month. Each discovery run calls 4 actors.
   - What's unclear: Exact credit cost per Google Search actor run.
   - Recommendation: Use fixtures during development. Run ONE real discovery during integration testing to capture realistic output. Budget: ~$0.10-0.30 per discovery run across all 4 sources. Reserve $2-3 for demo.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Trigger.dev SDK | Orchestration, waitpoints | Yes (installed) | ^4 (v4.3.x) | -- |
| @google/genai | Competitor scoring | Yes (installed) | ^1 (v1.46.x) | -- |
| apify-client | Discovery actors | Yes (installed) | ^2 (v2.22.x) | -- |
| Supabase | Data persistence | Yes (installed) | ^2 (v2.100.x) | -- |
| Zod | Schema validation | Yes (installed) | 3.25.76 | -- |
| zod-to-json-schema | Gemini structured output | Yes (installed) | ^3 | -- |

**Missing dependencies with no fallback:** None

**Missing dependencies with fallback:** None

All dependencies are already installed from Phase 1. No new npm packages needed for Phase 3.

## Sources

### Primary (HIGH confidence)
- [Trigger.dev - Triggering (batchTriggerAndWait, batch.triggerByTaskAndWait)](https://trigger.dev/docs/triggering) - Fan-out patterns, import paths
- [Trigger.dev - Run Metadata](https://trigger.dev/docs/runs/metadata) - metadata.set, metadata.parent, metadata.root, 256KB limit
- [Trigger.dev - Wait for Token](https://trigger.dev/docs/wait-for-token) - wait.createToken, wait.forToken, wait.completeToken API
- [Trigger.dev - Parent/Root Metadata Updates](https://trigger.dev/changelog/metadata-parent-root-updates) - Child-to-parent metadata updates
- [Apify - Google Search Scraper](https://apify.com/apify/google-search-scraper) - Actor ID `apify/google-search-scraper`, input/output schema
- [Trigger.dev - Waitpoints changelog](https://trigger.dev/changelog/waitpoints) - Waitpoint token feature announcement

### Secondary (MEDIUM confidence)
- [Trigger.dev v4 GA announcement](https://trigger.dev/launchweek/2/trigger-v4-ga) - Waitpoints, input streams, v4 features
- [Trigger.dev v4 beta blog](https://trigger.dev/blog/v4-beta-launch) - Run Engine 2, human-in-the-loop tokens
- Existing codebase patterns (src/trigger/analyze-market.ts, src/lib/ai/understand.ts, src/lib/apify/*.ts) - Verified import paths and established patterns

### Tertiary (LOW confidence)
- SimilarWeb actor's `similarSites` field availability - Not verified against actual actor output; needs runtime validation during implementation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All packages already installed and patterns established in Phase 1/2
- Architecture: HIGH - Trigger.dev v4 waitpoints, batch operations, and metadata APIs verified against official docs
- Pitfalls: HIGH - Based on project-specific pitfalls research and established patterns
- Gemini scoring prompt: MEDIUM - Prompt structure follows established pattern but effectiveness needs real-world testing

**Research date:** 2026-03-27
**Valid until:** 2026-04-10 (Trigger.dev v4 APIs are stable; Apify actor IDs may change)
