# LupAI

**Inteligência competitiva com IA para times de marketing.**

Uma lupa inteligente pro seu mercado: digite seu nicho, e em minutos receba concorrentes mapeados, conteúdo viral analisado, recomendações estratégicas e roteiros de vídeo prontos pra gravar.

---

## O problema

Um gestor de marketing de uma agência recebe um novo cliente: uma barbearia premium em São Paulo. Antes de propor qualquer estratégia, ele precisa entender o mercado.

O processo manual que acontece hoje:

1. **Pesquisa de concorrentes** — Abre o Google, busca "barbearia premium São Paulo", navega 30 resultados, anota nomes, abre cada site, compara posicionamento. Depois vai pro Instagram de cada um, analisa frequência de posts, engajamento, tipo de conteúdo. Repete pro TikTok. Abre a Biblioteca de Anúncios da Meta pra ver quem tá investindo em ads. *Tempo: 4-6 horas.*

2. **Análise de conteúdo viral** — Busca hashtags do nicho no TikTok e Instagram, assiste dezenas de vídeos, tenta identificar padrões: que tipo de gancho funciona? Qual formato engaja mais? Qual CTA converte? *Tempo: 3-4 horas.*

3. **Síntese e recomendações** — Cruza tudo isso numa planilha, tenta identificar lacunas no mercado, escreve recomendações, propõe calendário de conteúdo. *Tempo: 4-6 horas.*

4. **Modelagem de criativos** — Cria roteiros de vídeo baseados nos padrões que identificou. *Tempo: 2-3 horas.*

**Total: 15-20 horas de trabalho por cliente.** E esse processo se repete a cada novo cliente, a cada novo nicho.

A frustração é real: o trabalho é repetitivo, manual, e boa parte dele é coleta de dados — não análise estratégica. O tempo do profissional deveria estar na criatividade e na execução, não em copiar números de perfis do Instagram pra uma planilha.

---

## A solução

O LupAI automatiza esse processo inteiro. O usuário digita uma frase simples — "barbearia premium em São Paulo" — e em ~5 minutos recebe:

- **3-4 concorrentes mapeados** com dados de site, SEO, redes sociais e anúncios
- **5 vídeos virais do nicho** baixados, transcritos e analisados (padrões de gancho, corpo e CTA)
- **5-8 recomendações estratégicas** que citam dados específicos ("seu concorrente X posta 5x por semana no TikTok e tem 2.500 seguidores — invista nesse canal")
- **3-5 roteiros de vídeo** prontos pra gravar, com gancho, corpo, CTA e tom de voz definidos

Tudo em português brasileiro, sem login, sem configuração.

---

## Quem usa e quando

**O gestor de tráfego da agência** abre o LupAI quando recebe um briefing de cliente novo. Em vez de gastar um dia inteiro pesquisando, ele tem o panorama competitivo em minutos e pode focar no que importa: a estratégia.

**O social media** usa pra entender que tipo de conteúdo está performando no nicho. Os roteiros gerados são ponto de partida — ele adapta pro tom da marca e grava.

**O dono do negócio** que não tem agência usa pra entender onde está no mercado. "Meus concorrentes estão investindo em anúncios e eu não? Eles postam com que frequência? O que funciona no TikTok pro meu nicho?"

**O momento da rotina:** é a primeira ferramenta que se abre num projeto novo. Antes de qualquer planejamento, antes de qualquer post, antes de qualquer reunião de briefing.

---

## Como funciona

### 1. Entendimento

O usuário descreve o nicho em linguagem natural. A IA interpreta e extrai: nicho, segmento e região. "Barbearia premium em São Paulo" vira `{nicho: "Barbearia", segmento: "Premium", região: "São Paulo"}`.

### 2. Descoberta de concorrentes

Quatro fontes são consultadas em paralelo:
- **Google Search** — resultados orgânicos do nicho + região
- **Google Maps** — negócios locais com avaliações
- **Biblioteca de Anúncios Meta** — quem está anunciando no nicho
- **SimilarWeb** — sites com mais tráfego no segmento

Dos 20-30 candidatos encontrados, a IA seleciona os 3-4 mais relevantes usando critérios como correspondência de segmento, porte similar, presença digital ativa.

### 3. Extração profunda

Para cada concorrente, o sistema extrai em paralelo:
- **Site:** conteúdo, posicionamento, estrutura, palavras-chave
- **Redes sociais:** seguidores, engajamento, frequência de posts (Instagram + TikTok)
- **Anúncios:** campanhas ativas na Meta Ads Library e Google Ads

### 4. Conteúdo viral

A IA gera hashtags relevantes pro nicho. Com essas hashtags, busca os vídeos mais engajados no TikTok e Instagram Reels. Os top 5 vídeos são:
1. Baixados e hospedados permanentemente (CDN próprio)
2. Transcritos automaticamente por IA de áudio
3. Analisados individualmente (extração de gancho, corpo e CTA)
4. Comparados entre si pra identificar **padrões recorrentes**: que tipos de abertura funcionam, que formatos engajam, quais CTAs convertem

### 5. Síntese estratégica

Com todos os dados coletados, a IA gera:
- **Visão do mercado** — panorama competitivo com nível de competição, tendências e canais dominantes
- **Recomendações priorizadas** — cada uma cita dados específicos dos concorrentes, com nível de esforço e impacto esperado
- **Roteiros de vídeo** — scripts prontos pra gravar, inspirados nos padrões virais do nicho, com gancho, corpo, CTA e tom de voz

### O que muda

