# Phase 2: Input & AI Understanding - Context

**Gathered:** 2026-03-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Homepage with a prominent text input where users describe their niche in free text. The AI interprets the input (niche, segment, region) within 5 seconds. User sees a confirmation showing what the AI understood and can adjust before starting the analysis. Clicking "start" creates a database record, triggers the background job via Trigger.dev, and redirects to the analysis page. API routes complete within 10 seconds (Vercel limit). Competitor discovery and extraction are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Input Experience
- **D-01:** Single prominent textarea on the homepage — no structured form, matches "input simples" from PRD
- **D-02:** Placeholder text with example niche (e.g., "Ex: e-commerce de suplementos esportivos no Brasil")
- **D-03:** Submit via button click with "Analisar" CTA — not auto-submit
- **D-04:** Mode selection (Modo Rapido / Modo Completo) as toggle or radio below the input, Modo Rapido selected by default
- **D-05:** URL input field for user's business appears only when Modo Completo is selected (progressive disclosure)

### Input Classification & Branching
- **D-19:** Before calling Gemini, classify input into one of 5 categories with client-side or lightweight server-side logic:
  1. **MINIMAL** ("suplementos", "roupas", "dentista") — single word or very short with insufficient context
  2. **MEDIUM** ("loja de suplementos esportivos em Campinas") — expected happy path with niche + context
  3. **URL** ("www.lojadowhey.com.br" or "instagram.com/lojadowhey") — detected URL pattern
  4. **EXCESSIVE** (long paragraph with competitors, audience, goals) — rich multi-sentence input
  5. **NONSENSE** ("asdfgh", "quero ganhar dinheiro", empty) — invalid or off-topic input
- **D-20:** MINIMAL inputs: AI detects insufficient context and returns follow-up questions ("Que tipo de negocio? Qual regiao?"). UI shows follow-up fields for user to provide more detail before proceeding
- **D-21:** MEDIUM inputs: Happy path — AI interprets directly, shows confirmation card with editable niche/segment/region
- **D-22:** URL inputs: Detect URL pattern, scrape the site/profile FIRST (via Apify or fetch), extract niche automatically, then show confirmation with pre-filled fields from scraped data
- **D-23:** EXCESSIVE inputs: Extract everything possible, use as rich context. Show a rich summary in confirmation. This is the best scenario — more data equals better output
- **D-24:** NONSENSE inputs: Validate BEFORE sending to Gemini (save API tokens). Show friendly PT-BR error message asking to rephrase (e.g., "Nao consegui entender. Descreva o nicho do seu negocio com mais detalhes.")
- **D-25:** The understandNiche() function needs branching logic based on input classification BEFORE calling Gemini
- **D-26:** UI confirmation flow adapts based on detected scenario — minimal inputs show more follow-up fields, URL inputs show scraped data preview, excessive inputs show a rich summary

### Confirmation Flow
- **D-06:** After AI interpretation, show confirmation inline below the input on the same page — no modal, no separate page
- **D-07:** Confirmation displays a card with editable fields for niche, segment, and region individually (satisfies INPT-04 adjustment requirement)
- **D-08:** Confirmation message pattern: "Entendi: [niche] no segmento [segment] em [region]. Correto?" with edit capability
- **D-09:** Two actions on confirmation: "Corrigir" (returns to editable fields) and "Iniciar Analise" (proceeds)
- **D-10:** After user confirms and clicks "Iniciar Analise", system creates DB record, triggers Trigger.dev job, and redirects to /analysis/[id]

### API Route Design
- **D-11:** Two separate endpoints — POST /api/analyze/understand (classification + Gemini interpretation) and POST /api/analyze (create record + trigger job)
- **D-12:** POST /api/analyze/understand receives { nicheInput: string }, classifies input first, then either: returns follow-up questions (MINIMAL), calls understandNiche() (MEDIUM/EXCESSIVE), triggers URL scraping (URL), or returns error (NONSENSE)
- **D-13:** POST /api/analyze receives { nicheInput, nicheInterpreted, mode, userBusinessUrl? }, creates analysis record, triggers Trigger.dev job, returns { analysisId, redirectUrl }
- **D-14:** Both endpoints use Zod validation on request body
- **D-15:** Error responses in PT-BR with descriptive messages (e.g., "Nao foi possivel interpretar o nicho. Tente descrever de outra forma.")

### Loading & Error States
- **D-16:** Show inline loading spinner/skeleton during AI interpretation (< 5s expected)
- **D-17:** Error messages displayed inline below the input — not toast, not alert
- **D-18:** If AI interpretation fails, user can retry without reloading the page

### UX Guidance (Input Assistance)
- **D-27:** Smart rotating placeholder that cycles through examples every 3-4 seconds with fade animation:
  - "e.g. loja de suplementos esportivos em Campinas"
  - "e.g. clinica de estetica no Rio de Janeiro"
  - "e.g. www.minhalojaonline.com.br"
  - "e.g. e-commerce de roupas femininas plus size"
