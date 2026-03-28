# Roadmap: LupAI

## Overview

LupAI delivers a marketing intelligence platform in 10 phases over 3 days. The build follows a strict dependency chain: foundation and types first, then the input/understanding entry point, then progressive expansion of the extraction pipeline (competitors, website/SEO/social, ads, viral/transcription), then AI synthesis and creative modeling, then the comparative mode, then the full results dashboard, and finally history/cache/PDF export. Each phase produces data or capability consumed by the next. The goal is a working demo deployed on Vercel by 2026-03-30 14h.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation & Project Setup** - Scaffolding, DB schema, service clients, types, fixtures, and config
- [ ] **Phase 2: Input & AI Understanding** - Homepage input, Gemini interpretation, confirmation flow, API dispatch
- [ ] **Phase 3: Competitor Discovery & Orchestration** - Trigger.dev orchestrator, competitor discovery via AI+Apify, fan-out pattern
- [ ] **Phase 4: Website, SEO & Social Extraction** - Competitor website, SEO, and social media data extraction sub-tasks
- [ ] **Phase 5: Ads Intelligence** - Meta Ads Library, Google Ads, and Google My Business extraction
- [ ] **Phase 6: Viral Content & Transcription** - Viral content discovery, Bunny Storage pipeline, video transcription with AssemblyAI
- [ ] **Phase 7: AI Synthesis & Creative Modeling** - Strategic recommendations, Hook/Body/CTA analysis, script generation
- [ ] **Phase 8: Modo Completo** - User business extraction, comparative analysis, personalized recommendations
- [ ] **Phase 9: Dashboard & Results UI** - Full results dashboard with real-time progress, responsive layout, graceful degradation
- [ ] **Phase 10: History, Cache & PDF Export** - Search history, 24h niche cache, PDF report generation

## Phase Details

### Phase 1: Foundation & Project Setup
**Goal**: All infrastructure is in place so that subsequent phases can build features without setup friction
**Depends on**: Nothing (first phase)
**Requirements**: FOUND-01, FOUND-02, FOUND-03, FOUND-04, FOUND-05, FOUND-06
**Success Criteria** (what must be TRUE):
  1. Running `npm run dev` starts the Next.js app on localhost with a visible page
  2. Supabase database has all tables (analyses, competitors, viral_content, synthesis) with correct columns accessible via client
  3. All external service clients (Apify, Gemini, AssemblyAI, Bunny, Trigger.dev) are configured and importable with type-safe wrappers
  4. TypeScript types for all domain entities exist and are used across the codebase (no `any` for domain data)
  5. Mock/fixture data exists for every external service so development can proceed without burning API credits
**Plans**: 3 plans

Plans:
- [x] 01-01-PLAN.md — Scaffold Next.js project, install deps, define TypeScript types, env config (Wave 1)
- [x] 01-02-PLAN.md — Supabase migration, client, queries, and all service client wrappers (Wave 2)
- [x] 01-03-PLAN.md — Fixture/mock infrastructure and initial tests (Wave 2)

### Phase 2: Input & AI Understanding
**Goal**: Users can describe their niche in plain text and see the AI's interpretation before starting analysis
**Depends on**: Phase 1
**Requirements**: INPT-01, INPT-02, INPT-03, INPT-04, ORCH-03
**Success Criteria** (what must be TRUE):
  1. User sees a clean homepage with a prominent text input field and can type a niche description freely
  2. After submitting, the AI returns a structured interpretation (niche, segment, region) within 5 seconds
  3. User sees a confirmation screen showing what the AI understood and can adjust it before proceeding
  4. Clicking "start analysis" creates a database record, triggers a background job, and redirects to the analysis page (API route completes in under 10 seconds)
**Plans**: 2 plans

Plans:
- [x] 02-01-PLAN.md — Backend logic: input classification, understand + analyze API routes, Trigger.dev stub, tests (Wave 1)
- [ ] 02-02-PLAN.md — Frontend UI: homepage components, input-to-redirect flow, analysis shell page, component tests (Wave 2)

**UI hint**: yes

### Phase 3: Competitor Discovery & Orchestration
**Goal**: The system automatically finds relevant competitors and the background job orchestration pattern is established
**Depends on**: Phase 2
**Requirements**: COMP-01, COMP-02, COMP-03, ORCH-01, ORCH-02
**Success Criteria** (what must be TRUE):
  1. After the user confirms the niche, the system discovers 3-4 relevant competitors via AI + Apify within the Trigger.dev orchestrator
  2. Discovered competitors are presented to the user for confirmation (user can remove or adjust before full extraction)
  3. The Trigger.dev orchestrator fans out to parallel sub-tasks and each sub-task runs independently (failure in one does not block others)
  4. Real-time status updates flow from Trigger.dev to the frontend showing which extraction step is running
