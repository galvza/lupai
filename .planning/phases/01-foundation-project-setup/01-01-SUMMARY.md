---
phase: 01-foundation-project-setup
plan: 01
subsystem: infra
tags: [nextjs, typescript, tailwind-v4, zod, trigger-dev, supabase, vitest, eslint]

# Dependency graph
requires:
  - phase: none
    provides: greenfield project
provides:
  - Next.js 15.5.14 project scaffold with Tailwind v4 CSS-first config
  - Complete TypeScript domain model (Analysis, Competitor, ViralContent, Synthesis, Database)
  - Zod-validated environment config for 6 services (Supabase, Gemini, Apify, Bunny, AssemblyAI, Trigger.dev)
  - .env.example with all 14 environment variables
  - Vitest 4, ESLint 9, TypeScript 5 configured and runnable
  - Complete folder structure per CLAUDE.md specification
  - Trigger.dev v4 config with example task
affects: [01-02, 01-03, 02, 03, 04, 05, 06, 07, 08, 09, 10]

# Tech tracking
tech-stack:
  added: [next@15.5.14, react@19.1.0, typescript@5, tailwindcss@4, zod@3.25.76, "@google/genai@1", "@trigger.dev/sdk@4", "@trigger.dev/react-hooks@4", "@supabase/supabase-js@2", apify-client@2, assemblyai@4, lucide-react@1, zod-to-json-schema@3, vitest@4, "@vitejs/plugin-react@4", vite-tsconfig-paths@4, "@testing-library/react@16", eslint@9, eslint-config-next@15.5.14]
  patterns: [Zod schema validation for env config, CSS-first Tailwind v4 with @theme, Arrow function components, PT-BR interface text]

key-files:
  created:
    - package.json
    - tsconfig.json
    - postcss.config.mjs
    - vitest.config.ts
    - trigger.config.ts
    - eslint.config.mjs
    - .env.example
    - src/app/layout.tsx
    - src/app/page.tsx
    - src/app/globals.css
    - src/types/analysis.ts
    - src/types/competitor.ts
    - src/types/viral.ts
    - src/types/database.ts
    - src/config/supabase.ts
    - src/config/gemini.ts
    - src/config/apify.ts
    - src/config/bunny.ts
    - src/config/assemblyai.ts
    - src/config/trigger.ts
    - src/utils/validators.ts
    - src/utils/formatters.ts
    - src/trigger/example.ts
    - src/lib/pdf/generate.ts
  modified: []

key-decisions:
  - "Used @google/genai (not deprecated @google/generative-ai) per research findings"
  - "Pinned Zod to 3.25.76 with overrides to prevent transitive Zod v4 (Trigger.dev incompatibility)"
  - "Trigger.dev v4 requires maxDuration in config - set to 300s for cascading analysis jobs"
  - "Tailwind v4 CSS-first config with @theme directive (no tailwind.config.js)"

patterns-established:
  - "Zod schema validation: each config file validates env vars at import time, fail-fast pattern"
  - "Arrow function components: const Component = () => {} per CLAUDE.md"
  - "PT-BR interface: lang=pt-BR on html, Portuguese metadata and UI text"
  - "Domain types: camelCase for TS interfaces, snake_case for DB column mapping in database.ts"
  - "Config pattern: src/config/<service>.ts with Zod parse + type export"

requirements-completed: [FOUND-01, FOUND-04, FOUND-06]

# Metrics
duration: 9min
completed: 2026-03-27
---

# Phase 01 Plan 01: Project Scaffold Summary

**Next.js 15.5 project with Tailwind v4 CSS-first config, complete TypeScript domain model (4 type files, 17 interfaces), and Zod-validated env config for 6 services**

## Performance

- **Duration:** 9 min
- **Started:** 2026-03-27T19:48:25Z
- **Completed:** 2026-03-27T19:57:32Z
- **Tasks:** 2
- **Files modified:** 44

## Accomplishments
- Next.js 15.5.14 project running with Turbopack, Tailwind v4, ESLint 9, Vitest 4
- Complete TypeScript domain model: Analysis, Competitor, ViralContent, Synthesis, Database with Supabase-compatible table types
- All 6 service configs with Zod validation (Supabase, Gemini, Apify, Bunny, AssemblyAI, Trigger.dev)
- Full folder structure matching CLAUDE.md specification with all required directories
- TypeScript compilation passes with zero errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Scaffold Next.js project and install all dependencies** - `fff1d6f` (feat)
2. **Task 2: Define all TypeScript domain types and environment config** - `d35e600` (feat)

