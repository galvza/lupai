# Phase 8: Modo Completo - Context

**Gathered:** 2026-03-28 (auto mode)
**Status:** Ready for planning

<domain>
## Phase Boundary

Users who provide their own business URL alongside the niche input get a comparative analysis. The system extracts the user's business data using the SAME extraction pipeline as competitors (website, SEO, social, ads), then generates a cross-comparison showing the user's position vs discovered competitors with personalized comparative recommendations. This phase modifies the orchestrator flow, adds user extraction steps, extends the synthesis to include comparative sections, and adds a DB migration for the `role` column. Frontend/UI changes are Phase 9 — this phase is backend only.

</domain>

<decisions>
## Implementation Decisions

### User Extraction Pipeline Strategy
- **D-01:** Extract user business data using the SAME extraction tasks (extract-website, extract-social, extract-ads) as competitors — no new extraction code needed, just new orchestrator wiring
- **D-02:** In Modo Completo, extract user's business FIRST (before competitor discovery). Pipeline: classify → create user record → extract user (website+SEO → social+ads) → discover competitors → extract competitors → viral → synthesize WITH user data
- **D-03:** User extraction runs the same 2-batch pattern as competitor extraction: Batch A (extract-website for user), then Batch B (extract-social + extract-ads for user, using social links from Batch A)
- **D-04:** User extraction is a self-contained step in the orchestrator — its success or failure is independent of competitor extraction

### User Data Storage Model
- **D-05:** Add `role` column to `competitors` table: `role TEXT NOT NULL DEFAULT 'competitor' CHECK (role IN ('competitor', 'user_business'))` — user's own business stored as a competitor record with `role='user_business'`
- **D-06:** Supabase migration needed: ALTER TABLE to add `role` column with default and CHECK constraint
- **D-07:** `createCompetitor()` query updated to accept optional `role` parameter (defaults to 'competitor')
- **D-08:** New query: `getUserBusinessByAnalysis(analysisId)` — fetches the competitor record where `role='user_business'` for a given analysis
- **D-09:** Competitor type (`src/types/competitor.ts`) extended with `role: 'competitor' | 'user_business'` field
- **D-10:** Existing `getCompetitorsByAnalysis()` ONLY returns role='competitor' records (no behavior change for Modo Rapido or downstream consumers)

### Orchestrator Flow for Modo Completo
- **D-11:** When `mode='complete'` and `userBusinessUrl` is provided, orchestrator inserts a user extraction phase between "classify" and "discover competitors"
- **D-12:** Orchestrator creates a user business competitor record via `createCompetitor({ analysisId, name: '[user business name from AI understanding]', websiteUrl: userBusinessUrl, role: 'user_business' })`
- **D-13:** User extraction steps: (1) `extractWebsite` for user URL → (2) collect social links → (3) `extractSocial` + `extractAds` for user — same batch pattern as competitors
- **D-14:** After user extraction completes (or fails), proceed to competitor discovery as normal — user extraction failure does NOT block competitor pipeline
- **D-15:** Metadata progress updated to reflect user extraction step: "Analisando seu negocio..." → "Descobrindo concorrentes..." → (normal flow)
- **D-16:** When `mode='quick'`, orchestrator flow is UNCHANGED — skip user extraction entirely

### Comparative Synthesis Design
- **D-17:** Modify `synthesizeAnalysis()` to accept optional `userBusiness: Competitor | null` parameter. When present (mode='complete'), include user data in the Gemini prompt and request comparative output sections
- **D-18:** Extend `SynthesisOutput` with optional comparative fields for Modo Completo:
  - `userVsMarket?: SynthesisSection` — "Sua posicao no mercado"
  - `gapsVsCompetitors?: SynthesisSection` �� "Gaps vs concorrentes"
  - `competitiveAdvantages?: SynthesisSection` — "Vantagens competitivas identificadas"
