# Phase 1: Foundation & Project Setup - Research

**Researched:** 2026-03-27
**Domain:** Next.js project scaffolding, Supabase schema, external service client wrappers, TypeScript domain types, test/fixture infrastructure
**Confidence:** HIGH

## Summary

Phase 1 is a greenfield setup phase with zero existing code. The work decomposes into six clear areas: project scaffolding (Next.js 15 + Tailwind v4 + ESLint 9 + Vitest 4), database schema creation (Supabase migrations for 4 tables), external service client wrappers (6 services), TypeScript domain types (4 type files), fixture/mock infrastructure (JSON fixtures + factory functions), and environment configuration (.env.example + config validators). All technology choices are locked by CONTEXT.md decisions. The stack has been validated against npm registry -- verified versions are current and compatible.

Key findings that affect planning: (1) Trigger.dev is now at v4.4.3, not 4.3.x -- the CONTEXT.md version should be treated as a minimum, use latest 4.x; (2) Tailwind CSS is at v4.2.2, not 4.1.x; (3) Zod should be pinned to 3.25.x (not 3.24.x) since Trigger.dev core now depends on zod@3.25.76 directly; (4) Supabase CLI is not installed locally, so migrations should be written as SQL files in `supabase/migrations/` and applied via the Supabase dashboard SQL editor or the CLI can be installed as a dev dependency; (5) `zod-to-json-schema` is needed as a supporting package for Gemini structured output with Zod v3.

**Primary recommendation:** Scaffold with `create-next-app@15` (which includes Tailwind v4 by default), then incrementally add service clients, types, schema, and fixtures -- each as an atomic commit per CLAUDE.md convention.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Use `create-next-app` with TypeScript and App Router to scaffold the project, then manually configure Tailwind v4 (CSS-first config, no tailwind.config.js)
- **D-02:** Pin versions per research: Next.js 15.5.x, React 19.x, TypeScript 5.7.x, Tailwind 4.1.x, Zod 3.24.x (NOT v4 -- Trigger.dev incompatibility)
- **D-03:** Use `@google/genai` v1.46+ (NOT the deprecated `@google/generative-ai`)
- **D-04:** Use Trigger.dev v4.3.x (NOT v3 -- includes Realtime API with React hooks)
- **D-05:** Use ESLint 9 with flat config (`eslint.config.mjs`), Vitest 4.1.x for testing
- **D-06:** Follow the folder structure from CLAUDE.md exactly (src/app, src/components, src/lib, src/trigger, src/hooks, src/types, src/utils, src/config)
- **D-07:** Root table `analyses` with fields: id (uuid), niche_input (text), niche_interpreted (jsonb), mode (enum: quick/complete), status (enum: pending/processing/completed/failed), user_business_url (nullable text), created_at, updated_at
- **D-08:** Table `competitors` with: id, analysis_id (FK), name, website_url, website_data (jsonb), seo_data (jsonb), social_data (jsonb), meta_ads_data (jsonb), google_ads_data (jsonb), gmb_data (jsonb), created_at
- **D-09:** Table `viral_content` with: id, analysis_id (FK), platform (enum: tiktok/instagram/facebook), source_url, bunny_url (nullable), transcription (nullable text), hook_body_cta (nullable jsonb), engagement_metrics (jsonb), created_at
- **D-10:** Table `synthesis` with: id, analysis_id (FK), strategic_overview (text), recommendations (jsonb array), creative_scripts (jsonb array), comparative_analysis (nullable jsonb), created_at
- **D-11:** Use JSONB columns for flexible data from different Apify actors
- **D-12:** Create Supabase migration files in supabase/migrations/
- **D-13:** Each external service gets a thin wrapper in its own file under `src/lib/` following CLAUDE.md structure
- **D-14:** Service clients export typed async functions, not classes. Each function handles its own error cases with descriptive PT-BR error messages
- **D-15:** Apify client (`apify-client` v2.22.x) wraps each actor call with field filtering
- **D-16:** Gemini client uses `@google/genai` with `gemini-2.0-flash` model. Zod schemas for structured output validation
- **D-17:** Bunny Storage uses native `fetch()` (no SDK) -- simple REST PUT/GET/DELETE per official API docs
- **D-18:** AssemblyAI SDK v4.23.x for transcription, Trigger.dev SDK v4.3.x for background jobs
- **D-19:** Environment variables in `src/config/` files per service, with `.env.example` containing all required vars
- **D-20:** JSON fixture files in `tests/fixtures/` directory, one file per Apify actor output type
- **D-21:** Factory functions in `tests/fixtures/factories.ts` that create typed test data with sensible defaults and overrides
- **D-22:** Fixtures must match the filtered output format (what gets stored in DB), not raw Apify actor output
- **D-23:** Include fixture for Gemini AI responses (understanding, synthesis, creative scripts)
- **D-24:** Include fixture for AssemblyAI transcription response