**Plans**: 2 plans

Plans:
- [x] 03-01-PLAN.md — Types, DB migration, Google Search wrapper, blocklist/dedup utilities, Gemini scoring, fixtures and tests (Wave 1)
- [x] 03-02-PLAN.md — Discovery sub-tasks, extraction stubs, full orchestrator with waitpoint confirmation, confirmation API route, tests (Wave 2)

**UI hint**: yes

### Phase 4: Website, SEO & Social Extraction
**Goal**: Competitor website positioning, SEO metrics, and social media presence are extracted and stored
**Depends on**: Phase 3
**Requirements**: SITE-01, SITE-02, SEO-01, SEO-02, SOCL-01, SOCL-02, SOCL-03
**Success Criteria** (what must be TRUE):
  1. Website data (positioning, offer, pricing, meta tags) is extracted per competitor and stored in Supabase
  2. SEO data (estimated authority, top keywords, estimated traffic) is extracted per competitor and stored
  3. Social media data (follower counts, posting frequency, engagement rates, top posts) is extracted per competitor from Instagram and TikTok
  4. Each extraction sub-task validates its output (rejects empty/malformed data) and stores only filtered, relevant fields
**Plans**: 3 plans

Plans:
- [x] 04-01-PLAN.md — Types, utilities (social links, fallback, business IDs), validation schemas, enhanced website scraper (Wave 1)
- [x] 04-02-PLAN.md — extract-website compound task + extract-social task implementations with tests (Wave 2)
- [x] 04-03-PLAN.md — Orchestrator 2-batch sequential refactoring with social link merging and fallback (Wave 3)

### Phase 5: Ads Intelligence
**Goal**: Competitor advertising presence across Meta and Google is captured and stored
**Depends on**: Phase 3
**Requirements**: ADS-01, ADS-02, GADS-01, GADS-02, GMB-01, GMB-02
**Success Criteria** (what must be TRUE):
  1. Active Meta ads per competitor are extracted (creatives, copy, format, time running) and stored
  2. Google Ads presence per competitor is detected (search ads, paid keywords) and stored
  3. Google My Business data is extracted when applicable, and the system gracefully handles businesses without GMB presence
**Plans**: 2 plans

Plans:
- [x] 05-01-PLAN.md — Enhance Apify wrappers (Meta Ads pageUrl, Google Ads domain), add Zod schemas, update actor ID (Wave 1)
- [x] 05-02-PLAN.md — Full extract-ads compound task, orchestrator region wiring, comprehensive tests (Wave 2)

### Phase 6: Viral Content & Transcription
**Goal**: Viral niche content is discovered, downloaded, transcribed, and structurally analyzed
**Depends on**: Phase 3
**Requirements**: VIRL-01, VIRL-02, VIRL-03, TRNS-01, TRNS-02, TRNS-03
**Success Criteria** (what must be TRUE):
  1. Viral content is discovered across TikTok and Instagram for the niche (not limited to discovered competitors, per D-01 Facebook deferred)
  2. Viral videos are downloaded to Bunny Storage and accessible via CDN URL
  3. Videos in Bunny Storage are transcribed via AssemblyAI and transcriptions are stored
  4. AI identifies hook, body, and CTA structure in each transcribed video and the breakdown is stored per video
**Plans**: 3 plans

Plans:
- [x] 06-01-PLAN.md — Extend types (ViralPatterns, ViralVideoCandidate), DB migration, Zod schemas, query extensions, Gemini prompts, fixtures (Wave 1)
- [x] 06-02-PLAN.md — TikTok/Instagram viral search Apify wrappers, Gemini HBC extraction + pattern detection modules, with tests (Wave 2)
- [x] 06-03-PLAN.md — Full extract-viral compound Trigger.dev task (6-stage pipeline: discover, filter, download, transcribe, HBC, patterns) with tests (Wave 3)

