import type { UIAnalysisStatus as AnalysisStatus, AnalysisResult, HistoryItem } from "@/types/ui";

/** Status de análise simulado para desenvolvimento */
export const MOCK_ANALYSIS_STATUS: AnalysisStatus = {
  id: "demo-123",
  status: "processing",
  progress: 62,
  niche: "E-commerce de suplementos esportivos",
  region: "Brasil",
  steps: [
    {
      id: "understand",
      title: "Entendimento do nicho",
      status: "completed",
      logs: [
        { text: "Nicho: suplementos esportivos", timestamp: "00:01", color: "green" },
        { text: "Segmento: e-commerce B2C", timestamp: "00:02", color: "green" },
        { text: "Região: Brasil (nacional)", timestamp: "00:03", color: "green" },
      ],
    },
    {
      id: "competitors",
      title: "Descoberta de concorrentes",
      status: "completed",
      logs: [
        { text: "Growth Supplements — growthsupplements.com.br", timestamp: "00:15", color: "green" },
        { text: "Integral Médica — integralmedica.com.br", timestamp: "00:22", color: "green" },
        { text: "Max Titanium — maxtitanium.com.br", timestamp: "00:28", color: "green" },
        { text: "Darkness (Integralmédica) — darkness.com.br", timestamp: "00:35", color: "green" },
      ],
    },
    {
      id: "extraction",
      title: "Extraindo dados dos concorrentes",
      status: "active",
      logs: [
        { text: "Growth Supplements · site ✓ · SEO ✓ · social ✓", timestamp: "01:10", color: "green" },
        { text: "Integral Médica · site ✓ · SEO ✓ · social...", timestamp: "01:45", color: "white" },
        { text: "Max Titanium · aguardando", color: "muted" },
        { text: "Darkness · aguardando", color: "muted" },
      ],
    },
    {
      id: "virals",
      title: "Buscando virais do nicho",
      subtitle: "TikTok e Reels dos últimos 90 dias",
      status: "pending",
      logs: [],
    },
    {
      id: "recommendations",
      title: "Gerando recomendações",
      subtitle: "Síntese com IA · Roteiros · Diagnóstico",
      status: "pending",
      logs: [],
    },
  ],
};

