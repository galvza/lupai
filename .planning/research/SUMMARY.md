# Project Research Summary

**Project:** LupAI - Marketing Intelligence Platform
**Domain:** Marketing Intelligence & Competitive Analysis (AI-powered, niche-based)
**Researched:** 2026-03-27
**Confidence:** HIGH

## Executive Summary

LupAI is a marketing intelligence platform that takes a simple text input (niche description or business URL), discovers competitors, scrapes multi-source data (websites, social media, ads), finds viral content, transcribes videos, and delivers AI-generated strategic recommendations with creative scripts. Experts build this type of product as an **async pipeline orchestrated by background jobs**, not as a synchronous web app. The architecture is a fan-out/fan-in pattern: one orchestrator task triggers parallel scraping sub-tasks across 7+ data sources, collects results, then feeds everything into an AI synthesis layer. The presentation layer is a real-time dashboard that progressively renders as data arrives. This is a well-understood pattern with strong tooling support in 2026.

The recommended approach uses **Next.js 15.5 + Trigger.dev v4 + Supabase + Gemini 2.0-flash + Apify**, with critical version corrections from what CLAUDE.md specifies. The most important corrections: use `@google/genai` (not the deprecated `@google/generative-ai`), Trigger.dev v4 (not v3), Tailwind v4 (not v3), and pin Zod to v3.24 (Trigger.dev v4 breaks with Zod v4). Trigger.dev v4's Realtime API with React hooks eliminates the need for custom polling infrastructure, which is a major simplification. The media pipeline flows Apify -> Bunny Storage -> AssemblyAI, keeping video URLs stable and transcription decoupled from scraping.

The primary risks are **Apify credit exhaustion** ($5/month free tier vs 7+ actor runs per analysis), **Gemini rate limits** (reduced 50-80% since December 2025), and **Vercel's 10-second timeout** killing any API route that does real work. Mitigation is straightforward: implement test fixtures from day one to avoid burning Apify credits during development, move ALL heavy processing into Trigger.dev tasks (API routes are thin dispatchers only), add exponential backoff on Gemini calls, and implement the 24h niche cache immediately. The biggest product risk is generic AI recommendations -- prompt engineering must inject actual scraped data with few-shot examples, not vague instructions.

## Key Findings

### Recommended Stack

The CLAUDE.md stack has 5+ outdated entries that must be corrected before development. The Gemini SDK package name has changed entirely (`@google/generative-ai` is deprecated, replaced by `@google/genai`). Trigger.dev jumped from v3 to v4 with a completely different API surface including Realtime hooks. Next.js 15.5 is the sweet spot -- v14 is two majors behind and v16 is too fresh (4 days old) for a deadline project.

