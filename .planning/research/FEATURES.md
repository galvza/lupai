# Feature Research

**Domain:** Marketing Intelligence & Competitive Analysis Platform (AI-powered, niche-based)
**Researched:** 2026-03-27
**Confidence:** MEDIUM-HIGH

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete or broken.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Simple text input to start analysis** | Core promise of the product. Competely, FindNiche, and every competitor uses URL or text as entry point. Users expect zero friction. | LOW | Single field, free-text. Gemini interprets the input. Already in PROJECT.md requirements. |
| **Automatic competitor discovery** | Users come to avoid manual research. If they have to name competitors themselves, the tool is just a dashboard, not intelligence. Competely auto-suggests competitors from a URL. | HIGH | This is the hardest table-stakes feature. Requires Gemini to understand the niche + Apify scraping (Google Maps, SimilarWeb) to find real competitors. 3-4 competitors per analysis. |
| **Competitor website analysis** | Every competitive analysis tool (SimilarWeb, SEMrush, Competely, Crayon) analyzes competitor websites. Positioning, offer, pricing, meta tags are baseline data. | MEDIUM | Apify website scraper actor. Extract positioning, offer description, pricing if visible, meta tags. Gemini synthesizes the raw HTML into structured insights. |
| **Social media presence overview** | Dash Social, Sprout Social, Hootsuite -- all competitive analysis includes social media. Users expect to see posting frequency, follower counts, engagement rates. | MEDIUM | Apify Instagram + TikTok actors. Focus on: follower count, posting frequency (posts/week), average engagement rate, top-performing recent posts. |
| **Results dashboard with organized sections** | Every platform (SimilarWeb, Competely, Crayon) presents results in structured, scannable dashboards. Users expect clear sections, not a wall of text. | MEDIUM | Sections: Overview, Competitors, Social Media, Ads, Viral Content, Recommendations. Use cards, tables, and progressive disclosure. |
| **Real-time progress during analysis** | The cascade takes 1-3 minutes. Without progress feedback, users assume it is broken. NNGroup research: any process >1s needs a progress indicator; >10s needs detailed progress. | MEDIUM | Step-by-step progress: "Entendendo seu nicho..." -> "Descobrindo concorrentes..." -> "Analisando sites..." -> "Buscando conteudo viral..." -> "Gerando recomendacoes...". Polling-based with Trigger.dev status updates. |
| **AI-generated strategic recommendations** | This is the core value prop. Every tool from Competely to Crayon generates AI-powered insights. Users expect actionable recommendations, not just raw data. | MEDIUM | Gemini synthesizes all collected data into specific, actionable recommendations in PT-BR. Must NOT be generic ("melhore seu SEO") but specific ("seus concorrentes postam 5x/semana no Instagram com foco em Reels de 30s; voce deveria testar esse formato"). |
| **PDF report export** | SimilarWeb, Competely, Sprinklr, Valona -- all offer exportable reports. Marketers need to share findings with clients and stakeholders. | MEDIUM | jspdf library (already approved). Must include all dashboard sections in a clean, printable layout. Logo, date, niche name on cover. |
| **Search history** | Users expect to find past analyses. Without this, they re-run the same analysis wastefully. Even Competely tracks previous analyses. | LOW | Supabase query for past analyses. Simple list page with niche name, date, status. Link back to dashboard. No auth means all analyses are visible (acceptable for demo). |
| **Mobile-responsive layout** | 2025-2026 expectation: real-time interactivity, clean visuals, mobile responsiveness are not "nice to have" -- they are expected. Constraint in PROJECT.md: 375px+. | MEDIUM | Tailwind responsive classes. Dashboard must stack sections vertically on mobile. Charts must resize. Touch-friendly interactions. |

### Differentiators (Competitive Advantage)

