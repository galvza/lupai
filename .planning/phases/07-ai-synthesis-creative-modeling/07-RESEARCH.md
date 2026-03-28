# Phase 7: AI Synthesis & Creative Modeling - Research

**Researched:** 2026-03-28
**Domain:** Gemini AI structured output, prompt engineering, Trigger.dev compound tasks, Supabase JSONB storage
**Confidence:** HIGH

## Summary

Phase 7 upgrades two existing stub functions (`synthesizeAnalysis` and `generateCreativeScripts`) to use the mature Zod + `zodToJsonSchema` + `validateOrNull` pattern already established across Phases 2-6, creates a new Trigger.dev compound task for orchestration, and integrates the synthesis step into the existing `analyze-market` orchestrator. The codebase already has all the infrastructure in place -- the `synthesis` table exists in the DB schema, the `upsertSynthesis` and `getSynthesisByAnalysis` queries are implemented, the `Recommendation` and `CreativeScript` types are defined, and test fixtures exist for both synthesis and creative output.

The primary technical concern is Gemini 2.0 Flash's **8,192 output token limit**. Synthesis output (6 sections with title/summary/metrics/tags/detailed_analysis) plus 5-10 recommendations can easily approach this limit if not carefully managed. The decision to split synthesis and creative into two separate Gemini calls (D-15) directly mitigates this -- each call gets its own 8K budget. Prompt engineering must enforce conciseness while maintaining specificity.

**Primary recommendation:** Follow the exact same pattern as `hbc-extraction.ts` and `viral-patterns.ts` (Zod schema + `zodToJsonSchema` + `responseMimeType: 'application/json'` + `responseJsonSchema` + `validateOrNull`), split into two sequential Gemini calls, and integrate as a new stage in the orchestrator after extraction batches complete.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Gemini returns STRUCTURED JSON, not prose -- enforced via Zod schema + `zodToJsonSchema` + `responseJsonSchema` in Gemini config
- **D-02:** Each synthesis section has: `title` (string), `summary` (2-3 line string), `metrics` (key-value pairs), `tags` (string[]), `detailed_analysis` (markdown string)
- **D-03:** Output sections (Modo Rapido): market overview, competitor analysis, gaps & opportunities, viral patterns, suggested scripts, prioritized recommendations
- **D-04:** Output sections (Modo Completo): all Modo Rapido sections + "user vs market" comparative section
- **D-05:** Upgrade existing `synthesize.ts` and `creative.ts` stubs from raw `JSON.parse()` to Zod + `zodToJsonSchema` + `validateOrNull` pattern
- **D-06:** Recommendations MUST reference actual scraped data -- specific competitor names, numbers, content examples
- **D-07:** NEVER generic recommendations
- **D-08:** Each recommendation includes: `action`, `reason` (citing specific data), `priority` (alta/media/baixa), `effort` (alto/medio/baixo), `expected_impact`
- **D-09:** Recommendations are PRIORITIZED -- ordered by impact/effort ratio
- **D-10:** AI generates 3-5 video script suggestions with explicit hook, body, and CTA per script
- **D-11:** Scripts are adapted to user's niche based on cross-video viral patterns (ViralPatterns from Phase 6)
- **D-12:** Each script includes: `title`, `format`, `estimated_duration_seconds`, `hook` (text + timing), `body` (text + structure notes), `cta` (text + action), `tone`, `inspiration_source`
- **D-13:** Scripts use detected patterns from Phase 6 ViralPatterns as foundation
- **D-14:** If no viral patterns available, generate scripts based on competitor analysis + niche best practices
- **D-15:** Synthesis and creative scripts are TWO SEPARATE Gemini calls
- **D-16:** Separate calls allow partial success, independent schemas, token budget management
- **D-17:** Call order: synthesis FIRST, then creative scripts
- **D-18:** Create NEW `src/trigger/synthesize.ts` Trigger.dev task
- **D-19:** Task receives lightweight payload: `{ analysisId, niche, segment, region, mode }` -- fetches all data from Supabase internally
- **D-20:** Task fetches: `getAnalysis()`, `getCompetitorsByAnalysis()`, `getViralContentByAnalysis()`
- **D-21:** Retry config: `maxAttempts: 3, minTimeoutInMs: 5000, maxTimeoutInMs: 15000, factor: 2`
- **D-22:** Fallback chain: normal Gemini call -> wait 15s retry -> raw data without AI synthesis
- **D-23:** Return pattern: `{ status: "success" | "partial" | "fallback" | "unavailable", data: { synthesis: SynthesisResult | null, scripts: CreativeScript[] | null }, reason?: string }`
- **D-24:** "partial" = synthesis succeeded but creative failed (or vice versa). "fallback" = Gemini unavailable
- **D-25:** Add synthesis step to `src/trigger/analyze-market.ts` AFTER extraction batches complete
- **D-26:** Orchestrator calls `synthesize` task, waits for result, then marks analysis as `completed`
- **D-27:** If synthesis returns "unavailable"/"fallback", still mark analysis as `completed` with a `synthesis_status` indicator
- **D-28:** Synthesis task assembles input context from DB: competitor data, viral content, viral patterns
- **D-29:** Truncate/summarize data if total context exceeds Gemini token budget
- **D-30:** Input context formatted as structured JSON sections in the prompt
- **D-31:** Store synthesis result in `synthesis` table -- `strategic_overview` and `recommendations` JSONB columns
- **D-32:** Store creative scripts in same synthesis record -- `creative_scripts` JSONB column
- **D-33:** All Gemini responses validated via Zod before DB storage
- **D-34:** All synthesis text, recommendations, script content in Portuguese (PT-BR)
- **D-35:** Error messages and status reasons in PT-BR

