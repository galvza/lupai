# CLAUDE.md

## Sobre este projeto

LupAI é uma plataforma de inteligência e análise de marketing com IA. A partir de um input simples (descrição do nicho ou URL do negócio), o sistema descobre concorrentes, analisa o mercado, identifica conteúdos virais, transcreve e analisa vídeos, e entrega recomendações estratégicas acionáveis com modelagem de criativos (roteiros com gancho, corpo e CTA).

---

## Stack

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| Linguagem | TypeScript | 5.5+ |
| Runtime | Node.js | 20 LTS |
| Framework | Next.js (App Router) | 14.2+ |
| Banco de dados | Supabase (PostgreSQL) | latest |
| Estilização | Tailwind CSS | 3.4+ |
| Jobs assíncronos | Trigger.dev | 3.x |
| IA | Google Gemini API | gemini-2.0-flash |
| Scraping | Apify (actors via API REST) | latest |
| Transcrição | Assembly AI ou Whisper | latest |
| Storage de mídia | Bunny CDN + Storage | latest |
| Testes | Vitest | 2.x |
| Gerenciador de pacotes | npm | 10+ |
| Deploy | Vercel | latest |

---

## Comandos essenciais

```bash
# Instalar dependências
npm install

# Rodar em desenvolvimento
npm run dev

# Rodar testes
npm test

# Rodar testes em modo watch
npm run test:watch

# Build de produção
npm run build

# Lint
npm run lint

# Verificação de tipos
npm run typecheck

# Trigger.dev — rodar worker local
npx trigger.dev@latest dev
```

---

## Estrutura de pastas

```
lupai/
├── src/
│   ├── app/                    # Next.js App Router — páginas e layouts
│   │   ├── page.tsx            # Homepage com input principal
│   │   ├── analysis/
│   │   │   └── [id]/
│   │   │       └── page.tsx    # Dashboard de resultados da análise
│   │   ├── history/
│   │   │   └── page.tsx        # Histórico de pesquisas
│   │   ├── api/
│   │   │   ├── analyze/
│   │   │   │   └── route.ts    # Endpoint que inicia a análise
│   │   │   ├── status/
│   │   │   │   └── [id]/
│   │   │   │       └── route.ts # Polling do status do job
│   │   │   └── report/
│   │   │       └── [id]/
│   │   │           └── route.ts # Gerar PDF do relatório
│   │   └── layout.tsx          # Layout global
│   ├── components/
│   │   ├── ui/                 # Componentes base (botões, inputs, cards, loading)
│   │   ├── analysis/           # Componentes do dashboard de análise
│   │   ├── competitors/        # Componentes de exibição de concorrentes
│   │   ├── viral/              # Componentes de conteúdo viral
│   │   └── report/             # Componentes de relatório/PDF
│   ├── lib/
│   │   ├── apify/              # Clientes e wrappers dos actors da Apify
│   │   │   ├── instagram.ts    # Actor de Instagram
│   │   │   ├── tiktok.ts       # Actor de TikTok
│   │   │   ├── facebook-ads.ts # Actor de Biblioteca de Anúncios Meta
│   │   │   ├── similarweb.ts   # Actor de SimilarWeb
│   │   │   ├── google-maps.ts  # Actor de Google Maps
│   │   │   ├── google-ads.ts   # Actor de Google Ads
│   │   │   └── website.ts      # Actor de scraping de site
│   │   ├── ai/                 # Integração com Gemini API
│   │   │   ├── understand.ts   # Camada de entendimento do input
│   │   │   ├── synthesize.ts   # Síntese dos dados em recomendações
│   │   │   ├── creative.ts     # Modelagem de criativos (roteiros)
│   │   │   └── prompts.ts      # Templates de prompts
│   │   ├── transcription/      # Integração com Assembly AI / Whisper
│   │   │   └── transcribe.ts   # Transcrição de vídeos
│   │   ├── storage/            # Integração com Bunny CDN + Storage
│   │   │   └── bunny.ts        # Upload, download e delete de mídia
│   │   ├── supabase/           # Cliente e queries do Supabase
│   │   │   ├── client.ts       # Cliente Supabase
│   │   │   └── queries.ts      # Queries organizadas
│   │   └── pdf/                # Geração de relatórios PDF
│   │       └── generate.ts     # Gerar PDF a partir dos dados
│   ├── trigger/                # Jobs do Trigger.dev
│   │   ├── analyze-market.ts   # Job principal: orquestra toda a cascata
│   │   ├── extract-competitors.ts  # Sub-job: extração de dados dos concorrentes
│   │   ├── extract-viral.ts    # Sub-job: busca de conteúdo viral + download de vídeos pro Bunny
│   │   └── synthesize.ts       # Sub-job: síntese com IA
│   ├── hooks/                  # React hooks customizados
│   │   ├── useAnalysis.ts      # Hook pra acompanhar status da análise
│   │   └── usePolling.ts       # Hook genérico de polling
│   ├── types/                  # Tipos TypeScript
│   │   ├── analysis.ts         # Tipos da análise (input, output, status)
│   │   ├── competitor.ts       # Tipos de concorrente
│   │   ├── viral.ts            # Tipos de conteúdo viral
│   │   └── database.ts         # Tipos do banco de dados
│   ├── utils/                  # Funções utilitárias
│   │   ├── formatters.ts       # Formatadores de dados
│   │   └── validators.ts       # Validação de input
│   └── config/                 # Configurações
│       ├── apify.ts            # Config dos actors da Apify
│       ├── gemini.ts           # Config da Gemini API
│       ├── supabase.ts         # Config do Supabase
│       └── bunny.ts            # Config do Bunny CDN + Storage
├── trigger.config.ts           # Configuração do Trigger.dev
├── tests/
│   ├── unit/                   # Testes unitários
│   ├── integration/            # Testes de integração
│   └── fixtures/               # Dados de teste (mocks dos actors)
├── public/                     # Arquivos estáticos
├── supabase/
│   └── migrations/             # Migrations SQL
├── .env.example                # Variáveis de ambiente (modelo)
├── CLAUDE.md                   # Este arquivo
├── ARCHITECTURE.md             # Documentação de arquitetura
└── README.md                   # Documentação pro desafio
```

