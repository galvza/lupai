# Phase 8: Modo Completo - Research

**Researched:** 2026-03-28
**Domain:** Orchestrator extension, comparative AI synthesis, database migration
**Confidence:** HIGH

## Summary

Phase 8 extends the existing analysis pipeline to support "Modo Completo" -- where users provide their own business URL alongside the niche input, and the system extracts user business data using the SAME extraction pipeline as competitors, then generates a comparative synthesis. This is a backend-only phase (no UI work per user directive).

The implementation is architecturally straightforward because all building blocks already exist: the extraction tasks (extractWebsite, extractSocial, extractAds), the orchestrator batch pattern, the synthesis Gemini integration, and the database schema (which already has `comparative_analysis` JSONB column and `user_business_url` on analyses). The core work is: (1) add a `role` column to the `competitors` table via migration, (2) wire user extraction into the orchestrator before competitor discovery, (3) extend the synthesis prompt and schema to include comparative sections, and (4) update queries to distinguish user business from competitor records.

**Primary recommendation:** Implement in 3 plans: (P01) DB migration + type/query updates, (P02) orchestrator user extraction wiring, (P03) comparative synthesis prompt/schema extension.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Extract user business data using the SAME extraction tasks (extract-website, extract-social, extract-ads) as competitors -- no new extraction code needed, just new orchestrator wiring
- **D-02:** In Modo Completo, extract user's business FIRST (before competitor discovery). Pipeline: classify -> create user record -> extract user (website+SEO -> social+ads) -> discover competitors -> extract competitors -> viral -> synthesize WITH user data
- **D-03:** User extraction runs the same 2-batch pattern as competitor extraction: Batch A (extract-website for user), then Batch B (extract-social + extract-ads for user, using social links from Batch A)
- **D-04:** User extraction is a self-contained step in the orchestrator -- its success or failure is independent of competitor extraction
- **D-05:** Add `role` column to `competitors` table: `role TEXT NOT NULL DEFAULT 'competitor' CHECK (role IN ('competitor', 'user_business'))` -- user's own business stored as a competitor record with `role='user_business'`
- **D-06:** Supabase migration needed: ALTER TABLE to add `role` column with default and CHECK constraint
- **D-07:** `createCompetitor()` query updated to accept optional `role` parameter (defaults to 'competitor')
- **D-08:** New query: `getUserBusinessByAnalysis(analysisId)` -- fetches the competitor record where `role='user_business'` for a given analysis
- **D-09:** Competitor type (`src/types/competitor.ts`) extended with `role: 'competitor' | 'user_business'` field
- **D-10:** Existing `getCompetitorsByAnalysis()` ONLY returns role='competitor' records (no behavior change for Modo Rapido or downstream consumers)
- **D-11:** When `mode='complete'` and `userBusinessUrl` is provided, orchestrator inserts a user extraction phase between "classify" and "discover competitors"
- **D-12:** Orchestrator creates a user business competitor record via `createCompetitor({ analysisId, name: '[user business name from AI understanding]', websiteUrl: userBusinessUrl, role: 'user_business' })`
- **D-13:** User extraction steps: (1) `extractWebsite` for user URL -> (2) collect social links -> (3) `extractSocial` + `extractAds` for user -- same batch pattern as competitors
- **D-14:** After user extraction completes (or fails), proceed to competitor discovery as normal -- user extraction failure does NOT block competitor pipeline
- **D-15:** Metadata progress updated to reflect user extraction step: "Analisando seu negocio..." -> "Descobrindo concorrentes..." -> (normal flow)
- **D-16:** When `mode='quick'`, orchestrator flow is UNCHANGED -- skip user extraction entirely
- **D-17:** Modify `synthesizeAnalysis()` to accept optional `userBusiness: Competitor | null` parameter. When present (mode='complete'), include user data in the Gemini prompt and request comparative output sections
- **D-18:** Extend `SynthesisOutput` with optional comparative fields for Modo Completo: `userVsMarket?: SynthesisSection`, `gapsVsCompetitors?: SynthesisSection`, `competitiveAdvantages?: SynthesisSection`
- **D-19:** Add new Zod schema extending `synthesisOutputSchema` with the 3 comparative sections (optional fields so the same schema validates both modes)
- **D-20:** Comparative recommendations pattern: "Seu concorrente X faz Y e voce nao -- implemente Z" -- recommendations in Modo Completo MUST reference both competitor data AND user data with specific numbers
- **D-21:** Use the SAME Gemini call (not a third call) -- when mode='complete', the synthesis prompt includes an additional "user business" data section and requests the 3 extra comparative sections alongside the standard Modo Rapido sections
- **D-22:** `ComparativeAnalysis` type in `database.ts` upgraded from stub to properly typed interface matching actual synthesis output (the 3 comparative SynthesisSections + personalized recommendations)
- **D-23:** Store comparative analysis in `synthesis.comparative_analysis` JSONB column (already exists in schema, currently always null)
- **D-24:** `SynthesizePayload` -- no change needed, already has `mode` field
- **D-25:** Synthesis task fetches user business via new `getUserBusinessByAnalysis()` when `mode='complete'`
- **D-26:** If user business record exists but has no/partial data (extraction failed), pass what's available -- partial comparative is better than none
- **D-27:** After synthesis, call `upsertSynthesis()` with the `comparativeAnalysis` field populated (currently always null)
- **D-28:** If user URL extraction fails completely (site down, blocked), proceed with competitor pipeline normally and synthesize without comparative sections -- effectively degrades to Modo Rapido results + warning
- **D-29:** If user URL extraction partially succeeds (website OK but social/ads failed), proceed with available data -- partial comparative analysis is better than none
- **D-30:** Synthesis handles missing user data gracefully: if `userBusiness` is null or has no extracted data, skip comparative sections and return standard Modo Rapido output with a `comparativeStatus: 'unavailable' | 'partial' | 'full'` indicator
- **D-31:** Status metadata communicates degradation to frontend: `metadata.set('modoCompleto', 'degraded')` with reason string