### Claude's Discretion
- Exact Gemini prompt design for synthesis and creative calls
- How to truncate/summarize competitor data if token budget is tight
- Whether `synthesis` table needs new columns or existing schema is sufficient
- Exact Zod schema field names and nesting structure
- Whether to add a third Gemini call for deeper gap analysis or keep it in the synthesis call
- maxDuration for the synthesis Trigger.dev task (120s-300s range)

### Deferred Ideas (OUT OF SCOPE)
- Modo Completo "user vs market" section -- Requires Phase 8
- A/B script variants -- Future enhancement
- Script thumbnail/storyboard generation -- Future enhancement
- Recommendation tracking/completion -- Needs auth
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SYNTH-01 | AI consolidates all collected data into a strategic overview | Gemini structured output with synthesis Zod schema; data assembled from `getCompetitorsByAnalysis()`, `getViralContentByAnalysis()`, `getAnalysis()` (for viralPatterns); stored in `synthesis.strategic_overview` |
| SYNTH-02 | Recommendations are specific and actionable (not generic) | Prompt engineering with explicit rules; D-06/D-07/D-08 enforce data-referencing pattern; Zod schema enforces `action`, `reason`, `priority`, `effort`, `expected_impact` fields |
| SYNTH-03 | Results display recommendations in prioritized, actionable list | D-09 orders by impact/effort ratio; stored as ordered JSONB array in `synthesis.recommendations`; display is Phase 9 |
| CRTV-01 | AI generates 3-5 video script suggestions with hook, body, CTA | Second Gemini call with creative Zod schema; D-10/D-12 specify fields; stored in `synthesis.creative_scripts` |
| CRTV-02 | Scripts adapted to user's niche based on viral patterns | D-11/D-13 use `viralPatterns` from Phase 6 as creative input; D-14 fallback to competitor data if no patterns |
| CRTV-03 | Each script includes format recommendation and estimated duration | D-12 schema includes `format`, `estimated_duration_seconds`; Zod schema enforces these fields |
| CRTV-04 | Results display creative scripts in structured format | Stored as structured JSONB; display is Phase 9 (this phase stores the data) |
</phase_requirements>

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@google/genai` | 1.46.0 | Gemini AI structured output for synthesis + creative | Official SDK, supports `responseJsonSchema` + `responseMimeType` |
| `zod` | 3.25.76 | Schema definition for Gemini output validation | Pinned for Trigger.dev compatibility; `zodToJsonSchema` converts to Gemini schema |
| `zod-to-json-schema` | (installed) | Convert Zod schemas to JSON Schema for Gemini | Used by all AI modules in the project |
| `@trigger.dev/sdk` | 4.4.3 | Compound task for synthesis orchestration | `task`, `metadata` for progress tracking |
| `@supabase/supabase-js` | 2.x | Synthesis data storage | `upsertSynthesis` already implemented |

### No New Dependencies Required
This phase requires zero new npm packages. All libraries are already installed and proven in the codebase.

## Architecture Patterns

### Existing Code to Upgrade (Not Create)
```
src/lib/ai/
  synthesize.ts   -- UPGRADE: stub -> Zod schema + zodToJsonSchema + validateOrNull
  creative.ts     -- UPGRADE: stub -> Zod schema + zodToJsonSchema + validateOrNull
  prompts.ts      -- EXTEND: add synthesis + creative prompt templates (replace existing stubs)