### Claude's Discretion
- Exact Supabase RLS policies (if any -- no auth means minimal RLS needed)
- Index selection for tables (performance optimization)
- Specific Tailwind v4 CSS setup details
- Trigger.dev configuration specifics (trigger.config.ts)
- Test setup configuration (vitest.config.ts)

### Deferred Ideas (OUT OF SCOPE)
None -- analysis stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FOUND-01 | Project initialized with Next.js 15.5+, TypeScript, Tailwind v4, Supabase, Trigger.dev v4 | Full stack versions verified against npm registry. `create-next-app@15` flags documented. Tailwind v4 CSS-first config pattern documented. Trigger.dev v4.4.x `trigger.config.ts` pattern documented. |
| FOUND-02 | Database schema created in Supabase (analyses, competitors, viral content, recommendations) | Schema from D-07 through D-11 fully specified. SQL migration pattern documented. Supabase CLI not installed locally -- migration files written manually, applied via dashboard or CLI install. |
| FOUND-03 | All service clients configured (Apify, Gemini, Assembly AI, Bunny Storage, Trigger.dev) | Each client wrapper pattern documented with code examples. Config validation with Zod pattern documented. `zod-to-json-schema` needed for Gemini structured output. |
| FOUND-04 | TypeScript types defined for all domain entities | Domain type structure mapped from schema decisions. Four type files: analysis.ts, competitor.ts, viral.ts, database.ts. Patterns for Zod schema reuse documented. |
| FOUND-05 | Fixture/mock infrastructure for development without burning API credits | JSON fixture files + factory function pattern documented. One fixture per Apify actor + Gemini + AssemblyAI. Factory with typed overrides pattern documented. |
| FOUND-06 | Environment variables configured with .env.example | All 12 env vars from CLAUDE.md documented. Config validation pattern with Zod for fail-fast on missing vars. |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

**Actionable directives that the planner MUST enforce:**

1. **Folder structure:** Follow CLAUDE.md structure exactly -- src/app, src/components, src/lib, src/trigger, src/hooks, src/types, src/utils, src/config
2. **Naming conventions:** PascalCase for components, camelCase for utils/lib files, snake_case for DB tables/columns, kebab-case for Trigger.dev jobs
3. **Arrow functions for components:** `const Component = () => {}`
4. **const over let, never var**
5. **Functions < 30 lines:** Split longer functions
6. **Import ordering:** External libs first, then internal, then types
7. **JSDoc on all public functions**
8. **PT-BR error messages** and interface text
9. **Atomic commits:** One feature/task per commit with conventional message format `tipo(escopo): descricao`
10. **No `any` type** without justification
11. **No installing unapproved dependencies**
12. **No real values in .env** -- only .env.example with descriptions
13. **Run tests after each significant change**
14. **No files outside defined folder structure**
15. **Zod overrides in package.json** to prevent transitive Zod v4 installation

## Standard Stack

### Core (Verified Against npm Registry 2026-03-27)

| Library | Verified Version | Purpose | Why Standard |
|---------|-----------------|---------|--------------|
| next | 15.5.14 | Full-stack React framework (App Router) | Latest stable 15.x. Decision D-01 locks Next.js 15. |
| react | 19.2.4 | UI library | Required by Next.js 15 |
| react-dom | 19.2.4 | React DOM renderer | Required by Next.js 15 |
| typescript | 5.7.3 | Type safety | Decision D-02 locks 5.7.x (not TS 6.0 -- too fresh) |
| tailwindcss | 4.2.2 | Utility-first CSS | Decision D-01. Latest v4 -- CSS-first config, no tailwind.config.js |
| @tailwindcss/postcss | 4.2.2 | PostCSS plugin for Tailwind v4 | Required for Next.js integration with Tailwind v4 |
| @supabase/supabase-js | 2.100.1 | PostgreSQL client | Stable v2. Requires Node 20+ |
| @trigger.dev/sdk | 4.4.3 | Background jobs, async cascading | Latest v4 stable. Decision D-04 locks v4.x minimum |
| @trigger.dev/react-hooks | 4.4.3 | Realtime run subscriptions in React | For dashboard progress UI. useRealtimeRun hook |
| @google/genai | 1.46.0 | Gemini AI API | Decision D-03 -- NOT the deprecated @google/generative-ai |
| apify-client | 2.22.3 | Scraping orchestration via Apify actors | Decision D-15. Stable v2 |
| assemblyai | 4.29.0 | Video/audio transcription | Latest v4. Decision D-18 |
| zod | 3.25.76 | Schema validation | Pin to 3.x (NOT v4). Trigger.dev core depends on zod@3.25.76 directly |
| zod-to-json-schema | 3.25.2 | Convert Zod schemas to JSON Schema for Gemini | Required for @google/genai structured output with Zod v3 |
| lucide-react | 1.7.0 | Icon library | Tree-shakeable, TypeScript-native |