### Claude's Discretion
- Exact Gemini prompt design for the comparative sections (within the structured JSON + Zod schema constraints)
- How to derive user business name from the URL/AI understanding (could use domain name, meta title, or AI-extracted name)
- Whether to run user extraction concurrently with viral extraction (optimization) or strictly before competitor discovery
- Exact progress percentage allocations for the user extraction step
- Whether `ComparativeAnalysis` type wraps the 3 SynthesisSections or uses a flatter structure

### Deferred Ideas (OUT OF SCOPE)
None -- analysis stayed within phase scope

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MODO-01 | User can provide their own business URL or description alongside the niche | Already supported: `AnalysisInput.userBusinessUrl` exists, `POST /api/analyze` route accepts it, `AnalyzeMarketPayload` has `userBusinessUrl`. No backend changes needed for input acceptance. |
| MODO-02 | System runs the same extraction cascade on the user's business | Orchestrator wiring: insert user extraction step (same extractWebsite/extractSocial/extractAds tasks) into analyze-market.ts when mode='complete'. Reuse existing 2-batch pattern. |
| MODO-03 | System generates comparative analysis: user's business vs competitors | Extend synthesizeAnalysis() with userBusiness parameter. Add 3 comparative SynthesisSections to output schema. Store in existing `comparative_analysis` JSONB column. |
| MODO-04 | Recommendations in Modo Completo are personalized and comparative | Extend SYNTHESIZE_PROMPT with comparative section instructions when mode='complete'. Enforce pattern: "Seu concorrente X faz Y e voce nao -- implemente Z" with specific numbers. |

</phase_requirements>

## Project Constraints (from CLAUDE.md)

