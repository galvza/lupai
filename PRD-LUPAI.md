# PRD — LupAI

**Versão:** 1.1
**Data:** 27/03/2026
**Status:** Em revisão (correções aplicadas)

---

## 1. Resumo Executivo

**Uma frase que explica o projeto:**
Uma plataforma de inteligência e análise de marketing com IA que, a partir de um input simples sobre o negócio do usuário, descobre concorrentes, analisa o mercado, identifica conteúdos virais do nicho, entrega recomendações estratégicas acionáveis e modela conteúdo sugerido (roteiros de vídeo com gancho, corpo e CTA).

**Posicionamento:** LupAI é uma lupa inteligente pro mercado. Não executa campanhas, não agenda posts, não automatiza anúncios. Ela **investiga, analisa, recomenda e modela conteúdo**. A execução fica com o time, usando as ferramentas que já conhece.

---

## 2. Problema

### 2.1 Situação atual

Profissionais de marketing e donos de negócios precisam constantemente entender o que está acontecendo no mercado: quem são os concorrentes, como eles se posicionam, que tipo de conteúdo funciona no nicho, quais formatos de criativo estão performando. Hoje esse processo é 100% manual:

- Abrir o site de cada concorrente pra ver preço e posicionamento
- Verificar SEO da página (autoridade, palavras-chave)
- Ir na Biblioteca de Anúncios do Meta pra ver criativos rodando
- Entrar no perfil de redes sociais (Instagram, TikTok) pra ver conteúdo orgânico
- Procurar anúncios no Google
- Usar SimilarWeb pra estimar tráfego
- Buscar manualmente vídeos virais do nicho pra referência criativa
- Compilar tudo numa planilha ou documento sem padronização

Pesquisa da RD Station aponta que 44% dos times de marketing brasileiros não têm rotinas e processos definidos. Outra pesquisa indica que profissionais de marketing gastam mais de 60% do tempo em tarefas de baixo valor.

### 2.2 Dor principal

**Tempo desperdiçado em coleta manual de dados que deveria ser gasto em estratégia.** O profissional de marketing gasta horas abrindo abas, copiando dados, montando comparativos — trabalho braçal que não gera valor direto. Quando termina, os dados já começaram a ficar desatualizados.

Além disso, mesmo quando os dados são coletados, falta a camada de **interpretação**: o que esses dados significam na prática? O que o usuário deveria fazer com base neles? Essa tradução de dados em ação depende de experiência que nem todo profissional tem — especialmente quem é novo no mercado.

### 2.3 O que acontece se não resolvermos?

- Decisões de marketing baseadas em intuição em vez de dados
- Concorrentes se posicionam melhor porque estão mais atentos ao mercado
- Retrabalho: análises refeitas do zero toda vez que alguém precisa
- Oportunidades de conteúdo viral perdidas por falta de monitoramento
- Agências gastam horas de onboarding de cliente que poderiam ser automatizadas

---

## 3. Personas (Quem usa)

### Persona primária — Profissional de Marketing (Agência ou In-house)

| Campo | Descrição |
|-------|-----------|
| **Quem é** | Social media, gestor de tráfego, estrategista digital, analista de marketing |
| **Contexto de uso** | Desktop, no escritório ou home office. Usa quando pega um cliente novo (onboarding), quando precisa de referências criativas, ou quando quer entender o posicionamento dos concorrentes antes de planejar uma campanha |
| **Nível técnico** | Intermediário a avançado — entende termos como SEO, CTR, hook rate, CPA, mas não necessariamente sabe programar ou fazer scraping |
| **O que precisa** | Ter uma visão rápida e consolidada do mercado do cliente/nicho, com dados concretos e recomendações acionáveis pra montar estratégia |
| **O que frustra** | Perder 2-4 horas fazendo pesquisa manual que poderia ser automatizada. Ter que repetir o processo toda vez. Não ter um lugar centralizado com as informações |

### Persona secundária — Dono de Pequeno/Médio Negócio

