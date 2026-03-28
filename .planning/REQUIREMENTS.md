# Requirements: LupAI

**Defined:** 2026-03-27
**Core Value:** Entregar em minutos o que hoje leva horas: análise completa do mercado/nicho com concorrentes mapeados, dados consolidados e recomendações estratégicas acionáveis.

## v1 Requirements

### Foundation & Setup

- [x] **FOUND-01**: Project initialized with Next.js 15.5+, TypeScript, Tailwind v4, Supabase, Trigger.dev v4
- [x] **FOUND-02**: Database schema created in Supabase (analyses, competitors, viral content, recommendations)
- [x] **FOUND-03**: All service clients configured (Apify, Gemini, Assembly AI, Bunny Storage, Trigger.dev)
- [x] **FOUND-04**: TypeScript types defined for all domain entities (analysis, competitor, viral content, recommendation)
- [x] **FOUND-05**: Fixture/mock infrastructure for development without burning API credits
- [x] **FOUND-06**: Environment variables configured with .env.example

### Input & AI Understanding

- [ ] **INPT-01**: User can type a free-text description of their niche/segment in a central input field
- [x] **INPT-02**: AI interprets the input and identifies niche, segment, and region (< 5 seconds)
- [ ] **INPT-03**: System confirms interpretation with user before proceeding (e.g., "Entendi: e-commerce de suplementos esportivos no Brasil. Correto?")
- [ ] **INPT-04**: User can adjust the interpretation before starting the analysis

### Competitor Discovery

- [x] **COMP-01**: System automatically discovers 3-4 relevant competitors for the given niche
- [ ] **COMP-02**: System presents discovered competitors to user for confirmation
- [ ] **COMP-03**: User can remove or adjust competitors before full extraction

### Website Analysis

- [x] **SITE-01**: System extracts competitor website data (positioning, offer, pricing when visible, meta tags)
- [x] **SITE-02**: Results display website analysis per competitor in organized cards

### SEO Analysis

- [x] **SEO-01**: System extracts SEO data per competitor (estimated authority, top keywords, estimated traffic)
- [x] **SEO-02**: Results display SEO analysis per competitor with key metrics

### Social Media Analysis

- [x] **SOCL-01**: System discovers and analyzes competitor social media presence (Instagram, TikTok)
- [x] **SOCL-02**: System extracts posting frequency, follower counts, engagement rates, top recent posts
- [x] **SOCL-03**: Results display social media overview per competitor

### Meta Ads Library

- [x] **ADS-01**: System extracts active ads from Meta Ads Library per competitor (creatives, copy, format, time running)
- [x] **ADS-02**: Results display active ads per competitor with creative previews

### Google Ads

- [x] **GADS-01**: System detects competitor presence in Google Ads (search ads, paid keywords)
- [x] **GADS-02**: Results display Google Ads presence per competitor

### Google Meu Negócio

- [x] **GMB-01**: System analyzes Google My Business presence when applicable (local businesses)
- [x] **GMB-02**: Results display GMB data when available, gracefully handles absence

### Viral Content Discovery

- [x] **VIRL-01**: System searches for viral content in the niche across TikTok, Instagram, and Facebook (not limited to discovered competitors)
- [x] **VIRL-02**: System downloads viral videos to Bunny Storage for transcription
- [x] **VIRL-03**: Results display viral content gallery with engagement metrics

### Video Transcription & Analysis

- [x] **TRNS-01**: System transcribes viral videos using Assembly AI
- [x] **TRNS-02**: AI identifies hook, body, and CTA structure in each transcribed video
- [x] **TRNS-03**: Results display transcription with hook/body/CTA breakdown per video

### Creative Modeling

- [x] **CRTV-01**: AI generates 3-5 video script suggestions (roteiros) with explicit hook, body, and CTA
- [x] **CRTV-02**: Scripts are adapted to the user's product/niche based on patterns found in viral content
- [x] **CRTV-03**: Each script includes format recommendation (Reels, TikTok, etc.) and estimated duration
- [x] **CRTV-04**: Results display creative scripts in structured, copy-friendly format

### AI Synthesis & Recommendations

- [x] **SYNTH-01**: AI consolidates all collected data into a strategic overview
- [x] **SYNTH-02**: Recommendations are specific and actionable (not generic — e.g., "seus concorrentes ranqueiam pra 'whey protein isolado' e você não tem conteúdo sobre isso")
- [x] **SYNTH-03**: Results display recommendations in prioritized, actionable list

### Modo Completo (Comparative Analysis)

- [x] **MODO-01**: User can provide their own business URL or description alongside the niche
- [x] **MODO-02**: System runs the same extraction cascade on the user's business
- [x] **MODO-03**: System generates comparative analysis: user's business vs competitors
- [x] **MODO-04**: Recommendations in Modo Completo are personalized and comparative ("seu concorrente X posta 5x por semana e você posta 2x")

### Dashboard & Results

- [x] **DASH-01**: Dashboard displays all analysis results in organized, scannable sections
- [x] **DASH-02**: Real-time progress indicator during cascade execution (step-by-step: "Entendendo nicho...", "Descobrindo concorrentes...", etc.)
- [x] **DASH-03**: Dashboard handles partial data gracefully (if one extraction fails, shows what succeeded with clear indicators)
- [ ] **DASH-04**: Interface is responsive (desktop + mobile 375px+)
- [ ] **DASH-05**: Interface is in Portuguese (PT-BR) throughout
- [ ] **DASH-06**: Interface is clean, professional, and self-explanatory