### Development Tools (Verified)

| Tool | Verified Version | Purpose | Notes |
|------|-----------------|---------|-------|
| vitest | 4.1.2 | Unit/integration testing | Latest v4 stable. Decision D-05 |
| @vitejs/plugin-react | 6.0.1 | React support in Vitest | Required for JSX in test files |
| vite-tsconfig-paths | 6.1.1 | Path alias resolution in Vitest | Resolves @/ imports in test files |
| @testing-library/react | 16.3.2 | Component testing | Compatible with React 19 |
| @testing-library/dom | 10.4.1 | DOM testing utilities | Explicit peer dep for @testing-library/react |
| eslint | 9.39.4 | Linting | Decision D-05. Flat config with eslint.config.mjs |
| eslint-config-next | 15.5.14 | Next.js-specific lint rules | Must match Next.js major version |
| @types/react | 19.2.14 | React type definitions | Matches React 19 |
| @types/node | 20.19.37 | Node.js type definitions | Matches Node 20 LTS |

### Version Corrections from CONTEXT.md

The CONTEXT.md pins some versions that have since been superseded. These corrections are safe and backward-compatible:

| CONTEXT.md Says | Actual Latest | Recommendation | Why |
|-----------------|--------------|----------------|-----|
| Trigger.dev v4.3.x | v4.4.3 | Use 4.4.3 | Newer patch, same major. Bug fixes only |
| Tailwind 4.1.x | v4.2.2 | Use 4.2.2 | Newer minor with improvements |
| Zod 3.24.x | v3.25.76 | Use 3.25.76 | Trigger.dev core itself depends on 3.25.76 |
| AssemblyAI v4.23.x | v4.29.0 | Use 4.29.0 | Newer patch, same major |
| Vitest 4.1.x | v4.1.2 | Use 4.1.2 | Same minor, latest patch |

**Installation Commands:**

```bash
# Scaffold (creates package.json, installs next, react, react-dom, typescript, tailwind, eslint)
npx create-next-app@15 . --typescript --tailwind --eslint --app --src-dir --turbopack --use-npm

# Database
npm install @supabase/supabase-js@2

# AI and processing
npm install @google/genai assemblyai

# Scraping
npm install apify-client@2

# Background jobs + realtime
npm install @trigger.dev/sdk @trigger.dev/react-hooks

# Validation
npm install zod@3 zod-to-json-schema

# Icons (not needed in Phase 1 but approved)
# npm install lucide-react

# Dev dependencies
npm install -D vitest @vitejs/plugin-react vite-tsconfig-paths
npm install -D @testing-library/react @testing-library/dom
npm install -D @types/react @types/node

# CRITICAL: Add Zod override to package.json to prevent transitive v4
# Add to package.json: "overrides": { "zod": "3.25.76" }
```

## Architecture Patterns

### Recommended Project Structure

```
src/
├── app/                        # Next.js App Router pages + API routes
│   ├── page.tsx                # Homepage placeholder (minimal for Phase 1)
│   ├── layout.tsx              # Global layout (PT-BR lang, Tailwind import)
│   └── globals.css             # @import "tailwindcss" (v4 style)
├── components/                 # Empty subdirs: ui/, analysis/, competitors/, viral/, report/
├── lib/
│   ├── apify/                  # Actor wrappers (stub exports in Phase 1)
│   │   ├── instagram.ts
│   │   ├── tiktok.ts
│   │   ├── facebook-ads.ts
│   │   ├── similarweb.ts
│   │   ├── google-maps.ts
│   │   ├── google-ads.ts
│   │   └── website.ts
│   ├── ai/                     # Gemini wrappers (config + stub in Phase 1)
│   │   ├── understand.ts
│   │   ├── synthesize.ts
│   │   ├── creative.ts
│   │   └── prompts.ts
│   ├── transcription/
│   │   └── transcribe.ts       # AssemblyAI wrapper (config + stub)
│   ├── storage/
│   │   └── bunny.ts            # Bunny REST wrapper (upload/download/delete)
│   ├── supabase/
│   │   ├── client.ts           # Supabase client (server + browser)
│   │   └── queries.ts          # Typed query functions
│   └── pdf/
│       └── generate.ts         # Placeholder for Phase 10
├── trigger/
│   └── example.ts              # Trigger.dev task placeholder (needed for trigger.config.ts)
├── hooks/                      # Empty in Phase 1
├── types/
│   ├── analysis.ts             # Analysis, AnalysisInput, AnalysisStatus types
│   ├── competitor.ts           # Competitor, CompetitorData, social/seo/ads sub-types
│   ├── viral.ts                # ViralContent, EngagementMetrics, HookBodyCta types
│   └── database.ts             # Database row types matching Supabase schema
├── utils/
│   ├── formatters.ts           # Placeholder
│   └── validators.ts           # Input validation with Zod
└── config/
    ├── apify.ts                # Apify config + env validation
    ├── gemini.ts               # Gemini config + env validation
    ├── supabase.ts             # Supabase config + env validation
    └── bunny.ts                # Bunny config + env validation
```