```

### New Files
```
src/trigger/
  synthesize.ts           -- NEW: Compound Trigger.dev task (synthesis + creative)
src/lib/validation/
  synthesisSchemas.ts     -- NEW: Zod schemas for synthesis + creative output
tests/unit/
  synthesize-ai.test.ts   -- NEW: Tests for synthesizeAnalysis
  creative-ai.test.ts     -- NEW: Tests for generateCreativeScripts
  synthesize-task.test.ts -- NEW: Tests for Trigger.dev synthesize task
tests/fixtures/
  gemini-synthesis-v2.json -- NEW: Updated fixture matching new schema (D-02 format)
  gemini-creative-v2.json  -- NEW: Updated fixture matching new schema (D-12 format)
```

### Modified Files
```
src/trigger/analyze-market.ts  -- MODIFY: Add synthesis step after extraction (line ~272)
src/types/database.ts          -- MODIFY: Update Recommendation and CreativeScript interfaces to match D-08/D-12
src/lib/ai/prompts.ts          -- MODIFY: Replace SYNTHESIZE_PROMPT and CREATIVE_PROMPT with D-06/D-07/D-34 compliant prompts
tests/fixtures/factories.ts    -- MODIFY: Update createRecommendation and createCreativeScript factories
```

### Pattern 1: Gemini Structured Output (Established Pattern)
**What:** Use Zod schema -> `zodToJsonSchema` -> Gemini `responseJsonSchema` -> `validateOrNull` for type-safe AI output
**When to use:** Every Gemini call in this project
**Example (from existing `hbc-extraction.ts`):**
```typescript
// Source: src/lib/ai/hbc-extraction.ts (existing pattern)
import { zodToJsonSchema } from 'zod-to-json-schema';
import { validateOrNull } from '@/lib/validation/extractionSchemas';

