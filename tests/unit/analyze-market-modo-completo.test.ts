import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockMetadata, mockWait, mockBatch, capturedRuns } = vi.hoisted(() => ({
  mockMetadata: { set: vi.fn() },
  mockWait: { createToken: vi.fn(), forToken: vi.fn() },
  mockBatch: { triggerByTaskAndWait: vi.fn() },
  capturedRuns: new Map<string, (payload: unknown) => Promise<unknown>>(),
}));

vi.mock('@trigger.dev/sdk', () => ({
  task: vi.fn((config: { id: string; run: (payload: unknown) => Promise<unknown> }) => {
    capturedRuns.set(config.id, config.run);
    // Store triggerAndWait on the returned object so extractWebsite.triggerAndWait works
    return {
      ...config,
      triggerAndWait: vi.fn(),
    };
  }),
  metadata: mockMetadata,
  wait: mockWait,
  batch: mockBatch,
}));

vi.mock('@/lib/ai/score-competitors', () => ({
  scoreCompetitorsWithAI: vi.fn(),
}));

vi.mock('@/utils/competitors', () => ({
  filterBlockedDomains: vi.fn((c: unknown[]) => c),
  deduplicateCandidates: vi.fn((c: unknown[]) => c),
}));

vi.mock('@/lib/supabase/queries', () => ({
  createCompetitor: vi.fn(),
  updateAnalysis: vi.fn(),
  getCompetitorsByAnalysis: vi.fn(),
}));

vi.mock('./discover-competitors', () => ({
  discoverFromGoogleSearch: { id: 'discover-google-search' },
  discoverFromGoogleMaps: { id: 'discover-google-maps' },
  discoverFromFacebookAds: { id: 'discover-facebook-ads' },
  discoverFromSimilarWeb: { id: 'discover-similarweb' },
}));

// extractWebsite needs triggerAndWait for user extraction
const { mockExtractWebsiteTriggerAndWait } = vi.hoisted(() => ({
  mockExtractWebsiteTriggerAndWait: vi.fn(),
}));

vi.mock('./extract-website', () => ({
  extractWebsite: { id: 'extract-website', triggerAndWait: mockExtractWebsiteTriggerAndWait },
}));

vi.mock('./extract-social', () => ({
  extractSocial: { id: 'extract-social' },
}));

vi.mock('./extract-ads', () => ({
  extractAds: { id: 'extract-ads' },
}));

vi.mock('./extract-viral', () => ({
  extractViral: { id: 'extract-viral' },
}));

vi.mock('./synthesize', () => ({
  synthesizeTask: { id: 'synthesize', triggerAndWait: vi.fn().mockResolvedValue({ ok: true, output: { status: 'completed' } }) },
}));

vi.mock('@/utils/socialFallback', () => ({
  findSocialProfilesViaSearch: vi.fn(),
  mergeSocialSources: vi.fn(),
}));

import { scoreCompetitorsWithAI } from '@/lib/ai/score-competitors';
import { createCompetitor, updateAnalysis } from '@/lib/supabase/queries';
import { findSocialProfilesViaSearch, mergeSocialSources } from '@/utils/socialFallback';

// Force module load to capture run functions
import '@/trigger/analyze-market';

const mockScoreCompetitors = vi.mocked(scoreCompetitorsWithAI);
const mockCreateCompetitor = vi.mocked(createCompetitor);
const mockUpdateAnalysis = vi.mocked(updateAnalysis);
const mockFindSocialProfiles = vi.mocked(findSocialProfilesViaSearch);
const mockMergeSocialSources = vi.mocked(mergeSocialSources);

/** Get the orchestrator run function */
const getOrchestratorRun = () => {
  const runFn = capturedRuns.get('analyze-market');
  if (!runFn) throw new Error('analyze-market run function not captured');
  return runFn;
};

/** Payload base para modo completo COM URL do usuario */
const COMPLETE_PAYLOAD = {
  analysisId: 'analysis-mc-123',
  niche: 'odontologia',
  segment: 'clinicas odontologicas',
  region: 'Sao Paulo',
  mode: 'complete' as const,
  userBusinessUrl: 'https://minha-clinica.com.br',
};

/** Payload base para modo completo SEM URL */
const COMPLETE_NO_URL_PAYLOAD = {
  ...COMPLETE_PAYLOAD,
  userBusinessUrl: null,
};

/** Payload base para modo rapido */
const QUICK_PAYLOAD = {
  analysisId: 'analysis-quick-456',
  niche: 'odontologia',
  segment: 'clinicas odontologicas',
  region: 'Sao Paulo',
  mode: 'quick' as const,
  userBusinessUrl: null,
};

