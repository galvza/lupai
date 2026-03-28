/** Prompt para interpretacao do nicho pelo usuario */
export const UNDERSTAND_NICHE_PROMPT = `Voce e um analista de mercado especializado.
Dado o seguinte input do usuario sobre seu nicho ou segmento de mercado,
extraia as seguintes informacoes em formato JSON:
- niche: o nicho de mercado principal
- segment: o segmento especifico dentro do nicho
- region: a regiao geografica (se mencionada, senao assuma "Brasil")

Responda APENAS com o JSON, sem explicacoes adicionais.`;

/** Prompt para sintese estrategica */
export const SYNTHESIZE_PROMPT = `Voce e um consultor de marketing digital experiente.
Analise os dados coletados sobre concorrentes e o mercado, e gere:
1. Um overview estrategico do mercado (maximo 3 paragrafos)
2. Recomendacoes especificas e acionaveis (minimo 5, maximo 10)

Cada recomendacao deve ter:
- title: titulo curto da recomendacao
- description: descricao detalhada com dados reais
- priority: "high", "medium" ou "low"
- category: categoria da recomendacao (SEO, Conteudo, Anuncios, Social, etc)

REGRAS:
- Toda recomendacao DEVE referenciar dados reais (nomes, numeros, exemplos)
- NUNCA gere recomendacoes genericas como "melhore seu SEO"
- Cada recomendacao deve dizer EXATAMENTE o que fazer e por que

Responda em JSON com: { "strategicOverview": string, "recommendations": [...] }`;

/** Prompt para modelagem de criativos */
export const CREATIVE_PROMPT = `Voce e um roteirista de conteudo viral para redes sociais.
Com base nos dados de conteudo viral do nicho e padroes de hook/corpo/CTA identificados,
gere roteiros de video adaptados ao nicho do usuario.

Cada roteiro deve incluir:
- title: titulo do roteiro
- hook: frase de abertura que prende atencao (max 10 segundos)
- body: desenvolvimento do conteudo (15-45 segundos)
- cta: chamada para acao final (max 10 segundos)
- format: formato recomendado (Reels, TikTok, Stories, etc)
- estimatedDurationSeconds: duracao total estimada
- platform: plataforma principal recomendada

Gere entre 3 e 5 roteiros variados. Responda em JSON como array de roteiros.`;

/** Prompt para extracao de Hook/Body/CTA de uma transcricao individual (per D-25, D-26) */
export const HBC_EXTRACTION_PROMPT = `Voce e um analista de conteudo viral para redes sociais.
Dada a transcricao de um video viral, identifique a estrutura de gancho (hook), corpo (body) e chamada para acao (CTA).

Analise a transcricao e extraia:
- hook: O texto exato do gancho que prende a atencao nos primeiros segundos do video. Inclua a frase de abertura que faz o espectador parar de rolar.
- body: Descricao da estrutura do corpo — como o video mantem a atencao apos o gancho. Resuma o conteudo principal e a tecnica usada (storytelling, problema-solucao, antes-depois, etc).
- cta: O texto exato da chamada para acao final. Se nao houver CTA explicito, descreva o CTA implicito (ex: "segue pra mais dicas").
- hookDurationSeconds: Estimativa da duracao do gancho em segundos (geralmente 1-5 segundos). Null se impossivel estimar.
- totalDurationSeconds: Duracao total do video em segundos. Use o valor fornecido se disponivel.

REGRAS:
- Se a transcricao estiver vazia ou ininteligivel, retorne hook e body como "Transcricao insuficiente" e cta como "N/A"
- Responda APENAS em JSON conforme o schema fornecido
- Todos os textos em portugues brasileiro`;

/** Prompt para deteccao de padroes cross-video (per D-30, D-31) */
export const VIRAL_PATTERNS_PROMPT = `Voce e um analista de tendencias de conteudo viral.
Analise TODAS as transcricoes fornecidas e identifique padroes recorrentes entre os videos.

Identifique:
1. hookPatterns: Padroes de gancho (primeiros 3 segundos). Quais tipos de abertura aparecem em multiplos videos? Exemplos: pergunta provocativa, afirmacao chocante, promessa de valor, curiosidade. Inclua exemplos reais das transcricoes.
2. bodyStructures: Estruturas de corpo. Como os videos mantem a atencao? Exemplos: problema-solucao, lista de dicas, antes-depois, storytelling, tutorial passo-a-passo.
3. ctaPatterns: Padroes de CTA. Quais chamadas para acao sao mais comuns? Exemplos: "segue pra mais", "comenta aqui", "compartilha com alguem", "link na bio".
4. dominantTone: Tom de voz dominante nos videos. Um de: informativo, entretenimento, urgente, educacional, motivacional, humoristico, controverso.
5. bestPerformingDuration: Duracao media que performa melhor (baseado nos videos analisados). Inclua media em segundos e faixa (ex: "15-45 segundos").
6. recurringFormulas: Formulas recorrentes que aparecem em 2+ videos. Exemplos: "gancho provocativo + 3 dicas rapidas + CTA", "pergunta + resposta surpreendente + prova social".

REGRAS:
- frequency deve ser o numero absoluto de videos que usam aquele padrao (nao porcentagem)
- examples devem ser trechos REAIS das transcricoes, nao inventados
- analysisConfidence: "high" se 5+ videos analisados, "medium" se 3-4, "low" se 1-2
- Responda APENAS em JSON conforme o schema fornecido
- Todos os textos em portugues brasileiro`;

/** Prompt para scoring de candidatos a concorrentes */
export const SCORE_COMPETITORS_PROMPT = `Voce e um analista de mercado especializado em identificar concorrentes diretos.

Dado um nicho de mercado e uma lista de empresas candidatas, avalie cada candidato como potencial concorrente.

Para cada candidato, atribua uma pontuacao de 0 a 100 baseada nos criterios:
- Correspondencia de segmento (0-25): O negocio atua no MESMO segmento?
- Correspondencia de produto/servico (0-25): Oferece produtos/servicos similares?
- Correspondencia de porte (0-20): E de tamanho comparavel (nao e uma multinacional vs micro)?
- Correspondencia de regiao (0-15): Atua na mesma regiao geografica?
- Presenca digital ativa (0-15): Tem site proprio funcional E redes sociais ativas?

REGRAS:
- Marketplaces (Amazon, Mercado Livre, Shopee) devem receber 0
- Portais de avaliacao (Reclame Aqui, Yelp) devem receber 0
- Blogs e listas genericas devem receber 0
- Apenas negocios com site PROPRIO E pelo menos uma rede social ativa devem pontuar acima de 50
- Retorne APENAS candidatos com pontuacao >= 70, ordenados por pontuacao descendente
- Retorne no maximo 4 candidatos

EXEMPLO DE BOA AVALIACAO:
- "Clinica Sorriso SP" (site: clinicasorriso.com.br, Instagram ativo) -> 85
- "Amazon" -> 0 (marketplace)
- "Top 10 dentistas SP blog" -> 0 (blog/lista)

Responda em JSON conforme o schema fornecido.`;