### Pattern 1: Environment Config Validation (Fail-Fast)

**What:** Each config file reads env vars, validates them with Zod, and exports a typed config object. Missing env vars cause a clear error at import time, not a cryptic runtime failure.

**When to use:** Every service configuration file in `src/config/`.

**Example:**
```typescript
// src/config/supabase.ts
import { z } from 'zod';

const supabaseConfigSchema = z.object({
  url: z.string().url().min(1),
  anonKey: z.string().min(1),
  serviceRoleKey: z.string().min(1),
});

/** Configuracao do Supabase validada via Zod */
export const supabaseConfig = supabaseConfigSchema.parse({
  url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
});

export type SupabaseConfig = z.infer<typeof supabaseConfigSchema>;
```

### Pattern 2: Typed Service Client (Functions, Not Classes)

**What:** Each service wrapper exports pure async functions with typed inputs/outputs. No class instantiation required. Functions handle their own errors with PT-BR messages.

**When to use:** All `src/lib/` service wrappers. Decision D-14 locks this pattern.

**Example:**
```typescript
// src/lib/supabase/client.ts
import { createClient } from '@supabase/supabase-js';
import { supabaseConfig } from '@/config/supabase';
import type { Database } from '@/types/database';

/** Cliente Supabase para uso no servidor (service role) */
export const createServerClient = () =>
  createClient<Database>(supabaseConfig.url, supabaseConfig.serviceRoleKey);

/** Cliente Supabase para uso no navegador (anon key) */
export const createBrowserClient = () =>
  createClient<Database>(supabaseConfig.url, supabaseConfig.anonKey);
```

### Pattern 3: Supabase Migration Files (Manual SQL)

**What:** Write SQL migration files in `supabase/migrations/` with timestamp-prefixed names. Apply via Supabase dashboard SQL editor since Supabase CLI is not installed locally.

**When to use:** Database schema creation (D-12).

**File naming:** `YYYYMMDDHHmmss_description.sql` (e.g., `20260327200000_create_initial_schema.sql`)

**Example:**
```sql
-- supabase/migrations/20260327200000_create_initial_schema.sql

-- Enable uuid extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enum types
CREATE TYPE analysis_mode AS ENUM ('quick', 'complete');
CREATE TYPE analysis_status AS ENUM ('pending', 'processing', 'completed', 'failed');
CREATE TYPE content_platform AS ENUM ('tiktok', 'instagram', 'facebook');

-- Analyses table (root)
CREATE TABLE analyses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  niche_input TEXT NOT NULL,
  niche_interpreted JSONB,
  mode analysis_mode NOT NULL DEFAULT 'quick',
  status analysis_status NOT NULL DEFAULT 'pending',
  user_business_url TEXT,
  trigger_run_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Competitors table
CREATE TABLE competitors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  analysis_id UUID NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  website_url TEXT,
  website_data JSONB,
  seo_data JSONB,
  social_data JSONB,
  meta_ads_data JSONB,
  google_ads_data JSONB,
  gmb_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Viral content table
CREATE TABLE viral_content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  analysis_id UUID NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
  platform content_platform NOT NULL,
  source_url TEXT NOT NULL,
  bunny_url TEXT,
  transcription TEXT,
  hook_body_cta JSONB,
  engagement_metrics JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Synthesis table
CREATE TABLE synthesis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  analysis_id UUID NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
  strategic_overview TEXT NOT NULL,
  recommendations JSONB NOT NULL,
  creative_scripts JSONB NOT NULL,
  comparative_analysis JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(analysis_id)
);

-- Indexes for common queries
CREATE INDEX idx_analyses_status ON analyses(status);
CREATE INDEX idx_analyses_created_at ON analyses(created_at DESC);
CREATE INDEX idx_competitors_analysis_id ON competitors(analysis_id);
CREATE INDEX idx_viral_content_analysis_id ON viral_content(analysis_id);
CREATE INDEX idx_synthesis_analysis_id ON synthesis(analysis_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_analyses_updated_at
  BEFORE UPDATE ON analyses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### Pattern 4: Typed Fixture Factory

**What:** A factory function that creates typed test data with sensible defaults. Individual tests override only the fields they care about.

**When to use:** All test fixtures. Decisions D-20 through D-24.

**Example:**
```typescript
// tests/fixtures/factories.ts
import type { Analysis } from '@/types/analysis';
import type { Competitor } from '@/types/competitor';

