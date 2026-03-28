# LupAI

## What This Is

Uma plataforma de inteligência e análise de marketing com IA que, a partir de um input simples sobre o negócio do usuário, descobre concorrentes, analisa o mercado, identifica conteúdos virais do nicho, transcreve e analisa vídeos, entrega recomendações estratégicas acionáveis e modela conteúdo sugerido (roteiros de vídeo com gancho, corpo e CTA). LupAI é uma lupa inteligente pro mercado — investiga, analisa, recomenda e modela conteúdo. A execução fica com o time.

## Core Value

Entregar em minutos o que hoje leva horas: uma análise completa do mercado/nicho com concorrentes mapeados, dados consolidados e recomendações estratégicas acionáveis — tudo a partir de um input simples.

## Requirements

### Validated

- ✓ Project scaffolded with Next.js 15.5, TypeScript 5.7, Tailwind v4, Trigger.dev v4 — Phase 1
- ✓ Database schema (4 tables: analyses, competitors, viral_content, synthesis) — Phase 1
- ✓ All service clients configured (Apify, Gemini, AssemblyAI, Bunny, Trigger.dev) — Phase 1
- ✓ TypeScript domain types defined (17+ interfaces, zero `any`) — Phase 1
- ✓ Fixture/mock infrastructure (11 JSON, 6 factories, 23 tests passing) — Phase 1
- ✓ Environment configuration with Zod validation — Phase 1
- ✓ Input classification (5 categories: MINIMAL/MEDIUM/URL/EXCESSIVE/NONSENSE) with pre-Gemini validation — Phase 2
- ✓ AI understanding: Gemini interprets niche input with branching per classification — Phase 2
- ✓ API routes: POST /api/analyze/understand + POST /api/analyze (thin dispatchers < 10s) — Phase 2
- ✓ Trigger.dev analyze-market task stub ready for Phase 3 orchestration — Phase 2
- ✓ Competitor discovery: 4 parallel Apify sources + Gemini AI scoring (70+ threshold, top 3-4) — Phase 3
- ✓ Trigger.dev orchestrator: full 11-step pipeline with batch fan-out and independent sub-tasks — Phase 3
- ✓ Waitpoint confirmation: user confirms competitors before extraction via API route — Phase 3
- ✓ Extraction stub fan-out: 4 extraction stubs wired for Phases 4/5/6 — Phase 3
- ✓ Website extraction: Apify crawler + social link discovery + CNPJ/email extraction — Phase 4
- ✓ SEO extraction: SimilarWeb parallel with website scraping, Zod validation — Phase 4
- ✓ Social media extraction: 3-tier discovery (website > Google Search > AI hints), Instagram + TikTok parallel — Phase 4
- ✓ 2-batch sequential orchestrator: website+viral first, then social+ads with enriched social links — Phase 4
- ✓ Extraction resilience: retry config, fallback chains, never-fail pattern, status objects — Phase 4
- ✓ Meta Ads Library extraction: pageUrl-first search + keyword fallback, up to 20 ads per competitor — Phase 5
- ✓ Google Ads detection: domain-based Ads Transparency + topic fallback, paid keywords extraction — Phase 5
- ✓ Google My Business extraction: name+region search, graceful null for absent listings — Phase 5
- ✓ Extract-ads compound task: 3-way parallel (Promise.allSettled), Zod validation, never-throw — Phase 5
- ✓ Viral content extraction: TikTok + Instagram viral search, Bunny Storage upload, transcription pipeline — Phase 6
- ✓ AI synthesis: Gemini structured output with 8 sections, creative modeling (roteiros com gancho/corpo/CTA) — Phase 7
- ✓ Modo Completo: role-based competitor schema, user business extraction in orchestrator, comparative synthesis pipeline — Phase 8

