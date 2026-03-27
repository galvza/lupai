# Requirements: LupAI

**Defined:** 2026-03-27
**Core Value:** Entregar em minutos o que hoje leva horas: análise completa do mercado/nicho com concorrentes mapeados, dados consolidados e recomendações estratégicas acionáveis.

## v1 Requirements

### Foundation & Setup

- [x] **FOUND-01**: Project initialized with Next.js 15.5+, TypeScript, Tailwind v4, Supabase, Trigger.dev v4
- [ ] **FOUND-02**: Database schema created in Supabase (analyses, competitors, viral content, recommendations)
- [ ] **FOUND-03**: All service clients configured (Apify, Gemini, Assembly AI, Bunny Storage, Trigger.dev)
- [x] **FOUND-04**: TypeScript types defined for all domain entities (analysis, competitor, viral content, recommendation)
- [ ] **FOUND-05**: Fixture/mock infrastructure for development without burning API credits
- [x] **FOUND-06**: Environment variables configured with .env.example

### Input & AI Understanding

- [ ] **INPT-01**: User can type a free-text description of their niche/segment in a central input field
- [ ] **INPT-02**: AI interprets the input and identifies niche, segment, and region (< 5 seconds)
- [ ] **INPT-03**: System confirms interpretation with user before proceeding (e.g., "Entendi: e-commerce de suplementos esportivos no Brasil. Correto?")
- [ ] **INPT-04**: User can adjust the interpretation before starting the analysis

### Competitor Discovery

- [ ] **COMP-01**: System automatically discovers 3-4 relevant competitors for the given niche
- [ ] **COMP-02**: System presents discovered competitors to user for confirmation
- [ ] **COMP-03**: User can remove or adjust competitors before full extraction

### Website Analysis

- [ ] **SITE-01**: System extracts competitor website data (positioning, offer, pricing when visible, meta tags)
- [ ] **SITE-02**: Results display website analysis per competitor in organized cards

### SEO Analysis

- [ ] **SEO-01**: System extracts SEO data per competitor (estimated authority, top keywords, estimated traffic)
- [ ] **SEO-02**: Results display SEO analysis per competitor with key metrics

### Social Media Analysis

- [ ] **SOCL-01**: System discovers and analyzes competitor social media presence (Instagram, TikTok)
- [ ] **SOCL-02**: System extracts posting frequency, follower counts, engagement rates, top recent posts
- [ ] **SOCL-03**: Results display social media overview per competitor

### Meta Ads Library

- [ ] **ADS-01**: System extracts active ads from Meta Ads Library per competitor (creatives, copy, format, time running)
- [ ] **ADS-02**: Results display active ads per competitor with creative previews

### Google Ads

- [ ] **GADS-01**: System detects competitor presence in Google Ads (search ads, paid keywords)
- [ ] **GADS-02**: Results display Google Ads presence per competitor

### Google Meu Negócio

- [ ] **GMB-01**: System analyzes Google My Business presence when applicable (local businesses)
- [ ] **GMB-02**: Results display GMB data when available, gracefully handles absence

### Viral Content Discovery

- [ ] **VIRL-01**: System searches for viral content in the niche across TikTok, Instagram, and Facebook (not limited to discovered competitors)
- [ ] **VIRL-02**: System downloads viral videos to Bunny Storage for transcription
- [ ] **VIRL-03**: Results display viral content gallery with engagement metrics

### Video Transcription & Analysis

- [ ] **TRNS-01**: System transcribes viral videos using Assembly AI
- [ ] **TRNS-02**: AI identifies hook, body, and CTA structure in each transcribed video
- [ ] **TRNS-03**: Results display transcription with hook/body/CTA breakdown per video

### Creative Modeling

- [ ] **CRTV-01**: AI generates 3-5 video script suggestions (roteiros) with explicit hook, body, and CTA
- [ ] **CRTV-02**: Scripts are adapted to the user's product/niche based on patterns found in viral content
- [ ] **CRTV-03**: Each script includes format recommendation (Reels, TikTok, etc.) and estimated duration
- [ ] **CRTV-04**: Results display creative scripts in structured, copy-friendly format

### AI Synthesis & Recommendations

- [ ] **SYNTH-01**: AI consolidates all collected data into a strategic overview
- [ ] **SYNTH-02**: Recommendations are specific and actionable (not generic — e.g., "seus concorrentes ranqueiam pra 'whey protein isolado' e você não tem conteúdo sobre isso")
- [ ] **SYNTH-03**: Results display recommendations in prioritized, actionable list

### Modo Completo (Comparative Analysis)

