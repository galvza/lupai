# Stack Research

**Domain:** Marketing Intelligence & Competitive Analysis Platform
**Researched:** 2026-03-27
**Confidence:** HIGH (most choices validated against current npm/official sources)

## Critical Findings vs. CLAUDE.md

The CLAUDE.md stack definition has **5 outdated entries** that need correction before development begins:

| CLAUDE.md Says | Reality (March 2026) | Impact |
|----------------|----------------------|--------|
| `@google/generative-ai` | **DEPRECATED** -- replaced by `@google/genai` | Will miss Gemini 2.0+ features, no active maintenance |
| Trigger.dev 3.x | Trigger.dev is now at **v4.3.x** (v3 is legacy) | v3 docs and APIs are outdated; v4 has Realtime hooks |
| Next.js 14.2+ | Next.js **15.5** is stable, **16.x** is latest | 14 is two major versions behind, missing React 19, Turbopack |
| Tailwind CSS 3.4+ | Tailwind **v4.1** is stable (Rust engine, CSS-first config) | v3 still works but v4 is recommended for new projects |
| Zod 3.x | Zod **v4.3.x** is stable | BUT: Trigger.dev has known Zod v4 compatibility bugs -- use Zod 3.24.x |
| Vitest 2.x | Vitest **v4.1** is current | v2 is two majors behind |
| ESLint 8.x | ESLint **9+** is standard; Next.js 15+ supports flat config | v8 is deprecated |
| TypeScript 5.5+ | TypeScript **6.0** released March 2026 | 5.x still works, but 6.0 is the current stable |

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|------------|
| Next.js | **15.5.x** (latest 15) | Full-stack framework with App Router | Stable, proven, React 19 support, Turbopack dev. Choosing 15 over 16 because: (1) 3-day deadline demands stability, (2) 16 has breaking changes in async Request APIs and removes `next lint`, (3) 15 has the most ecosystem compatibility. | HIGH |
| React | **19.x** | UI library | Required by Next.js 15. Includes Server Components, Actions, use() hook. | HIGH |
| TypeScript | **5.7.x** | Type safety | Use 5.7 (not 6.0). TS 6.0 just released 4 days ago -- too fresh for a deadline project. 5.7 is battle-tested and fully compatible with all dependencies. | HIGH |
| Supabase JS | **2.100.x** (`@supabase/supabase-js`) | PostgreSQL client, auth-less DB access | v2 is mature and stable. No v3 yet. Works well with Next.js Server Components and Route Handlers. Note: dropped Node 18 support in 2.79+, requires Node 20+. | HIGH |
| Tailwind CSS | **4.1.x** | Utility-first CSS | v4 is the standard for new projects in 2026. Rust engine = 2-5x faster builds, 70% smaller CSS output, CSS-first config eliminates tailwind.config.js. Browser support (Chrome 111+, Safari 16.4+, Firefox 128+) matches project requirements. | HIGH |
| Trigger.dev SDK | **4.3.x** (`@trigger.dev/sdk`) | Background jobs, async cascading | v4 is current stable. Includes Realtime API built on Electric SQL for live progress updates -- eliminates need for custom polling. Has React hooks for subscribing to runs from the frontend. | HIGH |
| `@google/genai` | **1.46.x** | Gemini AI API (understanding, synthesis, creative) | This is the **new official SDK** replacing the deprecated `@google/generative-ai`. Supports Gemini 2.0-flash and newer models. Active development (published 9 days ago). | HIGH |
| `apify-client` | **2.22.x** | Scraping orchestration via Apify actors | Stable, auto-retry on 429/500+, works in Node.js and browser. No breaking changes expected. | HIGH |
| `assemblyai` | **4.23.x** | Video/audio transcription | SDK v2+ rewrite in TypeScript. Supports file upload from URL (Bunny CDN URLs) and local files. Async transcription fits the Trigger.dev job pattern. | HIGH |
| Bunny CDN + Storage | **REST API** (no SDK needed) | Media hosting, video storage for transcription | Use native `fetch()` -- Bunny's API is simple REST (PUT upload, GET download, DELETE). Third-party SDKs exist but are unnecessary overhead. Node 20's native fetch is sufficient. | HIGH |