const response = await genai.models.generateContent({
  model: 'gemini-2.0-flash',
  contents: `${PROMPT}\n\nContext:\n${contextData}`,
  config: {
    responseMimeType: 'application/json',
    responseJsonSchema: zodToJsonSchema(schema),
  },
});
const text = response.text ?? '';
const parsed = JSON.parse(text);
return validateOrNull(schema, parsed);
```

### Pattern 2: Compound Trigger.dev Task (Established Pattern)
**What:** Sequential stages within one task, metadata updates for progress tracking, never-fail return pattern
**When to use:** Multi-stage operations like synthesis (call 1: synthesis, call 2: creative)
**Example (from existing `extract-viral.ts`):**
```typescript
// Source: src/trigger/extract-viral.ts (existing pattern)
export const extractViral = task({
  id: 'extract-viral',
  maxDuration: 300,
  retry: { maxAttempts: 2, ... },
  run: async (payload): Promise<ExtractViralResult> => {
    const progress = { stage1: 'pending', stage2: 'pending' };
    const updateProgress = (updates) => {
      Object.assign(progress, updates);
      metadata.set('progress', { ...progress });
    };
    try {
      // Stage 1...
      // Stage 2...
      return { status: 'success', data: {...} };
    } catch (error) {
      return { status: 'unavailable', data: {...}, reason: error.message };
    }
  },
});
```

### Pattern 3: Never-Fail Return (Established Pattern)
**What:** Return structured result with status instead of throwing. Caller decides what to do with partial/unavailable results.
**When to use:** All extraction and synthesis tasks
```typescript
// Source: Multiple extraction tasks
interface SynthesizeResult {
  status: 'success' | 'partial' | 'fallback' | 'unavailable';
  data: {
    synthesis: SynthesisData | null;
    scripts: CreativeScriptOutput[] | null;
  };
  reason?: string;
}
```

### Anti-Patterns to Avoid
- **Raw JSON.parse without Zod validation:** Current stubs do this. MUST upgrade to `validateOrNull` pattern. Invalid AI output should return null, not crash.
- **Generic recommendations:** NEVER allow "Melhore seu SEO" or similar. Prompt must mandate citing specific data.
- **Single monolithic Gemini call:** Don't combine synthesis + creative into one call. 8K output token limit makes this risky.
- **Throwing errors from synthesis:** Use never-fail return pattern. Partial data is better than no data.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Zod -> JSON Schema conversion | Manual JSON schema construction | `zodToJsonSchema(schema)` | Already used in 4 AI modules; consistent, battle-tested |
| Data validation with graceful failure | Try/catch with manual field checking | `validateOrNull(schema, data)` | Established pattern, returns null instead of throwing |
| Task progress tracking | Custom event system | `metadata.set()` from `@trigger.dev/sdk` | Already used in orchestrator and extract-viral |
| DB upsert for synthesis | Raw SQL or manual insert/update | `upsertSynthesis()` from `queries.ts` | Already implemented with `onConflict: 'analysis_id'` |
| Token counting heuristic | Character count / 4 estimation | `genai.models.countTokens()` | Free API call (3000 RPM), exact count, no estimation error |

**Key insight:** This phase is entirely an upgrade of existing stubs and integration of existing patterns. Zero new architectural decisions are needed -- follow the patterns already established in Phases 2-6.

## Common Pitfalls

### Pitfall 1: Gemini 2.0 Flash 8,192 Output Token Limit
**What goes wrong:** Synthesis output with 6 detailed sections + 10 recommendations + markdown detailed_analysis easily exceeds 8K tokens, causing truncated JSON that fails parsing.
**Why it happens:** `gemini-2.0-flash` has an 8,192 max output token limit (confirmed via official docs).
**How to avoid:**
1. Two separate calls (D-15) -- each gets its own 8K budget
2. Set `maxOutputTokens: 8192` explicitly in config to make intent clear
3. Limit synthesis sections to the 6 defined (D-03), not more
4. Limit recommendations to 5-8, not 10 (prompt should say "5 a 8 recomendacoes")
5. Keep `detailed_analysis` markdown concise (prompt: "maximo 2 paragrafos")
6. Use `genai.models.countTokens()` on input prompt to ensure it fits within 1M input limit (unlikely issue but safety check)
**Warning signs:** `JSON.parse()` throwing SyntaxError on truncated response; `validateOrNull` returning null consistently.

### Pitfall 2: Recommendations Becoming Generic Under Token Pressure
**What goes wrong:** When prompt context is large and output budget is tight, Gemini tends to produce shorter, more generic recommendations instead of specific ones.
**Why it happens:** The model optimizes for completion within the token budget, sacrificing specificity for brevity.
**How to avoid:**
1. Prompt explicitly states: "Cada recomendacao DEVE citar dados especificos: nome do concorrente, numero exato, exemplo concreto. Recomendacoes genericas como 'melhore seu SEO' serao REJEITADAS."
2. Include specific data points in the input context (not just raw competitor objects -- pre-summarize key metrics)
3. Fewer, better recommendations (5-8) beats many generic ones
4. Post-validation: check that each recommendation's `reason` field references at least one competitor name or metric
**Warning signs:** Recommendations with `reason` fields that don't contain any competitor names or numbers.

### Pitfall 3: Context Assembly Exceeding Input Token Budget
**What goes wrong:** With 3-4 competitors each having website/SEO/social/ads data plus 10+ viral content items with transcriptions, the assembled context can be enormous.
**Why it happens:** Competitor JSONB fields contain nested arrays (topPosts, ads, paidKeywords) that expand significantly.
**How to avoid:**
1. Pre-summarize competitor data before including in prompt (don't dump raw JSONB)
2. For competitors: include name, websiteUrl, top 3 keywords, follower counts, engagement rate, ad count -- NOT full post arrays
3. For viral content: include only caption + hookBodyCta summary + engagement metrics -- NOT full transcriptions (those are already analyzed in ViralPatterns)
4. Use ViralPatterns (cross-video analysis) as primary viral input, not individual video data
5. Use `genai.models.countTokens()` to verify before sending
**Warning signs:** Gemini returning errors about context length; very slow response times.

### Pitfall 4: Orchestrator Status Timing
**What goes wrong:** Current orchestrator marks analysis as `completed` at line 272. Adding synthesis after extraction but before completion requires moving this status update.
**Why it happens:** The orchestrator currently ends at extraction. Synthesis is a new final step.
**How to avoid:**
1. Move `updateAnalysis(payload.analysisId, { status: 'completed' })` to AFTER synthesis result
2. Add intermediate metadata: `metadata.set('step', 'Sintetizando dados...')` and `metadata.set('progress', 96)`
3. If synthesis fails/returns fallback, still set `completed` but add `metadata.set('synthesisStatus', result.status)`
**Warning signs:** Dashboard showing "completed" before synthesis is done; synthesis data not appearing for "completed" analyses.

### Pitfall 5: Type Mismatch Between Current and New Schema
**What goes wrong:** Current `Recommendation` type has `{ title, description, priority, category }` but D-08 requires `{ action, reason, priority, effort, expected_impact }`. Existing test fixtures and the `gemini-synthesis.json` fixture use the old format.
**Why it happens:** Types were defined in Phase 1 as stubs. D-08 from CONTEXT.md redefines the fields.
**How to avoid:**
1. Update `Recommendation` interface in `src/types/database.ts`
2. Update `Database` type's `synthesis` table Row/Insert/Update types
3. Update `createRecommendation` factory in `tests/fixtures/factories.ts`
4. Create new JSON fixture matching the new schema
5. Check if any existing code references the old field names (only the stub and fixtures do)
**Warning signs:** TypeScript compilation errors after type update; test failures in existing tests referencing old field names.

### Pitfall 6: Gemini 2.0 Flash Deprecation (June 1, 2026)
**What goes wrong:** Model stops working after deadline.
**Why it happens:** Google is retiring `gemini-2.0-flash` on June 1, 2026, replacing it with `gemini-2.5-flash`.
**How to avoid:** Not a blocker for the March 30 deadline. The model is still fully functional. But the code should use the model name from a constant/config, not hardcoded strings, making future migration trivial. The codebase currently hardcodes `'gemini-2.0-flash'` in every AI module -- this is a pre-existing pattern to accept (not change in this phase).
**Warning signs:** 404 or model-not-found errors after June 1, 2026.

## Code Examples

### Synthesis Zod Schema (D-02 Section Format)
```typescript
// Source: Designed from D-02, D-03, D-08 decisions
import { z } from 'zod';

