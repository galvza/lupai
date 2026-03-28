import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase queries
vi.mock('@/lib/supabase/queries', () => ({
  getAnalysis: vi.fn(),
  getCompetitorsByAnalysis: vi.fn(),
  getUserBusinessByAnalysis: vi.fn(),
  getViralContentByAnalysis: vi.fn(),
  getSynthesisByAnalysis: vi.fn(),
}));

// Mock section-statuses
vi.mock('@/lib/api/section-statuses', () => ({
  deriveSectionStatuses: vi.fn(),
}));

import { GET } from '@/app/api/analysis/[id]/route';
import {
  getAnalysis,
  getCompetitorsByAnalysis,
  getUserBusinessByAnalysis,
  getViralContentByAnalysis,
  getSynthesisByAnalysis,
} from '@/lib/supabase/queries';
import { deriveSectionStatuses } from '@/lib/api/section-statuses';
import {
  createAnalysis,
  createCompetitor,
  createViralContent,
  createSynthesis,
} from '../fixtures/factories';
import type { SectionStatus } from '@/types/analysis';

const mockGetAnalysis = vi.mocked(getAnalysis);
const mockGetCompetitors = vi.mocked(getCompetitorsByAnalysis);
const mockGetUserBusiness = vi.mocked(getUserBusinessByAnalysis);
const mockGetViralContent = vi.mocked(getViralContentByAnalysis);
const mockGetSynthesis = vi.mocked(getSynthesisByAnalysis);
const mockDeriveSectionStatuses = vi.mocked(deriveSectionStatuses);

/** Helper para criar params no formato Next.js 15 (async) */
const createParams = (id: string) => ({ params: Promise.resolve({ id }) });

/** Helper para chamar o GET handler */
const callGet = (id: string) =>
  GET(new Request('http://localhost/api/analysis/' + id), createParams(id));

/** Mock de 10 section statuses */
const MOCK_SECTION_STATUSES: SectionStatus[] = [
  { section: 'overview', status: 'available' },
  { section: 'competitors', status: 'available' },
  { section: 'website', status: 'available' },
  { section: 'seo', status: 'available' },
  { section: 'social', status: 'available' },
  { section: 'ads', status: 'available' },
  { section: 'viral', status: 'available' },
  { section: 'recommendations', status: 'available' },
  { section: 'scripts', status: 'available' },
  { section: 'comparative', status: 'unavailable' },
];

const MOCK_UNAVAILABLE_STATUSES: SectionStatus[] = [
  { section: 'overview', status: 'unavailable' },
  { section: 'competitors', status: 'unavailable' },
  { section: 'website', status: 'unavailable' },
  { section: 'seo', status: 'unavailable' },
  { section: 'social', status: 'unavailable' },
  { section: 'ads', status: 'unavailable' },
  { section: 'viral', status: 'unavailable' },
  { section: 'recommendations', status: 'unavailable' },
  { section: 'scripts', status: 'unavailable' },
  { section: 'comparative', status: 'unavailable' },
];

