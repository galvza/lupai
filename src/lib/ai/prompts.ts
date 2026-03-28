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