Features that set LupAI apart from generic competitive intelligence tools. These are where the product competes.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Viral content discovery by niche** | Most competitive analysis tools (SimilarWeb, SEMrush, Crayon) focus on website/SEO/ads. LupAI goes further by finding what is actually going viral in the niche across TikTok, Instagram, and Facebook. Virlo does this but costs $49+/mo and is separate from competitor analysis. | HIGH | Apify TikTok + Instagram actors with niche-related hashtags/keywords. Download top viral videos to Bunny Storage. This is the bridge between "what competitors do" and "what actually works in this market." |
| **Video transcription + Hook/Body/CTA breakdown** | HookLens does this for individual ads you upload. LupAI does it automatically for discovered viral content. No other tool combines competitor analysis + automatic viral video transcription + structural breakdown. | HIGH | Assembly AI transcribes videos from Bunny Storage. Gemini analyzes transcript to identify: hook (first 3s), body (value delivery), CTA (call to action). Scores each section. This is genuinely novel in the competitor-analysis space. |
| **AI-generated creative scripts (roteiros)** | Competely analyzes competitors. HookLens analyzes ads. Neither generates new creative scripts based on what is working. LupAI bridges analysis to action: "here is what works in your niche, and here are scripts you can use." | HIGH | Gemini generates 3-5 video scripts with explicit hook, body, and CTA sections. Scripts are based on patterns found in viral content analysis. Each script has format recommendation (Reels, TikTok, etc.) and estimated duration. |
| **Meta Ads Library analysis** | Not all competitor tools include ad library scraping. Finding active competitor ads, their creatives, copy, format, and time running gives direct intelligence on what competitors are investing money in. | MEDIUM | Apify Facebook Ads Library actor. Extract: ad creative type (image/video/carousel), copy text, CTA button, start date (time running), estimated spend tier if available. |
| **Google Ads presence detection** | Knowing which keywords competitors bid on reveals their paid strategy. SpyFu specializes in this but is a separate $39+/mo tool. Including it in a niche analysis is added value. | MEDIUM | Apify Google Ads actor. Extract: presence in search ads (yes/no), top paid keywords, ad copy snippets. Even basic detection adds value vs most competitive analysis tools that skip paid search. |
| **"Modo Completo" -- comparative analysis with user's own business** | Competely compares competitors to each other. LupAI's Modo Completo compares competitors to YOUR business specifically, highlighting gaps and opportunities personalized to you. | MEDIUM | User provides their own website URL + social media. Same scraping pipeline runs on their data. Gemini generates comparative analysis: "Seu concorrente X posta 3x mais que voce" or "Voce tem melhor engajamento mas menor frequencia." |
| **Niche-level cache (24h)** | Most tools re-run full analyses every time. LupAI reuses recent data for the same niche, making subsequent analyses near-instant and saving API costs. | LOW | Supabase query: if analysis for same niche exists and is < 24h old, serve cached results. Simple but valuable for demo scenarios where the same niche is queried repeatedly. |
| **Independent cascade (graceful degradation)** | Most analysis tools fail completely if one data source is down. LupAI's cascade is designed so each extraction step is independent -- if TikTok scraping fails, the rest of the analysis still completes. | MEDIUM | Trigger.dev sub-jobs run independently. Each reports success/failure. Dashboard shows partial results with clear indicators of what succeeded and what failed. This is an architectural differentiator that directly improves UX. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but would hurt the product, especially given the 3-day timeline and demo context.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Continuous monitoring / scheduled re-analysis** | Competely offers 2-4 week monitoring cycles. Users naturally want "keep watching my competitors." | Massive infrastructure complexity: cron jobs, notification systems, change detection, storage of historical snapshots. Completely out of scope for a 3-day demo. Changes the product from "instant analysis" to "monitoring platform." | Cache results for 24h. Show "last analyzed" timestamp. Users can manually re-run. Backlog for v2. |
| **User authentication and accounts** | Natural expectation for a SaaS product. "Save my analyses to my account." | Adds auth infrastructure (Supabase Auth, session management, protected routes, email verification). Zero value for demo evaluation. Explicitly out of scope per PROJECT.md. | All analyses stored in Supabase without user association. History page shows all analyses. Acceptable for demo. |
| **Real-time collaboration / sharing** | Teams want to share competitive intelligence. Crayon and Klue have team features. | Requires auth, permissions, real-time sync, sharing URLs with access control. Enormous complexity. | PDF export covers sharing needs. Dashboard URLs are shareable by default (no auth). |
| **Campaign execution (schedule posts, run ads)** | "Now that I know what to do, let me do it from here." Natural next step after recommendations. | Completely different product category (Hootsuite, Buffer, Meta Business Suite). Requires platform API integrations for posting, ad account access, billing. Explicitly out of scope per PROJECT.md. | Clear, actionable recommendations and scripts that users can execute in their existing tools. LupAI is the "lupa" (magnifying glass), not the hands. |
| **Historical trend tracking** | "Show me how this niche changed over 6 months." Valuable for strategy, common in enterprise tools. | Requires months of historical data collection before it becomes useful. Cannot demo with fresh data. Storage and computation costs scale linearly with time. | Show current snapshot with clear date. Future: store snapshots and build trend views over time. |
| **CRM / lead management integration** | Enterprise competitive intelligence tools (Klue, Crayon) integrate with Salesforce. | Wrong market segment. LupAI targets small business owners and marketers, not enterprise sales teams. Integration complexity is enormous. | Export as PDF. Copy-paste-friendly dashboard. |
| **Multi-language analysis** | "Analyze competitors in English/Spanish markets too." | Multiplies scraping complexity (different platforms per country), translation needs, and prompt engineering. | PT-BR only. Clearly state this in the interface. International expansion is a v2+ consideration. |
| **Influencer discovery and outreach** | ViralMango analyzes 450M+ influencer profiles. "Who should I partner with?" | Different product category. Requires influencer databases, engagement scoring algorithms, outreach tools. | Viral content analysis shows which creators produce viral content in the niche. Users can note these creators manually. |
| **Custom competitor selection before analysis** | Competely lets users customize suggested competitors. "I want to analyze these specific 3 competitors." | Adds UI complexity (multi-step wizard), edge cases (invalid URLs, competitors outside the niche), and delays the user from getting results. | Auto-discover 3-4 competitors. Show who was found. Future: allow adding/removing competitors on the results page. |
| **Video generation from scripts** | Tools like Pictory and Creatify turn scripts into actual videos. "Generate the video for me." | Entirely different product (video production). Requires video rendering infrastructure, stock footage libraries, voice synthesis. Massive cost and complexity. | Generate detailed text scripts with timing, visual suggestions, and platform format. Users produce videos with their preferred tools. |