| Campo | Descrição |
|-------|-----------|
| **Quem é** | Empreendedor que gerencia o próprio marketing ou tem uma equipe enxuta. Pode ser e-commerce ou negócio local |
| **Contexto de uso** | Desktop ou mobile. Usa quando quer entender como se posicionar melhor, quando sente que os concorrentes estão à frente, ou quando quer ideias de conteúdo |
| **Nível técnico** | Leigo a intermediário — sabe o básico de marketing digital mas não domina termos técnicos avançados |
| **O que precisa** | Entender de forma simples o que os concorrentes estão fazendo e receber orientações claras de "por onde começar" |
| **O que frustra** | Não ter dinheiro pra contratar uma agência. Não saber interpretar dados de marketing. Sentir que está ficando pra trás sem entender por quê |

### Pré-requisito para ambas as personas
O negócio analisado (tanto do usuário quanto dos concorrentes) precisa ter **presença digital mínima**: um site, landing page, ou pelo menos perfil ativo em redes sociais. Sem posicionamento digital, não há o que analisar.

---

## 4. Objetivos e Métricas de Sucesso

### 4.1 Objetivo principal
Entregar em minutos o que hoje leva horas: uma análise completa do mercado/nicho com concorrentes mapeados, dados consolidados e recomendações estratégicas acionáveis — tudo a partir de um input simples.

### 4.2 Métricas quantitativas

| Métrica | Situação atual | Meta após lançamento | Como medir |
|---------|---------------|---------------------|------------|
| Tempo pra fazer análise de concorrente completa | 2-4 horas (manual) | < 5 minutos (automatizado) | Tempo entre input e output no sistema |
| Número de fontes de dados consultadas por análise | 1-3 (quem tem paciência) | 5-6 fontes simultâneas | Contagem de módulos da cascata que retornam dados |
| Número de concorrentes identificados por pesquisa | 1-2 (que o usuário já conhece) | 3-4 (descoberta automática) | Contagem de resultados relevantes retornados |
| Qualidade das recomendações | Inexistente (dados crus sem interpretação) | Recomendações específicas e acionáveis | Avaliação qualitativa / feedback do usuário |

### 4.3 Métricas qualitativas
- O usuário sente que tem um "consultor de marketing" disponível a qualquer momento
- O profissional de agência consegue fazer onboarding de cliente com dados reais em vez de achismo
- O dono de negócio entende pela primeira vez o que os concorrentes estão fazendo e por onde começar
- A interface é autoexplicativa — bate o olho e sabe o que fazer

---

## 5. Escopo

### 5.1 O que ENTRA no MVP (versão 1)

**Modo Rápido (sem cadastro):**
- [ ] Input simples: campo de texto livre onde o usuário descreve o nicho/segmento (ex: "suplementos esportivos", "clínica de estética em Campinas")
- [ ] Camada de entendimento: IA interpreta o input e identifica nicho, segmento e região
- [ ] Descoberta de concorrentes: sistema encontra 3-4 concorrentes relevantes do nicho
- [ ] Extração em cascata pra cada concorrente (cada etapa independente — se uma falha, as outras continuam):
  - [ ] Análise do site (posicionamento, oferta, preços quando visíveis, meta tags)
  - [ ] Análise de SEO (autoridade estimada, palavras-chave principais, tráfego estimado)
  - [ ] Descoberta e análise de redes sociais (posts recentes, frequência, engajamento)
  - [ ] Anúncios ativos na Biblioteca de Anúncios do Meta (criativos, copy, formato, tempo no ar)
  - [ ] Análise de anúncios no Google Ads (presença em search, palavras-chave pagas)
  - [ ] Análise de presença no Google Meu Negócio (quando aplicável — negócios locais)
- [ ] Inteligência de conteúdo viral (independente dos concorrentes): busca o que está viralizando naquele nicho no TikTok, Instagram e Facebook — não limitada aos concorrentes encontrados, abrange qualquer criador/marca do nicho
- [ ] Transcrição e análise de vídeos virais: usa IA pra transcrever, identificar gancho, corpo e CTA
- [ ] Modelagem automática de criativos: IA gera sugestões de conteúdo adaptadas ao produto do usuário — incluindo roteiros de vídeo com gancho, corpo e CTA modelados a partir dos padrões virais identificados
- [ ] Síntese com IA: consolida todos os dados e gera recomendações estratégicas acionáveis
- [ ] Dashboard/relatório visual com os resultados organizados
- [ ] Exportação de relatórios em PDF