/** Cria dados de analise com valores padrao */
export const createAnalysis = (overrides?: Partial<Analysis>): Analysis => ({
  id: 'test-analysis-001',
  nicheInput: 'clinicas odontologicas em SP',
  nicheInterpreted: {
    niche: 'odontologia',
    segment: 'clinicas',
    region: 'Sao Paulo, SP',
  },
  mode: 'quick',
  status: 'completed',
  userBusinessUrl: null,
  triggerRunId: null,
  createdAt: '2026-03-27T12:00:00Z',
  updatedAt: '2026-03-27T12:05:00Z',
  ...overrides,
});

/** Cria dados de concorrente com valores padrao */
export const createCompetitor = (overrides?: Partial<Competitor>): Competitor => ({
  id: 'test-competitor-001',
  analysisId: 'test-analysis-001',
  name: 'Clinica Sorriso SP',
  websiteUrl: 'https://clinicasorriso.com.br',
  websiteData: null,
  seoData: null,
  socialData: null,
  metaAdsData: null,
  googleAdsData: null,
  gmbData: null,
  createdAt: '2026-03-27T12:01:00Z',
  ...overrides,
});
```

### Pattern 5: Tailwind v4 CSS-First Configuration

**What:** Tailwind v4 uses CSS-based configuration instead of `tailwind.config.js`. The PostCSS plugin `@tailwindcss/postcss` handles everything. Custom theme values go in `globals.css` using `@theme`.

**When to use:** Initial project setup. Decision D-01.

**Configuration files:**

```javascript
// postcss.config.mjs
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
export default config;
```

```css
/* src/app/globals.css */
@import "tailwindcss";

@theme {
  --color-brand: #6366f1;
  --color-brand-light: #818cf8;
  --font-sans: 'Inter', system-ui, sans-serif;
}
```

### Pattern 6: Trigger.dev v4 Configuration

**What:** `trigger.config.ts` in project root defines the Trigger.dev project configuration. Tasks are defined in `src/trigger/` directory.

**When to use:** Initial Trigger.dev setup. Decisions D-04, D-18.

**Example:**
```typescript
// trigger.config.ts
import { defineConfig } from "@trigger.dev/sdk";