/** Individual section in strategic synthesis (per D-02) */
const synthesisSectionSchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),  // 2-3 lines
  metrics: z.record(z.string(), z.union([z.string(), z.number()])),
  tags: z.array(z.string()),
  detailed_analysis: z.string().min(1),  // markdown
});

/** Individual recommendation (per D-08) */
const recommendationSchema = z.object({
  action: z.string().min(1),
  reason: z.string().min(1),
  priority: z.enum(['alta', 'media', 'baixa']),
  effort: z.enum(['alto', 'medio', 'baixo']),
  expected_impact: z.string().min(1),
});

/** Full synthesis output (per D-03 Modo Rapido) */
export const synthesisOutputSchema = z.object({
  marketOverview: synthesisSectionSchema,
  competitorAnalysis: synthesisSectionSchema,
  gapsAndOpportunities: synthesisSectionSchema,
  viralPatterns: synthesisSectionSchema,
  recommendations: z.array(recommendationSchema).min(3).max(10),
});
```

### Creative Script Zod Schema (D-12)
```typescript
// Source: Designed from D-12 decisions
const creativeScriptSchema = z.object({
  title: z.string().min(1),
  format: z.enum(['Reels', 'TikTok', 'YouTube Shorts', 'Stories']),
  estimated_duration_seconds: z.number().min(10).max(120),
  hook: z.object({
    text: z.string().min(1),
    timing_seconds: z.number().min(1).max(10),
  }),
  body: z.object({
    text: z.string().min(1),
    structure_notes: z.string().min(1),
  }),
  cta: z.object({
    text: z.string().min(1),
    action: z.string().min(1),
  }),
  tone: z.string().min(1),
  inspiration_source: z.string().min(1),
});

export const creativeOutputSchema = z.object({
  scripts: z.array(creativeScriptSchema).min(3).max(5),
});
```

### Context Assembly Pattern (D-28, D-29, D-30)
```typescript
// Source: Designed from D-28/D-29/D-30 decisions
const assembleCompetitorContext = (competitors: Competitor[]) =>
  competitors.map((c) => ({
    name: c.name,
    website: c.websiteUrl,
    positioning: c.websiteData?.positioning ?? null,
    topKeywords: c.seoData?.topKeywords?.slice(0, 5) ?? [],
    estimatedTraffic: c.seoData?.estimatedTraffic ?? null,
    instagram: c.socialData?.instagram
      ? {
          followers: c.socialData.instagram.followers,
          engagementRate: c.socialData.instagram.engagementRate,
          postingFrequency: c.socialData.instagram.postingFrequency,
        }
      : null,
    tiktok: c.socialData?.tiktok
      ? {
          followers: c.socialData.tiktok.followers,
          engagementRate: c.socialData.tiktok.engagementRate,
          postingFrequency: c.socialData.tiktok.postingFrequency,
        }
      : null,
    activeAds: c.metaAdsData?.activeAdsCount ?? 0,
    hasGoogleAds: c.googleAdsData?.hasSearchAds ?? false,
    paidKeywords: c.googleAdsData?.paidKeywords?.slice(0, 5) ?? [],
    gmb: c.gmbData
      ? { rating: c.gmbData.rating, reviewCount: c.gmbData.reviewCount }
      : null,
  }));
