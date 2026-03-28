# Phase 3: Competitor Discovery & Orchestration - Context

**Gathered:** 2026-03-27
**Status:** Ready for planning

<domain>
## Phase Boundary

The system automatically finds relevant competitors for a given niche and establishes the Trigger.dev orchestration pattern. After the user confirms the AI-interpreted niche (Phase 2), the system discovers 3-4 relevant competitors via AI + Apify, presents them for user confirmation, then fans out to parallel extraction sub-tasks. Each sub-task runs independently. Real-time status updates flow from Trigger.dev to the frontend. Actual extraction of website/SEO/social/ads data is Phases 4-6 — this phase builds the orchestrator skeleton and competitor discovery only.

</domain>

<decisions>
## Implementation Decisions

### Discovery Sources
- **D-01:** Fetch 15-20 raw competitor candidates from multiple Apify sources: Google Search, SimilarWeb, Facebook Ads Library, Google Maps
- **D-02:** Each source runs as a separate Trigger.dev sub-task so failures are independent
- **D-03:** Aggregate and deduplicate results across all sources before sending to Gemini for scoring

### Filtering Rules
- **D-04:** EXCLUDE all marketplaces entirely — both platforms AND sellers within them
- **D-05:** Blocklist domains: amazon.com.br, mercadolivre.com.br, shopee.com.br, magazineluiza.com.br, americanas.com.br, aliexpress.com, casasbahia.com.br
- **D-06:** Blocklist generic portals: wikipedia, youtube.com, reddit.com, reclameaqui.com.br, review/list blogs
- **D-07:** ONLY include competitors with independent digital presence: own website/landing page + active social media
- **D-08:** If a result has no detectable website or social profile, discard it
- **D-09:** The AI must validate: "Does this business have its own site AND at least one active social media profile?"

### Competitor Scoring
- **D-10:** Send aggregated raw results to Gemini for intelligent filtering and scoring
- **D-11:** Gemini scores each result 0-100 using match criteria:
  - Segment match: same type of business?
  - Product match: similar products/services?
  - Size match: comparable scale?
  - Region match: if user is local, competitor should be local too
  - Active digital presence: functional site + active social media + running ads?
- **D-12:** Threshold: 70+ score to qualify as a competitor
- **D-13:** Return top 3-4 qualifying competitors, sorted by score descending

### Confirmation Flow
- **D-14:** Present discovered competitors to user for confirmation before full extraction begins
- **D-15:** User can remove competitors they don't want analyzed (satisfies COMP-02, COMP-03)
- **D-16:** After confirmation, persist selected competitors to Supabase via createCompetitor()
- **D-17:** Confirmation happens via API endpoint — frontend sends confirmed competitor list, backend proceeds to fan-out

### Orchestration Pattern
- **D-18:** Expand existing `analyze-market` task stub into full orchestrator with step progression
- **D-19:** Orchestrator flow: discovery → AI scoring/filtering → pause for user confirmation → fan-out extraction
- **D-20:** Fan-out uses Trigger.dev's `trigger.batchTriggerAndWait()` or parallel task triggers for sub-tasks
- **D-21:** Sub-task IDs follow kebab-case per CLAUDE.md: `extract-website`, `extract-social`, `extract-ads`, `extract-viral`
- **D-22:** Each sub-task receives a single competitor + analysis context as payload
- **D-23:** Each sub-task is fully independent — failure in one does not block others (ORCH-02)

### Progress Tracking
- **D-24:** Use Trigger.dev `metadata.set()` for step-by-step progress updates
- **D-25:** Progress steps: "Descobrindo concorrentes..." → "Filtrando resultados..." → "Aguardando confirmacao..." → "Extraindo dados de [Competitor]..." (per sub-task)
- **D-26:** Frontend subscribes via `@trigger.dev/react-hooks` useRealtimeRun (established in Phase 1 stack decisions)
- **D-27:** Each sub-task updates its own metadata independently so the frontend can show per-competitor progress

### Error Handling
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

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product Definition
- `PRD-LUPAI.md` — Full product requirements, competitor discovery flow, user confirmation
- `.planning/PROJECT.md` — Constraints: Apify free tier ($5/mo), Gemini rate limits, Vercel 10s timeout
- `CLAUDE.md` — Stack versions, folder structure, Trigger.dev job naming (kebab-case)