const MOCK_CANDIDATES = [
  { name: 'Clinica A', url: 'https://clinica-a.com', description: 'Descricao A', source: 'google-search' as const },
  { name: 'Clinica B', url: 'https://clinica-b.com', description: 'Descricao B', source: 'google-maps' as const },
];

const MOCK_SCORED = [
  {
    name: 'Clinica A',
    url: 'https://clinica-a.com',
    score: 85,
    segmentMatch: 20,
    productMatch: 20,
    sizeMatch: 15,
    regionMatch: 15,
    digitalPresence: 15,
    reasoning: 'Relevante',
    socialProfiles: { instagram: '@clinicaa', tiktok: null, facebook: null },
  },
  {
    name: 'Clinica B',
    url: 'https://clinica-b.com',
    score: 75,
    segmentMatch: 18,
    productMatch: 17,
    sizeMatch: 12,
    regionMatch: 13,
    digitalPresence: 15,
    reasoning: 'Relevante tambem',
    socialProfiles: { instagram: null, tiktok: null, facebook: 'clinicab' },
  },
];

const MOCK_USER_BUSINESS = {
  id: 'user-biz-001',
  analysisId: 'analysis-mc-123',
  name: 'minha-clinica.com.br',
  websiteUrl: 'https://minha-clinica.com.br',
  websiteData: null,
  seoData: null,
  socialData: null,
  metaAdsData: null,
  googleAdsData: null,
  gmbData: null,
  role: 'user_business' as const,
  createdAt: '2026-01-01',
};

const MOCK_SAVED_COMPETITORS = [
  { id: 'comp-1', analysisId: 'analysis-mc-123', name: 'Clinica A', websiteUrl: 'https://clinica-a.com', websiteData: null, seoData: null, socialData: null, metaAdsData: null, googleAdsData: null, gmbData: null, role: 'competitor' as const, createdAt: '2026-01-01' },
  { id: 'comp-2', analysisId: 'analysis-mc-123', name: 'Clinica B', websiteUrl: 'https://clinica-b.com', websiteData: null, seoData: null, socialData: null, metaAdsData: null, googleAdsData: null, gmbData: null, role: 'competitor' as const, createdAt: '2026-01-01' },
];

const MOCK_USER_WEBSITE_RESULT = {
  competitorId: 'user-biz-001',
  websiteData: null,
  seoData: null,
  socialLinks: { instagram: '@minhaclinica', tiktok: null, facebook: 'minhaclinicafb', youtube: null, linkedin: null, twitter: null },
  businessIdentifiers: null,
  warnings: [],
};

const MOCK_WEBSITE_RESULT_A = {
  competitorId: 'comp-1',
  websiteData: null,
  seoData: null,
  socialLinks: { instagram: '@clinicaa_site', tiktok: null, facebook: 'clinicaafb', youtube: null, linkedin: null, twitter: null },
  businessIdentifiers: null,
  warnings: [],
};

const MOCK_WEBSITE_RESULT_B = {
  competitorId: 'comp-2',
  websiteData: null,
  seoData: null,
  socialLinks: { instagram: null, tiktok: null, facebook: null, youtube: null, linkedin: null, twitter: null },
  businessIdentifiers: null,
  warnings: [],
};

/** Setup completo para modo completo com user extraction */
const setupModoCompleto = () => {
  mockUpdateAnalysis.mockResolvedValue({} as ReturnType<typeof updateAnalysis> extends Promise<infer T> ? T : never);

  // User extraction: extractWebsite.triggerAndWait succeeds
  mockExtractWebsiteTriggerAndWait.mockResolvedValue({
    ok: true,
    output: MOCK_USER_WEBSITE_RESULT,
  });

  // Social fallback for user business
  mockFindSocialProfiles.mockResolvedValue({ tiktok: null });
  mockMergeSocialSources.mockReturnValue({
    instagram: { username: 'minhaclinica', source: 'website' as const },
    tiktok: null,
  });

  // Discovery runs: all succeed (call 1)
  mockBatch.triggerByTaskAndWait.mockResolvedValueOnce({
    runs: [
      { ok: true, output: [MOCK_CANDIDATES[0]] },
      { ok: true, output: [MOCK_CANDIDATES[1]] },
      { ok: true, output: [] },
      { ok: true, output: [] },
    ],
  });

  mockScoreCompetitors.mockResolvedValue(MOCK_SCORED);

  mockWait.createToken.mockResolvedValue({ id: 'token-mc' });
  mockWait.forToken.mockResolvedValue({
    ok: true,
    output: { competitors: MOCK_SCORED },
  });

  // createCompetitor: first call is for user_business (in user extraction block),
  // next calls are for confirmed competitors
  mockCreateCompetitor
    .mockResolvedValueOnce(MOCK_USER_BUSINESS)
    .mockResolvedValueOnce(MOCK_SAVED_COMPETITORS[0])
    .mockResolvedValueOnce(MOCK_SAVED_COMPETITORS[1]);

  // Batch 1 runs: extractWebsite x2 + extractViral (call 2)
  mockBatch.triggerByTaskAndWait.mockResolvedValueOnce({
    runs: [
      { ok: true, output: MOCK_WEBSITE_RESULT_A },
      { ok: true, output: MOCK_WEBSITE_RESULT_B },
      { ok: true, output: {} },
    ],
  });

  // Batch 2 runs: extractSocial x2 + extractAds x2 (call 3)
  mockBatch.triggerByTaskAndWait.mockResolvedValueOnce({
    runs: [
      { ok: true, output: {} },
      { ok: true, output: {} },
      { ok: true, output: {} },
      { ok: true, output: {} },
    ],
  });
};