## Files Created/Modified
- `package.json` - All dependencies with correct versions, scripts, Zod override
- `tsconfig.json` - TypeScript config with @/* path alias
- `postcss.config.mjs` - Tailwind v4 CSS-first PostCSS config
- `vitest.config.ts` - Vitest 4 with React plugin and tsconfig paths
- `trigger.config.ts` - Trigger.dev v4 config with 300s maxDuration
- `eslint.config.mjs` - ESLint 9 flat config with Next.js rules
- `.env.example` - All 14 environment variables documented
- `src/app/layout.tsx` - Root layout with PT-BR lang attribute
- `src/app/page.tsx` - LupAI placeholder homepage
- `src/app/globals.css` - Tailwind v4 @import with @theme (brand colors)
- `src/types/analysis.ts` - AnalysisMode, AnalysisStatus, NicheInterpreted, Analysis, AnalysisInput types
- `src/types/competitor.ts` - Competitor, WebsiteData, SeoData, SocialData, MetaAdsData, GoogleAdsData, GmbData types
- `src/types/viral.ts` - ViralContent, ContentPlatform, EngagementMetrics, HookBodyCta types
- `src/types/database.ts` - Database, Tables, Synthesis, Recommendation, CreativeScript types with Supabase Row/Insert/Update
- `src/config/supabase.ts` - Zod-validated Supabase config (url, anonKey, serviceRoleKey)
- `src/config/gemini.ts` - Zod-validated Gemini config (apiKey, model=gemini-2.0-flash)
- `src/config/apify.ts` - Zod-validated Apify config + APIFY_ACTORS constant with all 7 actor IDs
- `src/config/bunny.ts` - Zod-validated Bunny CDN config (storageApiKey, storageZoneName, cdnUrl)
- `src/config/assemblyai.ts` - Zod-validated AssemblyAI config (apiKey)
- `src/config/trigger.ts` - Zod-validated Trigger.dev config (secretKey)
- `src/utils/validators.ts` - Zod schemas for analysis input and niche interpretation
- `src/utils/formatters.ts` - PT-BR date formatter utility
- `src/trigger/example.ts` - Placeholder Trigger.dev task
- `src/lib/pdf/generate.ts` - Placeholder PDF generation (Phase 10)

## Decisions Made
- **Trigger.dev v4 maxDuration required:** The v4 SDK requires `maxDuration` in config (not optional). Set to 300s to accommodate cascading analysis jobs.
- **Zod 3.25.76 pin:** Pinned exact version matching Trigger.dev core dependency to prevent transitive v4 installation.
- **@google/genai over @google/generative-ai:** Used new SDK per research findings (old package deprecated).
- **Tailwind v4 @theme over @theme inline:** Used `@theme` (not `@theme inline`) for brand customization as it provides clearer semantics.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added maxDuration to trigger.config.ts**
- **Found during:** Task 2 (TypeScript compilation verification)
- **Issue:** Trigger.dev v4 SDK requires `maxDuration` as a required property in `TriggerConfig`. The plan's trigger.config.ts template omitted it.
- **Fix:** Added `maxDuration: 300` to the config (5 minutes for cascading analysis jobs)
- **Files modified:** trigger.config.ts
- **Verification:** `npx tsc --noEmit` passes with zero errors
- **Committed in:** d35e600 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary fix for TypeScript compilation. No scope creep.

## Known Stubs

These are intentional placeholders documented in the plan:

- `src/lib/pdf/generate.ts:2` - Throws "not implemented" error. Will be implemented in Phase 10 (PDF report generation).
- `src/trigger/example.ts:4` - Example task placeholder. Will be replaced by real tasks in Phase 3 (Trigger.dev jobs).

Both stubs are expected and do not block the plan's goal of establishing the project foundation.

## Issues Encountered
None - plan executed smoothly after the maxDuration auto-fix.

## User Setup Required
None - no external service configuration required for this plan.

## Next Phase Readiness
- Project scaffold complete, all dependencies installed and working
- TypeScript types ready for import by all subsequent phases
- Config validators ready - will fail fast on missing env vars when services are configured
- Folder structure established for all future code placement
- Ready for Plan 01-02 (Supabase schema) and Plan 01-03 (fixtures/mocks)

## Self-Check: PASSED

All 24 created files verified to exist on disk. Both task commits (fff1d6f, d35e600) verified in git log.

---
*Phase: 01-foundation-project-setup*
*Completed: 2026-03-27*
