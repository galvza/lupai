---
phase: 01-foundation-project-setup
plan: 02
subsystem: database, integrations
tags: [supabase, postgresql, apify, gemini, assemblyai, bunny-cdn, migration, service-clients]

# Dependency graph
requires:
  - phase: 01-01
    provides: TypeScript types (database.ts, analysis.ts, competitor.ts, viral.ts), config modules, project structure
provides:
  - Complete Supabase migration (4 tables, enums, indexes, RLS)
  - Typed Supabase client (server + browser)
  - CRUD query functions with snake_case-to-camelCase mapping
  - 7 Apify actor wrappers with field filtering
  - 3 Gemini AI functions (understand, synthesize, creative)
  - AssemblyAI transcription wrapper
  - Bunny Storage REST client (upload/download/delete/getUrl)
affects: [02-supabase-schema, 03-trigger-dev, 04-apify-extraction, 05-ai-synthesis, 06-media-pipeline]

# Tech tracking
tech-stack:
  added: []
  patterns: [service-client-as-functions, snake-to-camel-mapping, env-var-direct-access, field-filtering-at-extraction]

key-files:
  created:
    - supabase/migrations/20260327200000_create_initial_schema.sql
    - src/lib/supabase/client.ts
    - src/lib/supabase/queries.ts
    - src/lib/apify/instagram.ts
    - src/lib/apify/tiktok.ts
    - src/lib/apify/facebook-ads.ts
    - src/lib/apify/similarweb.ts
    - src/lib/apify/google-maps.ts
    - src/lib/apify/google-ads.ts
    - src/lib/apify/website.ts
    - src/lib/ai/prompts.ts
    - src/lib/ai/understand.ts
    - src/lib/ai/synthesize.ts
    - src/lib/ai/creative.ts
    - src/lib/transcription/transcribe.ts
    - src/lib/storage/bunny.ts
  modified:
    - src/types/database.ts

key-decisions:
  - "Service clients use process.env directly (not Zod config imports) to avoid parse errors in Trigger.dev edge environment"
  - "Database type updated with Relationships, Views, Functions, Enums to match Supabase JS v2 GenericSchema requirement"
  - "Bunny Storage body uses cast to BodyInit due to Node.js @types/node Uint8Array incompatibility with fetch BodyInit"
  - "All Apify wrappers filter output at extraction time -- never store raw actor response"

patterns-established:
  - "Service client pattern: export typed async functions, not classes (per D-14)"
  - "Error handling: throw Error with PT-BR message in every catch block"
  - "Apify wrapper pattern: ApifyClient -> actor.call -> dataset.listItems -> filter relevant fields -> return typed data"
  - "Gemini AI pattern: GoogleGenAI -> models.generateContent with responseMimeType: application/json -> JSON.parse"
  - "Row mapper pattern: snake_case DB columns mapped to camelCase TypeScript properties"

requirements-completed: [FOUND-02, FOUND-03]

# Metrics
duration: 5min
completed: 2026-03-27
---

# Phase 01 Plan 02: Database Migration and Service Client Wrappers Summary

**Supabase migration with 4 tables (analyses, competitors, viral_content, synthesis) plus 16 typed service client wrappers for Apify, Gemini, AssemblyAI, and Bunny Storage**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-27T20:01:39Z
- **Completed:** 2026-03-27T20:07:37Z
- **Tasks:** 2
- **Files modified:** 17

## Accomplishments
- Complete SQL migration with 4 tables, 3 enums, 6 indexes, updated_at trigger, and open RLS policies
- Typed Supabase client with createServerClient/createBrowserClient and full CRUD query layer with snake_case-to-camelCase mapping
- All 7 Apify actor wrappers (Instagram, TikTok, Facebook Ads, SimilarWeb, Google Maps, Google Ads, Website) with field filtering at extraction
- Gemini AI integration using @google/genai with gemini-2.0-flash for niche understanding, strategic synthesis, and creative script generation
- AssemblyAI transcription wrapper and Bunny Storage REST client using native fetch

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Supabase migration, client, and query functions** - `dd1ec43` (feat)
2. **Task 2: Create all external service client wrappers** - `e290627` (feat)