## Feature Dependencies

```
[AI Understanding Layer (Gemini interprets input)]
    |
    +--requires--> [Competitor Discovery]
    |                  |
    |                  +--requires--> [Website Analysis]
    |                  +--requires--> [Social Media Analysis]
    |                  +--requires--> [Meta Ads Library Analysis]
    |                  +--requires--> [Google Ads Analysis]
    |                  +--requires--> [Google Meu Negocio Analysis]
    |
    +--requires--> [Viral Content Discovery]
                       |
                       +--requires--> [Media Storage (Bunny)]
                                          |
                                          +--requires--> [Video Transcription (Assembly AI)]
                                                             |
                                                             +--requires--> [Hook/Body/CTA Breakdown]

[All Data Collected]
    |
    +--requires--> [AI Synthesis & Recommendations]
    +--requires--> [Creative Script Generation]

[Results Dashboard]
    +--requires--> [All Data Collected] OR [Partial Data (graceful degradation)]
    +--enhances--> [PDF Export]
    +--enhances--> [Search History]

[Real-time Progress]
    +--requires--> [Trigger.dev Job Orchestration]
    +--enhances--> [Results Dashboard]

[Modo Completo]
    +--requires--> [Basic Analysis Pipeline (Modo Rapido)]
    +--enhances--> [AI Synthesis] (adds comparative dimension)

[Niche Cache]
    +--enhances--> [All Analysis Steps] (skip re-scraping)
    +--requires--> [Supabase Persistence]
```

### Dependency Notes

- **AI Understanding requires nothing external:** It is the entry point. Gemini processes the text input and outputs structured niche data (niche name, segment, region, keywords). Everything downstream depends on this.
- **Competitor Discovery requires AI Understanding:** Cannot find competitors without knowing what niche to search in. This is the critical bottleneck -- if discovery fails, most downstream analysis cannot run.
- **Viral Content Discovery is independent from Competitor Discovery:** Both depend on AI Understanding but not on each other. This enables parallel execution in the Trigger.dev cascade.
- **Video Transcription requires Media Storage:** Videos must be downloaded to Bunny Storage before Assembly AI can transcribe them. This is a hard sequential dependency.
- **Hook/Body/CTA Breakdown requires Transcription:** Cannot analyze video structure without the transcript text.
- **Creative Script Generation requires both Viral Analysis and Competitor Analysis:** Scripts are modeled on patterns found in both viral content and competitor strategies.
- **Modo Completo requires Modo Rapido pipeline:** It is an extension, not an alternative. The user's own data goes through the same extraction pipeline, then comparative analysis is layered on top.
- **PDF Export requires Dashboard data:** PDF is a serialization of the dashboard, not independent content.
- **Niche Cache enhances all steps:** If cache hit, skip scraping entirely and serve stored results. Does not change the dependency graph, just short-circuits it.

## MVP Definition

### Launch With (v1 -- Demo for Challenge)

Given the 3-day deadline (deliver by 2026-03-30 14h), the MVP must be ruthlessly scoped.

