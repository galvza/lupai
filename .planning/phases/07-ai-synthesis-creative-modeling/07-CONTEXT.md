# Phase 7: AI Synthesis & Creative Modeling - Context

**Gathered:** 2026-03-28 (assumptions mode)
**Status:** Ready for planning

<domain>
## Phase Boundary

Consolidate ALL collected data (competitors, website, SEO, social, ads, viral content, transcriptions, cross-video patterns) into actionable strategic recommendations and ready-to-use creative scripts via Gemini AI. Output is structured JSON stored in Supabase. Frontend/UI display is Phase 9 — this phase is backend only (synthesis logic, Gemini prompts, Trigger.dev task, DB storage).

</domain>

<decisions>
## Implementation Decisions

### Gemini Output Format (User-Specified)
- **D-01:** Gemini returns STRUCTURED JSON, not prose — enforced via Zod schema + `zodToJsonSchema` + `responseJsonSchema` in Gemini config
- **D-02:** Each synthesis section has: `title` (string), `summary` (2-3 line string), `metrics` (key-value pairs), `tags` (string[]), `detailed_analysis` (markdown string)
- **D-03:** Output sections (Modo Rapido): market overview, competitor analysis, gaps & opportunities, viral patterns, suggested scripts, prioritized recommendations
- **D-04:** Output sections (Modo Completo): all Modo Rapido sections + "user vs market" comparative section
- **D-05:** Upgrade existing `synthesize.ts` and `creative.ts` stubs from raw `JSON.parse()` to Zod + `zodToJsonSchema` + `validateOrNull` pattern (matching established mature pattern in `hbc-extraction.ts`, `viral-patterns.ts`)

### Recommendation Specificity (User-Specified)
- **D-06:** Recommendations MUST reference actual scraped data — specific competitor names, numbers, content examples
- **D-07:** NEVER generic recommendations. Pattern: "Seus concorrentes ranqueiam pra 'whey protein isolado' e voce nao tem conteudo sobre isso — crie uma pagina focada nessa keyword"
- **D-08:** Each recommendation includes: `action` (what to do), `reason` (why — citing specific data), `priority` (alta/media/baixa), `effort` (alto/medio/baixo), `expected_impact` (description)
- **D-09:** Recommendations are PRIORITIZED — ordered by impact/effort ratio, not random

### Creative Script Generation (CRTV-01 through CRTV-04)
- **D-10:** AI generates 3-5 video script suggestions with explicit hook, body, and CTA per script
- **D-11:** Scripts are adapted to the user's niche based on cross-video viral patterns (ViralPatterns from Phase 6)
- **D-12:** Each script includes: `title`, `format` (Reels/TikTok/YouTube Shorts), `estimated_duration_seconds`, `hook` (text + timing), `body` (text + structure notes), `cta` (text + action), `tone`, `inspiration_source` (which viral video pattern inspired it)
- **D-13:** Scripts use detected patterns (hook formulas, CTA patterns, dominant tone) from Phase 6 ViralPatterns as foundation
- **D-14:** If no viral patterns available (Phase 6 returned unavailable), generate scripts based on competitor analysis + niche best practices instead

### Architecture: Two Separate Gemini Calls
- **D-15:** Synthesis (strategic overview + recommendations) and creative scripts are TWO SEPARATE Gemini calls, each with its own Zod schema and prompt
- **D-16:** Rationale: separate calls allow partial success (synthesis saves even if creative fails), independent schemas, token budget management
- **D-17:** Call order: synthesis FIRST (because creative scripts can reference recommendations), then creative scripts

### Trigger.dev Task
- **D-18:** Create NEW `src/trigger/synthesize.ts` Trigger.dev task (compound: synthesis + creative generation)
- **D-19:** Task receives lightweight payload: `{ analysisId, niche, segment, region, mode }` — fetches all data from Supabase internally
- **D-20:** Task fetches: `getAnalysis()` (includes viralPatterns), `getCompetitorsByAnalysis()`, `getViralContentByAnalysis()` — all queries already exist
- **D-21:** Retry config per error handling strategy: `retry: { maxAttempts: 3, minTimeoutInMs: 5000, maxTimeoutInMs: 15000, factor: 2 }`
- **D-22:** Fallback chain: normal Gemini call → wait 15s retry → raw data without AI synthesis (store extracted data summary as "fallback" synthesis)
- **D-23:** Return pattern: `{ status: "success" | "partial" | "fallback" | "unavailable", data: { synthesis: SynthesisResult | null, scripts: CreativeScript[] | null }, reason?: string }`
- **D-24:** "partial" = synthesis succeeded but creative failed (or vice versa). "fallback" = Gemini unavailable, stored raw data summary instead