---

## Convenções de código

### Nomenclatura

| Elemento | Padrão | Exemplo |
|----------|--------|---------|
| Arquivos de componente | PascalCase | CompetitorCard.tsx |
| Arquivos utilitários/lib | camelCase | formatDate.ts |
| Variáveis e funções | camelCase | getCompetitors() |
| Constantes | UPPER_SNAKE_CASE | MAX_COMPETITORS |
| Tipos/Interfaces | PascalCase | AnalysisResult |
| Tabelas no banco | snake_case plural | analyses, competitors |
| Colunas no banco | snake_case | created_at, niche_name |
| Jobs do Trigger.dev | kebab-case | analyze-market |

### Estilo

- Usar arrow functions pra componentes: `const Component = () => {}`
- Preferir `const` sobre `let`. Nunca usar `var`.
- Funções com mais de 30 linhas devem ser divididas.
- Imports organizados: libs externas primeiro, depois internos, depois tipos.
- Toda função pública deve ter JSDoc com descrição e parâmetros.
- Mensagens de erro e interface em português brasileiro.
- Recomendações da IA em português brasileiro.

### Git

**Regra fundamental: cada feature/task deve ter seu próprio commit.** Nunca acumular múltiplas features num commit só. O histórico do Git deve contar a história do projeto task por task.

```
tipo(escopo): descrição curta

Tipos: feat, fix, refactor, test, docs, chore
Escopo: área do projeto afetada

Exemplos:
feat(apify): adicionar integração com TikTok Scraper
fix(ai): corrigir prompt de síntese gerando recomendações genéricas
test(cascade): adicionar testes da cascata de extração
docs(readme): adicionar seção de arquitetura no README
```