describe('GET /api/analysis/[id]', () => {
  const mockAnalysis = createAnalysis({ id: 'analysis-001', status: 'completed' });
  const mockCompetitors = [
    createCompetitor({ id: 'c1', name: 'Concorrente A' }),
    createCompetitor({ id: 'c2', name: 'Concorrente B' }),
  ];
  const mockUserBusiness = createCompetitor({ id: 'ub1', role: 'user_business', name: 'Meu Negocio' });
  const mockViralContent = [createViralContent({ id: 'v1' })];
  const mockSynthesis = createSynthesis({ id: 's1' });

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAnalysis.mockResolvedValue(mockAnalysis);
    mockGetCompetitors.mockResolvedValue(mockCompetitors);
    mockGetUserBusiness.mockResolvedValue(mockUserBusiness);
    mockGetViralContent.mockResolvedValue(mockViralContent);
    mockGetSynthesis.mockResolvedValue(mockSynthesis);
    mockDeriveSectionStatuses.mockReturnValue(MOCK_SECTION_STATUSES);
  });

  it('retorna 404 com erro PT-BR quando analise nao existe', async () => {
    mockGetAnalysis.mockResolvedValue(null);

    const response = await callGet('nao-existe');
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Analise nao encontrada.');
  });

  it('retorna 200 com AnalysisResultsResponse completo quando analise existe', async () => {
    const response = await callGet('analysis-001');
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('analysis');
    expect(data).toHaveProperty('competitors');
    expect(data).toHaveProperty('userBusiness');
    expect(data).toHaveProperty('viralContent');
    expect(data).toHaveProperty('synthesis');
    expect(data).toHaveProperty('viralPatterns');
    expect(data).toHaveProperty('sectionStatuses');
  });

  it('response.analysis corresponde ao retorno de getAnalysis', async () => {
    const response = await callGet('analysis-001');
    const data = await response.json();

    expect(data.analysis.id).toBe('analysis-001');
    expect(data.analysis.status).toBe('completed');
    expect(data.analysis.nicheInput).toBe(mockAnalysis.nicheInput);
  });

  it('response.competitors e array de getCompetitorsByAnalysis', async () => {
    const response = await callGet('analysis-001');
    const data = await response.json();

    expect(data.competitors).toHaveLength(2);
    expect(data.competitors[0].name).toBe('Concorrente A');
    expect(data.competitors[1].name).toBe('Concorrente B');
  });

  it('response.userBusiness e de getUserBusinessByAnalysis (null no modo rapido)', async () => {
    mockGetUserBusiness.mockResolvedValue(null);

    const response = await callGet('analysis-001');
    const data = await response.json();

    expect(data.userBusiness).toBeNull();
  });

  it('response.userBusiness retorna dados quando presente', async () => {
    const response = await callGet('analysis-001');
    const data = await response.json();

    expect(data.userBusiness).not.toBeNull();
    expect(data.userBusiness.name).toBe('Meu Negocio');
  });

  it('response.viralContent e array de getViralContentByAnalysis', async () => {
    const response = await callGet('analysis-001');
    const data = await response.json();

    expect(data.viralContent).toHaveLength(1);
    expect(data.viralContent[0].id).toBe('v1');
  });

  it('response.synthesis e de getSynthesisByAnalysis', async () => {
    const response = await callGet('analysis-001');
    const data = await response.json();

    expect(data.synthesis).not.toBeNull();
    expect(data.synthesis.id).toBe('s1');
  });

  it('response.viralPatterns vem do campo analysis.viralPatterns', async () => {
    const analysisWithPatterns = createAnalysis({
      id: 'analysis-001',
      status: 'completed',
      viralPatterns: {
        dominantHookTypes: ['pergunta provocativa'],
        commonCtaPatterns: ['link na bio'],
        averageDurationSeconds: 28,
        topPerformingFormats: ['reels'],
        engagementInsights: ['videos curtos performam melhor'],
      },
    });
    mockGetAnalysis.mockResolvedValue(analysisWithPatterns);

    const response = await callGet('analysis-001');
    const data = await response.json();

    expect(data.viralPatterns).not.toBeNull();
    expect(data.viralPatterns.dominantHookTypes).toContain('pergunta provocativa');
  });

  it('response.sectionStatuses e array de length 10', async () => {
    const response = await callGet('analysis-001');
    const data = await response.json();

    expect(data.sectionStatuses).toHaveLength(10);
  });

  it('retorna 200 com sectionStatuses unavailable quando analise esta em processing', async () => {
    const processingAnalysis = createAnalysis({
      id: 'analysis-001',
      status: 'processing',
      nicheInterpreted: null,
    });
    mockGetAnalysis.mockResolvedValue(processingAnalysis);
    mockGetCompetitors.mockResolvedValue([]);
    mockGetViralContent.mockResolvedValue([]);
    mockGetSynthesis.mockResolvedValue(null);
    mockDeriveSectionStatuses.mockReturnValue(MOCK_UNAVAILABLE_STATUSES);

    const response = await callGet('analysis-001');
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.sectionStatuses).toHaveLength(10);
    expect(data.sectionStatuses.every((s: SectionStatus) => s.status === 'unavailable')).toBe(true);
  });

  it('retorna 200 com fallback values se sub-query lanca erro', async () => {
    mockGetCompetitors.mockRejectedValue(new Error('Erro no banco'));
    mockGetViralContent.mockRejectedValue(new Error('Timeout'));

    const response = await callGet('analysis-001');
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.competitors).toEqual([]);
    expect(data.viralContent).toEqual([]);
    expect(data.synthesis).not.toBeUndefined();
  });

  it('analise completa inclui Cache-Control header com max-age', async () => {
    const response = await callGet('analysis-001');

    expect(response.headers.get('Cache-Control')).toContain('max-age');
    expect(response.headers.get('Cache-Control')).toContain('public');
  });

  it('analise nao completa inclui Cache-Control no-cache', async () => {
    const processingAnalysis = createAnalysis({
      id: 'analysis-001',
      status: 'processing',
    });
    mockGetAnalysis.mockResolvedValue(processingAnalysis);

    const response = await callGet('analysis-001');

    expect(response.headers.get('Cache-Control')).toContain('no-cache');
  });
});