/** Setup para modo rapido (happy path, sem user extraction) */
const setupModoRapido = () => {
  mockUpdateAnalysis.mockResolvedValue({} as ReturnType<typeof updateAnalysis> extends Promise<infer T> ? T : never);

  // Discovery runs (call 1)
  mockBatch.triggerByTaskAndWait.mockResolvedValueOnce({
    runs: [
      { ok: true, output: [MOCK_CANDIDATES[0]] },
      { ok: true, output: [MOCK_CANDIDATES[1]] },
      { ok: true, output: [] },
      { ok: true, output: [] },
    ],
  });

  mockScoreCompetitors.mockResolvedValue(MOCK_SCORED);

  mockWait.createToken.mockResolvedValue({ id: 'token-quick' });
  mockWait.forToken.mockResolvedValue({
    ok: true,
    output: { competitors: MOCK_SCORED },
  });

  mockCreateCompetitor
    .mockResolvedValueOnce({ ...MOCK_SAVED_COMPETITORS[0], analysisId: 'analysis-quick-456' })
    .mockResolvedValueOnce({ ...MOCK_SAVED_COMPETITORS[1], analysisId: 'analysis-quick-456' });

  // Batch 1 (call 2)
  mockBatch.triggerByTaskAndWait.mockResolvedValueOnce({
    runs: [
      { ok: true, output: MOCK_WEBSITE_RESULT_A },
      { ok: true, output: MOCK_WEBSITE_RESULT_B },
      { ok: true, output: {} },
    ],
  });

  mockFindSocialProfiles.mockResolvedValue({ tiktok: null });
  mockMergeSocialSources.mockReturnValue({ instagram: null, tiktok: null });

  // Batch 2 (call 3)
  mockBatch.triggerByTaskAndWait.mockResolvedValueOnce({
    runs: [{ ok: true }, { ok: true }, { ok: true }, { ok: true }],
  });
};