**Core technologies:**
- **Next.js 15.5:** Full-stack framework with App Router, React 19, Turbopack dev -- stable and ecosystem-compatible
- **Trigger.dev v4.3:** Background job orchestration with fan-out/fan-in, Realtime API with React hooks, no custom WebSocket needed
- **@google/genai v1.46:** New official Gemini SDK replacing the deprecated package -- supports Gemini 2.0-flash and structured output
- **Supabase JS v2.100:** PostgreSQL client for persistence -- mature, no v3 yet, works with Server Components
- **Tailwind CSS v4.1:** Rust engine, CSS-first config, 2-5x faster builds -- standard for new projects in 2026
- **Zod v3.24 (PINNED):** Schema validation -- must stay on v3 due to Trigger.dev v4 incompatibility with Zod v4 (Issue #2805)
- **Apify Client v2.22:** Scraping orchestration via actors -- stable, auto-retry built in
- **AssemblyAI v4.23:** Video/audio transcription -- async model fits Trigger.dev pattern
- **Bunny CDN:** Media storage via REST API (native fetch, no SDK needed)

**Critical version pin:**
```json
{ "overrides": { "zod": "3.24.4" } }
```

### Expected Features

The MVP scope is ambitious but achievable for a 3-day demo. The product's unique value is combining capabilities that currently require 3-4 separate paid tools (SimilarWeb + Virlo + HookLens + scriptwriting).

**Must have (table stakes):**
- Simple text input with zero friction (Gemini interprets free text)
- Automatic competitor discovery (3-4 competitors via AI + Apify)
- Competitor website, social media, and presence analysis
- Viral content discovery across TikTok and Instagram
- Real-time progress during the 1-3 minute cascade
- AI-generated strategic recommendations (specific, not generic)
- Results dashboard with organized, scannable sections
- Search history for past analyses
- Mobile-responsive layout

**Should have (differentiators):**
- Video transcription + Hook/Body/CTA structural breakdown
- AI-generated creative scripts (roteiros) based on viral patterns
- Meta Ads Library analysis (active competitor ad intelligence)
- Google Ads presence detection
- "Modo Completo" with comparative analysis against user's business
- 24h niche cache for instant repeat queries
- Independent cascade with graceful degradation

**Defer (v2+):**
- Continuous monitoring / scheduled re-analysis
- User authentication and accounts
- Historical trend tracking
- Multi-language support
- CRM integrations
- Video generation from scripts

### Architecture Approach

The architecture follows a four-layer model: Presentation (Next.js App Router pages), API (thin Route Handlers that validate and dispatch), Orchestration (Trigger.dev fan-out/fan-in tasks), and Data (Supabase + Bunny Storage). The key insight is that API routes must be thin dispatchers -- all work beyond input validation and database reads happens in Trigger.dev. Progress updates flow via Trigger.dev Realtime API (built on Electric SQL) to React hooks on the frontend, with Supabase as the persistent fallback.

**Major components:**
1. **Homepage (Input)** -- Accepts niche text, validates, creates analysis record, triggers orchestrator
2. **Orchestrator Task (analyze-market)** -- Fan-out to parallel extraction sub-tasks, fan-in results, trigger synthesis
3. **Extraction Sub-tasks** -- Independent Trigger.dev tasks per data source (competitors, viral, transcription)
4. **AI Layer (lib/ai/)** -- Gemini integration for understanding, synthesis, creative modeling with structured output
5. **Service Wrappers (lib/)** -- Thin wrappers per external service (Apify actors, Bunny, AssemblyAI) with validation
6. **Dashboard** -- Real-time results display with progressive rendering via `useRealtimeRun`
7. **Data Layer** -- 4 Supabase tables (analyses, competitors, viral_content, synthesis) + Bunny media storage

**Key patterns to follow:**
- `batch.triggerByTaskAndWait()` for parallel sub-tasks (NOT Promise.all with triggerAndWait)
- Zod validation on every external service response (Apify outputs, Gemini responses)
- Field filtering in Apify wrappers before database storage (never store raw output)
- Multiple focused Gemini calls instead of one monolithic prompt
- Cache-first with normalized niche name as key, 24h TTL

### Critical Pitfalls

1. **Apify free tier credits ($5/month) exhaust before demo** -- Capture real actor outputs as fixtures on first run; use mocks for all subsequent development. Reserve $2-3 for demo day. Implement 24h cache from day one.

2. **Vercel 10-second timeout kills API routes** -- Move ALL heavy processing (including Gemini understanding) into Trigger.dev. API routes only do: validate, create DB record, trigger task, return ID. Set `maxDuration = 10` explicitly.

3. **Gemini rate limits block pipeline (50-80% reduction since Dec 2025)** -- Implement exponential backoff with jitter on all Gemini calls. Batch synthesis into fewer, focused calls. Cache AI outputs alongside scraping data.

4. **Scrapers return empty data silently** -- Every Apify wrapper must validate `items.length > 0` and check key fields. Dashboard must show graceful degradation ("Dados insuficientes") not blank sections.

5. **Generic AI recommendations destroy product value** -- Structure prompts with explicit data injection and few-shot examples. Break synthesis into focused sub-prompts. Never ask for advice without including the actual scraped numbers.

6. **Video transcription pipeline has 4 sequential failure points** -- Make transcription optional (analysis is valuable without it). Download immediately after Apify returns URLs. Verify Bunny CDN URL accessibility before sending to AssemblyAI. Limit to 3 videos per analysis.

7. **Gemini structured output breaks between model versions** -- Pin model version explicitly (e.g., `gemini-2.0-flash-001`). Validate every response with Zod. Have regex-based JSON extraction fallback.

## Implications for Roadmap

Based on combined research, the build follows a strict dependency chain across 6 phases. The architecture research provides the clearest ordering signal: each phase can only function if the previous phase's components exist.

### Phase 1: Foundation & Project Setup
**Rationale:** Everything depends on types, database schema, configuration, and the async processing pattern. Establishing that API routes are thin dispatchers (not processors) prevents the Vercel timeout pitfall from the start.
**Delivers:** Working Next.js 15.5 project with Supabase schema, typed config layer, Trigger.dev setup, test fixture infrastructure, base UI components.
**Addresses:** Project setup, type definitions, database migrations, config validation, mock/fixture infrastructure.
**Avoids:** Apify credit exhaustion (fixtures first), Vercel timeout (thin route pattern established).

### Phase 2: AI Understanding & Input Flow
**Rationale:** This is the entry point -- nothing else triggers without it. The AI understanding layer must work before any extraction can begin, since competitor discovery depends on Gemini interpreting the user's input.
**Delivers:** Homepage with input form, Gemini understanding integration, POST /api/analyze route that creates a record and triggers the orchestrator, redirect to dashboard.
**Addresses:** Simple text input, AI understanding layer, niche cache check.
**Avoids:** Generic AI output (understanding prompt must be specific), Vercel timeout (Gemini call in Trigger.dev, not route handler).

### Phase 3: Orchestration & Data Extraction
**Rationale:** The core pipeline -- fan-out to parallel scraping tasks, download media, store results. This is the most complex phase with the most external dependencies. Building incrementally (one actor wrapper at a time) reduces risk.
**Delivers:** Full extraction cascade -- competitor website/social/ads analysis, viral content discovery, media download to Bunny, real-time progress on dashboard.
**Addresses:** Competitor discovery, website analysis, social media analysis, viral content discovery, real-time progress, independent cascade, media pipeline.
**Avoids:** Empty scraper results (validation in every wrapper), credit exhaustion (maxItems limits, fixtures for testing).

### Phase 4: Transcription & AI Synthesis
**Rationale:** Depends on extracted data existing in Supabase and media in Bunny. The synthesis is where product value is created -- this phase needs the most prompt engineering attention.
**Delivers:** Video transcription, Hook/Body/CTA breakdown, AI synthesis with specific recommendations, creative script generation.
**Addresses:** Video transcription, Hook/Body/CTA analysis, AI recommendations, creative scripts (roteiros).
**Avoids:** Generic recommendations (few-shot prompts with real data), monolithic prompt (break into focused sub-calls), transcription pipeline failures (optional transcription, max 3 videos).

### Phase 5: Dashboard & Results Display
**Rationale:** Presentation layer needs all data to exist in the database. Building the dashboard after the pipeline ensures real data shapes the UI, not assumptions.
**Delivers:** Full results dashboard with all sections (overview, competitors, social, viral, recommendations, scripts), graceful degradation for partial data, responsive layout.
**Addresses:** Results dashboard, mobile responsiveness, data visualization, empty states, comparisons with context.
**Avoids:** Dashboard crashes on missing data (empty state designs), raw numbers without context (always show comparisons).

### Phase 6: Polish, History & Export
**Rationale:** These are enhancements to a working product. History and PDF export depend on the dashboard and data being stable. Cache logic and error handling get refined.
**Delivers:** Search history page, PDF report export, refined cache logic, error states, loading skeletons, final responsive polish.
**Addresses:** Search history, PDF export, niche cache refinement, edge cases, UX polish.
**Avoids:** PDF layout issues (test with varying data lengths), polling overload (Trigger.dev Realtime primary, polling fallback only).

### Phase Ordering Rationale

- **Dependency chain is strict:** Types and DB schema (Phase 1) -> AI understanding (Phase 2) -> Extraction pipeline (Phase 3) -> Synthesis (Phase 4) -> Dashboard (Phase 5) -> Polish (Phase 6). Each phase produces outputs consumed by the next.
- **Risk mitigation is front-loaded:** The two biggest technical risks (Vercel timeout pattern, Apify credit management) are addressed in Phase 1 before any integration code is written.
- **Incremental value delivery:** Phase 2 already produces a working flow (input -> understanding -> stub results). Phase 3 adds real data. Phase 4 adds intelligence. Phase 5 makes it presentable.
- **The hardest technical work (Phase 3) comes before the hardest product work (Phase 4).** This ensures real scraped data is available when prompt engineering begins, preventing the generic-recommendations pitfall.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 3 (Orchestration & Extraction):** Most complex phase with 7+ Apify actor integrations, each with different input/output schemas. Needs per-actor API research. Trigger.dev v4 batch patterns need careful implementation (the Promise.all anti-pattern is easy to fall into).
- **Phase 4 (Transcription & Synthesis):** Prompt engineering is iterative and requires real data. Gemini structured output has known bugs between model versions. AssemblyAI integration needs end-to-end pipeline testing.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Foundation):** Well-documented Next.js 15 + Supabase + Tailwind v4 setup. No novel patterns.
- **Phase 2 (AI Understanding):** Standard Gemini API call with structured output. One prompt, one response.
- **Phase 5 (Dashboard):** Standard React component composition with Tailwind. Real-time via documented Trigger.dev hooks.
- **Phase 6 (Polish):** Standard CRUD (history), jsPDF (documented), responsive design.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All versions verified against npm registry and official docs. Compatibility matrix validated. Zod/Trigger.dev incompatibility confirmed via GitHub issue. |
| Features | MEDIUM-HIGH | Feature landscape mapped against 6+ competitors. MVP scope is clear. Uncertainty: actual Apify actor output quality for niche-specific queries varies. |
| Architecture | HIGH | Fan-out/fan-in pattern is well-documented by Trigger.dev. Database schema is straightforward. Media pipeline has clear sequential flow. |
| Pitfalls | HIGH | All pitfalls verified against official documentation, GitHub issues, and community reports. Rate limit numbers confirmed against current API docs. |