### Supporting Libraries

| Library | Version | Purpose | When to Use | Confidence |
|---------|---------|---------|-------------|------------|
| `zod` | **3.24.x** (NOT v4) | Schema validation for API inputs, Apify outputs, AI responses | Always. Pin to v3 because Trigger.dev v4 has a known bug with `zod-validation-error` that breaks when Zod v4 is installed. Issue #2805 on triggerdotdev/trigger.dev. Upgrade to Zod v4 only after Trigger.dev resolves this. | HIGH |
| `@trigger.dev/react-hooks` | **4.3.x** | Realtime run subscriptions in React | For the analysis dashboard progress UI. `useRealtimeRun` subscribes to job progress without polling. Eliminates need for custom SSE/polling code. | HIGH |
| `recharts` | **3.8.x** | Data visualization charts | For the analysis dashboard -- competitor comparisons, engagement metrics, trend charts. Declarative React components, SVG-based. | HIGH |
| `lucide-react` | **1.7.x** | Icon library | Throughout the UI. Consistent, tree-shakeable, TypeScript-native. | HIGH |
| `jspdf` | **2.x** | PDF report generation | For the export/report feature. Use over `@react-pdf/renderer` because: (1) works server-side in Route Handlers without React rendering overhead, (2) lighter weight for the simple report format needed, (3) already in approved deps list. | MEDIUM |
| `@react-pdf/renderer` | **4.3.x** | PDF generation (alternative) | Consider IF reports need complex React-component-based layouts. Heavier but more declarative for complex designs. Only use if jspdf proves insufficient for the report format. | MEDIUM |

### Development Tools

| Tool | Version | Purpose | Notes | Confidence |
|------|---------|---------|-------|------------|
| Vitest | **4.1.x** | Unit/integration testing | Current major. Faster than v2, stable Browser Mode. Note: async Server Components cannot be unit-tested with Vitest -- use E2E for those. | HIGH |
| `@testing-library/react` | **16.3.x** | Component testing | Compatible with React 19. Requires `@testing-library/dom` as explicit peer dep. | HIGH |
| ESLint | **9.x** | Linting | Next.js 15 supports ESLint 9 flat config. Use `eslint.config.mjs` instead of `.eslintrc`. Note: `eslint-config-next` works with ESLint 9 on Next.js 15. | HIGH |
| `eslint-config-next` | **15.x** | Next.js-specific lint rules | Must match Next.js major version. | HIGH |
| `@types/react` | **19.x** | React type definitions | Must match React 19. | HIGH |
| `@types/node` | **20.x** | Node.js type definitions | Matches Node 20 LTS runtime. | HIGH |

## Installation