Key directives that apply to this phase:
- **Skip frontend/UI**: User memory directive -- focus only on backend/APIs/integrations/DB/business logic
- **Git commits**: Each feature/task must have its own commit (never accumulate)
- **TypeScript**: No `any` without justification. Use defined types from `src/types/`
- **Error handling**: Every extraction must follow never-fail pattern. Partial data > no data (golden rule)
- **All text PT-BR**: Interface messages, recommendations, and error messages in Portuguese
- **Trigger.dev for heavy work**: All extraction and AI processing in Trigger.dev tasks (Vercel 10s timeout)
- **Zod v3.24.x**: Pinned for Trigger.dev compatibility -- do NOT upgrade to Zod v4
- **@google/genai**: Use new SDK (not deprecated @google/generative-ai)
- **Supabase queries**: Filter and store only relevant fields, not raw output
- **Functions < 30 lines**: Split larger functions
- **JSDoc on public functions**

## Architecture Patterns

### Current Orchestrator Flow (Modo Rapido)
```
Step 1:  updateAnalysis(status: 'discovering')
Step 2:  batch.triggerByTaskAndWait(4 discovery tasks)
Step 3:  filterBlockedDomains + deduplicateCandidates
Step 4:  scoreCompetitorsWithAI
Step 5:  wait.forToken (user confirmation)
Step 6:  persist confirmed competitors
Step 7:  Batch 1: extractWebsite * N + extractViral (parallel)
Step 8:  Collect social links from Batch 1
Step 9:  Batch 2: extractSocial * N + extractAds * N (parallel)
Step 10: summarize extraction results
Step 11: synthesizeTask.triggerAndWait
Step 12: updateAnalysis(status: 'completed')
```

### Extended Orchestrator Flow (Modo Completo)
```
Step 1:   updateAnalysis(status: 'extracting_user')  [NEW]
Step 1.1: metadata.set('step', 'Analisando seu negocio...')  [NEW]
Step 1.2: createCompetitor(role: 'user_business')  [NEW]
Step 1.3: extractWebsite for user URL  [NEW - reuses existing task]
Step 1.4: collect user social links  [NEW]
Step 1.5: extractSocial + extractAds for user  [NEW - reuses existing tasks]
Step 2:   updateAnalysis(status: 'discovering')
Step 3-10: [UNCHANGED from Modo Rapido]
Step 11:  synthesizeTask.triggerAndWait (now passes mode to enable comparative)
Step 12:  updateAnalysis(status: 'completed')
```

### Key Integration Points

**1. Orchestrator (`analyze-market.ts`)**
- Insert user extraction block at line ~41 (after status update, before discovery fan-out)
- Guard with `if (payload.mode === 'complete' && payload.userBusinessUrl)`
- Use single extractWebsite call (not batch) since only 1 entity
- Then use batch for extractSocial + extractAds after social links collected
- Progress adjustments: user extraction gets 10-25%, rest of flow shifts down

**2. Synthesis Task (`synthesize.ts`)**
- After fetching competitors and viral content, also fetch `getUserBusinessByAnalysis()`
- Pass userBusiness to `synthesizeAnalysis()` when mode='complete'
- Pass comparativeAnalysis result to `upsertSynthesis()`

**3. Synthesis AI (`lib/ai/synthesize.ts`)**
- Accept optional `userBusiness: Competitor | null` parameter
- Assemble user business context using same `assembleCompetitorContext()` function
- Append comparative prompt section when userBusiness is present
- Use `comparativeSynthesisOutputSchema` (extends base) for mode='complete'
- Use base `synthesisOutputSchema` for mode='quick'

**4. Database Layer**
- New migration: ADD COLUMN `role` to competitors table
- Update `createCompetitor()` to accept `role` parameter
- New query `getUserBusinessByAnalysis()` with `.eq('role', 'user_business')`
- Update `getCompetitorsByAnalysis()` to filter `.eq('role', 'competitor')`

