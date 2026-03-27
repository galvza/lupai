# Phase 1: Foundation & Project Setup - Context

**Gathered:** 2026-03-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Scaffold the Next.js project, create the Supabase database schema, configure all external service clients (Apify, Gemini, AssemblyAI, Bunny, Trigger.dev), define TypeScript types for all domain entities, create fixture/mock infrastructure for development, and set up environment configuration. No feature logic — only infrastructure that subsequent phases depend on.

</domain>

<decisions>
## Implementation Decisions

### Project Scaffolding
- **D-01:** Use `create-next-app` with TypeScript and App Router to scaffold the project, then manually configure Tailwind v4 (CSS-first config, no tailwind.config.js)
- **D-02:** Pin versions per research: Next.js 15.5.x, React 19.x, TypeScript 5.7.x, Tailwind 4.1.x, Zod 3.24.x (NOT v4 — Trigger.dev incompatibility)
- **D-03:** Use `@google/genai` v1.46+ (NOT the deprecated `@google/generative-ai`)
- **D-04:** Use Trigger.dev v4.3.x (NOT v3 — includes Realtime API with React hooks)
- **D-05:** Use ESLint 9 with flat config (`eslint.config.mjs`), Vitest 4.1.x for testing
- **D-06:** Follow the folder structure from CLAUDE.md exactly (src/app, src/components, src/lib, src/trigger, src/hooks, src/types, src/utils, src/config)

### Database Schema Design
- **D-07:** Root table `analyses` with fields: id (uuid), niche_input (text), niche_interpreted (jsonb — stores niche, segment, region), mode (enum: quick/complete), status (enum: pending/processing/completed/failed), user_business_url (nullable text), created_at, updated_at
- **D-08:** Table `competitors` with: id, analysis_id (FK), name, website_url, website_data (jsonb), seo_data (jsonb), social_data (jsonb), meta_ads_data (jsonb), google_ads_data (jsonb), gmb_data (jsonb), created_at
- **D-09:** Table `viral_content` with: id, analysis_id (FK), platform (enum: tiktok/instagram/facebook), source_url, bunny_url (nullable), transcription (nullable text), hook_body_cta (nullable jsonb), engagement_metrics (jsonb), created_at
- **D-10:** Table `synthesis` with: id, analysis_id (FK), strategic_overview (text), recommendations (jsonb array), creative_scripts (jsonb array), comparative_analysis (nullable jsonb — for Modo Completo), created_at
- **D-11:** Use JSONB columns for flexible data from different Apify actors — avoids rigid column design that would break when actor outputs change
- **D-12:** Create Supabase migration files in supabase/migrations/

### Service Client Patterns
- **D-13:** Each external service gets a thin wrapper in its own file under `src/lib/` following CLAUDE.md structure (lib/apify/, lib/ai/, lib/transcription/, lib/storage/, lib/supabase/)
- **D-14:** Service clients export typed async functions, not classes. Each function handles its own error cases with descriptive PT-BR error messages
- **D-15:** Apify client (`apify-client` v2.22.x) wraps each actor call with field filtering — only store relevant fields from actor output
- **D-16:** Gemini client uses `@google/genai` with `gemini-2.0-flash` model. Zod schemas for structured output validation
- **D-17:** Bunny Storage uses native `fetch()` (no SDK) — simple REST PUT/GET/DELETE per official API docs
- **D-18:** AssemblyAI SDK v4.23.x for transcription, Trigger.dev SDK v4.3.x for background jobs
- **D-19:** Environment variables in `src/config/` files per service, with `.env.example` containing all required vars

### Fixture/Mock Strategy
- **D-20:** JSON fixture files in `tests/fixtures/` directory, one file per Apify actor output type (instagram.json, tiktok.json, facebook-ads.json, similarweb.json, google-ads.json, website.json)
- **D-21:** Factory functions in `tests/fixtures/factories.ts` that create typed test data with sensible defaults and overrides
- **D-22:** Fixtures must match the filtered output format (what gets stored in DB), not raw Apify actor output
- **D-23:** Include fixture for Gemini AI responses (understanding, synthesis, creative scripts)
- **D-24:** Include fixture for AssemblyAI transcription response

### Claude's Discretion
- Exact Supabase RLS policies (if any — no auth means minimal RLS needed)
- Index selection for tables (performance optimization)
- Specific Tailwind v4 CSS setup details
- Trigger.dev configuration specifics (trigger.config.ts)
- Test setup configuration (vitest.config.ts)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Definition
- `PRD-LUPAI.md` — Full product requirements, user flows, business rules, integrations
- `.planning/PROJECT.md` — Project context, core value, constraints, key decisions
- `CLAUDE.md` — Stack versions, folder structure, coding conventions, dependency list

### Research
- `.planning/research/STACK.md` — Validated stack with correct versions, compatibility matrix, critical warnings
- `.planning/research/ARCHITECTURE.md` — System structure, data flow, build order, Trigger.dev patterns
- `.planning/research/PITFALLS.md` — Critical pitfalls: Apify credits, Gemini rate limits, Vercel timeouts

### Requirements
- `.planning/REQUIREMENTS.md` — FOUND-01 through FOUND-06 define Phase 1 scope

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — greenfield project, no existing code

### Established Patterns
- None — this phase establishes the patterns all subsequent phases will follow

### Integration Points
- This phase creates the foundation that ALL other phases depend on
- Database schema must support the full data model from Phase 2 through Phase 10
- Service clients must be importable by Trigger.dev jobs (Phase 3+) and API routes (Phase 2+)
- Types must cover the full domain model used throughout the app

</code_context>

<specifics>
## Specific Ideas

- Stack corrections from research: use `@google/genai` not `@google/generative-ai`, Trigger.dev v4 not v3, Tailwind v4 not v3, pin Zod to 3.24.x
- Apify free tier is only $5/month — fixture infrastructure is critical to avoid burning credits during development
- Vercel has 10-second timeout — all processing must happen in Trigger.dev tasks, API routes are thin dispatchers only
- Use `@trigger.dev/react-hooks` for real-time progress (eliminates custom polling infrastructure)

</specifics>

<deferred>
## Deferred Ideas

None — analysis stayed within phase scope

</deferred>

---

*Phase: 01-foundation-project-setup*
*Context gathered: 2026-03-27*