```

### Orchestrator Integration Point
```typescript
// Source: src/trigger/analyze-market.ts line ~272 (current completion point)
// BEFORE (current):
//   await updateAnalysis(payload.analysisId, { status: 'completed' });
//   metadata.set('status', 'completed');
//   metadata.set('progress', 100);

// AFTER (Phase 7 integration):
//   metadata.set('step', 'Gerando sintese e recomendacoes...');
//   metadata.set('progress', 96);
//   const synthesisResult = await synthesizeTask.triggerAndWait({
//     analysisId: payload.analysisId,
//     niche: payload.niche,
//     segment: payload.segment,
//     region: payload.region,
//     mode: payload.mode,
//   });
//   metadata.set('synthesisStatus', synthesisResult.ok ? synthesisResult.output.status : 'unavailable');
//   await updateAnalysis(payload.analysisId, { status: 'completed' });
//   metadata.set('status', 'completed');
//   metadata.set('progress', 100);
```

## DB Schema Analysis

### Existing `synthesis` Table (from migration)
```sql
-- Already exists in 20260327200000_create_initial_schema.sql
CREATE TABLE synthesis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  analysis_id UUID NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
  strategic_overview TEXT NOT NULL,    -- Will store JSON string or markdown
  recommendations JSONB NOT NULL,      -- Array of Recommendation objects
  creative_scripts JSONB NOT NULL,     -- Array of CreativeScript objects
  comparative_analysis JSONB,          -- Null for Modo Rapido
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(analysis_id)
);
```

**Assessment:** The existing schema is sufficient. No new migration needed because:
1. `strategic_overview` is TEXT -- can store the full synthesis JSON as stringified JSON or as a composite
2. `recommendations` is JSONB -- directly stores the recommendations array
3. `creative_scripts` is JSONB -- directly stores the creative scripts array
4. `comparative_analysis` is nullable JSONB -- left null for Modo Rapido (Phase 7), populated in Phase 8

**Recommendation (Claude's discretion):** Store `strategic_overview` as stringified JSON of the full synthesis sections object (marketOverview, competitorAnalysis, gapsAndOpportunities, viralPatterns). The TEXT column can hold JSON -- the `upsertSynthesis` query already handles this. Alternatively, a new migration could change it to JSONB, but this is unnecessary overhead for the deadline.

### Type Updates Needed
The current `Recommendation` interface in `src/types/database.ts`:
```typescript
// CURRENT (needs update):
interface Recommendation {
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  category: string;
}

// NEW (per D-08):
interface Recommendation {
  action: string;
  reason: string;
  priority: 'alta' | 'media' | 'baixa';
  effort: 'alto' | 'medio' | 'baixo';
  expected_impact: string;
}
```

The current `CreativeScript` interface:
```typescript
// CURRENT (needs update):
interface CreativeScript {
  title: string;
  hook: string;
  body: string;
  cta: string;
  format: string;
  estimatedDurationSeconds: number;
  platform: string;
}