### Active
- [ ] Análise do site (posicionamento, oferta, preços, meta tags)
- [ ] Análise de SEO (autoridade estimada, palavras-chave principais, tráfego estimado)
- [ ] Descoberta e análise de redes sociais (posts recentes, frequência, engajamento)
- [x] Anúncios ativos na Biblioteca de Anúncios do Meta (criativos, copy, formato, tempo no ar) — Phase 5 (backend extraction)
- [x] Análise de anúncios no Google Ads (presença em search, palavras-chave pagas) — Phase 5 (backend extraction)
- [x] Análise de presença no Google Meu Negócio (quando aplicável) — Phase 5 (backend extraction)
- [ ] Inteligência de conteúdo viral: busca o que está viralizando no nicho (TikTok, Instagram, Facebook)
- [ ] Transcrição e análise de vídeos virais: IA transcreve, identifica gancho, corpo e CTA
- [ ] Modelagem automática de criativos: IA gera roteiros de vídeo com gancho, corpo e CTA
- [ ] Síntese com IA: consolida todos os dados e gera recomendações estratégicas acionáveis
- [ ] Dashboard/relatório visual com os resultados organizados
- [ ] Exportação de relatórios em PDF
- [x] Modo Completo: usuário informa dados do próprio negócio, sistema cruza com concorrentes — Phase 8 (backend)
- [x] Recomendações personalizadas no Modo Completo (comparativas) — Phase 8 (backend)
- [ ] Persistência de dados: resultados salvos por categoria de nicho
- [ ] Histórico de pesquisas acessível
- [ ] Interface web responsiva, didática e autoexplicativa (sem autenticação)
- [ ] Progresso em tempo real durante a cascata de extração

### Out of Scope

- Monitoramento contínuo/agendado de concorrentes — backlog futuro, alta complexidade
- Histórico de tendências por nicho ao longo do tempo — backlog futuro
- Descoberta automática via Google Maps pra negócios locais — backlog futuro
- Autenticação e contas de usuário — não necessário pra MVP
- API pública pra integração — backlog futuro
- Execução de campanhas (agendar posts, subir campanhas, automatizar anúncios) — fora do escopo do produto
- CRM ou gerenciamento de clientes — fora do escopo do produto
- Automação de marketing (nutrição de leads, email marketing, funis) — fora do escopo do produto
- Real-time chat — alta complexidade, não é core
- Video posts — custo de storage/bandwidth
- OAuth login — email/password suficiente (na verdade, sem auth no MVP)
- Mobile app nativo — web-first

## Context

- **Personas:** Profissional de marketing (agência/in-house) e dono de pequeno/médio negócio
- **Stack definida:** Next.js 14+ (App Router), TypeScript, Supabase (PostgreSQL), Tailwind CSS, Trigger.dev 3.x (jobs assíncronos), Google Gemini API (gemini-2.0-flash), Apify (scraping), Assembly AI (transcrição), Bunny CDN + Storage (mídia), Vitest (testes)
- **Deploy:** Vercel
- **Interface em PT-BR:** Toda a interface e recomendações em português brasileiro
- **Sem autenticação:** Produto funciona sem login. Pesquisas salvas no banco sem associação a usuário
- **Dois modos:** Modo Rápido (só nicho) e Modo Completo (nicho + dados do negócio)
- **Cascata independente:** Cada etapa de extração é independente — falha em uma não impede as outras
- **Fluxo de mídia:** Apify → download → Bunny Storage → Assembly AI (transcrição)
- **Cache:** Reutilizar dados de pesquisas recentes < 24h por nicho
- **Prazo:** Entrega até 30/03/2026 às 14h (projeto de demonstração para desafio)
- **Prioridade:** Produto funcional no ar. Polimento visual é secundário.

## Constraints

- **Timeline**: Entrega até 30/03/2026 14h — projeto de demonstração para desafio de recrutamento
- **Tech stack**: Next.js 14+ App Router, TypeScript, Supabase, Tailwind, Trigger.dev, Gemini API, Apify, Assembly AI, Bunny CDN — stack já definida e aprovada
- **Budget**: Free tiers dos serviços (Apify créditos gratuitos, Supabase free, Gemini free tier, Vercel free) — volume baixo (<50 pesquisas)
- **No auth**: Sem autenticação por requisito do desafio
- **Performance**: Camada de entendimento < 5s, cascata completa 1-3 min com progresso real-time, dashboard < 2s após extração
- **Compatibility**: Desktop Chrome/Firefox/Safari últimas 2 versões, mobile responsivo 375px+
- **Availability**: 24/7 durante período de avaliação

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Apify como hub central de scraping | Actors prontos, evita manter scrapers próprios | — Pending |
| Gemini API (gemini-2.0-flash) como IA | Free tier, boa qualidade pra entendimento e síntese | — Pending |
| Trigger.dev pra jobs assíncronos | Cascata pode levar 1-3 min, precisa background processing | — Pending |
| Bunny CDN + Storage pra mídia | Necessário hospedar vídeos pra transcrição, CDN pra performance | — Pending |
| Sem autenticação no MVP | Requisito do desafio, simplifica UX | — Pending |
| Interface em PT-BR | Público-alvo brasileiro, desafio em português | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-03-28 after Phase 5 completion*