/** Resultado completo simulado */
export const MOCK_ANALYSIS_RESULT: AnalysisResult = {
  id: "demo-123",
  niche: "Suplementos esportivos",
  nicheKeyword: "Suplementos",
  nicheAccent: "esportivos",
  region: "Brasil",
  timestamp: "27 mar 2026 · 14:32",
  marketOverview: {
    summary:
      "Mercado de suplementos esportivos no Brasil é altamente competitivo, com 4 players dominantes focados em whey protein e creatina. Presença digital forte via Instagram e TikTok, com investimento significativo em Meta Ads.",
    competition: "Alta",
    trend: "Crescimento",
    strongChannels: "Instagram, TikTok",
  },
  competitors: [
    {
      id: "comp-1",
      name: "Growth Supplements",
      url: "growthsupplements.com.br",
      tags: [
        { label: "SEO forte", type: "positive" },
        { label: "Preço agressivo", type: "positive" },
        { label: "Blog fraco", type: "negative" },
      ],
      metrics: { score: 87, activeAds: 12, postsPerWeek: 5, monthlyTraffic: "1.2M", igFollowers: "890K" },
      siteAnalysis: "Site rápido com boa UX mobile. Checkout otimizado com upsell. Blog com pouco conteúdo mas landing pages bem feitas para cada produto.",
      seoMetrics: { authority: 45, topKeywords: 320, speed: "Rápido" },
      socialAnalysis: "Instagram muito ativo com Reels diários. Parcerias com influenciadores fitness. TikTok em crescimento com conteúdo educativo sobre suplementação.",
      platforms: [
        { name: "Instagram", status: "active", stats: "890K seguidores · 5 posts/sem" },
        { name: "TikTok", status: "active", stats: "120K seguidores · 3 vídeos/sem" },
        { name: "YouTube", status: "active", stats: "45K inscritos" },
        { name: "Twitter", status: "absent" },
      ],
      ads: [
        { copy: "Whey Protein Growth com 30% OFF. Frete grátis acima de R$199.", format: "Carrossel", duration: "14 dias" },
        { copy: "Creatina Growth: a mais vendida do Brasil. Compre agora.", format: "Vídeo 15s", duration: "7 dias" },
        { copy: "Kit Definição: Whey + Creatina + BCAA por R$189,90", format: "Imagem", duration: "21 dias" },
      ],
      lessons: "Growth domina pela combinação de preço agressivo + presença massiva em redes. O ponto fraco é o conteúdo de blog — oportunidade para SEO de cauda longa.",
    },
    {
      id: "comp-2",
      name: "Integral Médica",
      url: "integralmedica.com.br",
      tags: [
        { label: "Marca consolidada", type: "positive" },
        { label: "Ads ativos", type: "positive" },
        { label: "Site lento", type: "negative" },
      ],
      metrics: { score: 82, activeAds: 8, postsPerWeek: 4, monthlyTraffic: "800K", igFollowers: "650K" },
    },
    {
      id: "comp-3",
      name: "Max Titanium",
      url: "maxtitanium.com.br",
      tags: [
        { label: "Conteúdo forte", type: "positive" },
        { label: "Pouco ads", type: "negative" },
      ],
      metrics: { score: 75, activeAds: 3, postsPerWeek: 6, monthlyTraffic: "500K", igFollowers: "420K" },
    },
    {
      id: "comp-4",
      name: "Darkness",
      url: "darkness.com.br",
      tags: [
        { label: "Nicho fitness", type: "positive" },
        { label: "SEO fraco", type: "negative" },
      ],
      metrics: { score: 68, activeAds: 5, postsPerWeek: 3, monthlyTraffic: "200K", igFollowers: "180K" },
    },
  ],
  gaps: {
    icon: "search",
    label: "Gaps identificados",
    value: 8,
    subtitle: "oportunidades não exploradas",
    preview: "Blog SEO · Vídeos longos YouTube · Email marketing · Programa de afiliados",
  },
  virals: {
    icon: "play",
    label: "Virais encontrados",
    value: 10,
    subtitle: "vídeos com +100K views",
    preview: "\"Como tomar creatina certo\" · \"Whey barato vs caro\" · \"Rotina de suplementação\"",
  },
  scripts: {
    icon: "trending",
    label: "Roteiros gerados",
    value: 5,
    subtitle: "prontos para gravar",
    preview: "Gancho + corpo + CTA modelados dos padrões virais do nicho",
  },
  recommendations: [
    { text: "Investir em blog SEO com artigos de cauda longa sobre suplementação", impact: "ALTO" },
    { text: "Criar série de Reels comparando produtos (formato que mais viraliza)", impact: "ALTO" },
    { text: "Ativar Meta Ads com criativos em vídeo curto (15s)", impact: "ALTO" },
    { text: "Lançar programa de afiliados para microinfluenciadores", impact: "MÉDIO" },
    { text: "Otimizar velocidade do site para mobile (Core Web Vitals)", impact: "MÉDIO" },
  ],
  totalRecommendations: 12,
};

/** Histórico simulado */
export const MOCK_HISTORY: HistoryItem[] = [
  {
    id: "demo-123",
    niche: "E-commerce de suplementos esportivos",
    icon: "shopping-cart",
    metadata: "4 concorrentes · 10 virais · 12 recomendações",
    date: "27 mar 2026",
    relativeTime: "há 2 horas",
    status: "complete",
    competitors: 4,
  },
  {
    id: "demo-456",
    niche: "Clínica de estética em São Paulo",
    icon: "sparkles",
    metadata: "3 concorrentes · 8 virais · 9 recomendações",
    date: "25 mar 2026",
    relativeTime: "há 2 dias",
    status: "complete",
    competitors: 3,
  },
  {
    id: "demo-789",
    niche: "Loja de roupas fitness femininas",
    icon: "shirt",
    metadata: "Análise em andamento...",
    date: "27 mar 2026",
    relativeTime: "há 15 min",
    status: "processing",
  },
];