- [x] **Simple text input** -- Single field, Gemini interprets. Zero friction entry.
- [x] **AI Understanding Layer** -- Gemini extracts niche, segment, region, keywords from free text.
- [x] **Competitor Discovery** -- Find 3-4 real competitors via Apify (Google Maps, SimilarWeb, web search).
- [x] **Website Analysis** -- Apify website scraper extracts positioning, offer, pricing, meta tags per competitor.
- [x] **Social Media Analysis** -- Apify Instagram + TikTok actors extract follower counts, posting frequency, engagement metrics.
- [x] **Viral Content Discovery** -- Find top viral posts/videos in the niche via TikTok and Instagram.
- [x] **Video Transcription** -- Download viral videos to Bunny, transcribe via Assembly AI.
- [x] **Hook/Body/CTA Breakdown** -- Gemini analyzes transcripts for structural patterns.
- [x] **AI Synthesis & Recommendations** -- Consolidate all data into specific, actionable recommendations in PT-BR.
- [x] **Creative Script Generation** -- Generate 3-5 video scripts with hook/body/CTA based on what is working.
- [x] **Results Dashboard** -- Organized sections: overview, competitors, social, ads, viral, recommendations, scripts.
- [x] **Real-time Progress** -- Step-by-step status updates during the 1-3 minute cascade.
- [x] **Independent Cascade** -- Each extraction step can fail without blocking others.
- [x] **Niche Cache (24h)** -- Reuse recent results for same niche.
- [x] **Search History** -- List of past analyses with links back to dashboards.

### Add After Validation (v1.x)

Features to add once the demo succeeds and the product moves toward real users.

- [ ] **Meta Ads Library Analysis** -- Add when Apify Facebook Ads actor is tested and stable. Trigger: user feedback requesting ad intelligence.
- [ ] **Google Ads Analysis** -- Add when Apify Google Ads actor is validated. Trigger: users asking "what keywords are my competitors bidding on?"
- [ ] **Modo Completo** -- Add comparative analysis when basic pipeline is stable. Trigger: users wanting personalized recommendations vs just niche-level insights.
- [ ] **PDF Export** -- Add after dashboard is stable and content is finalized. Trigger: users wanting to share reports with clients.
- [ ] **Google Meu Negocio Analysis** -- Add for local business niches. Trigger: users submitting local business niches (restaurants, clinics, etc.).
- [ ] **Custom competitor selection** -- Allow users to add/remove discovered competitors. Trigger: user feedback that auto-discovered competitors are not relevant.

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] **Continuous monitoring** -- Scheduled re-analysis with change detection and alerts. Defer: requires fundamentally different architecture (cron, notifications, historical storage).
- [ ] **User authentication** -- Login, saved analyses per user, team sharing. Defer: only needed when product has repeat users who need persistence.
- [ ] **Historical trend tracking** -- Niche trends over time. Defer: requires months of data accumulation before being useful.
- [ ] **Multi-language support** -- Analysis in English, Spanish, etc. Defer: multiplies complexity across every pipeline stage.
- [ ] **API for integrations** -- Third-party access to LupAI data. Defer: requires auth, rate limiting, documentation, versioning.
- [ ] **SEO deep analysis** -- Backlink profiles, keyword rankings, domain authority. Defer: requires specialized data sources (Ahrefs-level data) beyond current Apify actors.

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Simple text input | HIGH | LOW | P1 |
| AI Understanding Layer | HIGH | MEDIUM | P1 |
| Competitor Discovery | HIGH | HIGH | P1 |
| Website Analysis | HIGH | MEDIUM | P1 |
| Social Media Analysis | HIGH | MEDIUM | P1 |
| Viral Content Discovery | HIGH | HIGH | P1 |
| Video Transcription | HIGH | MEDIUM | P1 |
| Hook/Body/CTA Breakdown | HIGH | MEDIUM | P1 |
| AI Synthesis & Recommendations | HIGH | MEDIUM | P1 |
| Creative Script Generation | HIGH | MEDIUM | P1 |
| Results Dashboard | HIGH | MEDIUM | P1 |
| Real-time Progress | HIGH | MEDIUM | P1 |
| Independent Cascade | MEDIUM | MEDIUM | P1 |
| Niche Cache (24h) | MEDIUM | LOW | P1 |
| Search History | MEDIUM | LOW | P1 |
| Meta Ads Library Analysis | HIGH | MEDIUM | P2 |
| Google Ads Analysis | MEDIUM | MEDIUM | P2 |
| Modo Completo | HIGH | MEDIUM | P2 |
| PDF Export | MEDIUM | MEDIUM | P2 |
| Google Meu Negocio | MEDIUM | MEDIUM | P2 |
| Custom competitor selection | LOW | LOW | P2 |
| Continuous monitoring | HIGH | HIGH | P3 |
| User authentication | MEDIUM | MEDIUM | P3 |
| Historical trends | HIGH | HIGH | P3 |
| Multi-language | MEDIUM | HIGH | P3 |