### Phase 7: AI Synthesis & Creative Modeling
**Goal**: All collected data is consolidated into actionable strategic recommendations and ready-to-use creative scripts
**Depends on**: Phase 4, Phase 5, Phase 6
**Requirements**: SYNTH-01, SYNTH-02, SYNTH-03, CRTV-01, CRTV-02, CRTV-03, CRTV-04
**Success Criteria** (what must be TRUE):
  1. AI produces a strategic overview that references actual scraped data (specific numbers, competitor names, content examples)
  2. Recommendations are specific and actionable (e.g., "seus concorrentes ranqueiam pra X e voce nao tem conteudo sobre isso") -- never generic
  3. AI generates 3-5 video script suggestions with explicit hook, body, and CTA adapted to the user's niche
  4. Each script includes format recommendation (Reels, TikTok, etc.) and estimated duration
  5. Recommendations and scripts are stored in Supabase and displayed in a prioritized, structured format
**Plans**: 2 plans

Plans:
- [x] 07-01-PLAN.md — Update types (Recommendation, CreativeScript per D-08/D-12), Zod schemas, upgrade synthesize.ts and creative.ts to structured output, prompts, fixtures, tests (Wave 1)
- [x] 07-02-PLAN.md — Trigger.dev synthesize compound task, orchestrator integration with synthesis step after extraction, tests (Wave 2)

### Phase 8: Modo Completo
**Goal**: Users who provide their own business data get a comparative analysis showing exactly where they stand vs competitors
**Depends on**: Phase 7
**Requirements**: MODO-01, MODO-02, MODO-03, MODO-04
**Success Criteria** (what must be TRUE):
  1. User can provide their own business URL or description alongside the niche input
  2. The system runs the same extraction cascade on the user's business as it does on competitors
  3. A comparative analysis is generated showing the user's business vs competitors side-by-side
  4. Recommendations in Modo Completo are personalized and comparative (e.g., "seu concorrente X posta 5x por semana e voce posta 2x")
**Plans**: TBD

Plans:
- [ ] 08-01: TBD

### Phase 9: Dashboard & Results UI
**Goal**: Users see all analysis results in a polished, organized, responsive interface with real-time progress feedback
**Depends on**: Phase 7
**Requirements**: DASH-01, DASH-02, DASH-03, DASH-04, DASH-05, DASH-06
**Success Criteria** (what must be TRUE):
  1. The dashboard displays all analysis sections (overview, competitors, website, SEO, social, ads, viral, recommendations, scripts) in organized, scannable cards
  2. During cascade execution, a step-by-step progress indicator shows what is running in real time ("Entendendo nicho...", "Descobrindo concorrentes...", etc.)
  3. When an extraction step fails or returns no data, the dashboard shows what succeeded with clear indicators and does not break
  4. The interface works on desktop and mobile (375px+) with responsive layout
  5. All text, labels, and AI-generated content is in Portuguese (PT-BR)
**Plans**: TBD

Plans:
- [ ] 09-01: TBD
- [ ] 09-02: TBD
- [ ] 09-03: TBD

**UI hint**: yes

### Phase 10: History, Cache & PDF Export
**Goal**: Users can revisit past analyses, get instant results for recent niches, and export reports as PDF
**Depends on**: Phase 9
**Requirements**: HIST-01, HIST-02, HIST-03, HIST-04, PDF-01, PDF-02, PDF-03
**Success Criteria** (what must be TRUE):
  1. Analysis results are persisted in Supabase by niche category and survive page refreshes
  2. User can access a history page listing all past analyses and click to view any previous result
  3. Querying the same niche within 24 hours serves cached results instantly without re-running the extraction cascade
  4. User can click "Export PDF" and receive a downloadable PDF containing all dashboard sections in a clean, printable layout with cover page
**Plans**: TBD

Plans:
- [ ] 10-01: TBD
- [ ] 10-02: TBD

**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4/5/6 (parallelizable) -> 7 -> 8 -> 9 -> 10

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Project Setup | 0/3 | Planning complete | - |
| 2. Input & AI Understanding | 0/2 | Planning complete | - |
| 3. Competitor Discovery & Orchestration | 0/2 | Planning complete | - |
| 4. Website, SEO & Social Extraction | 0/3 | Planning complete | - |
| 5. Ads Intelligence | 0/2 | Planning complete | - |
| 6. Viral Content & Transcription | 0/3 | Planning complete | - |
| 7. AI Synthesis & Creative Modeling | 0/2 | Planning complete | - |
| 8. Modo Completo | 0/1 | Not started | - |
| 9. Dashboard & Results UI | 0/3 | Not started | - |
| 10. History, Cache & PDF Export | 0/2 | Not started | - |