**Modo Completo (com dados do negócio):**
- [ ] O usuário informa dados do próprio negócio (URL do site ou descrição) além do nicho
- [ ] Sistema faz a análise do negócio do usuário (mesma cascata de extração)
- [ ] Cruzamento: compara a situação do usuário com os concorrentes e o mercado
- [ ] Recomendações personalizadas: "seus concorrentes fazem X e você não", "oportunidade em Y"

**Persistência de dados:**
- [ ] Resultados salvos em banco de dados por categoria de nicho
- [ ] Histórico de pesquisas acessível
- [ ] Acervo de concorrentes por nicho cresce com o uso da plataforma

**Interface:**
- [ ] Sem autenticação (requisito do desafio)
- [ ] Interface web responsiva, didática e autoexplicativa
- [ ] Design limpo e profissional

### 5.2 O que NÃO entra no MVP (backlog futuro)

- Monitoramento contínuo/agendado de concorrentes (alertas quando algo muda)
- Histórico de tendências por nicho ao longo do tempo ("esse concorrente aumentou frequência de posts")
- Descoberta automática de concorrentes via Google Maps pra negócios locais
- Autenticação e contas de usuário
- API pública pra integração com outras ferramentas

### 5.3 O que o projeto NÃO é

- **Não é uma ferramenta de execução.** Não agenda posts, não sobe campanhas, não automatiza anúncios.
- **Não é um CRM ou gerenciador de clientes.** Não gerencia relacionamento, pipeline ou vendas.
- **Não é um SimilarWeb ou SEMrush.** Não pretende competir com ferramentas de SEO completas — usa dados dessas fontes como insumo.
- **Não é uma ferramenta de automação de marketing.** Não faz nutrição de leads, email marketing ou funis.
- **É inteligência, análise e modelagem de conteúdo.** Investiga, analisa, recomenda e sugere criativos. A publicação e execução é do usuário.

---

## 6. Fluxos do Usuário

### Fluxo principal — Modo Rápido (análise de nicho)

```
1. Usuário acessa o LupAI (sem login)
2. Usuário vê uma interface limpa com um campo de input central
3. Usuário digita uma descrição do nicho (ex: "loja de suplementos esportivos")
4. Sistema mostra indicador de progresso enquanto processa
5. Camada de entendimento: IA interpreta o nicho e confirma com o usuário (ex: "Entendi: e-commerce de suplementos esportivos no Brasil. Correto?")
6. Usuário confirma ou ajusta
7. Sistema roda a cascata: descoberta de concorrentes → extração de dados → busca de virais → transcrição → síntese
8. Sistema apresenta os concorrentes encontrados (3-4) com opção de ajustar
9. Usuário confirma os concorrentes ou remove/adiciona
10. Sistema exibe o dashboard completo: dados de cada concorrente + conteúdos virais do nicho + recomendações da IA
11. Resultado: usuário tem uma visão completa do mercado com ações sugeridas
```

### Fluxo secundário — Modo Completo (análise cruzada)

```
1. Usuário acessa o LupAI
2. Usuário escolhe "Modo Completo" ou "Analisar meu negócio também"
3. Usuário informa URL do próprio site ou descreve o negócio
4. Sistema roda a cascata de extração no negócio do usuário
5. Sistema roda a cascata de descoberta e extração nos concorrentes (mesmo do Modo Rápido)
6. Sistema cruza os dados: situação do usuário vs concorrentes vs mercado
7. Sistema exibe dashboard com seção adicional: "Onde você está", "Onde eles estão", "Suas oportunidades"
8. Resultado: usuário tem diagnóstico completo do próprio negócio em contexto competitivo
```

### Fluxo de retorno — Pesquisa salva

```
1. Usuário acessa o LupAI
2. Usuário vê lista de pesquisas anteriores (salvas no banco por nicho)
3. Usuário clica numa pesquisa anterior
4. Sistema exibe os resultados salvos
5. Usuário pode optar por "Atualizar dados" pra refazer a análise
```

---

## 7. Regras de Negócio

