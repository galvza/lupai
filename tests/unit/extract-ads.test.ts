import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Hoisted mocks ---
const { mockMetadata, capturedRuns } = vi.hoisted(() => ({
  mockMetadata: { set: vi.fn() },
  capturedRuns: new Map<string, (payload: unknown) => Promise<unknown>>(),
}));

vi.mock('@trigger.dev/sdk', () => ({
  task: vi.fn((config: { id: string; run: (payload: unknown) => Promise<unknown> }) => {
    capturedRuns.set(config.id, config.run);
    return config;
  }),
  metadata: mockMetadata,
}));

vi.mock('@/lib/apify/facebook-ads', () => ({
  scrapeFacebookAds: vi.fn(),
}));

vi.mock('@/lib/apify/google-ads', () => ({
  scrapeGoogleAds: vi.fn(),
}));

vi.mock('@/lib/apify/google-maps', () => ({
  scrapeGoogleMaps: vi.fn(),
}));

vi.mock('@/lib/supabase/queries', () => ({
  updateCompetitor: vi.fn(),
}));

vi.mock('@/lib/validation/extractionSchemas', () => ({
  metaAdsDataSchema: { parse: vi.fn() },
  googleAdsDataSchema: { parse: vi.fn() },
  gmbDataSchema: { parse: vi.fn() },
  validateOrNull: vi.fn(),
}));

import { scrapeFacebookAds } from '@/lib/apify/facebook-ads';
import { scrapeGoogleAds } from '@/lib/apify/google-ads';
import { scrapeGoogleMaps } from '@/lib/apify/google-maps';
import { updateCompetitor } from '@/lib/supabase/queries';
import { validateOrNull } from '@/lib/validation/extractionSchemas';
import type { ExtractAdsResult, MetaAdsData, GoogleAdsData, GmbData } from '@/types/competitor';

// Force module load to capture run functions
import '@/trigger/extract-ads';

const mockScrapeFacebookAds = vi.mocked(scrapeFacebookAds);
const mockScrapeGoogleAds = vi.mocked(scrapeGoogleAds);
const mockScrapeGoogleMaps = vi.mocked(scrapeGoogleMaps);
const mockUpdateCompetitor = vi.mocked(updateCompetitor);
const mockValidateOrNull = vi.mocked(validateOrNull);

const getRunFn = () => {
  const runFn = capturedRuns.get('extract-ads');
  if (!runFn) throw new Error('extract-ads run function not captured');
  return runFn;
};

const MOCK_PAYLOAD = {
  analysisId: 'analysis-001',
  competitorId: 'comp-001',
  competitorName: 'Clinica Teste',
  websiteUrl: 'https://www.clinica-teste.com',
  region: 'Sao Paulo, SP',
};

const MOCK_META_ADS: MetaAdsData = {
  activeAdsCount: 3,
  ads: [
    {
      adId: 'meta-ad-001',
      creativeUrl: 'https://example.com/creative1.jpg',
      copyText: 'Clareamento dental com 40% de desconto! Agende sua avaliacao gratuita.',
      format: 'image',
      startedAt: '2026-03-01T00:00:00Z',
      isActive: true,
    },
    {
      adId: 'meta-ad-002',
      creativeUrl: 'https://example.com/creative2.mp4',
      copyText: 'Implante dentario em ate 12x sem juros. Consulta gratis!',
      format: 'video',
      startedAt: '2026-02-15T00:00:00Z',
      isActive: true,
    },
    {
      adId: 'meta-ad-003',
      creativeUrl: 'https://example.com/creative3.jpg',
      copyText: 'Aparelho invisivel: seu sorriso perfeito sem metal',
      format: 'carousel',
      startedAt: '2026-03-10T00:00:00Z',
      isActive: true,
    },
  ],
};

const MOCK_GOOGLE_ADS: GoogleAdsData = {
  hasSearchAds: true,
  paidKeywords: ['dentista sp', 'clinica odontologica', 'implante dentario preco', 'clareamento dental'],
  estimatedBudget: 'R$ 2.000-5.000/mes',
};

const MOCK_GMB: GmbData = {
  name: 'Clinica Sorriso SP',
  rating: 4.7,
  reviewCount: 234,
  address: 'Av. Paulista, 1000 - Bela Vista, Sao Paulo - SP',
  phone: '(11) 3456-7890',
  categories: ['Dentista', 'Clinica odontologica', 'Ortodontista'],
};