### Anti-Patterns to Avoid
- **Creating separate extraction code for user business**: Reuse existing tasks entirely. The only difference is the `role` on the DB record.
- **Blocking competitor pipeline on user extraction failure**: D-14 mandates independence. Wrap user extraction in try/catch.
- **Modifying existing extraction tasks**: Tasks are agnostic to whether the entity is a competitor or user business. Only the orchestrator knows the difference.
- **Adding a new analysis_status enum value**: The existing `extracting` status is sufficient. Use metadata to differentiate "extracting user" from "extracting competitors."

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| User business extraction | New extraction tasks/wrappers | Existing extractWebsite, extractSocial, extractAds | Same data model, same Apify actors, same validation schemas |
| User data storage | New table for user businesses | `competitors` table with `role='user_business'` | Same data shape, simpler queries, single table for all extraction results |
| Social link discovery for user | New social link finder | Existing findSocialProfilesViaSearch + mergeSocialSources | Same discovery pattern for user and competitors |
| Comparative prompt assembly | Manual string concatenation | Extend assembleCompetitorContext() reuse pattern | Already handles all competitor data fields correctly |
| Progress percentage tracking | Custom progress system | Existing metadata.set('progress', N) pattern | Well-established in orchestrator, frontend already reads it |

## Common Pitfalls

### Pitfall 1: getCompetitorsByAnalysis Breaking Change
**What goes wrong:** After adding `role` column and filtering to `role='competitor'`, the synthesis task (which calls `getCompetitorsByAnalysis()`) would stop returning the user business record -- which is the desired behavior. But any code that previously assumed "all records for this analysis" now gets fewer records.
**Why it happens:** The filter change is subtle and affects all existing callers.
**How to avoid:** The CONTEXT.md explicitly requires this behavior (D-10). Verify all callers of `getCompetitorsByAnalysis()`: orchestrator (uses saved competitors from createCompetitor, not from query), synthesis task (should only get competitors, user business fetched separately), dashboard (Phase 9, not built yet). All callers are safe.
**Warning signs:** Existing tests that create competitors without role might fail if the default 'competitor' is not properly set. Ensure migration has DEFAULT 'competitor'.

### Pitfall 2: User Business Name Derivation
**What goes wrong:** The user provides a URL but no business name. The orchestrator needs a `name` to call `createCompetitor()`.
**Why it happens:** Unlike discovered competitors (which come with names from Google/SimilarWeb), the user business URL may not have an obvious name.
**How to avoid:** Use the domain name as initial name (e.g., `new URL(url).hostname.replace(/^www\./, '')`). The extractWebsite task will later discover the actual business name from meta tags/positioning. This is sufficient -- the name is for internal tracking, not user-facing in this phase (UI is Phase 9).
**Warning signs:** Empty or null name causing DB constraint violation.