// NEW (per D-12):
interface CreativeScript {
  title: string;
  format: string;
  estimated_duration_seconds: number;
  hook: { text: string; timing_seconds: number };
  body: { text: string; structure_notes: string };
  cta: { text: string; action: string };
  tone: string;
  inspiration_source: string;
}
```

## Token Budget Analysis

### Gemini 2.0 Flash Limits
- **Input context:** 1,048,576 tokens (1M)
- **Output tokens:** 8,192 max per request
- **Free tier rate:** 10 RPM, up to 500 RPD (may vary -- deprecated model)

### Estimated Input Token Budget per Call
| Data Source | Estimated Tokens | Notes |
|-------------|-----------------|-------|
| System prompt (synthesis) | ~800 | Rules, format instructions, PT-BR enforcement |
| Competitor summaries (3-4) | ~1,200-2,000 | Pre-summarized, not raw JSONB |
| Viral patterns summary | ~500-800 | From `analysis.viralPatterns` |
| Viral content highlights (top 5) | ~500-1,000 | Captions + HBC summaries only |
| Niche context | ~100 | Niche, segment, region |
| **Total synthesis call** | **~3,100-4,700** | Well within 1M limit |
| System prompt (creative) | ~600 | Rules, script format, PT-BR |
| Viral patterns | ~500-800 | Hook/CTA patterns for inspiration |
| Niche + competitor summary | ~400 | Lighter context for creative |
| **Total creative call** | **~1,500-1,800** | Very comfortable |

### Estimated Output Token Budget per Call
| Output | Estimated Tokens | Budget (8,192) |
|--------|-----------------|----------------|
| 4 synthesis sections x ~400 tokens | ~1,600 | 20% |
| 5-8 recommendations x ~200 tokens | ~1,000-1,600 | 12-20% |
| **Total synthesis output** | **~2,600-3,200** | **32-39%** -- comfortable |
| 3-5 creative scripts x ~400 tokens | ~1,200-2,000 | 15-24% |
| **Total creative output** | **~1,200-2,000** | **15-24%** -- very comfortable |

**Conclusion:** The 8K output limit is NOT a blocker with two separate calls. Each call uses less than 40% of the budget. The split (D-15) was the right decision.

## State of the Art

| Old Approach (Current Stubs) | Current Approach (Phase 7) | Impact |
|------------------------------|----------------------------|--------|
| Raw `JSON.parse()` without validation | Zod schema + `validateOrNull` | Type safety, graceful failure |
| Generic prompt ("gere recomendacoes") | Specific prompt with data-citation rules | Actionable, non-generic output |
| Single flat Recommendation type | Structured with `action/reason/priority/effort/impact` | Richer, more actionable recommendations |
| Flat CreativeScript (string hook/body/cta) | Nested objects with timing/structure/action metadata | Better script structure for display |
| No orchestrator integration | Synthesis step in analyze-market pipeline | End-to-end automation |
| No fallback for Gemini failures | 3-tier fallback chain with partial/fallback status | Resilient to API outages |

## Open Questions

1. **`strategic_overview` column type (TEXT vs JSONB)**
   - What we know: The column is TEXT. The new synthesis output is a structured object with 4-5 sections.
   - What's unclear: Should we store as stringified JSON in TEXT, or add a migration to change to JSONB?
   - Recommendation: Store as stringified JSON in the existing TEXT column. Adding a migration is unnecessary complexity for the deadline. The `upsertSynthesis` query can `JSON.stringify()` the sections object before insert. The `mapSynthesisRow` mapper can `JSON.parse()` it back. This matches how `recommendations` and `creative_scripts` already work (they're stored as JSONB but the TEXT column can hold JSON strings too).

2. **Third Gemini call for deeper gap analysis (Claude's discretion)**
   - What we know: D-03 lists "gaps & opportunities" as a synthesis section.
   - What's unclear: Whether gap analysis needs its own dedicated call or fits within the synthesis call.
   - Recommendation: Keep it in the synthesis call. Gap analysis is a natural part of the strategic overview -- it depends on the same competitor data. A third call adds latency (another 5-15s) and complexity for marginal benefit.

3. **maxDuration for synthesis task (Claude's discretion: 120s-300s)**
   - What we know: Two sequential Gemini calls, each taking 5-15s. DB reads add 1-3s. Total: ~15-35s typical.
   - What's unclear: Worst case with retries and rate limits.
   - Recommendation: Set to 180s (3 minutes). This allows for the worst case of both calls needing the full retry chain (call + 15s wait + retry = ~45s per call, x2 = ~90s) plus DB operations.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.x (installed) |
| Config file | `vitest.config.ts` (exists) |
| Quick run command | `npx vitest run tests/unit/synthesize-ai.test.ts tests/unit/creative-ai.test.ts tests/unit/synthesize-task.test.ts --reporter verbose` |
| Full suite command | `npm test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SYNTH-01 | synthesizeAnalysis returns structured strategic overview with sections | unit | `npx vitest run tests/unit/synthesize-ai.test.ts -x` | Wave 0 |
| SYNTH-02 | Recommendations reference specific data (not generic) | unit | `npx vitest run tests/unit/synthesize-ai.test.ts -t "recomendacoes especificas" -x` | Wave 0 |
| SYNTH-03 | Recommendations stored as prioritized array in JSONB | unit | `npx vitest run tests/unit/synthesize-task.test.ts -t "armazena sintese" -x` | Wave 0 |
| CRTV-01 | generateCreativeScripts returns 3-5 scripts with hook/body/cta | unit | `npx vitest run tests/unit/creative-ai.test.ts -x` | Wave 0 |
| CRTV-02 | Scripts use viral patterns when available, fallback when not | unit | `npx vitest run tests/unit/creative-ai.test.ts -t "padroes virais" -x` | Wave 0 |
| CRTV-03 | Each script includes format and estimated_duration_seconds | unit | `npx vitest run tests/unit/creative-ai.test.ts -t "formato e duracao" -x` | Wave 0 |
| CRTV-04 | Creative scripts stored in synthesis.creative_scripts JSONB | unit | `npx vitest run tests/unit/synthesize-task.test.ts -t "armazena roteiros" -x` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/unit/synthesize-ai.test.ts tests/unit/creative-ai.test.ts tests/unit/synthesize-task.test.ts --reporter verbose`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/unit/synthesize-ai.test.ts` -- covers SYNTH-01, SYNTH-02
- [ ] `tests/unit/creative-ai.test.ts` -- covers CRTV-01, CRTV-02, CRTV-03
- [ ] `tests/unit/synthesize-task.test.ts` -- covers SYNTH-03, CRTV-04, orchestrator integration
- [ ] `tests/fixtures/gemini-synthesis-v2.json` -- updated fixture matching D-02 section format
- [ ] `tests/fixtures/gemini-creative-v2.json` -- updated fixture matching D-12 script format
- [ ] `src/lib/validation/synthesisSchemas.ts` -- Zod schemas for synthesis + creative (needed by tests)