| Antes | Depois |
|-------|--------|
| 15-20 horas de pesquisa manual | ~5 minutos de análise automatizada |
| Dados fragmentados em abas do navegador | Dashboard unificado com tudo consolidado |
| Recomendações genéricas ("melhore seu SEO") | Recomendações específicas ("seu concorrente X ranqueia pra 'barba degradê' e você não tem conteúdo sobre isso") |
| Roteiros de vídeo do zero | Roteiros baseados em padrões virais reais do nicho |
| Repete o processo a cada cliente | Reutiliza análises recentes (cache de 24h por nicho) |

---

## Decisões técnicas

### Por que Trigger.dev e não executar tudo na API?

O pipeline completo leva ~5 minutos — envolve 9 chamadas a APIs de scraping, transcrição de áudio e múltiplas chamadas à IA. Serverless functions têm timeout de 10-60 segundos. O Trigger.dev permite jobs de longa duração com progresso em tempo real, retry automático e paralelização de etapas.

### Por que Bunny CDN pra hospedar os vídeos?

URLs de vídeo do TikTok e Instagram expiram em horas. Pra transcrever os vídeos via AssemblyAI, precisamos de URLs permanentes. O Bunny Storage custa $0.01/GB — mais barato que qualquer alternativa — e entrega via CDN global.

### Por que transcrever os vídeos?

Sem transcrição, a análise de conteúdo viral é superficial — só métricas de engajamento. Com transcrição, a IA consegue extrair o **gancho** (o que prende nos primeiros 3 segundos), a **estrutura** (como mantém atenção) e o **CTA** (como converte). Isso transforma dados em inteligência acionável.

### Por que 9 fontes de dados?

Nenhuma fonte sozinha dá o quadro completo. Google Search mostra quem ranqueia, mas não quem anuncia. Instagram mostra engajamento, mas não SEO. A Biblioteca de Anúncios mostra quem investe, mas não o conteúdo orgânico. Cruzar 9 fontes é o que diferencia uma análise superficial de uma análise que um gestor confia pra tomar decisões.

### Por que forçar recomendações específicas?

O prompt da IA exige que toda recomendação cite dados concretos — nome do concorrente, número exato, exemplo real. "Melhore seu conteúdo" é rejeitado. "Seu concorrente Feel King tem 2.573 seguidores no TikTok com vídeos de transformação — crie uma série similar focando no antes/depois" é aceito. Recomendações genéricas não geram ação.

---

## Stack técnica

| Camada | Tecnologia | Por quê |
|--------|-----------|---------|
| Framework | Next.js 15 (App Router) | SSR, API Routes, deploy simples |
| Linguagem | TypeScript | Tipagem forte em toda a pipeline |
| Banco de dados | Supabase (PostgreSQL) | JSONB flexível pra dados heterogêneos de 9 fontes |
| Jobs assíncronos | Trigger.dev v4 | Pipeline de 5 min com progresso real-time |
| IA | Google Gemini 2.5 Flash | Output estruturado com JSON Schema, custo baixo |
| Scraping | Apify (9 actors) | Infraestrutura gerenciada, anti-bot, retry |
| Transcrição | AssemblyAI | API async, detecção de idioma, PT-BR nativo |
| Mídia | Bunny CDN + Storage | URLs permanentes pra vídeos, CDN global barato |
| Estilização | Tailwind CSS v4 | Design system consistente, dark mode |
| Testes | Vitest | 418 testes, <3s de execução |

---

## Rodando localmente

### Pré-requisitos

- Node.js 20+
- npm 10+
- Contas configuradas: Supabase, Apify, Gemini API, AssemblyAI, Bunny, Trigger.dev

### Setup

```bash
# Clonar e instalar
git clone https://github.com/galvza/lupai.git
cd lupai
npm install

# Configurar variáveis de ambiente
cp .env.example .env.local
# Preencher as chaves no .env.local

# Rodar migrations do Supabase
# (via Supabase Dashboard ou CLI)

# Iniciar o app
npm run dev

# Em outro terminal — iniciar o worker de jobs
npx trigger.dev@latest dev
```

Acesse `http://localhost:3000`, digite um nicho e aguarde ~5 minutos.

### Testes

```bash
npm test              # 418 testes
npm run build         # Build de produção
npm run typecheck     # Verificação de tipos
```

---

## Estrutura do projeto

```
src/
├── app/                    # Páginas e API Routes (Next.js App Router)
│   ├── page.tsx            # Homepage — input do nicho
│   ├── analysis/[id]/      # Dashboard de resultados
│   ├── history/            # Histórico de pesquisas
│   └── api/                # 6 endpoints REST
├── trigger/                # Jobs Trigger.dev (pipeline completa)
│   ├── analyze-market.ts   # Orquestrador — coordena as 6 etapas
│   ├── extract-viral.ts    # Pipeline de conteúdo viral (6 estágios)
│   └── synthesize.ts       # Síntese com IA
├── lib/
│   ├── ai/                 # Integração Gemini (entendimento, síntese, criativos)
│   ├── apify/              # 9 wrappers de actors Apify
│   ├── transcription/      # AssemblyAI
│   ├── storage/            # Bunny CDN
│   └── supabase/           # Queries e cliente
├── components/             # UI React (dashboard, cards, visualizações)
└── types/                  # Tipos TypeScript (análise, concorrente, viral, DB)
```

---

## Feito por

**Gabriel Alves** — Desafio Human Academy 2026

Construído com [Claude Code](https://claude.ai/claude-code).
