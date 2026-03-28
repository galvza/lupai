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

vi.mock('@/lib/apify/instagram', () => ({
  scrapeInstagram: vi.fn(),
}));

vi.mock('@/lib/apify/tiktok', () => ({
  scrapeTiktok: vi.fn(),
}));

vi.mock('@/lib/supabase/queries', () => ({
  updateCompetitor: vi.fn(),
}));

vi.mock('@/lib/validation/extractionSchemas', () => ({
  socialDataSchema: { parse: vi.fn() },
  validateOrNull: vi.fn(),
}));

import { scrapeInstagram } from '@/lib/apify/instagram';
import { scrapeTiktok } from '@/lib/apify/tiktok';
import { updateCompetitor } from '@/lib/supabase/queries';
import { validateOrNull } from '@/lib/validation/extractionSchemas';
import type { ExtractSocialResult, SocialData } from '@/types/competitor';

// Force module load to capture run functions
import '@/trigger/extract-social';

const mockScrapeInstagram = vi.mocked(scrapeInstagram);
const mockScrapeTiktok = vi.mocked(scrapeTiktok);
const mockUpdateCompetitor = vi.mocked(updateCompetitor);
const mockValidateOrNull = vi.mocked(validateOrNull);

const getRunFn = () => {
  const runFn = capturedRuns.get('extract-social');
  if (!runFn) throw new Error('extract-social run function not captured');
  return runFn;
};

const MOCK_IG_DATA: SocialData['instagram'] = {
  followers: 25000,
  postingFrequency: null,
  engagementRate: 3.5,
  topPosts: [
    { url: 'https://instagram.com/p/abc', caption: 'Post 1', likes: 500, comments: 20, shares: null, postedAt: '2026-01-01' },
  ],
};

const MOCK_TT_DATA: SocialData['tiktok'] = {
  followers: 50000,
  postingFrequency: null,
  engagementRate: null,
  topPosts: [
    { url: 'https://tiktok.com/@user/video/123', caption: 'Video 1', likes: 1000, comments: 50, shares: 200, postedAt: '2026-01-01' },
  ],
};

const MOCK_PAYLOAD_BOTH = {
  analysisId: 'analysis-001',
  competitorId: 'comp-001',
  competitorName: 'Clinica Teste',
  socialProfiles: {
    instagram: { username: 'clinicateste', source: 'website' as const },
    tiktok: { username: 'clinicateste_tt', source: 'website' as const },
  },
};

const MOCK_PAYLOAD_IG_ONLY = {
  analysisId: 'analysis-001',
  competitorId: 'comp-001',
  competitorName: 'Clinica Teste',
  socialProfiles: {
    instagram: { username: 'clinicateste', source: 'website' as const },
    tiktok: null,
  },
};

const MOCK_PAYLOAD_TT_ONLY = {
  analysisId: 'analysis-001',
  competitorId: 'comp-001',
  competitorName: 'Clinica Teste',
  socialProfiles: {
    instagram: null,
    tiktok: { username: 'clinicateste_tt', source: 'website' as const },
  },
};

const MOCK_PAYLOAD_NONE = {
  analysisId: 'analysis-001',
  competitorId: 'comp-001',
  competitorName: 'Clinica Teste',
  socialProfiles: {
    instagram: null,
    tiktok: null,
  },
};