**Overall confidence:** HIGH

### Gaps to Address

- **Apify actor selection per platform:** Research identified the general pattern, but specific actor IDs for each platform (Instagram, TikTok, SimilarWeb, etc.) need validation during Phase 3 planning. Some actors on the Apify Store are deprecated or have been replaced.
- **Gemini model availability on free tier:** The exact RPM/RPD for `gemini-2.0-flash` vs `gemini-2.5-flash-lite` on the current free tier needs verification at implementation time. Google changes these frequently.
- **Trigger.dev v4 migration from CLAUDE.md v3 references:** CLAUDE.md code examples reference v3 patterns (e.g., `client.defineJob()`). All Trigger.dev code must use v4's `task()` pattern. The import path changed from `@trigger.dev/sdk` to `@trigger.dev/sdk/v3` (confusingly named but correct for v4 SDK).
- **Bunny Storage zone setup:** The CDN pull zone and storage zone must be configured correctly. The storage zone password (not account API key) is needed for uploads. This is a setup task, not a code task.
- **PDF export complexity:** jsPDF is approved but may struggle with complex dashboard layouts. If the report needs charts or complex formatting, `@react-pdf/renderer` may be needed. Defer this decision until Phase 6.

## Sources

### Primary (HIGH confidence)
- [Next.js 16 blog post](https://nextjs.org/blog/next-16) -- Confirmed v16 latest, v15.5 stable
- [Trigger.dev docs: How it Works, Triggering, Realtime, Batch](https://trigger.dev/docs) -- v4 patterns, fan-out/fan-in, React hooks
- [Trigger.dev Zod v4 Issue #2805](https://github.com/triggerdotdev/trigger.dev/issues/2805) -- Confirmed incompatibility
- [@google/genai npm](https://www.npmjs.com/package/@google/genai) -- v1.46, confirmed as replacement SDK
- [Gemini API rate limits](https://ai.google.dev/gemini-api/docs/rate-limits) -- Official RPM/RPD documentation
- [Vercel function timeouts](https://vercel.com/kb/guide/what-can-i-do-about-vercel-serverless-functions-timing-out) -- 10s Hobby plan limit
- [Apify free tier pricing](https://use-apify.com/docs/what-is-apify/apify-free-plan) -- $5/month credit details
- [Bunny Storage API](https://docs.bunny.net/reference/storage-api) -- REST upload/download/delete
- [AssemblyAI transcription docs](https://www.assemblyai.com/docs/api-reference/transcripts/submit) -- URL-based async transcription

### Secondary (MEDIUM confidence)
- [Competely](https://competely.ai/), [Virlo](https://virlo.ai/), [HookLens](https://www.hooklens.net/) -- Competitor feature analysis
- [Gemini structured output issues](https://github.com/googleapis/python-genai/issues/706) -- JSON mode inconsistencies
- [Apify web scraping challenges 2025](https://blog.apify.com/web-scraping-challenges/) -- Anti-bot patterns
- [Gemini free tier reductions](https://www.aifreeapi.com/en/posts/gemini-api-free-tier-rate-limits) -- December 2025 quota changes

### Tertiary (LOW confidence)
- Exact CU cost per Apify actor run -- varies by actor, memory, and runtime. Needs real measurement.
- Gemini 2.0-flash vs 2.5-flash-lite free tier limits -- Google changes these without announcement. Verify at implementation.

---
*Research completed: 2026-03-27*
*Ready for roadmap: yes*