### Pitfall 3: Zod Schema Extension Breaking Validation
**What goes wrong:** Making comparative fields required in the synthesis schema causes Modo Rapido outputs to fail validation (since Gemini doesn't generate those fields in quick mode).
**Why it happens:** Extending the Zod schema incorrectly.
**How to avoid:** Use `.optional()` for all comparative fields. Create a single schema that validates both modes -- D-19 explicitly requires this. The base 4 sections + recommendations are required; the 3 comparative sections are optional.
**Warning signs:** synthesizeAnalysis tests failing for quick mode after schema changes.

### Pitfall 4: Progress Percentage Overflow
**What goes wrong:** Adding user extraction steps pushes existing progress values, causing the final progress to exceed 100% or make non-linear jumps.
**Why it happens:** Current progress: 10, 30, 45, 55, 60, 65, 75, 80, 90, 100. Adding user extraction before discovery means restructuring all percentages.
**How to avoid:** For Modo Completo: user extraction gets 5-20%, then shift all subsequent percentages. For Modo Rapido: unchanged. Use a simple conditional offset.
**Warning signs:** Progress going backwards or jumping non-linearly.

### Pitfall 5: Batch Call for Single Entity
**What goes wrong:** Using `batch.triggerByTaskAndWait` for a single user extractWebsite call, which adds unnecessary overhead.
**Why it happens:** Copy-pasting the competitor extraction pattern which uses batch for N competitors.
**How to avoid:** For user extraction Step 1.3, call `extractWebsite.triggerAndWait()` directly (single task, not batch). For Step 1.5 (extractSocial + extractAds), batch is appropriate since there are 2 tasks running in parallel.
**Warning signs:** Unnecessarily complex batch setup for a single-element array.

### Pitfall 6: ComparativeAnalysis Type Mismatch
**What goes wrong:** The existing `ComparativeAnalysis` stub type in `database.ts` has a completely different shape from what D-18/D-22 require. If not updated, the upsertSynthesis call will store data that doesn't match the TypeScript type.
**Why it happens:** The stub was created in Phase 1 as a placeholder.
**How to avoid:** Replace the stub entirely per D-22. The new type should contain the 3 SynthesisSections + a comparativeStatus field + personalized recommendations.
**Warning signs:** TypeScript errors when assigning synthesis output to ComparativeAnalysis type.

## Code Examples

### Pattern 1: User Extraction in Orchestrator
```typescript
// Source: Derived from existing orchestrator batch pattern
// Insert after status update, before discovery fan-out

if (payload.mode === 'complete' && payload.userBusinessUrl) {
  metadata.set('step', 'Analisando seu negocio...');
  metadata.set('progress', 5);

  // Derive name from URL
  let userBusinessName: string;
  try {
    userBusinessName = new URL(payload.userBusinessUrl).hostname.replace(/^www\./, '');
  } catch {
    userBusinessName = payload.userBusinessUrl;
  }

  // Create user business record
  const userBusiness = await createCompetitor({
    analysisId: payload.analysisId,
    name: userBusinessName,
    websiteUrl: payload.userBusinessUrl,
    role: 'user_business',
  });

  // User extraction Batch A: website
  try {
    const websiteResult = await extractWebsite.triggerAndWait({
      analysisId: payload.analysisId,
      competitorId: userBusiness.id,
      competitorName: userBusiness.name,
      websiteUrl: payload.userBusinessUrl,
    });

    if (websiteResult.ok) {
      const result = websiteResult.output as ExtractWebsiteResult;
      const userSocialLinks = result.socialLinks ?? emptySocialLinks;

      // User extraction Batch B: social + ads
      metadata.set('step', 'Analisando suas redes sociais e anuncios...');
      metadata.set('progress', 12);

      // Social link merge (same pattern as competitors)
      const missingPlatforms: string[] = [];
      if (!userSocialLinks.instagram) missingPlatforms.push('instagram');
      if (!userSocialLinks.tiktok) missingPlatforms.push('tiktok');

      let searchResults: Record<string, SocialProfileInput | null> = {};
      if (missingPlatforms.length > 0) {
        try {
          searchResults = await findSocialProfilesViaSearch(userBusiness.name, missingPlatforms);
        } catch { /* fallback failure not critical */ }
      }

      const merged = mergeSocialSources(userSocialLinks, searchResults, { instagram: null, tiktok: null, facebook: null });

      const { runs: userBatch2 } = await batch.triggerByTaskAndWait([
        {
          task: extractSocial,
          payload: {
            analysisId: payload.analysisId,
            competitorId: userBusiness.id,
            competitorName: userBusiness.name,
            socialProfiles: merged,
          },
        },
        {
          task: extractAds,
          payload: {
            analysisId: payload.analysisId,
            competitorId: userBusiness.id,
            competitorName: userBusiness.name,
            websiteUrl: payload.userBusinessUrl,
            region: payload.region,
          },
        },
      ]);
    }
  } catch (error) {
    // D-28: User extraction failure does NOT block competitor pipeline
    console.warn(`Aviso: extracao do negocio do usuario falhou: ${(error as Error).message}`);
    metadata.set('modoCompleto', 'degraded');
    metadata.set('modoCompletoReason', 'Nao foi possivel analisar seu site. Mostrando analise do mercado sem comparacao.');
  }

  metadata.set('progress', 18);
}

// Continue with existing discovery flow (Step 2+)
```

### Pattern 2: Extended Synthesis Schema
```typescript
// Source: Derived from existing synthesisSchemas.ts pattern

import { z } from 'zod';
import { synthesisSectionSchema, recommendationSchema } from './synthesisSchemas';

/** Schema for Modo Completo comparative output (D-19) */
export const comparativeSynthesisOutputSchema = z.object({
  // Base sections (same as Modo Rapido)
  marketOverview: synthesisSectionSchema,
  competitorAnalysis: synthesisSectionSchema,
  gapsAndOpportunities: synthesisSectionSchema,
  viralPatterns: synthesisSectionSchema,
  recommendations: z.array(recommendationSchema).min(3).max(10),
  // Comparative sections (optional -- only in Modo Completo)
  userVsMarket: synthesisSectionSchema.optional(),
  gapsVsCompetitors: synthesisSectionSchema.optional(),
  competitiveAdvantages: synthesisSectionSchema.optional(),
});
```

### Pattern 3: Updated ComparativeAnalysis Type
```typescript
// Source: Derived from CONTEXT.md D-22, D-18

/** Analise comparativa (Modo Completo) - replaces stub */
export interface ComparativeAnalysis {
  comparativeStatus: 'full' | 'partial' | 'unavailable';
  userVsMarket: SynthesisSection | null;
  gapsVsCompetitors: SynthesisSection | null;
  competitiveAdvantages: SynthesisSection | null;
  personalizedRecommendations: Recommendation[];
  degradedReason?: string;
}
```

### Pattern 4: getUserBusinessByAnalysis Query
```typescript
// Source: Derived from existing getCompetitorsByAnalysis pattern

/** Busca o negocio do usuario vinculado a uma analise */
export const getUserBusinessByAnalysis = async (analysisId: string): Promise<Competitor | null> => {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('competitors')
    .select()
    .eq('analysis_id', analysisId)
    .eq('role', 'user_business')
    .single();

  if (error) return null;
  return data ? mapCompetitorRow(data) : null;
};
```

### Pattern 5: Updated getCompetitorsByAnalysis
```typescript
// Source: Derived from existing query + D-10

/** Busca concorrentes de uma analise (exclui user_business) */
export const getCompetitorsByAnalysis = async (analysisId: string): Promise<Competitor[]> => {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('competitors')
    .select()
    .eq('analysis_id', analysisId)
    .eq('role', 'competitor');  // D-10: only competitors

  if (error) {
    throw new Error(`Erro ao buscar concorrentes: ${error.message}`);
  }

  return (data ?? []).map(mapCompetitorRow);
};
```

### Pattern 6: Comparative Synthesis Prompt Extension
```typescript
// Source: Derived from existing SYNTHESIZE_PROMPT pattern

const COMPARATIVE_SECTION = `
MODO COMPLETO - SECOES COMPARATIVAS ADICIONAIS:
Voce tambem recebeu dados do negocio do USUARIO. Gere 3 secoes comparativas adicionais:

5. userVsMarket: "Sua posicao no mercado" — posicione o negocio do usuario vs o panorama do mercado analisado. Compare metricas especificas (seguidores, engajamento, keywords, ads).
6. gapsVsCompetitors: "Gaps vs concorrentes" — identifique onde cada concorrente supera o usuario e vice-versa. Seja ESPECIFICO com numeros.
7. competitiveAdvantages: "Vantagens competitivas identificadas" — destaque o que o usuario faz melhor que os concorrentes.

As recomendacoes DEVEM ser comparativas: "Seu concorrente X posta 5x por semana e voce posta 2x — aumente para pelo menos 4x" — sempre cite dados do usuario E do concorrente.

DADOS DO NEGOCIO DO USUARIO:
`;
```

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.x |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run tests/unit/[file].test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MODO-01 | User business URL stored with role='user_business' | unit | `npx vitest run tests/unit/modo-completo-queries.test.ts -x` | Wave 0 |
| MODO-02 | Orchestrator runs extraction for user business when mode='complete' | unit | `npx vitest run tests/unit/analyze-market-modo-completo.test.ts -x` | Wave 0 |
| MODO-03 | Synthesis includes comparative sections when user data present | unit | `npx vitest run tests/unit/synthesize-comparative.test.ts -x` | Wave 0 |
| MODO-04 | Comparative recommendations reference both user and competitor data | unit | `npx vitest run tests/unit/synthesize-comparative.test.ts -x` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/unit/[changed-file].test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/unit/modo-completo-queries.test.ts` -- covers MODO-01 (createCompetitor with role, getUserBusinessByAnalysis, getCompetitorsByAnalysis filtering)
- [ ] `tests/unit/analyze-market-modo-completo.test.ts` -- covers MODO-02 (orchestrator user extraction flow, graceful degradation)
- [ ] `tests/unit/synthesize-comparative.test.ts` -- covers MODO-03, MODO-04 (comparative synthesis output, prompt extension)
- [ ] `tests/fixtures/gemini-synthesis-comparative-v1.json` -- fixture for comparative synthesis output
- [ ] Factory update: `createCompetitor` factory needs `role` field support

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `ComparativeAnalysis` stub type | Properly typed with SynthesisSections | Phase 8 | Enables type-safe comparative synthesis storage |
| `getCompetitorsByAnalysis()` returns all records | Filtered by `role='competitor'` | Phase 8 | Modo Rapido behavior unchanged, user business excluded |
| `synthesizeAnalysis()` always quick mode | Accepts optional userBusiness for comparative | Phase 8 | Single Gemini call handles both modes via prompt extension |
| `upsertSynthesis()` comparative_analysis always null | Populated for Modo Completo | Phase 8 | Enables dashboard comparative display (Phase 9) |

## Open Questions

1. **User business name derivation strategy**
   - What we know: D-12 says use "user business name from AI understanding." The AI understanding step happens before orchestrator in the API route, but the `NicheInterpreted` type only has niche/segment/region, not a business name.
   - What's unclear: Should the AI understanding step be extended to extract a business name from the URL? Or is domain name sufficient for Phase 8?
   - Recommendation: Use domain name from URL as initial name (simple, no AI changes needed). The extractWebsite task will discover actual business name from meta tags. This is adequate for backend storage -- Phase 9 dashboard can display the extracted name.

2. **Whether to run user extraction concurrently with viral extraction**
   - What we know: D-02 says "extract user FIRST then discover competitors." User extraction and viral extraction are independent.
   - What's unclear: Could user extraction run in parallel with viral in Batch 1 to save time?
   - Recommendation: Keep it simple -- run user extraction as a self-contained block BEFORE discovery. This matches D-02 exactly and is easier to reason about for error handling and progress tracking. Optimization is premature given the 3-day deadline.

3. **ComparativeAnalysis type: wrapper vs flat**
   - What we know: D-18 lists 3 SynthesisSections. D-22 says upgrade the stub.
   - What's unclear: Should ComparativeAnalysis wrap the sections or use a flatter structure?
   - Recommendation: Use a structured wrapper: `{ comparativeStatus, userVsMarket, gapsVsCompetitors, competitiveAdvantages, personalizedRecommendations }`. This maps cleanly to what Gemini returns and what the dashboard will display.

## Existing Code Inventory

### Files That MUST Be Modified
| File | Change | Scope |
|------|--------|-------|
| `supabase/migrations/` | New migration: add `role` column | Schema |
| `src/types/competitor.ts` | Add `role` to `Competitor`, `CompetitorInput` | Type |
| `src/types/database.ts` | Replace `ComparativeAnalysis` stub, add `SynthesisOutput` optional fields, update Database type competitors columns | Type |
| `src/lib/supabase/queries.ts` | Update `createCompetitor()`, `getCompetitorsByAnalysis()`, add `getUserBusinessByAnalysis()` | Query |
| `src/trigger/analyze-market.ts` | Insert user extraction block for mode='complete' | Orchestrator |
| `src/trigger/synthesize.ts` | Fetch user business, pass to synthesizeAnalysis, store comparative result | Task |
| `src/lib/ai/synthesize.ts` | Accept userBusiness param, extend prompt for comparative | AI |
| `src/lib/ai/prompts.ts` | Add COMPARATIVE_SYNTHESIS_SECTION prompt | AI |
| `src/lib/validation/synthesisSchemas.ts` | Add optional comparative sections to schema | Validation |
| `tests/fixtures/factories.ts` | Update createCompetitor factory with role field | Test |

### Files That MUST NOT Be Modified
| File | Reason |
|------|--------|
| `src/trigger/extract-website.ts` | Reused as-is for user extraction (D-01) |
| `src/trigger/extract-social.ts` | Reused as-is for user extraction (D-01) |
| `src/trigger/extract-ads.ts` | Reused as-is for user extraction (D-01) |
| `src/trigger/extract-viral.ts` | Not affected by Modo Completo |
| `src/app/api/analyze/route.ts` | Already accepts mode and userBusinessUrl |

### Database Schema Impact
- **New migration**: `ALTER TABLE competitors ADD COLUMN role TEXT NOT NULL DEFAULT 'competitor' CHECK (role IN ('competitor', 'user_business'));`
- **Existing column**: `synthesis.comparative_analysis` JSONB already exists, currently always null
- **No new tables needed**
- **No enum changes needed** (role is TEXT with CHECK, not an enum -- simpler migration)

## Sources

### Primary (HIGH confidence)
- `src/trigger/analyze-market.ts` -- Current orchestrator implementation, 308 lines, establishes all batch/metadata patterns
- `src/trigger/synthesize.ts` -- Current synthesis task, compound pattern, already has `mode` in payload
- `src/lib/ai/synthesize.ts` -- Current synthesis AI, assembleCompetitorContext reusable for user data
- `src/lib/ai/prompts.ts` -- All prompt templates, SYNTHESIZE_PROMPT to be extended
- `src/lib/validation/synthesisSchemas.ts` -- Current Zod schemas, base for extension
- `src/types/database.ts` -- ComparativeAnalysis stub, SynthesisOutput type, Database schema types
- `src/types/competitor.ts` -- Competitor type, CompetitorInput (both need role field)
- `src/lib/supabase/queries.ts` -- All query functions, createCompetitor/getCompetitorsByAnalysis to be updated
- `supabase/migrations/20260327200000_create_initial_schema.sql` -- Base schema, competitors table definition
- `.planning/phases/08-modo-completo/08-CONTEXT.md` -- All 31 locked decisions

### Secondary (MEDIUM confidence)
- `tests/unit/analyze-market.test.ts` -- Test pattern for orchestrator (vi.hoisted, capturedRuns, mockBatch)
- `tests/unit/synthesize-task.test.ts` -- Test pattern for synthesis task (vi.hoisted, captured.runFn)
- `tests/unit/synthesize-ai.test.ts` -- Test pattern for synthesis AI function
- `tests/fixtures/factories.ts` -- Factory pattern for test data

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, all changes use existing libraries (Zod, Supabase, Trigger.dev SDK)
- Architecture: HIGH -- all patterns established in Phases 3-7, this phase reuses them extensively
- Pitfalls: HIGH -- identified from direct code analysis, every edge case has a clear mitigation

**Research date:** 2026-03-28
**Valid until:** 2026-04-15 (stable patterns, no external dependency changes expected)