- **D-28:** Helper chips below the input — clickable quick-start examples:
  - "Local business" → pre-fills template for local business
  - "E-commerce" → pre-fills template for online store
  - "I have a URL" → switches input to URL mode
- **D-29:** Inline tips that appear AS the user types (guide without blocking):
  - User types 1-2 words → subtle hint: "Adicione sua regiao e tipo de negocio para melhores resultados"
  - User pastes URL → hint: "Vamos analisar seu site primeiro"
  - User types long paragraph → hint: "Quanto mais detalhes, melhor nossa analise"
- **D-30:** First-time dismissible banner at top (uses localStorage, shows only once):
  "Descreva seu negocio ou nicho e a LupAI vai encontrar seus concorrentes, analisar o mercado e entregar recomendacoes acionaveis."
- **D-31:** UX philosophy: GUIDE without BLOCKING — no popups, no modals, no forced tutorials. The UI teaches by example.

### Claude's Discretion
- Loading animation style (spinner vs skeleton vs dots)
- Exact card styling for the confirmation display
- How the mode toggle looks (radio buttons vs segmented control vs tabs)
- Transition/animation between input and confirmation states
- Exact visual styling of helper chips and inline tips

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product Definition
- `PRD-LUPAI.md` — Full product requirements, user flows (Section: Fluxo do Usuario), input field behavior
- `.planning/PROJECT.md` — Project context, constraints (Vercel 10s timeout, < 5s AI response)
- `CLAUDE.md` — Stack versions, folder structure (src/app/api/analyze/), coding conventions

### Requirements
- `.planning/REQUIREMENTS.md` — INPT-01 through INPT-04 and ORCH-03 define Phase 2 scope

### Research (from Phase 1)
- `.planning/research/STACK.md` — Validated @google/genai usage, Trigger.dev v4 patterns
- `.planning/research/ARCHITECTURE.md` — API route patterns, Trigger.dev integration flow
- `.planning/research/PITFALLS.md` — Gemini rate limits, Vercel timeout constraints

### Existing Implementation
- `src/lib/ai/understand.ts` — understandNiche() function already implemented (Gemini 2.0 Flash, JSON output)
- `src/lib/ai/prompts.ts` — UNDERSTAND_NICHE_PROMPT already defined
- `src/types/analysis.ts` — NicheInterpreted, AnalysisInput, Analysis types
- `src/lib/supabase/queries.ts` — createAnalysis(), updateAnalysis() DB operations

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/ai/understand.ts`: understandNiche() — core AI interpretation function, ready to use in API route
- `src/lib/ai/prompts.ts`: UNDERSTAND_NICHE_PROMPT — prompt template for niche interpretation
- `src/lib/supabase/queries.ts`: createAnalysis(), updateAnalysis() — DB operations for analysis records
- `src/types/analysis.ts`: NicheInterpreted, AnalysisInput, Analysis, AnalysisMode — all domain types
- `src/trigger/example.ts`: Trigger.dev task pattern (task() with id and run function)
- `src/app/globals.css`: Tailwind v4 theme with brand color (#6366f1) and Inter font

### Established Patterns
- Service clients use `process.env` directly (not Zod config imports) — per Phase 1 D-19
- Gemini client uses `responseMimeType: 'application/json'` for structured output
- DB queries use snake_case → camelCase mappers (mapAnalysisRow pattern)
- Arrow function components: `const Component = () => {}`
- PT-BR for all user-facing text and error messages

### Integration Points
- Homepage `src/app/page.tsx` needs full rebuild (currently placeholder)
- API routes: `src/app/api/analyze/understand/route.ts` and `src/app/api/analyze/route.ts` (new)
- Trigger.dev: Need actual orchestrator task replacing example.ts (but full orchestrator is Phase 3)
- Navigation: After confirmation, redirect to `/analysis/[id]/page.tsx` (page shell created here, full UI in Phase 9)

</code_context>

<specifics>
## Specific Ideas

- Confirmation message should follow the PRD example: "Entendi: e-commerce de suplementos esportivos no Brasil. Correto?"
- The input should feel inviting and simple — one clear action on the page
- Modo Completo URL field uses progressive disclosure (only appears when mode is selected)
- The /analysis/[id] page created in this phase is a shell (shows "Analise em andamento..." or minimal status) — the full dashboard is Phase 9
- Input classification must happen BEFORE Gemini call to save API tokens on nonsense/minimal inputs
- URL inputs trigger a scrape-first flow — this is a premium path that pre-fills fields from real data
- Excessive input is the BEST scenario — treat it as rich context, extract everything possible

</specifics>

<deferred>
## Deferred Ideas

None — analysis stayed within phase scope

</deferred>

---

*Phase: 02-input-ai-understanding*
*Context gathered: 2026-03-27*