| # | Regra | Exemplo |
|---|-------|---------|
| RN01 | O sistema deve descobrir entre 3 e 4 concorrentes por pesquisa — nem mais (perde foco), nem menos (pouco comparativo) | Usuário pesquisa "suplementos" → sistema retorna 3-4 lojas relevantes |
| RN02 | Cada etapa da cascata de extração é independente — falha em uma não impede as outras | Se não encontrar Instagram de um concorrente, continua com SEO, site, ads |
| RN03 | A IA deve gerar recomendações específicas e acionáveis, não genéricas | ❌ "Melhore seu SEO" → ✅ "Seus concorrentes ranqueiam pra 'whey protein isolado' e você não tem conteúdo sobre isso — crie uma página focada nessa palavra-chave" |
| RN04 | O sistema não exige autenticação pra funcionar | Qualquer pessoa acessa e usa sem criar conta |
| RN05 | Pesquisas são salvas no banco por categoria de nicho | Pesquisa de "suplementos" fica na categoria "suplementos" e é acessível depois |
| RN06 | O sistema deve lidar com negócios que têm pouca presença digital | Se o concorrente só tem Instagram e não tem site, o sistema analisa o que existe e sinaliza a ausência do resto |
| RN07 | Vídeos virais transcritos devem ter a estrutura identificada (gancho, corpo, CTA) | "Os 3 primeiros segundos usam pergunta provocativa como gancho, o corpo apresenta 3 benefícios com cortes rápidos, CTA é direto pra link na bio" |
| RN08 | No Modo Completo, as recomendações devem ser comparativas | "Seu concorrente X posta 5x por semana e você posta 2x — aumente a frequência" |
| RN09 | A modelagem de criativos deve gerar roteiros completos com gancho, corpo e CTA, adaptados ao produto do usuário | "Gancho (3s): 'Você sabia que 80% das pessoas tomam whey errado?' → Corpo: 3 erros comuns com cortes rápidos → CTA: 'Link na bio pra ver o guia completo'" |
| RN10 | A busca de conteúdo viral é independente dos concorrentes — abrange qualquer criador do nicho | Pesquisa de "suplementos" traz vídeos virais de influenciadores fitness, não só das lojas concorrentes |

---

## 8. Integrações

| Sistema | Tipo de integração | Pra quê | Já temos acesso? |
|---------|-------------------|---------|-------------------|
| Apify (actors de scraping) | API REST | Hub central de extração: sites, redes sociais, Biblioteca de Anúncios Meta, SimilarWeb, Google Ads, Google Meu Negócio, TikTok, Instagram | Parcial (créditos gratuitos, possível assinatura mensal) |
| Assembly AI (ou alternativa) | API REST | Transcrição de vídeos virais (TikTok, Reels) | A verificar |
| Google Gemini API | API REST | Camada de entendimento do input + síntese + recomendações + modelagem de criativos (free tier) | Sim |
| Supabase (PostgreSQL) | Direto | Persistência de pesquisas, concorrentes por nicho, histórico | Sim (free tier) |
| Bunny CDN + Storage | API REST | Hospedagem de toda mídia: vídeos (necessário pra transcrição), imagens, criativos, thumbnails | A criar conta |
| Trigger.dev | SDK | Jobs assíncronos — cascata de extração roda em background sem timeout | A criar conta |
| Vercel | Deploy | Hospedagem do Next.js (frontend + API routes) | Sim |

---

## 9. Requisitos Não-Funcionais

### 9.1 Performance
- A camada de entendimento (IA interpretando o input) deve responder em < 5 segundos
- A cascata completa de extração pode levar 1-3 minutos (processos paralelos) — o usuário deve ver progresso em tempo real (quais etapas já concluíram)
- O dashboard final deve carregar em < 2 segundos após a extração completar

### 9.2 Disponibilidade
- Precisa ficar no ar 24/7 (é um produto de demonstração que recrutadores/avaliadores podem acessar a qualquer momento)
- Tolerância a downtime: baixa durante o período de avaliação do desafio (até 31/03)

### 9.3 Segurança
- Sem autenticação (requisito do desafio)
- Sem dados sensíveis do usuário (não coleta email, senha, dados pessoais)
- API keys dos serviços externos ficam no backend, nunca expostas no frontend

### 9.4 Escalabilidade
- MVP: suportar uso individual (1-5 usuários simultâneos é suficiente)
- Banco de dados deve ser estruturado pra crescer (nichos × concorrentes × pesquisas)
- Não é prioridade pra o MVP mas a arquitetura não deve impedir escalabilidade futura

