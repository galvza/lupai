import type { Analysis } from '@/types/analysis';
import type { Competitor } from '@/types/competitor';
import type { ViralContent } from '@/types/viral';
import type { Synthesis, Recommendation, CreativeScript } from '@/types/database';
import type { RawCompetitorCandidate } from '@/utils/competitors';

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
  viralPatterns: null,
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
  caption: null,
  creatorHandle: null,
  durationSeconds: null,
  postDate: null,
  createdAt: '2026-03-27T12:02:00Z',
  ...overrides,
});

/** Cria dados de recomendacao com valores padrao (per D-08) */
export const createRecommendation = (overrides?: Partial<Recommendation>): Recommendation => ({
  action: 'Criar serie semanal de antes/depois no Instagram',
  reason: 'Clinica Sorriso SP gera 891 likes por post de antes/depois vs 256 em posts educativos. Este formato gera 3.5x mais engajamento.',
  priority: 'alta',
  effort: 'baixo',
  expected_impact: 'Aumento de 200-300% no engajamento do Instagram em 30 dias',
  ...overrides,
});

/** Cria dados de roteiro criativo com valores padrao (per D-12) */
export const createCreativeScript = (overrides?: Partial<CreativeScript>): CreativeScript => ({
  title: 'POV: Primeira consulta na clinica',
  format: 'Reels',
  estimated_duration_seconds: 30,
  hook: { text: 'Voce sabia que 70% das pessoas tem medo de dentista? Olha o que acontece quando elas chegam aqui...', timing_seconds: 3 },
  body: { text: 'Mostra a recepcao acolhedora, o ambiente moderno, o dentista explicando o procedimento com calma. Corta para o paciente sorrindo no final.', structure_notes: 'POV estilo "tour" com transicoes suaves. Use legendas grandes.' },
  cta: { text: 'Agende sua avaliacao gratuita pelo link na bio!', action: 'Link na bio para agendamento' },
  tone: 'acolhedor e profissional',
  inspiration_source: 'Padrao de hook provocativo com estatistica identificado em 4 videos virais do nicho',
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

/** Cria dados de candidato bruto para testes de discovery */
export const createRawCandidate = (overrides?: Partial<RawCompetitorCandidate>): RawCompetitorCandidate => ({
  name: 'Clinica Sorriso SP',
  url: 'https://clinicasorriso.com.br',
  description: 'Clinica odontologica especializada em Sao Paulo.',
  source: 'google-search',
  ...overrides,
});