### History & Persistence

- [x] **HIST-01**: Analysis results are saved in Supabase by niche category
- [x] **HIST-02**: User can access a list of past analyses (history page)
- [x] **HIST-03**: User can view a previous analysis result
- [x] **HIST-04**: 24h cache: same niche queried within 24h serves cached results

### PDF Export

- [ ] **PDF-01**: User can export the complete analysis as a PDF report
- [ ] **PDF-02**: PDF includes all dashboard sections in clean, printable layout
- [ ] **PDF-03**: PDF has cover with logo, date, and niche name

### Orchestration & Resilience

- [ ] **ORCH-01**: Cascade of extraction runs as background jobs via Trigger.dev (not in API routes)
- [ ] **ORCH-02**: Each extraction step is independent — failure in one does not block others
- [x] **ORCH-03**: API routes are thin dispatchers (< 10s execution to respect Vercel timeout)

## v2 Requirements

### Monitoring & Trends

- **MONIT-01**: Scheduled re-analysis of saved niches (weekly/monthly)
- **MONIT-02**: Historical trend tracking per niche over time
- **MONIT-03**: Alerts when significant changes detected in competitor behavior

### Enhanced Discovery

- **DISC-01**: Automatic competitor discovery via Google Maps for local businesses
- **DISC-02**: Custom competitor selection (add/remove on results page)
- **DISC-03**: Multi-language/multi-market analysis

### Platform Features

- **PLAT-01**: User authentication and personal accounts
- **PLAT-02**: API pública for integration with other tools
- **PLAT-03**: Team collaboration and sharing with access control
- **PLAT-04**: Notification preferences (email alerts for monitored niches)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Campaign execution (schedule posts, run ads) | Different product category — LupAI is intelligence, not execution |
| CRM / lead management | Wrong market segment, enormous integration complexity |
| Marketing automation (email, funnels, nurture) | Different product category entirely |
| Real-time chat | High complexity, not core to intelligence value |
| Video generation from scripts | Requires video rendering infrastructure, massive cost |
| Mobile native app | Web-first, mobile later |
| OAuth / social login | No auth required for MVP |
| Influencer discovery and outreach | Different product category |
| Multi-language analysis | PT-BR only for MVP, international is v2+ |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| FOUND-01 | Phase 1 | Complete |
| FOUND-02 | Phase 1 | Complete |
| FOUND-03 | Phase 1 | Complete |
| FOUND-04 | Phase 1 | Complete |
| FOUND-05 | Phase 1 | Complete |
| FOUND-06 | Phase 1 | Complete |
| INPT-01 | Phase 2 | Pending |
| INPT-02 | Phase 2 | Complete |
| INPT-03 | Phase 2 | Pending |
| INPT-04 | Phase 2 | Pending |
| COMP-01 | Phase 3 | Complete |
| COMP-02 | Phase 3 | Pending |
| COMP-03 | Phase 3 | Pending |
| SITE-01 | Phase 4 | Complete |
| SITE-02 | Phase 4 | Complete |
| SEO-01 | Phase 4 | Complete |
| SEO-02 | Phase 4 | Complete |
| SOCL-01 | Phase 4 | Complete |
| SOCL-02 | Phase 4 | Complete |
| SOCL-03 | Phase 4 | Complete |
| ADS-01 | Phase 5 | Complete |
| ADS-02 | Phase 5 | Complete |
| GADS-01 | Phase 5 | Complete |
| GADS-02 | Phase 5 | Complete |
| GMB-01 | Phase 5 | Complete |
| GMB-02 | Phase 5 | Complete |
| VIRL-01 | Phase 6 | Complete |
| VIRL-02 | Phase 6 | Complete |
| VIRL-03 | Phase 6 | Complete |
| TRNS-01 | Phase 6 | Complete |
| TRNS-02 | Phase 6 | Complete |
| TRNS-03 | Phase 6 | Complete |
| CRTV-01 | Phase 7 | Complete |
| CRTV-02 | Phase 7 | Complete |
| CRTV-03 | Phase 7 | Complete |
| CRTV-04 | Phase 7 | Complete |
| SYNTH-01 | Phase 7 | Complete |
| SYNTH-02 | Phase 7 | Complete |
| SYNTH-03 | Phase 7 | Complete |
| MODO-01 | Phase 8 | Complete |
| MODO-02 | Phase 8 | Complete |
| MODO-03 | Phase 8 | Complete |
| MODO-04 | Phase 8 | Complete |
| DASH-01 | Phase 9 | Complete |
| DASH-02 | Phase 9 | Complete |
| DASH-03 | Phase 9 | Complete |
| DASH-04 | Phase 9 | Pending |
| DASH-05 | Phase 9 | Pending |
| DASH-06 | Phase 9 | Pending |
| ORCH-01 | Phase 3 | Pending |
| ORCH-02 | Phase 3 | Pending |
| ORCH-03 | Phase 2 | Complete |
| HIST-01 | Phase 10 | Complete |
| HIST-02 | Phase 10 | Complete |
| HIST-03 | Phase 10 | Complete |
| HIST-04 | Phase 10 | Complete |
| PDF-01 | Phase 10 | Pending |
| PDF-02 | Phase 10 | Pending |
| PDF-03 | Phase 10 | Pending |

**Coverage:**
- v1 requirements: 59 total
- Mapped to phases: 59
- Unmapped: 0

---
*Requirements defined: 2026-03-27*
*Last updated: 2026-03-27 after roadmap creation*