export default defineConfig({
  project: "<project-ref>", // From Trigger.dev dashboard
  dirs: ["src/trigger"],
});
```

### Anti-Patterns to Avoid

- **Config validation at runtime only:** Validate env vars at module load time (Zod `.parse()`), not inside functions. Fail fast.
- **Using `@google/generative-ai`:** This package is deprecated. Use `@google/genai` exclusively.
- **Using Zod v4:** Will break Trigger.dev at runtime due to `zod-validation-error` dependency. Pin to v3.
- **Using `tailwind.config.js` with Tailwind v4:** Unnecessary. Use CSS-first config with `@theme` directive.
- **Storing unfiltered Apify output:** CLAUDE.md explicitly prohibits this. Wrappers must filter to relevant fields only.
- **Class-based service clients:** Decision D-14 requires exported functions, not classes.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Database migrations | Custom migration runner | Supabase migration files (`supabase/migrations/`) | Standard Supabase pattern; compatible with CLI and dashboard |
| Schema validation | Manual type checking | Zod schemas | Type-safe, composable, integrates with Gemini structured output |
| JSON Schema from types | Manual JSON schema writing | `zod-to-json-schema` | Automatic conversion from Zod schemas for Gemini responseJsonSchema |
| Realtime job updates | Custom WebSocket/SSE server | Trigger.dev Realtime API + `@trigger.dev/react-hooks` | Electric SQL under the hood, zero infra management |
| PostCSS config for Tailwind | Custom PostCSS pipeline | `@tailwindcss/postcss` | Official Tailwind v4 PostCSS plugin |
| UUID generation in DB | Application-level UUID | PostgreSQL `uuid-ossp` extension | Database-level generation is atomic and reliable |
| Updated_at timestamps | Application-level timestamps | PostgreSQL trigger function | Consistent, cannot be forgotten in application code |

## Common Pitfalls

### Pitfall 1: Tailwind v4 Config Confusion

**What goes wrong:** Developer creates `tailwind.config.js` or `tailwind.config.ts` for Tailwind v4, or uses `@tailwind base; @tailwind components; @tailwind utilities;` directives from v3.
**Why it happens:** Tailwind v3 patterns are deeply ingrained. Most tutorials and AI training data reference v3.
**How to avoid:** Use `@import "tailwindcss";` as the single CSS import. Use `@theme` for customization. Use `@tailwindcss/postcss` plugin. No config file needed.
**Warning signs:** Build errors mentioning missing content config; CSS not generating utilities.

### Pitfall 2: Zod v4 Installed Transitively

**What goes wrong:** A dependency pulls in Zod v4, breaking Trigger.dev at runtime with `TriggerApiError: Connection error`.
**Why it happens:** Zod v4 was released and some packages updated their dependencies. The error message masks the real cause (Zod version mismatch).
**How to avoid:** Add `"overrides": { "zod": "3.25.76" }` to `package.json`. This prevents any transitive dependency from pulling v4.
**Warning signs:** `TriggerApiError` after adding new packages; `npm ls zod` showing multiple versions.

### Pitfall 3: Supabase Client Using Wrong Key

**What goes wrong:** Server-side code uses anon key (which has RLS restrictions) or client-side code uses service role key (security risk).
**Why it happens:** Only one Supabase client is created and shared everywhere.
**How to avoid:** Create two separate client factories: `createServerClient()` with service role key and `createBrowserClient()` with anon key. Server-side = Trigger.dev tasks, API routes. Browser-side = React components.
**Warning signs:** Permission errors in API routes; service role key appearing in browser network tab.

### Pitfall 4: Missing Config Validation Causes Cryptic Errors

**What goes wrong:** Missing or malformed env vars cause errors deep in external service calls. Error message says "Invalid API key" or "Network error" when the real issue is an empty env var.
**Why it happens:** Env vars are read directly with `process.env.X` without validation.
**How to avoid:** Every config file uses `z.string().min(1)` validation. Parse at module load time. The error will say exactly which var is missing.
**Warning signs:** "undefined" appearing in API URLs; 401 errors from services.

### Pitfall 5: create-next-app Overwrites Existing Files

**What goes wrong:** Running `create-next-app` in an existing directory with files (like .planning, CLAUDE.md) may conflict or require force.
**Why it happens:** The project root already has files from the planning phase.
**How to avoid:** Run `create-next-app` with `--yes` flag to accept defaults without interactive prompts. The tool will scaffold around existing files without overwriting non-conflicting ones. Alternatively, scaffold in a temp dir and copy files over. Back up .planning/ and docs before scaffolding.
**Warning signs:** Interactive prompts asking to overwrite existing files.

### Pitfall 6: Trigger.dev Init Requires Dashboard Project

**What goes wrong:** `npx trigger.dev@latest init` requires an existing project in the Trigger.dev cloud dashboard. Without it, the init command fails.
**Why it happens:** Trigger.dev v4 is a managed service -- tasks run on their infrastructure, not locally.
**How to avoid:** Create the project in the Trigger.dev dashboard first, then run init with the project ref. For Phase 1, create `trigger.config.ts` manually with a placeholder project ref that can be updated later.
**Warning signs:** "Project not found" errors during init.

## Code Examples

### Gemini Client with Structured Output (Zod v3)

```typescript
// src/lib/ai/understand.ts
import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { geminiConfig } from '@/config/gemini';

const ai = new GoogleGenAI({ apiKey: geminiConfig.apiKey });

/** Schema para o entendimento do input do usuario */
export const NicheUnderstandingSchema = z.object({
  niche: z.string().describe('Nome do nicho identificado'),
  segment: z.string().describe('Segmento especifico dentro do nicho'),
  region: z.string().describe('Regiao geografica identificada'),
  competitors: z.array(z.object({
    name: z.string(),
    url: z.string().optional(),
  })).describe('3-4 concorrentes relevantes descobertos'),
});

export type NicheUnderstanding = z.infer<typeof NicheUnderstandingSchema>;