**Priority key:**
- P1: Must have for launch (demo delivery)
- P2: Should have, add when the core pipeline is stable
- P3: Nice to have, future product evolution

## Competitor Feature Analysis

| Feature | Competely | SimilarWeb | Crayon | HookLens | Virlo | LupAI (planned) |
|---------|-----------|------------|--------|----------|-------|-----------------|
| Text/URL input | URL + description | URL only | Company name | Video upload | Niche keywords | Free text (niche description) |
| Auto competitor discovery | Yes (AI suggests) | No (manual) | No (manual setup) | N/A | N/A | Yes (AI + scraping) |
| Website analysis | Yes (100+ data points) | Yes (traffic, keywords) | Yes (page changes) | No | No | Yes (positioning, offer, pricing) |
| SEO analysis | Basic | Deep (industry leader) | No | No | No | Basic (via SimilarWeb actor) |
| Social media analysis | Basic mentions | Basic | Monitoring | No | Deep (TikTok/IG/YT) | Medium (followers, engagement, posts) |
| Ad library scraping | No | Display ads | No | Analyzes uploaded ads | No | Yes (Meta Ads Library) |
| Viral content discovery | No | No | No | No | Yes (core feature) | Yes (TikTok + Instagram) |
| Video transcription | No | No | No | Yes (core feature) | No | Yes (Assembly AI) |
| Hook/Body/CTA analysis | No | No | No | Yes (core feature) | Partial (AI analysis) | Yes (Gemini analysis) |
| Creative script generation | No | No | No | Script rewriting | No | Yes (original scripts) |
| AI recommendations | SWOT analysis | No | Battlecards | Ad improvement tips | Trend suggestions | Full strategic recommendations |
| PDF export | CSV/PDF | Yes | Yes | Yes | No | Yes (planned P2) |
| Continuous monitoring | Yes (2-4 weeks) | Yes | Yes (real-time) | No | Yes (24/7) | No (cache only, v2) |
| Pricing | $39-99/mo | $149+/mo | $2,000+/yr | Unknown | $49+/mo | Free (demo) |

**Key insight from competitor analysis:** No single tool combines competitor discovery + social media analysis + viral content discovery + video transcription + hook/body/CTA breakdown + creative script generation. LupAI is assembling capabilities that currently require 3-4 separate paid tools (SimilarWeb + Virlo + HookLens + a scriptwriting tool). This is the core value proposition: "minutes instead of hours, one tool instead of four."

## Sources

- [Competely - Instant Competitive Analysis](https://competely.ai/) -- Primary competitor with similar input model
- [Improvado - Marketing Intelligence Tools 2026](https://improvado.io/blog/marketing-intelligence-tools) -- Market landscape overview
- [Contify - Best Competitive Intelligence Tools 2026](https://www.contify.com/resources/blog/best-competitive-intelligence-tools/) -- Tool comparison
- [Crayon - Competitive Intelligence Software](https://www.crayon.co/) -- Enterprise CI platform features
- [Virlo - Short-Form Video Analytics](https://virlo.ai/) -- Viral content discovery features
- [HookLens - AI Video Ad Scanner](https://www.hooklens.net/) -- Hook/Body/CTA analysis features
- [Visualping - Best AI Tools for Competitor Analysis 2026](https://visualping.io/blog/best-ai-tools-competitor-analysis) -- Market overview
- [Dash Social - Social Media Competitive Analysis](https://www.dashsocial.com/blog/social-media-competitive-analysis) -- Social media analysis features
- [MagicBrief - Guide to Competitor Research for Social Media Ads](https://magicbrief.com/post/a-comprehensive-guide-to-competitor-research-for-social-media-ads) -- Ad research methodology
- [Smashing Magazine - UX Strategies for Real-Time Dashboards](https://www.smashingmagazine.com/2025/09/ux-strategies-real-time-dashboards/) -- Dashboard UX patterns
- [NNGroup - Progress Indicators](https://www.nngroup.com/articles/progress-indicators/) -- Progress UX best practices
- [Sovran - Hook Body CTA Video Editor Guide 2025](https://sovran.ai/blog/hook-body-cta-video-editor-the-ultimate-guide-to-creating-high-converting-video-ads-in-2025) -- Hook/Body/CTA framework
- [Planable - 13 Popular TikTok Tools 2026](https://planable.io/blog/tiktok-tools/) -- TikTok ecosystem tools

---
*Feature research for: Marketing Intelligence & Competitive Analysis Platform*
*Researched: 2026-03-27*