## Sources

### Primary (HIGH confidence)
- **Existing codebase** - `src/lib/ai/hbc-extraction.ts`, `src/lib/ai/viral-patterns.ts`, `src/lib/ai/understand.ts` (established Gemini structured output patterns)
- **Existing codebase** - `src/trigger/extract-viral.ts` (compound task pattern with progress tracking)
- **Existing codebase** - `src/lib/supabase/queries.ts` (upsertSynthesis, getCompetitorsByAnalysis already implemented)
- **Existing codebase** - `supabase/migrations/20260327200000_create_initial_schema.sql` (synthesis table schema confirmed)
- **Gemini API deprecations page** - https://ai.google.dev/gemini-api/docs/deprecations (gemini-2.0-flash shutdown June 1, 2026)
- **Gemini API structured output docs** - https://ai.google.dev/gemini-api/docs/structured-output (responseJsonSchema config confirmed)

### Secondary (MEDIUM confidence)
- **OpenRouter model page** - https://openrouter.ai/google/gemini-2.0-flash-001 (8,192 output token limit)
- **Simon Willison tweet** - https://x.com/simonw/status/1867239706729316459 (confirms 8,192 max output tokens)
- **Gemini API rate limits** - https://ai.google.dev/gemini-api/docs/rate-limits (free tier limits)

### Tertiary (LOW confidence)
- **Third-party rate limit guides** - https://www.aifreeapi.com/en/posts/gemini-api-free-tier-complete-guide (free tier RPM/RPD numbers -- cross-referenced with official docs page)

## Project Constraints (from CLAUDE.md)

- **Gemini model:** `gemini-2.0-flash` (hardcoded across all AI modules)
- **SDK:** `@google/genai` v1.46.0 (not deprecated `@google/generative-ai`)
- **Zod:** v3.25.76 pinned (NOT v4 -- Trigger.dev incompatibility)
- **Trigger.dev:** v4.4.3, task names in kebab-case, maxDuration: 300
- **All output in PT-BR:** Interface and AI recommendations in Portuguese
- **No `any` types** without justification
- **Functions under 30 lines** (split if larger)
- **JSDoc on all public functions**
- **Error messages in PT-BR**
- **No raw Apify output storage** (filter at extraction time)
- **Every feature gets its own commit** (atomic commits)
- **Run tests after each change**
- **Arrow functions for components**
- **Imports:** external first, then internal, then types

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already installed and proven in codebase
- Architecture: HIGH - Following exact established patterns from Phases 2-6
- Pitfalls: HIGH - Token limits verified against official docs; type mismatches identified from codebase inspection
- DB schema: HIGH - Table exists, columns match, queries implemented

**Research date:** 2026-03-28
**Valid until:** 2026-06-01 (when gemini-2.0-flash is retired; patterns remain valid regardless)
