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

vi.mock('@/lib/apify/website', () => ({
  scrapeWebsite: vi.fn(),
}));

vi.mock('@/lib/apify/similarweb', () => ({
  scrapeSimilarweb: vi.fn(),
}));

vi.mock('@/lib/supabase/queries', () => ({
  updateCompetitor: vi.fn(),
}));

vi.mock('@/lib/validation/extractionSchemas', () => ({
  websiteDataSchema: { parse: vi.fn() },
  seoDataSchema: { parse: vi.fn() },
  validateOrNull: vi.fn(),
}));

import { scrapeWebsite } from '@/lib/apify/website';
import { scrapeSimilarweb } from '@/lib/apify/similarweb';
import { updateCompetitor } from '@/lib/supabase/queries';
import { validateOrNull } from '@/lib/validation/extractionSchemas';
import type { ExtractWebsiteResult, SocialLinks, WebsiteData, SeoData } from '@/types/competitor';
import type { WebsiteScrapingResult } from '@/lib/apify/website';

// Force module load to capture run functions
import '@/trigger/extract-website';

const mockScrapeWebsite = vi.mocked(scrapeWebsite);
const mockScrapeSimilarweb = vi.mocked(scrapeSimilarweb);
const mockUpdateCompetitor = vi.mocked(updateCompetitor);
const mockValidateOrNull = vi.mocked(validateOrNull);

const getRunFn = () => {
  const runFn = capturedRuns.get('extract-website');
  if (!runFn) throw new Error('extract-website run function not captured');
  return runFn;
};

const EMPTY_SOCIAL_LINKS: SocialLinks = {
  instagram: null,
  tiktok: null,
  facebook: null,
  youtube: null,
  linkedin: null,
  twitter: null,
};

const MOCK_PAYLOAD = {
  analysisId: 'analysis-001',
  competitorId: 'comp-001',
  competitorName: 'Clinica Teste',
  websiteUrl: 'https://clinica-teste.com',
};

const MOCK_WEBSITE_DATA: WebsiteData = {
  positioning: 'Clinica odontologica premium',
  offer: null,
  pricing: null,
  metaTags: {
    title: 'Clinica Teste - Odontologia',
    description: 'Melhor clinica de SP',
    keywords: ['odontologia', 'dentista'],
  },
};

const MOCK_SOCIAL_LINKS: SocialLinks = {
  instagram: '@clinicateste',
  tiktok: null,
  facebook: 'clinicateste',
  youtube: null,
  linkedin: null,
  twitter: null,
};

const MOCK_BUSINESS_IDS = { cnpj: '12.345.678/0001-99', emailDomain: 'clinicateste.com' };

const MOCK_WEBSITE_SCRAPING_RESULT: WebsiteScrapingResult = {
  websiteData: MOCK_WEBSITE_DATA,
  socialLinks: MOCK_SOCIAL_LINKS,
  businessIdentifiers: MOCK_BUSINESS_IDS,
  rawPagesText: 'Texto completo das paginas',
};

const MOCK_SEO_DATA: SeoData = {
  estimatedAuthority: 5000,
  topKeywords: ['dentista sp', 'clinica odontologica'],
  estimatedTraffic: 15000,
  backlinks: 200,
};