**Fluxo de commits:**
1. Completou uma task/feature → roda os testes
2. Testes passaram → commit imediato com mensagem descritiva
3. Próxima task → novo commit
4. Nunca fazer um "commitão" com várias coisas juntas

---

## Variáveis de ambiente

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=url_do_projeto_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=chave_anonima_supabase
SUPABASE_SERVICE_ROLE_KEY=chave_service_role_supabase

# Apify
APIFY_API_TOKEN=token_da_apify

# Gemini AI
GEMINI_API_KEY=chave_da_gemini_api

# Transcrição
ASSEMBLY_AI_API_KEY=chave_assembly_ai

# Trigger.dev
TRIGGER_API_KEY=chave_trigger_dev
TRIGGER_API_URL=url_trigger_dev

# Bunny CDN + Storage
BUNNY_STORAGE_API_KEY=chave_api_bunny_storage
BUNNY_STORAGE_ZONE_NAME=nome_da_storage_zone
BUNNY_CDN_URL=url_do_pullzone_bunny

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

> **IMPORTANTE:** O Claude Code nunca deve criar valores reais pras variáveis. Só o .env.example com descrições.

---

## Regras do Claude Code

### DEVE fazer
- Fazer commit atômico após cada feature/task completada (nunca acumular)
- Rodar testes após cada mudança significativa
- Seguir a estrutura de pastas definida acima
- Usar os tipos/interfaces definidos em `src/types/`
- Tratar erros com mensagens descritivas em português
- Manter funções pequenas e com responsabilidade única
- Cada etapa da cascata de extração deve ser independente (falha em uma não impede as outras)
- Commitar com mensagens no padrão definido
- Usar GSD framework pra gerenciar o fluxo de trabalho
- Toda mídia (imagens, vídeos, thumbnails, criativos) deve ser baixada e hospedada no Bunny Storage
- Vídeos hospedados no Bunny são a fonte pra transcrição via Assembly AI (fluxo: Apify → download → Bunny → Assembly AI)
- Implementar cache de resultados por nicho (reutilizar dados de pesquisas recentes < 24h)
- Filtrar e armazenar apenas campos relevantes dos outputs da Apify (não guardar output bruto inteiro)

### NÃO deve fazer
- Instalar dependências sem que estejam na lista de stack aprovada
- Criar arquivos fora da estrutura definida
- Alterar configurações de ambiente (.env) com valores reais
- Pular testes pra "ganhar tempo"
- Usar `any` como tipo (TypeScript) sem justificativa
- Fazer deploy sem todos os testes passando
- Fazer chamadas síncronas pra processos que levam mais de 10 segundos (usar Trigger.dev)
- Gerar recomendações genéricas na camada de IA — toda recomendação deve ser específica e acionável

### Quando travar
Se encontrar um problema que não consegue resolver em 3 tentativas:
1. Parar
2. Descrever o problema claramente
3. Listar o que já tentou
4. Pedir orientação

---

## Dependências aprovadas

### Produção
| Pacote | Versão | Pra quê |
|--------|--------|---------|
| next | 14.2+ | Framework web |
| react | 18.x | UI |
| react-dom | 18.x | UI |
| tailwindcss | 3.4+ | Estilização |
| @supabase/supabase-js | 2.x | Cliente Supabase |
| @trigger.dev/sdk | 3.x | Jobs assíncronos |
| @google/generative-ai | latest | Gemini API |
| apify-client | 2.x | Cliente Apify |
| assemblyai | latest | Transcrição de vídeo |
| jspdf | 2.x | Geração de PDF |
| lucide-react | latest | Ícones |
| recharts | 2.x | Gráficos (se necessário) |
| zod | 3.x | Validação de schemas |

### Desenvolvimento
| Pacote | Versão | Pra quê |
|--------|--------|---------|
| vitest | 2.x | Testes |
| @testing-library/react | 14.x | Testes de componentes |
| eslint | 8.x | Lint |
| eslint-config-next | 14.x | Lint Next.js |
| typescript | 5.5+ | Tipagem |
| @types/react | 18.x | Tipos React |
| @types/node | 20.x | Tipos Node |