### 9.5 Compatibilidade
- Desktop: Chrome, Firefox, Safari (últimas 2 versões)
- Mobile: responsivo, funcional em telas a partir de 375px
- Não precisa funcionar offline

---

## 10. Riscos e Dependências

### 10.1 Riscos

| # | Risco | Probabilidade | Impacto | Mitigação |
|---|-------|--------------|---------|-----------|
| R01 | Scraping de redes sociais pode ser bloqueado ou retornar dados incompletos | Alta | Alto | Usar Apify actors com boa reputação; cada etapa é independente, falha parcial não quebra o produto |
| R02 | Descoberta automática de concorrentes pode trazer resultados irrelevantes | Média | Alto | Etapa intermediária onde o usuário confirma/ajusta os concorrentes antes da extração completa |
| R03 | Limites de API gratuitas (Apify, Assembly AI) podem ser atingidos durante avaliação | Média | Médio | Calcular custo por pesquisa; implementar cache pra não refazer extrações idênticas |
| R04 | Qualidade das recomendações da IA pode ser genérica | Média | Alto | Investir em prompt engineering de qualidade; fornecer dados estruturados e contextuais pra IA |
| R05 | Transcrição de vídeos do TikTok/Reels pode falhar (vídeos privados, formato incompatível) | Média | Baixo | Funcionalidade adicional, não core — se falhar, o resto do produto continua funcionando |
| R06 | Prazo apertado (entrega até 30/03 às 14h) | Alta | Alto | Usar GSD framework pra execução eficiente; priorizar módulos por impacto; cortar escopo se necessário |

### 10.2 Dependências

- Conta na Apify com créditos disponíveis
- API key do Assembly AI (ou alternativa pra transcrição)
- Acesso a API de IA pra camada de síntese (Claude API ou OpenAI)
- Domínio/subdomínio configurado (lupai.gsdigitais.com)
- Hospedagem configurada (Cloudflare Pages + backend)

### 10.3 Premissas

- A Biblioteca de Anúncios do Meta continua sendo pública e acessível via scraping
- Os actors da Apify pra Instagram/TikTok funcionam de forma confiável
- O volume de pesquisas durante o período de avaliação será baixo (< 50 pesquisas)
- Os avaliadores do desafio vão acessar pelo desktop
- 3 dias são suficientes pra implementar o MVP usando Claude Code + GSD framework

---

## 11. Cronograma Estimado

| Fase | Estimativa | Observação |
|------|-----------|------------|
| PRD + Aprovação | 27/03 (hoje) | Este documento |
| Arquitetura (CLAUDE.md + ARCHITECTURE.md) | 27/03 | Stack, estrutura, decisões técnicas |
| Setup GSD + Testes | 27/03 | Instalação do framework, definição de cenários |
| Codificação — Backend (cascata de extração) | 28/03 | Core do produto: scraping + IA |
| Codificação — Frontend (interface + dashboard) | 28-29/03 | Interface didática e responsiva |
| Integração + Refinamento | 29/03 | Conectar tudo, ajustar qualidade das recomendações |
| Deploy + README | 29-30/03 | Deploy no ar, documentação final |
| Buffer de segurança | 30/03 manhã | Ajustes finais antes do deadline 14h |

**Total estimado:** ~3 dias (27/03 a 30/03)

> **Nota:** Cronograma agressivo. A prioridade é ter o produto funcional no ar. Polimento visual é secundário.

---

## 12. Histórico de Alterações

| Versão | Data | O que mudou | Motivo |
|--------|------|-------------|--------|
| 1.0 | 27/03/2026 | Versão inicial | — |
| 1.1 | 27/03/2026 | Adicionado ao MVP: exportação PDF, Google Ads, Google Meu Negócio, modelagem de criativos, busca viral independente dos concorrentes. Apify como hub central. API de IA a definir na Fase 1. | Correções do Gabriel após revisão |

---

> **Checklist de aprovação:**
> - [ ] Problema está claro e bem definido
> - [ ] Personas fazem sentido
> - [ ] Métricas de sucesso são mensuráveis
> - [ ] Escopo do MVP está fechado (sem "talvez")
> - [ ] Fluxos do usuário cobrem os cenários principais
> - [ ] Riscos foram identificados
> - [ ] Dependências estão mapeadas
>
> **Aprovado por:** _______________
> **Data de aprovação:** _______________