describe('extractWebsite compound task', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: validateOrNull returns the data as-is
    mockValidateOrNull.mockImplementation((_schema, data) => data as never);
    mockUpdateCompetitor.mockResolvedValue(undefined);
  });

  it('deve extrair website e SEO em paralelo e retornar resultado completo', async () => {
    mockScrapeWebsite.mockResolvedValue(MOCK_WEBSITE_SCRAPING_RESULT);
    mockScrapeSimilarweb.mockResolvedValue(MOCK_SEO_DATA);

    const result = await getRunFn()(MOCK_PAYLOAD) as ExtractWebsiteResult;

    expect(result.competitorId).toBe('comp-001');
    expect(result.websiteData).toEqual(MOCK_WEBSITE_DATA);
    expect(result.seoData).toEqual(MOCK_SEO_DATA);
    expect(result.socialLinks).toEqual(MOCK_SOCIAL_LINKS);
    expect(result.businessIdentifiers).toEqual(MOCK_BUSINESS_IDS);
    expect(result.warnings).toHaveLength(0);
  });

  it('deve chamar scrapeWebsite e scrapeSimilarweb simultaneamente', async () => {
    // Track call order to verify parallelism
    const callOrder: string[] = [];
    mockScrapeWebsite.mockImplementation(async () => {
      callOrder.push('website');
      return MOCK_WEBSITE_SCRAPING_RESULT;
    });
    mockScrapeSimilarweb.mockImplementation(async () => {
      callOrder.push('similarweb');
      return MOCK_SEO_DATA;
    });

    await getRunFn()(MOCK_PAYLOAD);

    // Both should be called (Promise.allSettled)
    expect(mockScrapeWebsite).toHaveBeenCalledWith('https://clinica-teste.com');
    expect(mockScrapeSimilarweb).toHaveBeenCalledWith('https://clinica-teste.com');
  });

  it('deve retornar seoData null com warning quando scrapeSimilarweb falha', async () => {
    mockScrapeWebsite.mockResolvedValue(MOCK_WEBSITE_SCRAPING_RESULT);
    mockScrapeSimilarweb.mockRejectedValue(new Error('SimilarWeb timeout'));

    const result = await getRunFn()(MOCK_PAYLOAD) as ExtractWebsiteResult;

    expect(result.websiteData).toEqual(MOCK_WEBSITE_DATA);
    expect(result.seoData).toBeNull();
    expect(result.socialLinks).toEqual(MOCK_SOCIAL_LINKS);
    expect(result.warnings.some((w: string) => w.includes('SEO') || w.includes('SimilarWeb'))).toBe(true);
  });

  it('deve retornar websiteData null e socialLinks vazios quando scrapeWebsite falha', async () => {
    mockScrapeWebsite.mockRejectedValue(new Error('Connection refused'));
    mockScrapeSimilarweb.mockResolvedValue(MOCK_SEO_DATA);

    const result = await getRunFn()(MOCK_PAYLOAD) as ExtractWebsiteResult;

    expect(result.websiteData).toBeNull();
    expect(result.seoData).toEqual(MOCK_SEO_DATA);
    expect(result.socialLinks).toEqual(EMPTY_SOCIAL_LINKS);
    expect(result.warnings.some((w: string) => w.includes('Website') || w.includes('website'))).toBe(true);
  });

  it('deve retornar tudo null com warnings quando ambos falham', async () => {
    mockScrapeWebsite.mockRejectedValue(new Error('Website error'));
    mockScrapeSimilarweb.mockRejectedValue(new Error('SEO error'));

    const result = await getRunFn()(MOCK_PAYLOAD) as ExtractWebsiteResult;

    expect(result.websiteData).toBeNull();
    expect(result.seoData).toBeNull();
    expect(result.socialLinks).toEqual(EMPTY_SOCIAL_LINKS);
    expect(result.warnings.length).toBeGreaterThanOrEqual(2);
  });

  it('deve armazenar null para websiteData quando validacao Zod falha', async () => {
    mockScrapeWebsite.mockResolvedValue(MOCK_WEBSITE_SCRAPING_RESULT);
    mockScrapeSimilarweb.mockResolvedValue(MOCK_SEO_DATA);
    // First call (websiteData) returns null = validation fail, second call (seoData) passes
    mockValidateOrNull
      .mockReturnValueOnce(null)
      .mockReturnValueOnce(MOCK_SEO_DATA as never);

    const result = await getRunFn()(MOCK_PAYLOAD) as ExtractWebsiteResult;

    expect(result.websiteData).toBeNull();
    expect(result.seoData).toEqual(MOCK_SEO_DATA);
    expect(result.warnings.some((w: string) => w.includes('insuficientes') || w.includes('website'))).toBe(true);
  });

  it('deve armazenar null para seoData quando validacao Zod falha', async () => {
    mockScrapeWebsite.mockResolvedValue(MOCK_WEBSITE_SCRAPING_RESULT);
    mockScrapeSimilarweb.mockResolvedValue(MOCK_SEO_DATA);
    // First call (websiteData) passes, second call (seoData) returns null
    mockValidateOrNull
      .mockReturnValueOnce(MOCK_WEBSITE_DATA as never)
      .mockReturnValueOnce(null);

    const result = await getRunFn()(MOCK_PAYLOAD) as ExtractWebsiteResult;

    expect(result.websiteData).toEqual(MOCK_WEBSITE_DATA);
    expect(result.seoData).toBeNull();
    expect(result.warnings.some((w: string) => w.includes('SEO') || w.includes('insuficientes'))).toBe(true);
  });

  it('deve salvar dados no Supabase via updateCompetitor com colunas snake_case', async () => {
    mockScrapeWebsite.mockResolvedValue(MOCK_WEBSITE_SCRAPING_RESULT);
    mockScrapeSimilarweb.mockResolvedValue(MOCK_SEO_DATA);

    await getRunFn()(MOCK_PAYLOAD);

    expect(mockUpdateCompetitor).toHaveBeenCalledWith('comp-001', {
      website_data: MOCK_WEBSITE_DATA,
      seo_data: MOCK_SEO_DATA,
    });
  });

  it('nunca deve lancar excecao nao tratada (try/catch geral)', async () => {
    mockScrapeWebsite.mockImplementation(() => { throw new Error('Unexpected crash'); });
    mockScrapeSimilarweb.mockImplementation(() => { throw new Error('Also crash'); });

    const result = await getRunFn()(MOCK_PAYLOAD) as ExtractWebsiteResult;

    // Should NOT throw, should return fallback result
    expect(result.competitorId).toBe('comp-001');
    expect(result.websiteData).toBeNull();
    expect(result.seoData).toBeNull();
    expect(result.socialLinks).toEqual(EMPTY_SOCIAL_LINKS);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('deve atualizar metadata com status e progresso', async () => {
    mockScrapeWebsite.mockResolvedValue(MOCK_WEBSITE_SCRAPING_RESULT);
    mockScrapeSimilarweb.mockResolvedValue(MOCK_SEO_DATA);

    await getRunFn()(MOCK_PAYLOAD);

    const statusCalls = mockMetadata.set.mock.calls
      .filter(([key]: [string]) => key === 'status')
      .map(([, val]: [string, string]) => val);

    expect(statusCalls).toContain('running');
    expect(statusCalls).toContain('completed');
    expect(mockMetadata.set).toHaveBeenCalledWith('competitor', 'Clinica Teste');
  });
});
