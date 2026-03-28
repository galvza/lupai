import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createCompetitor as createCompetitorFactory,
  createRecommendation,
} from '../fixtures/factories';

// Mock the Supabase client module
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();
const mockFrom = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
  createServerClient: () => ({
    from: mockFrom,
  }),
}));

// Chain builder: each method returns the chain so .from().select().eq().eq().single() works
const buildChain = (resolvedValue: { data: unknown; error: unknown }) => {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.insert = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.single = vi.fn().mockResolvedValue(resolvedValue);
  return chain;
};

describe('Modo Completo: createCompetitor with role', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('cria concorrente com role=user_business quando especificado', async () => {
    const expectedRow = {
      id: 'user-biz-001',
      analysis_id: 'analysis-001',
      name: 'meunegocio.com.br',
      website_url: 'https://meunegocio.com.br',
      website_data: null,
      seo_data: null,
      social_data: null,
      meta_ads_data: null,
      google_ads_data: null,
      gmb_data: null,
      role: 'user_business',
      created_at: '2026-03-28T12:00:00Z',
    };

    const chain = buildChain({ data: expectedRow, error: null });
    mockFrom.mockReturnValue(chain);

    const { createCompetitor } = await import('@/lib/supabase/queries');
    const result = await createCompetitor({
      analysisId: 'analysis-001',
      name: 'meunegocio.com.br',
      websiteUrl: 'https://meunegocio.com.br',
      role: 'user_business',
    });

    expect(result.role).toBe('user_business');
    expect(result.id).toBe('user-biz-001');

    // Verify that role was passed in the insert
    const insertCall = chain.insert.mock.calls[0][0];
    expect(insertCall.role).toBe('user_business');
  });

  it('cria concorrente com role=competitor por padrao', async () => {
    const expectedRow = {
      id: 'comp-001',
      analysis_id: 'analysis-001',
      name: 'Clinica Sorriso SP',
      website_url: 'https://clinicasorriso.com.br',
      website_data: null,
      seo_data: null,
      social_data: null,
      meta_ads_data: null,
      google_ads_data: null,
      gmb_data: null,
      role: 'competitor',
      created_at: '2026-03-28T12:00:00Z',
    };

    const chain = buildChain({ data: expectedRow, error: null });
    mockFrom.mockReturnValue(chain);

    const { createCompetitor } = await import('@/lib/supabase/queries');
    const result = await createCompetitor({
      analysisId: 'analysis-001',
      name: 'Clinica Sorriso SP',
      websiteUrl: 'https://clinicasorriso.com.br',
    });

    expect(result.role).toBe('competitor');

    // Verify default role was passed in the insert
    const insertCall = chain.insert.mock.calls[0][0];
    expect(insertCall.role).toBe('competitor');
  });
});

describe('Modo Completo: getCompetitorsByAnalysis filtra por role=competitor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna apenas registros com role=competitor', async () => {
    const competitorRow = {
      id: 'comp-001',
      analysis_id: 'analysis-001',
      name: 'Clinica Sorriso SP',
      website_url: 'https://clinicasorriso.com.br',
      website_data: null,
      seo_data: null,
      social_data: null,
      meta_ads_data: null,
      google_ads_data: null,
      gmb_data: null,
      role: 'competitor',
      created_at: '2026-03-28T12:00:00Z',
    };

    const chain = buildChain({ data: null, error: null });
    // Override: getCompetitorsByAnalysis does not call .single(), it returns data as array
    chain.eq = vi.fn().mockImplementation(() => chain);
    // For getCompetitorsByAnalysis: the last .eq() resolves the query (no .single())
    // We need to make the chain resolve when used as a promise (await)
    const resolvedChain = {
      select: vi.fn().mockReturnValue(resolvedChain as unknown),
      eq: vi.fn().mockReturnValue(resolvedChain as unknown),
      data: [competitorRow],
      error: null,
      then: (resolve: (val: unknown) => void) => {
        resolve({ data: [competitorRow], error: null });
        return resolvedChain;
      },
    } as unknown as Record<string, ReturnType<typeof vi.fn>>;
    // Actually, Supabase client methods are thenable. Let me simplify.
    const lastEq = vi.fn().mockResolvedValue({ data: [competitorRow], error: null });
    const firstEq = vi.fn().mockReturnValue({ eq: lastEq });
    const selectFn = vi.fn().mockReturnValue({ eq: firstEq });
    mockFrom.mockReturnValue({ select: selectFn });

    const { getCompetitorsByAnalysis } = await import('@/lib/supabase/queries');
    const results = await getCompetitorsByAnalysis('analysis-001');

    expect(results).toHaveLength(1);
    expect(results[0].role).toBe('competitor');

    // Verify .eq('role', 'competitor') was called
    expect(firstEq).toHaveBeenCalledWith('analysis_id', 'analysis-001');
    expect(lastEq).toHaveBeenCalledWith('role', 'competitor');
  });
});

describe('Modo Completo: getUserBusinessByAnalysis', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna o registro user_business para uma analise', async () => {
    const userBizRow = {
      id: 'user-biz-001',
      analysis_id: 'analysis-001',
      name: 'meunegocio.com.br',
      website_url: 'https://meunegocio.com.br',
      website_data: null,
      seo_data: null,
      social_data: null,
      meta_ads_data: null,
      google_ads_data: null,
      gmb_data: null,
      role: 'user_business',
      created_at: '2026-03-28T12:00:00Z',
    };

    const singleFn = vi.fn().mockResolvedValue({ data: userBizRow, error: null });
    const secondEq = vi.fn().mockReturnValue({ single: singleFn });
    const firstEq = vi.fn().mockReturnValue({ eq: secondEq });
    const selectFn = vi.fn().mockReturnValue({ eq: firstEq });
    mockFrom.mockReturnValue({ select: selectFn });

    const { getUserBusinessByAnalysis } = await import('@/lib/supabase/queries');
    const result = await getUserBusinessByAnalysis('analysis-001');

    expect(result).not.toBeNull();
    expect(result!.id).toBe('user-biz-001');
    expect(result!.role).toBe('user_business');
    expect(result!.name).toBe('meunegocio.com.br');

    // Verify correct filters were applied
    expect(firstEq).toHaveBeenCalledWith('analysis_id', 'analysis-001');
    expect(secondEq).toHaveBeenCalledWith('role', 'user_business');
  });

  it('retorna null quando nao existe user_business', async () => {
    const singleFn = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'No rows found', code: 'PGRST116' },
    });
    const secondEq = vi.fn().mockReturnValue({ single: singleFn });
    const firstEq = vi.fn().mockReturnValue({ eq: secondEq });
    const selectFn = vi.fn().mockReturnValue({ eq: firstEq });
    mockFrom.mockReturnValue({ select: selectFn });

    const { getUserBusinessByAnalysis } = await import('@/lib/supabase/queries');
    const result = await getUserBusinessByAnalysis('analysis-001');

    expect(result).toBeNull();
  });
});

describe('Modo Completo: factory e tipos', () => {
  it('createCompetitor factory inclui role=competitor por padrao', () => {
    const competitor = createCompetitorFactory();
    expect(competitor.role).toBe('competitor');
  });

  it('createCompetitor factory permite role=user_business', () => {
    const userBiz = createCompetitorFactory({ role: 'user_business' });
    expect(userBiz.role).toBe('user_business');
  });
});