```bash
# Core framework
npm install next@15 react@19 react-dom@19

# Database and backend services
npm install @supabase/supabase-js@2

# AI and processing
npm install @google/genai assemblyai@4

# Scraping
npm install apify-client@2

# Background jobs + realtime
npm install @trigger.dev/sdk@4 @trigger.dev/react-hooks@4

# UI
npm install tailwindcss@4 @tailwindcss/postcss lucide-react recharts@3

# Validation and utilities
npm install zod@3

# PDF
npm install jspdf@2

# Dev dependencies
npm install -D vitest@4 @testing-library/react@16 @testing-library/dom
npm install -D eslint@9 eslint-config-next@15
npm install -D typescript@5.7 @types/react@19 @types/node@20
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Next.js 15 | Next.js 16 | After deadline, when Turbopack builds are needed in production and ecosystem has stabilized around v16's breaking changes. |
| Next.js 15 | Next.js 14 | Never for a new project. v14 misses React 19, Turbopack stable, and many DX improvements. |
| `@google/genai` | `@google/generative-ai` | Never. The old package is deprecated and stopped receiving updates ~1 year ago. |
| `@google/genai` | Vercel AI SDK (`ai`) | If you need streaming UI components with built-in React hooks for chat-like interfaces. Not needed here -- LupAI does batch analysis, not conversational AI. |
| Zod 3.24 | Zod 4.3 | After Trigger.dev fixes the `zod-validation-error` dependency issue (Issue #2805). Zod v4 has a better API but the runtime error is a blocker. |
| Tailwind v4 | Tailwind v3.4 | Only if you need Safari < 16.4 or Chrome < 111 support. Not applicable for this project. |
| jspdf | `@react-pdf/renderer` | If reports require complex React-component-based layouts with precise positioning. jspdf is lighter for simple structured reports. |
| Vitest 4 | Jest 30 | Never for a Vite/Next.js project in 2026. Vitest is the standard, faster, and has native ESM support. |
| `assemblyai` SDK | Whisper (local) | Only if you need offline transcription or want to avoid per-minute costs. Whisper requires GPU/heavy compute that Vercel functions cannot provide. AssemblyAI's API-based approach fits the serverless architecture. |
| Bunny REST API | `bunny-client` npm | If you want TypeScript types for Bunny API responses. The REST API is simple enough that a thin wrapper (< 50 lines) is better than a third-party dependency. |
| Trigger.dev | BullMQ + Redis | If you need self-hosted job queues. Trigger.dev is superior here because: managed infrastructure, Realtime API, React hooks, no Redis to manage. |
| Recharts 3 | Chart.js/react-chartjs-2 | If you need canvas-based rendering for very large datasets. Recharts' SVG approach is better for the dashboard use case (fewer data points, cleaner interactivity). |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `@google/generative-ai` | Deprecated since late 2024. No Gemini 2.0+ support. Last published ~1 year ago. | `@google/genai` v1.46+ |
| Zod v4.x (for now) | Trigger.dev v4.3.x depends on `zod-validation-error@^1.5.0` which accesses Zod v3 internals that don't exist in v4. Causes runtime `TriggerApiError: Connection error` that masks the real issue. | Zod v3.24.x until Trigger.dev updates their dependency |
| Next.js 14 | Two major versions behind. Misses React 19, stable Turbopack, improved caching, many bug fixes. No reason to start new project on v14. | Next.js 15.5 |
| `tailwindcss-animate` (old version) | Incompatible with Tailwind v4. | Use CSS `@keyframes` directly or updated animation utilities in Tailwind v4 |
| ESLint 8 with `.eslintrc` | Deprecated config format. ESLint 9 flat config is the standard. Next.js 15+ supports it natively. | ESLint 9 with `eslint.config.mjs` |
| `node-fetch` | Unnecessary with Node.js 20 LTS which has native `fetch()`. Adds dependency bloat. | Native `fetch()` for Bunny API calls |
| Whisper (local/self-hosted) | Requires GPU compute, not feasible on Vercel serverless. Complex setup for a 3-day deadline. | AssemblyAI SDK (API-based, async) |
| Custom polling for job status | Trigger.dev v4 has built-in Realtime API with React hooks. Building custom SSE/polling is reinventing the wheel. | `@trigger.dev/react-hooks` with `useRealtimeRun` |

## Stack Patterns by Variant

**For the AI layer (understand, synthesize, creative):**
- Use `@google/genai` directly with `ai.models.generateContent()`
- Model: `gemini-2.0-flash` for speed + cost-efficiency on free tier
- Structured output: Use Zod schemas with Gemini's structured output mode for type-safe AI responses
- Run AI calls inside Trigger.dev tasks to avoid Vercel function timeout (10s hobby / 60s pro)

**For the scraping cascade:**
- Use `apify-client` to call actors asynchronously
- Each actor call should be a sub-task in the Trigger.dev job
- Independent failure: if Instagram actor fails, TikTok actor still runs
- Filter Apify output immediately -- store only relevant fields in Supabase

**For real-time progress:**
- Use `@trigger.dev/react-hooks` `useRealtimeRun` or `useRealtimeRunsWithTag`
- The Realtime API uses Electric SQL under the hood -- no SSE/WebSocket setup needed
- On the frontend: subscribe to the main orchestrator run to show cascading progress

**For media pipeline (Apify -> Bunny -> AssemblyAI):**
- Download media from Apify output URLs using `fetch()` in Trigger.dev tasks
- Upload to Bunny Storage via PUT request with `fetch()`
- Pass Bunny CDN URL to AssemblyAI for transcription
- Store transcription result in Supabase

**For PDF generation:**
- Run in a Next.js Route Handler (`/api/report/[id]/route.ts`)
- Fetch analysis data from Supabase, generate PDF with jspdf
- Return as streaming response with `Content-Type: application/pdf`

## Version Compatibility Matrix

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `next@15` | `react@19`, `react-dom@19` | Next.js 15 requires React 19 minimum |
| `next@15` | `tailwindcss@4` | Works via `@tailwindcss/postcss` plugin |
| `next@15` | `eslint@9` + `eslint-config-next@15` | Flat config supported from Next.js 15 |
| `@trigger.dev/sdk@4` | `zod@3.24.x` | **NOT compatible with Zod v4** due to `zod-validation-error` dependency |
| `@trigger.dev/react-hooks@4` | `react@19` | React hooks for Realtime subscriptions |
| `@supabase/supabase-js@2` | Node.js 20+ | Dropped Node 18 support in v2.79.0 |
| `vitest@4` | `@testing-library/react@16` | Works together; need `@testing-library/dom` as explicit peer |
| `@testing-library/react@16` | `react@19` | Supports React 19 |
| `typescript@5.7` | All packages listed | Stable, no known compatibility issues |
| `@google/genai@1.46` | `gemini-2.0-flash` model | Full support for Gemini 2.0+ models |

## Key Version Pins

To avoid unexpected breakage during the 3-day build window, pin these in `package.json`:

```json
{
  "overrides": {
    "zod": "3.24.4"
  }
}
```

This prevents any transitive dependency from pulling in Zod v4, which would break Trigger.dev at runtime.

## Sources

- [Next.js 16 blog post](https://nextjs.org/blog/next-16) -- Confirmed v16 is latest, v15 is stable prior
- [Next.js upgrade guide v16](https://nextjs.org/docs/app/guides/upgrading/version-16) -- Breaking changes in v16
- [Tailwind CSS v4.0 announcement](https://tailwindcss.com/blog/tailwindcss-v4) -- Confirmed v4 stable, Rust engine
- [Tailwind CSS upgrade guide](https://tailwindcss.com/docs/upgrade-guide) -- Migration from v3 to v4
- [@google/genai npm](https://www.npmjs.com/package/@google/genai) -- v1.46.0, confirmed as replacement for @google/generative-ai
- [@google/generative-ai npm](https://www.npmjs.com/package/@google/generative-ai) -- v0.24.1, last published ~1 year ago (deprecated)
- [Gemini API migration guide](https://ai.google.dev/gemini-api/docs/migrate) -- Official migration from old to new SDK
- [@trigger.dev/sdk npm](https://www.npmjs.com/package/@trigger.dev/sdk) -- v4.3.3 confirmed as latest
- [Trigger.dev Zod v4 issue #2805](https://github.com/triggerdotdev/trigger.dev/issues/2805) -- Zod v4 incompatibility confirmed
- [Trigger.dev React hooks docs](https://trigger.dev/docs/realtime/react-hooks/overview) -- Realtime hooks API reference
- [@supabase/supabase-js npm](https://www.npmjs.com/package/@supabase/supabase-js) -- v2.100.1 confirmed
- [Vitest v4 announcement](https://www.infoq.com/news/2025/12/vitest-4-browser-mode/) -- v4.0 with stable Browser Mode
- [TypeScript 6.0 announcement](https://devblogs.microsoft.com/typescript/announcing-typescript-6-0/) -- Released March 23, 2026
- [zod npm](https://www.npmjs.com/package/zod) -- v4.3.6 latest, but pinning to v3.24 for compatibility
- [assemblyai npm](https://www.npmjs.com/package/assemblyai) -- v4.23.1 confirmed
- [apify-client npm](https://www.npmjs.com/package/apify-client) -- v2.22.3 confirmed
- [Bunny Storage API docs](https://docs.bunny.net/reference/put_-storagezonename-path-filename) -- REST API reference
- [ESLint 9 + Next.js discussion](https://github.com/vercel/next.js/discussions/54238) -- Flat config support confirmed for Next.js 15

---
*Stack research for: LupAI - Marketing Intelligence Platform*
*Researched: 2026-03-27*
