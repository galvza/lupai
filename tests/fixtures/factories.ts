import type { Analysis } from '@/types/analysis';
import type { Competitor } from '@/types/competitor';
import type { ViralContent } from '@/types/viral';
import type { Synthesis, Recommendation, CreativeScript } from '@/types/database';

/** Cria dados de analise com valores padrao para testes */
export const createAnalysis = (overrides?: Partial<Analysis>): Analysis => ({
  id: 'test-analysis-001',
  nicheInput: 'clinicas odontologicas em SP',
  nicheInterpreted: {
    niche: 'odontologia',
    segment: 'clinicas odontologicas',
    region: 'Sao Paulo, SP',
  },
  mode: 'quick',
  status: 'completed',
  userBusinessUrl: null,
  triggerRunId: null,
  createdAt: '2026-03-27T12:00:00Z',
  updatedAt: '2026-03-27T12:05:00Z',
  ...overrides,
});

/** Cria dados de concorrente com valores padrao para testes */
export const createCompetitor = (overrides?: Partial<Competitor>): Competitor => ({
  id: 'test-competitor-001',
  analysisId: 'test-analysis-001',
  name: 'Clinica Sorriso SP',
  websiteUrl: 'https://clinicasorriso.com.br',
  websiteData: null,
  seoData: null,
  socialData: null,
  metaAdsData: null,
  googleAdsData: null,
  gmbData: null,
  createdAt: '2026-03-27T12:01:00Z',
  ...overrides,
});

/** Cria dados de conteudo viral com valores padrao para testes */
export const createViralContent = (overrides?: Partial<ViralContent>): ViralContent => ({
  id: 'test-viral-001',
  analysisId: 'test-analysis-001',
  platform: 'instagram',
  sourceUrl: 'https://instagram.com/reel/abc123',
  bunnyUrl: null,
  transcription: null,
  hookBodyCta: null,
  engagementMetrics: {
    views: 15000,
    likes: 1200,
    comments: 89,
    shares: 45,
    saves: 120,
  },
  createdAt: '2026-03-27T12:02:00Z',
  ...overrides,
});

/** Cria dados de recomendacao com valores padrao */
export const createRecommendation = (overrides?: Partial<Recommendation>): Recommendation => ({
  title: 'Investir em conteudo de antes/depois',
  description: 'Posts de antes/depois geram 3x mais engajamento que posts educativos.',
  priority: 'high',
  category: 'conteudo',
  ...overrides,
});

/** Cria dados de roteiro criativo com valores padrao */
export const createCreativeScript = (overrides?: Partial<CreativeScript>): CreativeScript => ({
  title: 'POV: Primeira consulta',
  hook: 'Voce sabia que 70% das pessoas tem medo de dentista?',
  body: 'Mostra a recepcao acolhedora e o ambiente moderno da clinica.',
  cta: 'Agende sua avaliacao gratuita pelo link na bio!',
  format: 'Reels/TikTok',
  estimatedDurationSeconds: 30,
  platform: 'Instagram',
  ...overrides,
});

/** Cria dados de sintese com valores padrao para testes */
export const createSynthesis = (overrides?: Partial<Synthesis>): Synthesis => ({
  id: 'test-synthesis-001',
  analysisId: 'test-analysis-001',
  strategicOverview: 'O mercado de clinicas odontologicas em SP e altamente competitivo.',
  recommendations: [createRecommendation()],
  creativeScripts: [createCreativeScript()],
  comparativeAnalysis: null,
  createdAt: '2026-03-27T12:05:00Z',
  ...overrides,
});