- [ ] **MODO-01**: User can provide their own business URL or description alongside the niche
- [ ] **MODO-02**: System runs the same extraction cascade on the user's business
- [ ] **MODO-03**: System generates comparative analysis: user's business vs competitors
- [ ] **MODO-04**: Recommendations in Modo Completo are personalized and comparative ("seu concorrente X posta 5x por semana e você posta 2x")

### Dashboard & Results

- [ ] **DASH-01**: Dashboard displays all analysis results in organized, scannable sections
- [ ] **DASH-02**: Real-time progress indicator during cascade execution (step-by-step: "Entendendo nicho...", "Descobrindo concorrentes...", etc.)
- [ ] **DASH-03**: Dashboard handles partial data gracefully (if one extraction fails, shows what succeeded with clear indicators)
- [ ] **DASH-04**: Interface is responsive (desktop + mobile 375px+)
- [ ] **DASH-05**: Interface is in Portuguese (PT-BR) throughout
- [ ] **DASH-06**: Interface is clean, professional, and self-explanatory

### History & Persistence

- [ ] **HIST-01**: Analysis results are saved in Supabase by niche category
- [ ] **HIST-02**: User can access a list of past analyses (history page)
- [ ] **HIST-03**: User can view a previous analysis result
- [ ] **HIST-04**: 24h cache: same niche queried within 24h serves cached results

### PDF Export

- [ ] **PDF-01**: User can export the complete analysis as a PDF report
- [ ] **PDF-02**: PDF includes all dashboard sections in clean, printable layout
- [ ] **PDF-03**: PDF has cover with logo, date, and niche name

### Orchestration & Resilience

- [ ] **ORCH-01**: Cascade of extraction runs as background jobs via Trigger.dev (not in API routes)
- [ ] **ORCH-02**: Each extraction step is independent — failure in one does not block others
- [ ] **ORCH-03**: API routes are thin dispatchers (< 10s execution to respect Vercel timeout)

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
| FOUND-02 | Phase 1 | Pending |
| FOUND-03 | Phase 1 | Pending |
| FOUND-04 | Phase 1 | Complete |
| FOUND-05 | Phase 1 | Pending |
| FOUND-06 | Phase 1 | Complete |
| INPT-01 | Phase 2 | Pending |
| INPT-02 | Phase 2 | Pending |
| INPT-03 | Phase 2 | Pending |
| INPT-04 | Phase 2 | Pending |
| COMP-01 | Phase 3 | Pending |
| COMP-02 | Phase 3 | Pending |
| COMP-03 | Phase 3 | Pending |
| SITE-01 | Phase 4 | Pending |
| SITE-02 | Phase 4 | Pending |
| SEO-01 | Phase 4 | Pending |
| SEO-02 | Phase 4 | Pending |
| SOCL-01 | Phase 4 | Pending |
| SOCL-02 | Phase 4 | Pending |
| SOCL-03 | Phase 4 | Pending |
| ADS-01 | Phase 5 | Pending |
| ADS-02 | Phase 5 | Pending |
| GADS-01 | Phase 5 | Pending |
| GADS-02 | Phase 5 | Pending |
| GMB-01 | Phase 5 | Pending |
| GMB-02 | Phase 5 | Pending |
| VIRL-01 | Phase 6 | Pending |
| VIRL-02 | Phase 6 | Pending |
| VIRL-03 | Phase 6 | Pending |
| TRNS-01 | Phase 6 | Pending |
| TRNS-02 | Phase 6 | Pending |
| TRNS-03 | Phase 6 | Pending |
| CRTV-01 | Phase 7 | Pending |
| CRTV-02 | Phase 7 | Pending |
| CRTV-03 | Phase 7 | Pending |
| CRTV-04 | Phase 7 | Pending |
| SYNTH-01 | Phase 7 | Pending |
| SYNTH-02 | Phase 7 | Pending |
| SYNTH-03 | Phase 7 | Pending |
| MODO-01 | Phase 8 | Pending |
| MODO-02 | Phase 8 | Pending |
| MODO-03 | Phase 8 | Pending |
| MODO-04 | Phase 8 | Pending |
| DASH-01 | Phase 9 | Pending |
| DASH-02 | Phase 9 | Pending |
| DASH-03 | Phase 9 | Pending |
| DASH-04 | Phase 9 | Pending |
| DASH-05 | Phase 9 | Pending |
| DASH-06 | Phase 9 | Pending |
| ORCH-01 | Phase 3 | Pending |
| ORCH-02 | Phase 3 | Pending |
| ORCH-03 | Phase 2 | Pending |
| HIST-01 | Phase 10 | Pending |
| HIST-02 | Phase 10 | Pending |
| HIST-03 | Phase 10 | Pending |
| HIST-04 | Phase 10 | Pending |
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