## Files Created/Modified
- `supabase/migrations/20260327200000_create_initial_schema.sql` - Complete database schema with 4 tables, enums, indexes, trigger, RLS
- `src/lib/supabase/client.ts` - Supabase server and browser client factories
- `src/lib/supabase/queries.ts` - Typed CRUD functions for all 4 tables with row mappers
- `src/lib/apify/instagram.ts` - Instagram scraper wrapper
- `src/lib/apify/tiktok.ts` - TikTok scraper wrapper
- `src/lib/apify/facebook-ads.ts` - Meta Ads Library scraper wrapper
- `src/lib/apify/similarweb.ts` - SimilarWeb SEO/traffic scraper wrapper
- `src/lib/apify/google-maps.ts` - Google Maps/GMB scraper wrapper
- `src/lib/apify/google-ads.ts` - Google Ads presence scraper wrapper
- `src/lib/apify/website.ts` - Website content crawler wrapper
- `src/lib/ai/prompts.ts` - AI prompt templates in PT-BR
- `src/lib/ai/understand.ts` - Gemini niche understanding function
- `src/lib/ai/synthesize.ts` - Gemini strategic synthesis function
- `src/lib/ai/creative.ts` - Gemini creative script generation function
- `src/lib/transcription/transcribe.ts` - AssemblyAI video transcription wrapper
- `src/lib/storage/bunny.ts` - Bunny CDN Storage REST client (upload/download/delete/getUrl)
- `src/types/database.ts` - Updated Database type with Relationships, Views, Functions, Enums for Supabase v2

## Decisions Made
- Used process.env directly in service clients instead of Zod-validated config imports to avoid parse failures in Trigger.dev edge environments
- Updated Database type to include Relationships arrays, Views, Functions, Enums, and CompositeTypes to satisfy Supabase JS v2 GenericSchema constraint
- Used `as unknown as BodyInit` cast for Bunny upload body due to @types/node Uint8Array not matching fetch BodyInit type definition
- All Apify wrappers filter output at extraction time to comply with D-15 (never store raw actor output)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Database type missing Relationships and schema sections**
- **Found during:** Task 2 (TypeScript compilation)
- **Issue:** Supabase JS v2 expects GenericSchema with Tables having Relationships, plus Views and Functions sections. The Database type from Plan 01 was missing these.
- **Fix:** Added Relationships tuples to each table, plus empty Views, Functions, CompositeTypes, and Enums sections
- **Files modified:** src/types/database.ts
- **Verification:** `npx tsc --noEmit` passes with zero errors
- **Committed in:** e290627 (Task 2 commit)

**2. [Rule 1 - Bug] Fixed Bunny Storage Buffer/BodyInit type incompatibility**
- **Found during:** Task 2 (TypeScript compilation)
- **Issue:** Node.js @types/node defines Uint8Array/Buffer as incompatible with fetch BodyInit, causing type error on upload body
- **Fix:** Cast fileBuffer to BodyInit via unknown intermediate (runtime compatible, type assertion only)
- **Files modified:** src/lib/storage/bunny.ts
- **Verification:** `npx tsc --noEmit` passes with zero errors
- **Committed in:** e290627 (Task 2 commit)

**3. [Rule 1 - Bug] Fixed Facebook Ads nested property access type error**
- **Found during:** Task 2 (TypeScript compilation)
- **Issue:** Accessing `snapshot.body.text` on `Record<string, unknown>` caused TS2339 (property 'text' not on type '{}')
- **Fix:** Extracted snapshot and body into separate typed variables before accessing properties
- **Files modified:** src/lib/apify/facebook-ads.ts
- **Verification:** `npx tsc --noEmit` passes with zero errors
- **Committed in:** e290627 (Task 2 commit)

---

**Total deviations:** 3 auto-fixed (3 bugs)
**Impact on plan:** All auto-fixes necessary for TypeScript compilation. No scope creep.

## Issues Encountered
None beyond the type errors documented in deviations above.

## User Setup Required
None - no external service configuration required for this plan. Environment variables must be configured before runtime use (documented in .env.example from Plan 01).

## Known Stubs
None - all service clients are fully implemented with real SDK calls (not mocked).

## Next Phase Readiness
- All service client wrappers are ready for use by Trigger.dev jobs (Phase 03)
- Migration SQL ready to be applied to Supabase dashboard
- Query layer ready for API routes and job functions
- Apify wrappers ready for extraction cascade
- AI wrappers ready for synthesis pipeline
- Bunny Storage client ready for media pipeline

## Self-Check: PASSED

- All 16 created files verified present on disk
- Both task commits (dd1ec43, e290627) verified in git log
- `npx tsc --noEmit` exits with 0 errors

---
*Phase: 01-foundation-project-setup*
*Completed: 2026-03-27*