- **D-19:** Add new Zod schema extending `synthesisOutputSchema` with the 3 comparative sections (optional fields so the same schema validates both modes)
- **D-20:** Comparative recommendations pattern: "Seu concorrente X faz Y e voce nao — implemente Z" — recommendations in Modo Completo MUST reference both competitor data AND user data with specific numbers
- **D-21:** Use the SAME Gemini call (not a third call) — when mode='complete', the synthesis prompt includes an additional "user business" data section and requests the 3 extra comparative sections alongside the standard Modo Rapido sections
- **D-22:** `ComparativeAnalysis` type in `database.ts` upgraded from stub to properly typed interface matching actual synthesis output (the 3 comparative SynthesisSections + personalized recommendations)
- **D-23:** Store comparative analysis in `synthesis.comparative_analysis` JSONB column (already exists in schema, currently always null)

### Synthesis Task Integration
- **D-24:** `SynthesizePayload` — no change needed, already has `mode` field
- **D-25:** Synthesis task fetches user business via new `getUserBusinessByAnalysis()` when `mode='complete'`
- **D-26:** If user business record exists but has no/partial data (extraction failed), pass what's available — partial comparative is better than none
- **D-27:** After synthesis, call `upsertSynthesis()` with the `comparativeAnalysis` field populated (currently always null)

### Graceful Degradation
- **D-28:** If user URL extraction fails completely (site down, blocked), proceed with competitor pipeline normally and synthesize without comparative sections — effectively degrades to Modo Rapido results + warning: "Nao foi possivel analisar seu site. Mostrando analise do mercado sem comparacao."
- **D-29:** If user URL extraction partially succeeds (website OK but social/ads failed), proceed with available data — partial comparative analysis is better than none (golden rule from Phase 4 D-42)
- **D-30:** Synthesis handles missing user data gracefully: if `userBusiness` is null or has no extracted data, skip comparative sections and return standard Modo Rapido output with a `comparativeStatus: 'unavailable' | 'partial' | 'full'` indicator
- **D-31:** Status metadata communicates degradation to frontend: `metadata.set('modoCompleto', 'degraded')` with reason string

### Claude's Discretion
- Exact Gemini prompt design for the comparative sections (within the structured JSON + Zod schema constraints)
- How to derive user business name from the URL/AI understanding (could use domain name, meta title, or AI-extracted name)
- Whether to run user extraction concurrently with viral extraction (optimization) or strictly before competitor discovery
- Exact progress percentage allocations for the user extraction step
- Whether `ComparativeAnalysis` type wraps the 3 SynthesisSections or uses a flatter structure

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product Requirements
- `.planning/REQUIREMENTS.md` — MODO-01 (user provides URL), MODO-02 (same extraction), MODO-03 (comparative analysis), MODO-04 (personalized recommendations)
- `PRD-LUPAI.md` — Full product requirements, Modo Completo section
- `CLAUDE.md` — Stack versions, coding conventions, error handling rules

### Orchestrator (MUST READ)
- `src/trigger/analyze-market.ts` — Current orchestrator with 2-batch extraction pattern, receives `mode` and `userBusinessUrl` already
- `src/trigger/synthesize.ts` — Synthesis task (compound: synthesis + creative), receives `mode` but doesn't use it for comparative yet

### Extraction Tasks (reusable for user extraction)
- `src/trigger/extract-website.ts` — Website + SEO extraction task
- `src/trigger/extract-social.ts` — Social media extraction task
- `src/trigger/extract-ads.ts` — Meta Ads + Google Ads + GMB extraction task

### AI Synthesis (MUST READ)
- `src/lib/ai/synthesize.ts` — Current synthesis implementation, `assembleCompetitorContext()`, `truncateContextIfNeeded()`
- `src/lib/ai/creative.ts` — Creative script generation
- `src/lib/ai/prompts.ts` — All Gemini prompt templates (add comparative prompt section)
- `src/lib/validation/synthesisSchemas.ts` — Current Zod schemas for synthesis output (extend for comparative)

### Types (MUST READ)
- `src/types/analysis.ts` — `AnalysisMode`, `AnalysisInput.userBusinessUrl`, `Analysis.userBusinessUrl` already defined
- `src/types/database.ts` — `ComparativeAnalysis` stub (needs upgrade), `SynthesisOutput`, `Synthesis.comparativeAnalysis`
- `src/types/competitor.ts` — `Competitor` type (needs `role` field)