describe('extractAds compound task', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: validateOrNull returns the data as-is
    mockValidateOrNull.mockImplementation((_schema, data) => data as never);
    mockUpdateCompetitor.mockResolvedValue(undefined);
  });

  it('deve extrair Meta Ads, Google Ads e GMB em paralelo e retornar resultado completo', async () => {
    mockScrapeFacebookAds.mockResolvedValue(MOCK_META_ADS);
    mockScrapeGoogleAds.mockResolvedValue(MOCK_GOOGLE_ADS);
    mockScrapeGoogleMaps.mockResolvedValue(MOCK_GMB);

    const result = await getRunFn()(MOCK_PAYLOAD) as ExtractAdsResult;

    expect(result.competitorId).toBe('comp-001');
    expect(result.metaAds).toEqual(MOCK_META_ADS);
    expect(result.googleAds).toEqual(MOCK_GOOGLE_ADS);
    expect(result.gmb).toEqual(MOCK_GMB);
    expect(result.warnings).toHaveLength(0);
    expect(result.status).toBe('success');
  });

  it('deve chamar scrapeFacebookAds, scrapeGoogleAds e scrapeGoogleMaps simultaneamente', async () => {
    const callOrder: string[] = [];
    mockScrapeFacebookAds.mockImplementation(async () => {
      callOrder.push('meta');
      return MOCK_META_ADS;
    });
    mockScrapeGoogleAds.mockImplementation(async () => {
      callOrder.push('google');
      return MOCK_GOOGLE_ADS;
    });
    mockScrapeGoogleMaps.mockImplementation(async () => {
      callOrder.push('gmb');
      return MOCK_GMB;
    });

    await getRunFn()(MOCK_PAYLOAD);

    // All three should be called (Promise.allSettled)
    expect(mockScrapeFacebookAds).toHaveBeenCalledWith('https://www.clinica-teste.com', 'Clinica Teste');
    expect(mockScrapeGoogleAds).toHaveBeenCalledWith('clinica-teste.com', 'Clinica Teste');
    expect(mockScrapeGoogleMaps).toHaveBeenCalledWith('Clinica Teste', 'Sao Paulo, SP');
  });

  it('deve retornar status "partial" quando Meta falha mas Google e GMB succedem', async () => {
    mockScrapeFacebookAds.mockRejectedValue(new Error('Meta Ads timeout'));
    mockScrapeGoogleAds.mockResolvedValue(MOCK_GOOGLE_ADS);
    mockScrapeGoogleMaps.mockResolvedValue(MOCK_GMB);

    const result = await getRunFn()(MOCK_PAYLOAD) as ExtractAdsResult;

    expect(result.metaAds).toBeNull();
    expect(result.googleAds).toEqual(MOCK_GOOGLE_ADS);
    expect(result.gmb).toEqual(MOCK_GMB);
    expect(result.status).toBe('partial');
    expect(result.warnings.some((w: string) => w.includes('Meta Ads'))).toBe(true);
  });

  it('deve retornar status "partial" quando Google falha mas Meta e GMB succedem', async () => {
    mockScrapeFacebookAds.mockResolvedValue(MOCK_META_ADS);
    mockScrapeGoogleAds.mockRejectedValue(new Error('Google Ads timeout'));
    mockScrapeGoogleMaps.mockResolvedValue(MOCK_GMB);

    const result = await getRunFn()(MOCK_PAYLOAD) as ExtractAdsResult;

    expect(result.metaAds).toEqual(MOCK_META_ADS);
    expect(result.googleAds).toBeNull();
    expect(result.gmb).toEqual(MOCK_GMB);
    expect(result.status).toBe('partial');
    expect(result.warnings.some((w: string) => w.includes('Google Ads'))).toBe(true);
  });

  it('deve retornar gmb null sem warning quando scrapeGoogleMaps retorna null', async () => {
    mockScrapeFacebookAds.mockResolvedValue(MOCK_META_ADS);
    mockScrapeGoogleAds.mockResolvedValue(MOCK_GOOGLE_ADS);
    mockScrapeGoogleMaps.mockResolvedValue(null);

    const result = await getRunFn()(MOCK_PAYLOAD) as ExtractAdsResult;

    expect(result.gmb).toBeNull();
    expect(result.metaAds).toEqual(MOCK_META_ADS);
    expect(result.googleAds).toEqual(MOCK_GOOGLE_ADS);
    // GMB null from scraper is valid -- no warning added for GMB
    expect(result.warnings.filter((w: string) => w.includes('Google Meu Negocio') || w.includes('GMB'))).toHaveLength(0);
    expect(result.status).toBe('partial');
  });

  it('deve retornar status "unavailable" quando todos os 3 falham', async () => {
    mockScrapeFacebookAds.mockRejectedValue(new Error('Meta error'));
    mockScrapeGoogleAds.mockRejectedValue(new Error('Google error'));
    mockScrapeGoogleMaps.mockRejectedValue(new Error('GMB error'));

    const result = await getRunFn()(MOCK_PAYLOAD) as ExtractAdsResult;

    expect(result.metaAds).toBeNull();
    expect(result.googleAds).toBeNull();
    expect(result.gmb).toBeNull();
    expect(result.status).toBe('unavailable');
    expect(result.warnings.length).toBeGreaterThanOrEqual(3);
  });

  it('deve armazenar null para metaAds quando validacao Zod falha', async () => {
    mockScrapeFacebookAds.mockResolvedValue(MOCK_META_ADS);
    mockScrapeGoogleAds.mockResolvedValue(MOCK_GOOGLE_ADS);
    mockScrapeGoogleMaps.mockResolvedValue(MOCK_GMB);
    // First call (metaAds) returns null = validation fail, rest pass
    mockValidateOrNull
      .mockReturnValueOnce(null)
      .mockReturnValueOnce(MOCK_GOOGLE_ADS as never)
      .mockReturnValueOnce(MOCK_GMB as never);

    const result = await getRunFn()(MOCK_PAYLOAD) as ExtractAdsResult;

    expect(result.metaAds).toBeNull();
    expect(result.googleAds).toEqual(MOCK_GOOGLE_ADS);
    expect(result.gmb).toEqual(MOCK_GMB);
    expect(result.warnings.some((w: string) => w.includes('Meta Ads') && w.includes('insuficientes'))).toBe(true);
  });

  it('deve armazenar null para googleAds quando validacao Zod falha', async () => {
    mockScrapeFacebookAds.mockResolvedValue(MOCK_META_ADS);
    mockScrapeGoogleAds.mockResolvedValue(MOCK_GOOGLE_ADS);
    mockScrapeGoogleMaps.mockResolvedValue(MOCK_GMB);
    // First call (metaAds) passes, second (googleAds) fails, third (gmb) passes
    mockValidateOrNull
      .mockReturnValueOnce(MOCK_META_ADS as never)
      .mockReturnValueOnce(null)
      .mockReturnValueOnce(MOCK_GMB as never);

    const result = await getRunFn()(MOCK_PAYLOAD) as ExtractAdsResult;

    expect(result.metaAds).toEqual(MOCK_META_ADS);
    expect(result.googleAds).toBeNull();
    expect(result.gmb).toEqual(MOCK_GMB);
    expect(result.warnings.some((w: string) => w.includes('Google Ads') && w.includes('insuficientes'))).toBe(true);
  });

  it('deve salvar dados no Supabase via updateCompetitor com colunas snake_case', async () => {
    mockScrapeFacebookAds.mockResolvedValue(MOCK_META_ADS);
    mockScrapeGoogleAds.mockResolvedValue(MOCK_GOOGLE_ADS);
    mockScrapeGoogleMaps.mockResolvedValue(MOCK_GMB);

    await getRunFn()(MOCK_PAYLOAD);

    expect(mockUpdateCompetitor).toHaveBeenCalledWith('comp-001', {
      meta_ads_data: MOCK_META_ADS,
      google_ads_data: MOCK_GOOGLE_ADS,
      gmb_data: MOCK_GMB,
    });
  });

  it('nunca deve lancar excecao nao tratada (try/catch geral returns fallback result)', async () => {
    mockScrapeFacebookAds.mockImplementation(() => { throw new Error('Unexpected crash'); });
    mockScrapeGoogleAds.mockImplementation(() => { throw new Error('Also crash'); });
    mockScrapeGoogleMaps.mockImplementation(() => { throw new Error('GMB crash'); });

    const result = await getRunFn()(MOCK_PAYLOAD) as ExtractAdsResult;

    // Should NOT throw, should return fallback result
    expect(result.competitorId).toBe('comp-001');
    expect(result.metaAds).toBeNull();
    expect(result.googleAds).toBeNull();
    expect(result.gmb).toBeNull();
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.status).toBe('unavailable');
  });

  it('deve atualizar metadata com status, competitor, e adsProgress', async () => {
    mockScrapeFacebookAds.mockResolvedValue(MOCK_META_ADS);
    mockScrapeGoogleAds.mockResolvedValue(MOCK_GOOGLE_ADS);
    mockScrapeGoogleMaps.mockResolvedValue(MOCK_GMB);

    await getRunFn()(MOCK_PAYLOAD);

    const statusCalls = mockMetadata.set.mock.calls
      .filter(([key]: [string]) => key === 'status')
      .map(([, val]: [string, string]) => val);

    expect(statusCalls).toContain('running');
    expect(statusCalls).toContain('completed');
    expect(mockMetadata.set).toHaveBeenCalledWith('competitor', 'Clinica Teste');
    expect(mockMetadata.set).toHaveBeenCalledWith('adsProgress', expect.objectContaining({
      meta: expect.any(String),
      google: expect.any(String),
      gmb: expect.any(String),
    }));
  });

  it('deve extrair domain de websiteUrl usando new URL().hostname (strip www.)', async () => {
    mockScrapeFacebookAds.mockResolvedValue(MOCK_META_ADS);
    mockScrapeGoogleAds.mockResolvedValue(MOCK_GOOGLE_ADS);
    mockScrapeGoogleMaps.mockResolvedValue(MOCK_GMB);

    await getRunFn()(MOCK_PAYLOAD);

    // websiteUrl is 'https://www.clinica-teste.com' -> domain should be 'clinica-teste.com'
    expect(mockScrapeGoogleAds).toHaveBeenCalledWith('clinica-teste.com', 'Clinica Teste');
  });
});