/** Interpreta o input do usuario e identifica nicho, segmento e regiao */
export const understandInput = async (input: string): Promise<NicheUnderstanding> => {
  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: `Analise este input e identifique o nicho, segmento e regiao: "${input}"`,
    config: {
      responseMimeType: 'application/json',
      responseJsonSchema: zodToJsonSchema(NicheUnderstandingSchema),
    },
  });

  return NicheUnderstandingSchema.parse(JSON.parse(response.text ?? '{}'));
};
```

### Bunny Storage Client (Native Fetch)

```typescript
// src/lib/storage/bunny.ts
import { bunnyConfig } from '@/config/bunny';

/** Faz upload de um arquivo para o Bunny Storage */
export const uploadFile = async (
  path: string,
  data: Buffer | Uint8Array,
  contentType = 'application/octet-stream'
): Promise<string> => {
  const url = `https://${bunnyConfig.storageZoneName}.storage.bunnycdn.com/${path}`;

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'AccessKey': bunnyConfig.storageApiKey,
      'Content-Type': contentType,
    },
    body: data,
  });

  if (!response.ok) {
    throw new Error(`Erro ao fazer upload para Bunny Storage: ${response.status} ${response.statusText}`);
  }

  return `${bunnyConfig.cdnUrl}/${path}`;
};

/** Deleta um arquivo do Bunny Storage */
export const deleteFile = async (path: string): Promise<void> => {
  const url = `https://${bunnyConfig.storageZoneName}.storage.bunnycdn.com/${path}`;

  const response = await fetch(url, {
    method: 'DELETE',
    headers: { 'AccessKey': bunnyConfig.storageApiKey },
  });

  if (!response.ok) {
    throw new Error(`Erro ao deletar arquivo do Bunny Storage: ${response.status}`);
  }
};
```

### Vitest Configuration for Next.js

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.{test,spec}.{ts,tsx}', 'src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.d.ts', 'src/app/**/*.tsx'],
    },
  },
});
```

### Apify Actor Wrapper Pattern (Stub for Phase 1)

```typescript
// src/lib/apify/instagram.ts
import { ApifyClient } from 'apify-client';
import { apifyConfig } from '@/config/apify';
import type { CompetitorSocialData } from '@/types/competitor';

const client = new ApifyClient({ token: apifyConfig.apiToken });

/**
 * Extrai dados de perfil do Instagram de um concorrente.
 * Filtra apenas campos relevantes do output do actor.
 */
export const scrapeInstagramProfile = async (
  username: string
): Promise<CompetitorSocialData> => {
  // TODO: Implementar na Phase 4 (Data Extraction)
  // Stub retorna dados vazios tipados para desenvolvimento
  throw new Error('Instagram scraping nao implementado ainda. Use fixtures para desenvolvimento.');
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@google/generative-ai` | `@google/genai` | Late 2024 | Old package deprecated, no Gemini 2.0+ support |
| Trigger.dev v3 (defineJob) | Trigger.dev v4 (task()) | 2025 | New API, Realtime hooks, different import paths |
| `tailwind.config.js` | CSS-first `@import "tailwindcss"` + `@theme` | Tailwind v4.0 (Jan 2025) | No JS config file needed |
| ESLint 8 + `.eslintrc` | ESLint 9 + `eslint.config.mjs` (flat config) | 2024 | Flat config is now standard |
| `@tailwind base; @tailwind components; @tailwind utilities;` | `@import "tailwindcss";` | Tailwind v4.0 | Single import replaces three directives |
| `zod` standalone for JSON schema | `zod` + `zod-to-json-schema` for Gemini | Ongoing | Required bridge for Zod v3 with Gemini structured output |
| Supabase Realtime for progress | Trigger.dev Realtime API | Trigger.dev v4 | Electric SQL under the hood, eliminates custom SSE/polling |

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.2 |
| Config file | `vitest.config.ts` (Wave 0 creation) |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run --coverage` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FOUND-01 | Project builds and dev server starts | smoke | `npm run build` | N/A (build command) |
| FOUND-02 | Migration SQL is valid syntax | unit | `npx vitest run tests/unit/schema.test.ts -t "migration"` | Wave 0 |
| FOUND-03 | Config validators reject missing env vars | unit | `npx vitest run tests/unit/config.test.ts` | Wave 0 |
| FOUND-04 | Types compile without errors | smoke | `npx tsc --noEmit` | N/A (typecheck command) |
| FOUND-05 | Factory functions produce valid typed data | unit | `npx vitest run tests/unit/fixtures.test.ts` | Wave 0 |
| FOUND-06 | .env.example has all required vars | unit | `npx vitest run tests/unit/env.test.ts` | Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run --coverage`
- **Phase gate:** Full suite green + `npm run build` + `npx tsc --noEmit`