describe('extractSocial task', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: validateOrNull returns data as-is
    mockValidateOrNull.mockImplementation((_schema, data) => data as never);
    mockUpdateCompetitor.mockResolvedValue(undefined);
  });

  it('deve extrair Instagram e TikTok em paralelo quando ambos existem', async () => {
    mockScrapeInstagram.mockResolvedValue(MOCK_IG_DATA);
    mockScrapeTiktok.mockResolvedValue(MOCK_TT_DATA);

    const result = await getRunFn()(MOCK_PAYLOAD_BOTH) as ExtractSocialResult;

    expect(result.competitorId).toBe('comp-001');
    expect(result.socialData).toEqual({ instagram: MOCK_IG_DATA, tiktok: MOCK_TT_DATA });
    expect(result.warnings).toHaveLength(0);
    expect(mockScrapeInstagram).toHaveBeenCalledWith('clinicateste');
    expect(mockScrapeTiktok).toHaveBeenCalledWith('clinicateste_tt');
  });

  it('deve extrair apenas Instagram quando TikTok profile e null (per D-24)', async () => {
    mockScrapeInstagram.mockResolvedValue(MOCK_IG_DATA);

    const result = await getRunFn()(MOCK_PAYLOAD_IG_ONLY) as ExtractSocialResult;

    expect(result.socialData?.instagram).toEqual(MOCK_IG_DATA);
    expect(result.socialData?.tiktok).toBeNull();
    expect(mockScrapeInstagram).toHaveBeenCalledWith('clinicateste');
    expect(mockScrapeTiktok).not.toHaveBeenCalled();
  });

  it('deve extrair apenas TikTok quando Instagram profile e null', async () => {
    mockScrapeTiktok.mockResolvedValue(MOCK_TT_DATA);

    const result = await getRunFn()(MOCK_PAYLOAD_TT_ONLY) as ExtractSocialResult;

    expect(result.socialData?.instagram).toBeNull();
    expect(result.socialData?.tiktok).toEqual(MOCK_TT_DATA);
    expect(mockScrapeInstagram).not.toHaveBeenCalled();
    expect(mockScrapeTiktok).toHaveBeenCalledWith('clinicateste_tt');
  });

  it('deve retornar socialData null quando ambos profiles sao null', async () => {
    const result = await getRunFn()(MOCK_PAYLOAD_NONE) as ExtractSocialResult;

    expect(result.socialData).toBeNull();
    expect(result.warnings.some((w: string) => w.includes('Nenhum perfil social'))).toBe(true);
    expect(mockScrapeInstagram).not.toHaveBeenCalled();
    expect(mockScrapeTiktok).not.toHaveBeenCalled();
  });

  it('deve retornar instagram null quando Instagram falha mas TikTok sucede (per D-31)', async () => {
    mockScrapeInstagram.mockRejectedValue(new Error('Instagram timeout'));
    mockScrapeTiktok.mockResolvedValue(MOCK_TT_DATA);

    const result = await getRunFn()(MOCK_PAYLOAD_BOTH) as ExtractSocialResult;

    expect(result.socialData?.instagram).toBeNull();
    expect(result.socialData?.tiktok).toEqual(MOCK_TT_DATA);
    expect(result.warnings.some((w: string) => w.includes('Instagram'))).toBe(true);
  });

  it('deve armazenar null quando socialDataSchema validacao falha (per D-32)', async () => {
    mockScrapeInstagram.mockResolvedValue(MOCK_IG_DATA);
    mockScrapeTiktok.mockResolvedValue(MOCK_TT_DATA);
    mockValidateOrNull.mockReturnValue(null);

    const result = await getRunFn()(MOCK_PAYLOAD_BOTH) as ExtractSocialResult;

    expect(result.socialData).toBeNull();
    expect(result.warnings.some((w: string) => w.includes('insuficientes') || w.includes('social'))).toBe(true);
  });

  it('deve salvar no Supabase via updateCompetitor com coluna snake_case', async () => {
    mockScrapeInstagram.mockResolvedValue(MOCK_IG_DATA);
    mockScrapeTiktok.mockResolvedValue(MOCK_TT_DATA);

    await getRunFn()(MOCK_PAYLOAD_BOTH);

    expect(mockUpdateCompetitor).toHaveBeenCalledWith('comp-001', {
      social_data: { instagram: MOCK_IG_DATA, tiktok: MOCK_TT_DATA },
    });
  });

  it('nunca deve lancar excecao nao tratada (per D-35/D-42)', async () => {
    mockScrapeInstagram.mockImplementation(() => { throw new Error('Unexpected crash'); });
    mockScrapeTiktok.mockImplementation(() => { throw new Error('Also crash'); });

    const result = await getRunFn()(MOCK_PAYLOAD_BOTH) as ExtractSocialResult;

    expect(result.competitorId).toBe('comp-001');
    expect(result.socialData).toBeNull();
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('deve atualizar metadata com status e progresso', async () => {
    mockScrapeInstagram.mockResolvedValue(MOCK_IG_DATA);
    mockScrapeTiktok.mockResolvedValue(MOCK_TT_DATA);

    await getRunFn()(MOCK_PAYLOAD_BOTH);

    const statusCalls = mockMetadata.set.mock.calls
      .filter(([key]: [string]) => key === 'status')
      .map(([, val]: [string, string]) => val);

    expect(statusCalls).toContain('running');
    expect(statusCalls).toContain('completed');
    expect(mockMetadata.set).toHaveBeenCalledWith('competitor', 'Clinica Teste');
  });
});