### Database
- `supabase/migrations/20260327200000_create_initial_schema.sql` — Current schema (competitors table needs `role` column)
- `src/lib/supabase/queries.ts` — `createCompetitor()`, `getCompetitorsByAnalysis()`, `upsertSynthesis()` (needs updates)

### Prior Phase Context
- `.planning/phases/03-competitor-discovery-orchestration/03-CONTEXT.md` — Orchestration pattern, batch fan-out, metadata progress
- `.planning/phases/04-website-seo-social-extraction/04-CONTEXT.md` — 2-batch sequential pattern, extraction chain, golden rule (D-42), never-fail pattern
- `.planning/phases/07-ai-synthesis-creative-modeling/07-CONTEXT.md` — Synthesis architecture (two Gemini calls), D-04 (Modo Completo output sections), structured JSON output

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `extractWebsite` task — Fully implemented, handles website scraping + SEO + social link discovery. Can be called for user URL with zero changes
- `extractSocial` task — Fully implemented, handles Instagram + TikTok parallel extraction. Reusable for user's social profiles
- `extractAds` task — Fully implemented, handles Meta Ads + Google Ads + GMB. Reusable for user's ad presence
- `assembleCompetitorContext()` in `synthesize.ts` — Already extracts relevant fields from Competitor objects. Works for user business data too (same type)
- `batch.triggerByTaskAndWait()` — Established pattern in orchestrator for parallel task execution
- `upsertSynthesis()` — Already accepts `comparativeAnalysis` parameter, currently always passed as null/undefined

### Established Patterns
- **2-batch extraction**: Website+SEO first (Batch 1), then Social+Ads (Batch 2) using social links from Batch 1. User extraction should follow same pattern
- **Never-fail pattern**: All extraction tasks return `{ status, data, reason }` — never throw. User extraction should follow this
- **Retry config**: `{ maxAttempts: 3, minTimeoutInMs: 2000, maxTimeoutInMs: 10000, factor: 2 }` for extraction tasks
- **Metadata progress tracking**: `metadata.set('step', ...)` + `metadata.set('progress', N)` throughout orchestrator
- **Zod + zodToJsonSchema + validateOrNull**: Established pattern for structured Gemini output (used in understand.ts, hbc-extraction.ts, viral-patterns.ts, synthesize.ts)
- **Golden rule (Phase 4 D-42)**: Partial data is INFINITELY better than failed analysis with no data

### Integration Points
- `analyzeMarket` orchestrator (line ~40-308) — New user extraction step inserted between step 1 (status update) and step 2 (discovery fan-out) when mode='complete'
- `synthesizeTask` (line ~77-176) — Fetch user business record when mode='complete', pass to synthesizeAnalysis()
- `synthesizeAnalysis()` — Accept optional userBusiness parameter, modify prompt for comparative output
- `SynthesisOutput` type — Add optional comparative fields
- `synthesisOutputSchema` — Extend Zod schema with optional comparative sections
- API route `POST /api/analyze` — Already accepts mode and userBusinessUrl, no changes needed

</code_context>

<specifics>
## Specific Ideas

- User explicitly specified the pipeline ordering: "extract USER FIRST → discover competitors → extract competitors → viral → synthesize WITH user data"
- Comparative output sections named in PT-BR: "Sua posicao no mercado", "Gaps vs concorrentes", "Vantagens competitivas identificadas"
- Recommendation format for Modo Completo: "Seu concorrente X faz Y e voce nao — implemente Z" — must cite specific competitor data AND user data
- User data stored separately from competitors via role flag, not a separate table — reuses entire competitor data model
- If user URL extraction fails, gracefully degrade to Modo Rapido results + warning — never block the competitor analysis

</specifics>

<deferred>
## Deferred Ideas

None — analysis stayed within phase scope

</deferred>

---

*Phase: 08-modo-completo*
*Context gathered: 2026-03-28*