### Requirements
- `.planning/REQUIREMENTS.md` — COMP-01 (discover 3-4 competitors), COMP-02 (present for confirmation), COMP-03 (user can remove/adjust), ORCH-01 (background jobs via Trigger.dev), ORCH-02 (independent sub-tasks)

### Prior Phase Implementation
- `src/trigger/analyze-market.ts` — Existing stub task to expand into full orchestrator
- `src/lib/ai/understand.ts` — Gemini client pattern (GoogleGenAI, responseMimeType, zodToJsonSchema)
- `src/lib/supabase/queries.ts` — createCompetitor(), getCompetitorsByAnalysis(), updateCompetitor() already implemented
- `src/types/competitor.ts` — Competitor, CompetitorInput types defined
- `src/types/analysis.ts` — AnalysisStatus, NicheInterpreted, AnalyzeMarketPayload types

### Apify Wrappers
- `src/lib/apify/similarweb.ts` — SimilarWeb scraper (scrapeSimilarweb)
- `src/lib/apify/google-maps.ts` — Google Maps scraper (scrapeGoogleMaps)
- `src/lib/apify/website.ts` — Website content crawler (scrapeWebsite)
- `src/lib/apify/facebook-ads.ts` — Facebook Ads Library scraper
- `src/lib/apify/google-ads.ts` — Google Ads scraper

### Stack Research
- `.planning/research/STACK.md` — Trigger.dev v4 Realtime API, React hooks for progress
- `.planning/research/ARCHITECTURE.md` — Orchestrator pattern, fan-out sub-tasks
- `.planning/research/PITFALLS.md` — Apify credits, Gemini rate limits, maxDuration 300s

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/trigger/analyze-market.ts`: Stub task with metadata.set() pattern — expand into full orchestrator
- `src/lib/ai/understand.ts`: Gemini client pattern (GoogleGenAI, structured JSON output via Zod schema)
- `src/lib/supabase/queries.ts`: createCompetitor(), updateCompetitor(), getCompetitorsByAnalysis() — ready to use
- `src/lib/apify/*.ts`: All Apify actor wrappers (SimilarWeb, Google Maps, website, Facebook Ads, Google Ads, Instagram, TikTok)
- `src/types/competitor.ts`: Competitor, CompetitorInput types with all JSONB data fields
- `src/types/analysis.ts`: AnalyzeMarketPayload interface in analyze-market.ts

### Established Patterns
- Trigger.dev tasks: `task({ id: 'kebab-case', maxDuration: 300, run: async (payload) => {} })`
- Gemini calls: `genai.models.generateContent()` with `responseMimeType: 'application/json'` and `responseJsonSchema`
- Apify calls: `client.actor(ACTOR_ID).call(input)` → `client.dataset(run.defaultDatasetId).listItems()` → filter fields
- DB pattern: snake_case → camelCase mappers, Supabase client via `createServerClient()`
- Error messages in PT-BR with descriptive context

### Integration Points
- `src/app/api/analyze/route.ts` triggers `analyzeMarket` task — already wired
- Orchestrator needs new API endpoint for competitor confirmation (POST /api/analyze/[id]/confirm-competitors)
- Sub-tasks will be new files in `src/trigger/` (extract-website.ts, extract-social.ts, etc.)
- Frontend needs SSE/Realtime subscription at `/analysis/[id]` page (Phase 9 builds full UI, but data flow starts here)

</code_context>

<specifics>
## Specific Ideas

- Discovery should cast a wide net (15-20 results) then use AI to narrow down — quality over quantity
- The blocklist is strict: if domain contains any blocklisted string, immediate discard before AI scoring
- Confirmation step is critical: user must see AND approve competitors before any extraction credits are spent (Apify free tier is limited)
- The orchestrator is the backbone — Phases 4, 5, 6 plug their extraction tasks into the fan-out pattern established here
- Sub-task stubs only in this phase — actual extraction logic is Phases 4-6

</specifics>

<deferred>
## Deferred Ideas

None — analysis stayed within phase scope

</deferred>

---

*Phase: 03-competitor-discovery-orchestration*
*Context gathered: 2026-03-27*