---

## Contexto adicional

- **PRD:** Consultar PRD-LUPAI.md pra requisitos completos do produto
- **Arquitetura:** Consultar ARCHITECTURE.md pra detalhamento técnico e fluxos de dados
- **GSD:** O projeto usa o framework Get Shit Done — seguir os commands do GSD pra gerenciar fases de desenvolvimento
- **Apify actors:** Documentação dos actors usados está nos links da Apify Store. Cada actor tem input/output específico — consultar docs antes de implementar
- **Bunny Storage:** Usa API REST direta (sem SDK). Docs: https://docs.bunny.net/reference/storage-api. Upload via PUT, download via GET, delete via DELETE. CDN URL é o pullzone configurado
- **Sem autenticação:** O produto funciona sem login. Pesquisas são salvas no banco mas sem associação a usuário
- **Dois modos:** Modo Rápido (só nicho) e Modo Completo (nicho + dados do negócio do usuário)
- **Interface em PT-BR:** Toda a interface e recomendações em português brasileiro

<!-- GSD:project-start source:PROJECT.md -->
## Project

**LupAI**

Uma plataforma de inteligência e análise de marketing com IA que, a partir de um input simples sobre o negócio do usuário, descobre concorrentes, analisa o mercado, identifica conteúdos virais do nicho, transcreve e analisa vídeos, entrega recomendações estratégicas acionáveis e modela conteúdo sugerido (roteiros de vídeo com gancho, corpo e CTA). LupAI é uma lupa inteligente pro mercado — investiga, analisa, recomenda e modela conteúdo. A execução fica com o time.

**Core Value:** Entregar em minutos o que hoje leva horas: uma análise completa do mercado/nicho com concorrentes mapeados, dados consolidados e recomendações estratégicas acionáveis — tudo a partir de um input simples.

### Constraints

- **Timeline**: Entrega até 30/03/2026 14h — projeto de demonstração para desafio de recrutamento
- **Tech stack**: Next.js 14+ App Router, TypeScript, Supabase, Tailwind, Trigger.dev, Gemini API, Apify, Assembly AI, Bunny CDN — stack já definida e aprovada
- **Budget**: Free tiers dos serviços (Apify créditos gratuitos, Supabase free, Gemini free tier, Vercel free) — volume baixo (<50 pesquisas)
- **No auth**: Sem autenticação por requisito do desafio
- **Performance**: Camada de entendimento < 5s, cascata completa 1-3 min com progresso real-time, dashboard < 2s após extração
- **Compatibility**: Desktop Chrome/Firefox/Safari últimas 2 versões, mobile responsivo 375px+
- **Availability**: 24/7 durante período de avaliação
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

## Critical Findings vs. CLAUDE.md
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
# Core framework
# Database and backend services
# AI and processing
# Scraping
# Background jobs + realtime
# UI
# Validation and utilities
# PDF
# Dev dependencies
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
- Use `@google/genai` directly with `ai.models.generateContent()`
- Model: `gemini-2.0-flash` for speed + cost-efficiency on free tier
- Structured output: Use Zod schemas with Gemini's structured output mode for type-safe AI responses
- Run AI calls inside Trigger.dev tasks to avoid Vercel function timeout (10s hobby / 60s pro)
- Use `apify-client` to call actors asynchronously
- Each actor call should be a sub-task in the Trigger.dev job
- Independent failure: if Instagram actor fails, TikTok actor still runs
- Filter Apify output immediately -- store only relevant fields in Supabase
- Use `@trigger.dev/react-hooks` `useRealtimeRun` or `useRealtimeRunsWithTag`
- The Realtime API uses Electric SQL under the hood -- no SSE/WebSocket setup needed
- On the frontend: subscribe to the main orchestrator run to show cascading progress
- Download media from Apify output URLs using `fetch()` in Trigger.dev tasks
- Upload to Bunny Storage via PUT request with `fetch()`
- Pass Bunny CDN URL to AssemblyAI for transcription
- Store transcription result in Supabase
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
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd:profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