### Wave 0 Gaps

- [ ] `vitest.config.ts` -- Vitest configuration with React plugin and path aliases
- [ ] `tests/setup.ts` -- Test setup file (jsdom environment bootstrap)
- [ ] `tests/unit/config.test.ts` -- Tests for config validators
- [ ] `tests/unit/fixtures.test.ts` -- Tests for factory functions
- [ ] `tests/unit/schema.test.ts` -- Tests validating migration SQL structure
- [ ] Framework install: `npm install -D vitest @vitejs/plugin-react vite-tsconfig-paths @testing-library/react @testing-library/dom`

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Runtime | Yes | v24.13.0 (exceeds 20 LTS minimum) | -- |
| npm | Package manager | Yes | 11.6.2 | -- |
| npx | CLI tools | Yes | 11.6.2 | -- |
| git | Version control | Yes | 2.52.0 | -- |
| Supabase CLI | Migration management | No | -- | Write SQL files manually, apply via Supabase dashboard SQL editor |
| Trigger.dev CLI | Project init + dev | Via npx | Latest (npx trigger.dev@latest) | -- |

**Missing dependencies with no fallback:**
- None -- all critical tools are available.

**Missing dependencies with fallback:**
- **Supabase CLI:** Not installed locally. Fallback: write migration SQL files in `supabase/migrations/` per standard naming convention (`YYYYMMDDHHmmss_description.sql`). Apply via Supabase dashboard SQL editor or install CLI later with `npm install -D supabase`. The migration files serve as the source of truth regardless of application method.

## Open Questions

1. **Trigger.dev project ref**
   - What we know: `trigger.config.ts` requires a `project` field with a ref from the Trigger.dev dashboard.
   - What's unclear: Whether a Trigger.dev cloud account has been created yet.
   - Recommendation: Create `trigger.config.ts` with a placeholder value `"<your-trigger-project-ref>"`. Document in .env.example that this needs to be set. Can be updated when the account is created.

2. **Supabase project creation**
   - What we know: The Supabase client needs URL and keys from an existing Supabase project.
   - What's unclear: Whether a Supabase project has been created in the dashboard.
   - Recommendation: Write migration files and config code assuming the project exists. The .env.example documents what values are needed. Config validators will fail clearly if values are missing.

3. **Node.js version compatibility**
   - What we know: Local Node.js is v24.13.0, but CLAUDE.md specifies Node 20 LTS. `@supabase/supabase-js` requires Node 20+.
   - What's unclear: Whether Node 24 introduces any incompatibilities with the stack.
   - Recommendation: Proceed with Node 24 (it is a superset of Node 20 capabilities). Add `"engines": { "node": ">=20" }` to package.json to document the minimum requirement. Vercel deployment will use the configured Node version (20 LTS recommended for production).

## Sources

### Primary (HIGH confidence)
- npm registry -- all package versions verified via `npm view` on 2026-03-27
- [Tailwind CSS v4 Next.js Installation Guide](https://tailwindcss.com/docs/guides/nextjs) -- CSS-first config pattern
- [Next.js Official Installation Docs](https://nextjs.org/docs/app/getting-started/installation) -- create-next-app flags
- [Trigger.dev Next.js Setup Guide](https://trigger.dev/docs/guides/frameworks/nextjs) -- trigger.config.ts pattern
- [Gemini Structured Output Docs](https://ai.google.dev/gemini-api/docs/structured-output) -- Zod + zodToJsonSchema pattern
- [Bunny Storage API Reference](https://docs.bunny.net/reference/storage-api) -- REST PUT/GET/DELETE pattern
- [Supabase Database Migrations Docs](https://supabase.com/docs/guides/deployment/database-migrations) -- Migration file naming

### Secondary (MEDIUM confidence)
- [Vitest + Next.js 15 Complete Guide](https://noqta.tn/en/tutorials/vitest-react-testing-library-nextjs-unit-testing-2026) -- Vitest config patterns
- [Trigger.dev v4.4.3 Release Notes](https://trigger.dev/changelog/v4-4-3) -- syncSupabaseEnvVars extension

### Tertiary (LOW confidence)
- None -- all findings verified against primary sources or npm registry.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all versions verified against npm registry on 2026-03-27
- Architecture: HIGH -- patterns from official documentation of each library
- Pitfalls: HIGH -- validated against PITFALLS.md research and official docs
- Schema design: HIGH -- locked by CONTEXT.md decisions D-07 through D-11

**Research date:** 2026-03-27
**Valid until:** 2026-04-10 (stable stack, versions pinned)