### Orchestrator Integration
- **D-25:** Add synthesis step to `src/trigger/analyze-market.ts` AFTER extraction batches complete (currently ends at extraction)
- **D-26:** Orchestrator calls `synthesize` task, waits for result, then marks analysis as `completed` (move existing completion logic after synthesis)
- **D-27:** If synthesis returns "unavailable"/"fallback", still mark analysis as `completed` with a `synthesis_status` indicator — user gets extraction data even without AI synthesis

### Data Input Assembly
- **D-28:** Synthesis task assembles input context from DB: competitor data (website, SEO, social, ads per competitor), viral content (transcriptions, HBC breakdowns), viral patterns (cross-video analysis)
- **D-29:** Truncate/summarize data if total context exceeds Gemini token budget — prioritize: competitor core data > viral patterns > individual video details
- **D-30:** Input context formatted as structured JSON sections in the prompt, not raw DB dumps

### DB Storage
- **D-31:** Store synthesis result in `synthesis` table (already exists from Phase 1 schema) — `strategic_overview` and `recommendations` JSONB columns
- **D-32:** Store creative scripts in same synthesis record — `creative_scripts` JSONB column (may need new column or use existing field)
- **D-33:** All Gemini responses validated via Zod before DB storage — invalid responses stored as null with warning, per `validateOrNull` pattern

### All Output in PT-BR
- **D-34:** All synthesis text, recommendations, script content in Portuguese (PT-BR) — enforced in Gemini prompt
- **D-35:** Error messages and status reasons in PT-BR per established convention

### Claude's Discretion
- Exact Gemini prompt design for synthesis and creative calls (within the structured JSON format constraints)
- How to truncate/summarize competitor data if token budget is tight
- Whether `synthesis` table needs new columns or existing schema is sufficient
- Exact Zod schema field names and nesting structure (within the section format: title, summary, metrics, tags, detailed_analysis)
- Whether to add a third Gemini call for deeper gap analysis or keep it in the synthesis call
- maxDuration for the synthesis Trigger.dev task (120s-300s range depending on Gemini response time)

### Folded Todos
None — no matching todos for Phase 7.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product Requirements
- `.planning/REQUIREMENTS.md` — SYNTH-01 (strategic overview), SYNTH-02 (specific recommendations), SYNTH-03 (prioritized display), CRTV-01 (3-5 scripts), CRTV-02 (niche-adapted), CRTV-03 (format + duration), CRTV-04 (structured display)
- `PRD-LUPAI.md` — Full product requirements, synthesis and creative modeling sections
- `CLAUDE.md` — Stack versions, coding conventions, Trigger.dev job naming (kebab-case)

### Existing AI Module Patterns (MUST READ)
- `src/lib/ai/synthesize.ts` — Current synthesis stub (upgrade from raw JSON.parse to Zod schema pattern)
- `src/lib/ai/creative.ts` — Current creative stub (upgrade similarly)
- `src/lib/ai/prompts.ts` — All Gemini prompt templates (add synthesis + creative prompts)
- `src/lib/ai/understand.ts` — Mature Gemini structured output pattern with `responseJsonSchema: zodToJsonSchema(schema)`
- `src/lib/ai/hbc-extraction.ts` — HBC extraction pattern (Zod schema + validateOrNull)
- `src/lib/ai/viral-patterns.ts` — Cross-video pattern detection pattern (complex structured output)

### Orchestrator & Task Integration (MUST READ)
- `src/trigger/analyze-market.ts` — Orchestrator to extend with synthesis step (currently ends at line ~272 after extraction)
- `src/trigger/extract-viral.ts` — Compound task pattern reference (multiple stages in one task)
- `src/trigger/extract-website.ts` — Another compound task pattern reference

### Types & DB (MUST READ)
- `src/types/analysis.ts` — Analysis types including SynthesisResult, CreativeScript (may need extension)
- `src/types/viral.ts` — ViralContent, ViralPatterns, HookBodyCta types (synthesis input)
- `src/types/competitor.ts` — Competitor type with all JSONB data fields (synthesis input)
- `src/lib/supabase/queries.ts` — getAnalysis(), getCompetitorsByAnalysis(), getViralContentByAnalysis() queries
- `supabase/migrations/` — Existing schema, may need migration for new synthesis columns