describe('analyzeMarket Modo Completo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('modo completo com URL cria registro user_business e executa extracao', async () => {
    setupModoCompleto();
    await getOrchestratorRun()(COMPLETE_PAYLOAD);

    // Verify createCompetitor called with role='user_business'
    expect(mockCreateCompetitor).toHaveBeenCalledWith({
      analysisId: 'analysis-mc-123',
      name: 'minha-clinica.com.br',
      websiteUrl: 'https://minha-clinica.com.br',
      role: 'user_business',
    });

    // Verify extractWebsite.triggerAndWait called for user URL
    expect(mockExtractWebsiteTriggerAndWait).toHaveBeenCalledWith({
      analysisId: 'analysis-mc-123',
      competitorId: 'user-biz-001',
      competitorName: 'minha-clinica.com.br',
      websiteUrl: 'https://minha-clinica.com.br',
    });
  });

  it('modo completo executa batch social+ads apos website do usuario', async () => {
    setupModoCompleto();
    await getOrchestratorRun()(COMPLETE_PAYLOAD);

    // After extractWebsite.triggerAndWait succeeds, batch.triggerByTaskAndWait
    // should be called for user social+ads (this is BEFORE the discovery batch calls)
    // The first batch call is for user social+ads, then discovery, batch1, batch2

    // The user batch should include extractSocial and extractAds
    const allBatchCalls = mockBatch.triggerByTaskAndWait.mock.calls;

    // Find the user batch call (should be first call, before discovery)
    const userBatchCall = allBatchCalls[0][0];
    const userBatchIds = userBatchCall.map((item: { task: { id: string } }) => item.task.id);

    // User batch should contain social + ads for user business
    expect(userBatchIds).toContain('extract-social');
    expect(userBatchIds).toContain('extract-ads');
  });

  it('modo completo define metadata com step Analisando seu negocio', async () => {
    setupModoCompleto();
    await getOrchestratorRun()(COMPLETE_PAYLOAD);

    // Verify metadata.set called with user extraction step
    expect(mockMetadata.set).toHaveBeenCalledWith('step', 'Analisando seu negocio...');
  });

  it('modo completo continua com discovery se extracao do usuario falha', async () => {
    mockUpdateAnalysis.mockResolvedValue({} as ReturnType<typeof updateAnalysis> extends Promise<infer T> ? T : never);

    // User extraction: createCompetitor succeeds but extractWebsite.triggerAndWait throws
    mockCreateCompetitor.mockResolvedValueOnce(MOCK_USER_BUSINESS);
    mockExtractWebsiteTriggerAndWait.mockRejectedValue(new Error('Website extraction failed'));

    // Rest of pipeline should still work (discovery -> scoring -> confirmation -> extraction)
    mockBatch.triggerByTaskAndWait.mockResolvedValueOnce({
      runs: [
        { ok: true, output: [MOCK_CANDIDATES[0]] },
        { ok: true, output: [MOCK_CANDIDATES[1]] },
        { ok: true, output: [] },
        { ok: true, output: [] },
      ],
    });

    mockScoreCompetitors.mockResolvedValue(MOCK_SCORED);
    mockWait.createToken.mockResolvedValue({ id: 'token-fail' });
    mockWait.forToken.mockResolvedValue({
      ok: true,
      output: { competitors: MOCK_SCORED },
    });

    mockCreateCompetitor
      .mockResolvedValueOnce(MOCK_SAVED_COMPETITORS[0])
      .mockResolvedValueOnce(MOCK_SAVED_COMPETITORS[1]);

    mockBatch.triggerByTaskAndWait.mockResolvedValueOnce({
      runs: [
        { ok: true, output: MOCK_WEBSITE_RESULT_A },
        { ok: true, output: MOCK_WEBSITE_RESULT_B },
        { ok: true, output: {} },
      ],
    });

    mockFindSocialProfiles.mockResolvedValue({ tiktok: null });
    mockMergeSocialSources.mockReturnValue({ instagram: null, tiktok: null });

    mockBatch.triggerByTaskAndWait.mockResolvedValueOnce({
      runs: [{ ok: true }, { ok: true }, { ok: true }, { ok: true }],
    });

    // Should NOT throw — continues to discovery
    const result = await getOrchestratorRun()(COMPLETE_PAYLOAD) as Record<string, unknown>;
    expect(result).toBeDefined();
    expect(result.competitorsFound).toBe(2);

    // Should set degraded metadata
    expect(mockMetadata.set).toHaveBeenCalledWith('modoCompleto', 'degraded');

    // Discovery should still run (updateAnalysis called with 'discovering')
    expect(mockUpdateAnalysis).toHaveBeenCalledWith('analysis-mc-123', { status: 'discovering' });
  });

  it('modo rapido nao executa extracao do usuario', async () => {
    setupModoRapido();
    await getOrchestratorRun()(QUICK_PAYLOAD);

    // extractWebsite.triggerAndWait should NOT be called for user extraction
    expect(mockExtractWebsiteTriggerAndWait).not.toHaveBeenCalled();

    // createCompetitor should NOT be called with role='user_business'
    const createCalls = mockCreateCompetitor.mock.calls;
    const userBusinessCalls = createCalls.filter(
      (call) => call[0] && (call[0] as Record<string, unknown>).role === 'user_business'
    );
    expect(userBusinessCalls).toHaveLength(0);

    // metadata should NOT contain 'Analisando seu negocio...'
    const stepCalls = mockMetadata.set.mock.calls.filter(
      ([key, value]: [string, unknown]) => key === 'step' && value === 'Analisando seu negocio...'
    );
    expect(stepCalls).toHaveLength(0);
  });

  it('modo completo sem URL pula extracao do usuario', async () => {
    // Same as modo rapido in terms of user extraction behavior
    mockUpdateAnalysis.mockResolvedValue({} as ReturnType<typeof updateAnalysis> extends Promise<infer T> ? T : never);

    mockBatch.triggerByTaskAndWait.mockResolvedValueOnce({
      runs: [
        { ok: true, output: [MOCK_CANDIDATES[0]] },
        { ok: true, output: [MOCK_CANDIDATES[1]] },
        { ok: true, output: [] },
        { ok: true, output: [] },
      ],
    });

    mockScoreCompetitors.mockResolvedValue(MOCK_SCORED);
    mockWait.createToken.mockResolvedValue({ id: 'token-no-url' });
    mockWait.forToken.mockResolvedValue({
      ok: true,
      output: { competitors: MOCK_SCORED },
    });

    mockCreateCompetitor
      .mockResolvedValueOnce(MOCK_SAVED_COMPETITORS[0])
      .mockResolvedValueOnce(MOCK_SAVED_COMPETITORS[1]);

    mockBatch.triggerByTaskAndWait.mockResolvedValueOnce({
      runs: [
        { ok: true, output: MOCK_WEBSITE_RESULT_A },
        { ok: true, output: MOCK_WEBSITE_RESULT_B },
        { ok: true, output: {} },
      ],
    });

    mockFindSocialProfiles.mockResolvedValue({ tiktok: null });
    mockMergeSocialSources.mockReturnValue({ instagram: null, tiktok: null });

    mockBatch.triggerByTaskAndWait.mockResolvedValueOnce({
      runs: [{ ok: true }, { ok: true }, { ok: true }, { ok: true }],
    });

    await getOrchestratorRun()(COMPLETE_NO_URL_PAYLOAD);

    // extractWebsite.triggerAndWait should NOT be called for user extraction
    expect(mockExtractWebsiteTriggerAndWait).not.toHaveBeenCalled();

    // createCompetitor should NOT be called with role='user_business'
    const createCalls = mockCreateCompetitor.mock.calls;
    const userBusinessCalls = createCalls.filter(
      (call) => call[0] && (call[0] as Record<string, unknown>).role === 'user_business'
    );
    expect(userBusinessCalls).toHaveLength(0);
  });

  it('modo completo com website OK mas social fail continua normalmente', async () => {
    mockUpdateAnalysis.mockResolvedValue({} as ReturnType<typeof updateAnalysis> extends Promise<infer T> ? T : never);

    // User extraction: website succeeds
    mockCreateCompetitor.mockResolvedValueOnce(MOCK_USER_BUSINESS);
    mockExtractWebsiteTriggerAndWait.mockResolvedValue({
      ok: true,
      output: MOCK_USER_WEBSITE_RESULT,
    });

    // Social fallback for user
    mockFindSocialProfiles.mockResolvedValue({ tiktok: null });
    mockMergeSocialSources.mockReturnValue({
      instagram: { username: 'minhaclinica', source: 'website' as const },
      tiktok: null,
    });

    // User social+ads batch partially fails
    mockBatch.triggerByTaskAndWait.mockResolvedValueOnce({
      runs: [
        { ok: false, output: null }, // extractSocial failed
        { ok: true, output: {} },    // extractAds succeeded
      ],
    });

    // Discovery should still proceed
    mockBatch.triggerByTaskAndWait.mockResolvedValueOnce({
      runs: [
        { ok: true, output: [MOCK_CANDIDATES[0]] },
        { ok: true, output: [MOCK_CANDIDATES[1]] },
        { ok: true, output: [] },
        { ok: true, output: [] },
      ],
    });

    mockScoreCompetitors.mockResolvedValue(MOCK_SCORED);
    mockWait.createToken.mockResolvedValue({ id: 'token-partial' });
    mockWait.forToken.mockResolvedValue({
      ok: true,
      output: { competitors: MOCK_SCORED },
    });

    mockCreateCompetitor
      .mockResolvedValueOnce(MOCK_SAVED_COMPETITORS[0])
      .mockResolvedValueOnce(MOCK_SAVED_COMPETITORS[1]);

    mockBatch.triggerByTaskAndWait.mockResolvedValueOnce({
      runs: [
        { ok: true, output: MOCK_WEBSITE_RESULT_A },
        { ok: true, output: MOCK_WEBSITE_RESULT_B },
        { ok: true, output: {} },
      ],
    });

    mockBatch.triggerByTaskAndWait.mockResolvedValueOnce({
      runs: [{ ok: true }, { ok: true }, { ok: true }, { ok: true }],
    });

    // Should NOT throw — continues to discovery
    const result = await getOrchestratorRun()(COMPLETE_PAYLOAD) as Record<string, unknown>;
    expect(result).toBeDefined();
    expect(result.competitorsFound).toBe(2);

    // Discovery batch was still called
    expect(mockUpdateAnalysis).toHaveBeenCalledWith('analysis-mc-123', { status: 'discovering' });
  });
});