### Phase 6 Context (Direct Upstream)
- `.planning/phases/06-viral-content-transcription/06-CONTEXT.md` — Viral pipeline decisions, ViralPatterns output format, cross-video pattern detection

### Error Handling Strategy
- Error handling memory: retry config (maxAttempts: 3), fallback chain (Gemini → retry → raw data), golden rule (partial > no data)

### Test Fixtures
- `tests/fixtures/` — Existing fixtures for competitors, viral content, transcription output (use as synthesis input test data)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `synthesizeAnalysis()` in `src/lib/ai/synthesize.ts`: Stub function accepting competitors + viralContent — upgrade with Zod schema and structured prompts
- `generateCreativeScripts()` in `src/lib/ai/creative.ts`: Stub function accepting viralContent[] — upgrade with Zod schema, add viral patterns input
- All Gemini prompt templates in `src/lib/ai/prompts.ts`: Add synthesis and creative prompt templates
- `zodToJsonSchema` utility already used in `understand.ts`, `hbc-extraction.ts`, `viral-patterns.ts` — same pattern for synthesis
- `validateOrNull()` pattern established across all extraction phases — apply to Gemini synthesis output
- `getCompetitorsByAnalysis()`, `getViralContentByAnalysis()`, `getAnalysis()` in `src/lib/supabase/queries.ts` — data fetching for synthesis input
- `updateAnalysis()` in queries — for storing synthesis results

### Established Patterns
- Gemini structured output: `responseJsonSchema: zodToJsonSchema(schema)` + `responseMimeType: 'application/json'` + Zod `.parse()` validation
- Compound Trigger.dev task: sequential stages within one task, metadata updates per stage for progress tracking
- Never-fail return: `{ status, data, reason? }` — synthesis must follow this
- PT-BR prompts: all Gemini prompts enforce Portuguese output (see `hbc-extraction.ts`, `viral-patterns.ts`)
- Promise.allSettled for parallel independent operations (synthesis + creative could use this if made parallel)

### Integration Points
- Orchestrator `src/trigger/analyze-market.ts` needs new synthesis step after extraction batches (line ~272)
- `synthesis` table in Supabase — verify columns match new structured output format
- `SynthesisResult` and `CreativeScript` types in `src/types/analysis.ts` — may need update to match D-02 section format
- Phase 6 `viralPatterns` JSONB on `analyses` table — read by synthesis for pattern-based script generation

</code_context>

<specifics>
## Specific Ideas

- User explicitly specified the section schema: `{ title, summary (2-3 lines), metrics, tags, detailed_analysis (markdown) }` — this is the atomic unit for each synthesis section
- "Melhore seu SEO" is BANNED — every recommendation must cite specific data: competitor names, keywords, numbers, content examples
- Scripts should be "adapted to the user's product/niche based on patterns found in viral content" — Phase 6 ViralPatterns is the direct input
- "Modo Completo adds user vs market section" — this section only exists when mode is `completo` and user business data is available (Phase 8 provides this)
- Phase 6 deferred note: "Script generation (2-3 adapted scripts) — User requested as Phase 6 but ROADMAP places this in Phase 7" — this is where those scripts get built
- Existing stubs in `synthesize.ts` and `creative.ts` already have the right function signatures — they just need proper Gemini prompts, Zod schemas, and structured output

</specifics>

<deferred>
## Deferred Ideas

- **Modo Completo "user vs market" section** — Requires Phase 8 (user business extraction + comparative analysis). Phase 7 synthesize function should ACCEPT an optional `userBusiness` param but Phase 8 implements the actual flow
- **A/B script variants** — Could generate multiple variants per script for testing. Out of scope for MVP — one script per suggestion is sufficient
- **Script thumbnail/storyboard generation** — Visual representation of scripts. Future enhancement, not MVP
- **Recommendation tracking/completion** — Marking recommendations as "done" by the user. Needs auth + state management, not MVP

### Reviewed Todos (not folded)
None — no todos matched Phase 7.

</deferred>

---

*Phase: 07-ai-synthesis-creative-modeling*
*Context gathered: 2026-03-28*
