import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockMetadata, mockWait, mockBatch, capturedRuns, mockExtractViralTrigger } = vi.hoisted(() => ({
  mockMetadata: { set: vi.fn() },
  mockWait: { createToken: vi.fn(), forToken: vi.fn() },
  mockBatch: { triggerByTaskAndWait: vi.fn() },
  capturedRuns: new Map<string, (payload: unknown) => Promise<unknown>>(),
  mockExtractViralTrigger: vi.fn(),
}));

vi.mock('@trigger.dev/sdk', () => ({
  task: vi.fn((config: { id: string; run: (payload: unknown) => Promise<unknown> }) => {
    capturedRuns.set(config.id, config.run);
    return config;
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
}));

vi.mock('./discover-competitors', () => ({
  discoverFromGoogleSearch: { id: 'discover-google-search' },
  discoverFromGoogleMaps: { id: 'discover-google-maps' },
  discoverFromFacebookAds: { id: 'discover-facebook-ads' },
  discoverFromSimilarWeb: { id: 'discover-similarweb' },
}));

vi.mock('./extract-website', () => ({
  extractWebsite: { id: 'extract-website' },
}));

vi.mock('./extract-social', () => ({
  extractSocial: { id: 'extract-social' },
}));

vi.mock('./extract-ads', () => ({
  extractAds: { id: 'extract-ads' },
}));

vi.mock('@/trigger/extract-viral', () => ({
  extractViral: { id: 'extract-viral', triggerAndWait: mockExtractViralTrigger },
}));

vi.mock('@/utils/socialFallback', () => ({
  findSocialProfilesViaSearch: vi.fn(),
  mergeSocialSources: vi.fn(),
}));

import { scoreCompetitorsWithAI } from '@/lib/ai/score-competitors';
import { filterBlockedDomains, deduplicateCandidates } from '@/utils/competitors';
import { createCompetitor, updateAnalysis } from '@/lib/supabase/queries';
import { findSocialProfilesViaSearch, mergeSocialSources } from '@/utils/socialFallback';

// Force module load to capture run functions
import '@/trigger/analyze-market';

const mockScoreCompetitors = vi.mocked(scoreCompetitorsWithAI);
const mockFilterBlocked = vi.mocked(filterBlockedDomains);
const mockDeduplicate = vi.mocked(deduplicateCandidates);
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

const MOCK_PAYLOAD = {
  analysisId: 'analysis-123',
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

const MOCK_SAVED_COMPETITORS = [
  { id: 'comp-1', analysisId: 'analysis-123', name: 'Clinica A', websiteUrl: 'https://clinica-a.com', role: 'competitor' as const, websiteData: null, seoData: null, socialData: null, metaAdsData: null, googleAdsData: null, gmbData: null, createdAt: '2026-01-01' },
  { id: 'comp-2', analysisId: 'analysis-123', name: 'Clinica B', websiteUrl: 'https://clinica-b.com', role: 'competitor' as const, websiteData: null, seoData: null, socialData: null, metaAdsData: null, googleAdsData: null, gmbData: null, createdAt: '2026-01-01' },
];

/** Mock ExtractWebsiteResult com social links */
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

/** Setup padrao para fluxo completo (2-batch pattern) */
const setupHappyPath = () => {
  mockUpdateAnalysis.mockResolvedValue({} as ReturnType<typeof updateAnalysis> extends Promise<infer T> ? T : never);

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

  mockCreateCompetitor
    .mockResolvedValueOnce(MOCK_SAVED_COMPETITORS[0])
    .mockResolvedValueOnce(MOCK_SAVED_COMPETITORS[1]);

  // Batch 1 runs: extractWebsite x2 (call 2)
  mockBatch.triggerByTaskAndWait.mockResolvedValueOnce({
    runs: [
      { ok: true, output: MOCK_WEBSITE_RESULT_A },
      { ok: true, output: MOCK_WEBSITE_RESULT_B },
    ],
  });

  // Social fallback mocks (between batches)
  mockFindSocialProfiles.mockResolvedValue({ tiktok: null });
  mockMergeSocialSources.mockReturnValue({
    instagram: { username: 'clinicaa_site', source: 'website' as const },
    tiktok: null,
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

  // Batch 3: extractViral (triggerAndWait, not batch)
  mockExtractViralTrigger.mockResolvedValueOnce({ ok: true, output: { status: 'success', data: { viralContent: [], patterns: null } } });
};

describe('analyzeMarket orchestrator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve descobrir concorrentes via 4 fontes em paralelo', async () => {
    setupHappyPath();
    await getOrchestratorRun()(MOCK_PAYLOAD);

    // First call to batch.triggerByTaskAndWait is for discovery (4 tasks)
    const discoveryCall = mockBatch.triggerByTaskAndWait.mock.calls[0][0];
    expect(discoveryCall).toHaveLength(4);
    expect(discoveryCall[0].task).toMatchObject({ id: 'discover-google-search' });
    expect(discoveryCall[1].task).toMatchObject({ id: 'discover-google-maps' });
    expect(discoveryCall[2].task).toMatchObject({ id: 'discover-facebook-ads' });
    expect(discoveryCall[3].task).toMatchObject({ id: 'discover-similarweb' });
  });

  it('deve filtrar e deduplicar antes de enviar ao Gemini', async () => {
    setupHappyPath();
    await getOrchestratorRun()(MOCK_PAYLOAD);

    expect(mockFilterBlocked).toHaveBeenCalled();
    expect(mockDeduplicate).toHaveBeenCalled();
    // filterBlockedDomains is called before deduplicateCandidates
    const filterCallOrder = mockFilterBlocked.mock.invocationCallOrder[0];
    const dedupeCallOrder = mockDeduplicate.mock.invocationCallOrder[0];
    expect(filterCallOrder).toBeLessThan(dedupeCallOrder);
  });

  it('deve auto-confirmar concorrentes sem waitpoint', async () => {
    setupHappyPath();
    await getOrchestratorRun()(MOCK_PAYLOAD);

    // Auto-confirm: no waitpoint calls, competitors saved directly
    expect(mockWait.createToken).not.toHaveBeenCalled();
    expect(mockWait.forToken).not.toHaveBeenCalled();
    expect(mockCreateCompetitor).toHaveBeenCalledTimes(2);
  });

  it('deve persistir concorrentes confirmados no Supabase', async () => {
    setupHappyPath();
    await getOrchestratorRun()(MOCK_PAYLOAD);

    expect(mockCreateCompetitor).toHaveBeenCalledTimes(2);
    expect(mockCreateCompetitor).toHaveBeenCalledWith({
      analysisId: 'analysis-123',
      name: 'Clinica A',
      websiteUrl: 'https://clinica-a.com',
    });
    expect(mockCreateCompetitor).toHaveBeenCalledWith({
      analysisId: 'analysis-123',
      name: 'Clinica B',
      websiteUrl: 'https://clinica-b.com',
    });
  });

  it('deve fazer fan-out de extracao em 3 batches: website, social+ads, viral', async () => {
    setupHappyPath();
    await getOrchestratorRun()(MOCK_PAYLOAD);

    // batch.triggerByTaskAndWait called 3 times: discovery, batch1 (website), batch2 (social+ads)
    expect(mockBatch.triggerByTaskAndWait).toHaveBeenCalledTimes(3);

    // Batch 1 (call 2): extractWebsite x2 only
    const batch1Call = mockBatch.triggerByTaskAndWait.mock.calls[1][0];
    expect(batch1Call).toHaveLength(2);
    const batch1Ids = batch1Call.map((item: { task: { id: string } }) => item.task.id);
    expect(batch1Ids).toContain('extract-website');
    expect(batch1Ids).not.toContain('extract-viral');

    // Batch 2 (call 3): extractSocial x2 + extractAds x2 = 4
    const batch2Call = mockBatch.triggerByTaskAndWait.mock.calls[2][0];
    expect(batch2Call).toHaveLength(4);
    const batch2Ids = batch2Call.map((item: { task: { id: string } }) => item.task.id);
    expect(batch2Ids).toContain('extract-social');
    expect(batch2Ids).toContain('extract-ads');

    // Batch 3: extractViral runs alone via triggerAndWait
    expect(mockExtractViralTrigger).toHaveBeenCalledTimes(1);
    expect(mockExtractViralTrigger).toHaveBeenCalledWith(expect.objectContaining({
      analysisId: 'analysis-123',
      niche: 'odontologia',
    }));
  });

  it('deve reportar erro se todas as fontes falharem', async () => {
    mockUpdateAnalysis.mockResolvedValue({} as ReturnType<typeof updateAnalysis> extends Promise<infer T> ? T : never);
    mockBatch.triggerByTaskAndWait.mockResolvedValueOnce({
      runs: [
        { ok: false },
        { ok: false },
        { ok: false },
        { ok: false },
      ],
    });

    await expect(getOrchestratorRun()(MOCK_PAYLOAD)).rejects.toThrow(
      'Nao foi possivel encontrar concorrentes para este nicho'
    );
  });

  it('deve continuar se algumas fontes falharem', async () => {
    mockUpdateAnalysis.mockResolvedValue({} as ReturnType<typeof updateAnalysis> extends Promise<infer T> ? T : never);

    // 2 succeed, 2 fail (discovery)
    mockBatch.triggerByTaskAndWait.mockResolvedValueOnce({
      runs: [
        { ok: true, output: [MOCK_CANDIDATES[0]] },
        { ok: false },
        { ok: true, output: [MOCK_CANDIDATES[1]] },
        { ok: false },
      ],
    });

    mockScoreCompetitors.mockResolvedValue(MOCK_SCORED);

    mockCreateCompetitor
      .mockResolvedValueOnce(MOCK_SAVED_COMPETITORS[0])
      .mockResolvedValueOnce(MOCK_SAVED_COMPETITORS[1]);

    // Batch 1: website only
    mockBatch.triggerByTaskAndWait.mockResolvedValueOnce({
      runs: [
        { ok: true, output: MOCK_WEBSITE_RESULT_A },
        { ok: true, output: MOCK_WEBSITE_RESULT_B },
      ],
    });

    mockFindSocialProfiles.mockResolvedValue({ tiktok: null });
    mockMergeSocialSources.mockReturnValue({ instagram: null, tiktok: null });

    // Batch 2: social + ads
    mockBatch.triggerByTaskAndWait.mockResolvedValueOnce({
      runs: [{ ok: true }, { ok: true }, { ok: true }, { ok: true }],
    });

    // Batch 3: viral
    mockExtractViralTrigger.mockResolvedValueOnce({ ok: true, output: {} });

    const result = await getOrchestratorRun()(MOCK_PAYLOAD);
    expect(result).toBeDefined();
    expect(mockMetadata.set).toHaveBeenCalledWith('warnings', '2 fonte(s) de descoberta falharam');
  });

  it('deve usar fallback se scoring Gemini falhar', async () => {
    mockUpdateAnalysis.mockResolvedValue({} as ReturnType<typeof updateAnalysis> extends Promise<infer T> ? T : never);

    mockBatch.triggerByTaskAndWait.mockResolvedValueOnce({
      runs: [
        { ok: true, output: MOCK_CANDIDATES },
        { ok: true, output: [] },
        { ok: true, output: [] },
        { ok: true, output: [] },
      ],
    });

    // Gemini scoring fails — pipeline uses inline fallback (no waitpoint)
    mockScoreCompetitors.mockRejectedValue(new Error('Gemini API error'));

    mockCreateCompetitor
      .mockResolvedValueOnce(MOCK_SAVED_COMPETITORS[0])
      .mockResolvedValueOnce(MOCK_SAVED_COMPETITORS[1]);

    // Batch 1: website only
    mockBatch.triggerByTaskAndWait.mockResolvedValueOnce({
      runs: [
        { ok: true, output: MOCK_WEBSITE_RESULT_A },
        { ok: true, output: MOCK_WEBSITE_RESULT_B },
      ],
    });

    mockFindSocialProfiles.mockResolvedValue({ tiktok: null });
    mockMergeSocialSources.mockReturnValue({ instagram: null, tiktok: null });

    // Batch 2: social + ads
    mockBatch.triggerByTaskAndWait.mockResolvedValueOnce({
      runs: [{ ok: true }, { ok: true }, { ok: true }, { ok: true }],
    });

    // Batch 3: viral
    mockExtractViralTrigger.mockResolvedValueOnce({ ok: true, output: {} });

    const result = await getOrchestratorRun()(MOCK_PAYLOAD);
    expect(result).toBeDefined();
    expect(mockMetadata.set).toHaveBeenCalledWith('warnings', 'Scoring com IA indisponivel. Usando selecao por relevancia.');
  });

  it('deve atualizar metadata em cada etapa', async () => {
    setupHappyPath();
    await getOrchestratorRun()(MOCK_PAYLOAD);

    const metadataCalls = mockMetadata.set.mock.calls.map(([key]: string[]) => key);
    expect(metadataCalls).toContain('status');
    expect(metadataCalls).toContain('step');
    expect(metadataCalls).toContain('progress');
    expect(metadataCalls).toContain('candidates');
    expect(metadataCalls).toContain('subTasks');
    expect(metadataCalls).toContain('extractionSummary');

    // Verify specific status transitions (no waiting_confirmation in auto-confirm flow)
    const statusCalls = mockMetadata.set.mock.calls
      .filter(([key]: string[]) => key === 'status')
      .map(([, value]: string[]) => value);
    expect(statusCalls).toContain('discovering');
    expect(statusCalls).toContain('extracting');
    expect(statusCalls).toContain('completed');
  });

  it('deve falhar se nenhum concorrente qualificado for encontrado', async () => {
    mockUpdateAnalysis.mockResolvedValue({} as ReturnType<typeof updateAnalysis> extends Promise<infer T> ? T : never);

    mockBatch.triggerByTaskAndWait.mockResolvedValueOnce({
      runs: [
        { ok: true, output: MOCK_CANDIDATES },
        { ok: true, output: [] },
        { ok: true, output: [] },
        { ok: true, output: [] },
      ],
    });

    // Scoring returns empty (no qualified competitors)
    mockScoreCompetitors.mockResolvedValue([]);

    await expect(getOrchestratorRun()(MOCK_PAYLOAD)).rejects.toThrow(
      'Nenhum concorrente qualificado encontrado para este nicho.'
    );
  });

  it('deve retornar resultado com contagem de competidores e extracao', async () => {
    setupHappyPath();
    const result = await getOrchestratorRun()(MOCK_PAYLOAD) as Record<string, unknown>;

    expect(result.analysisId).toBe('analysis-123');
    expect(result.competitorsFound).toBe(2);
    // Batch 1: 2 website + Batch 2: 4 (2 social + 2 ads) + Batch 3: 1 viral = 7 total
    expect(result.extractionSuccess).toBe(7);
    expect(result.extractionFailed).toBe(0);
  });
});

describe('3-batch extraction pattern', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('runs Batch 1 (website) then Batch 2 (social+ads) then Batch 3 (viral) sequentially', async () => {
    setupHappyPath();
    await getOrchestratorRun()(MOCK_PAYLOAD);

    // batch.triggerByTaskAndWait called 3 times: discovery, batch1 (website), batch2 (social+ads)
    expect(mockBatch.triggerByTaskAndWait).toHaveBeenCalledTimes(3);

    // Batch 1 (call index 1): contains extractWebsite only
    const batch1 = mockBatch.triggerByTaskAndWait.mock.calls[1][0];
    const batch1Ids = batch1.map((item: { task: { id: string } }) => item.task.id);
    expect(batch1Ids.filter((id: string) => id === 'extract-website')).toHaveLength(2);
    expect(batch1Ids).not.toContain('extract-viral');
    expect(batch1Ids).not.toContain('extract-social');
    expect(batch1Ids).not.toContain('extract-ads');

    // Batch 2 (call index 2): contains extractSocial + extractAds
    const batch2 = mockBatch.triggerByTaskAndWait.mock.calls[2][0];
    const batch2Ids = batch2.map((item: { task: { id: string } }) => item.task.id);
    expect(batch2Ids.filter((id: string) => id === 'extract-social')).toHaveLength(2);
    expect(batch2Ids.filter((id: string) => id === 'extract-ads')).toHaveLength(2);
    expect(batch2Ids).not.toContain('extract-website');
    expect(batch2Ids).not.toContain('extract-viral');

    // Batch 3: extractViral runs alone via triggerAndWait (after all competitor actors free memory)
    expect(mockExtractViralTrigger).toHaveBeenCalledTimes(1);
  });

  it('collects social links from Batch 1 results and passes to Batch 2', async () => {
    setupHappyPath();
    // Override mergeSocialSources to return specific values per competitor
    mockMergeSocialSources
      .mockReturnValueOnce({
        instagram: { username: 'clinicaa_site', source: 'website' as const },
        tiktok: null,
      })
      .mockReturnValueOnce({
        instagram: null,
        tiktok: null,
      });

    await getOrchestratorRun()(MOCK_PAYLOAD);

    // Batch 2 extractSocial payloads should contain merged social profiles
    const batch2 = mockBatch.triggerByTaskAndWait.mock.calls[2][0];
    const socialPayloads = batch2.filter((item: { task: { id: string } }) => item.task.id === 'extract-social');
    expect(socialPayloads).toHaveLength(2);

    // First competitor gets website-discovered instagram
    expect(socialPayloads[0].payload.socialProfiles).toEqual({
      instagram: { username: 'clinicaa_site', source: 'website' },
      tiktok: null,
    });

    // Second competitor gets nothing (no profiles found)
    expect(socialPayloads[1].payload.socialProfiles).toEqual({
      instagram: null,
      tiktok: null,
    });
  });

  it('runs Google Search fallback for missing social profiles', async () => {
    setupHappyPath();
    await getOrchestratorRun()(MOCK_PAYLOAD);

    // Competitor A has instagram from website but not tiktok -> fallback for tiktok only
    // Competitor B has neither -> fallback for both
    expect(mockFindSocialProfiles).toHaveBeenCalled();

    // Verify findSocialProfilesViaSearch was called with missing platforms
    const calls = mockFindSocialProfiles.mock.calls;
    // At least one call should include 'tiktok' in missing platforms
    const allMissingPlatforms = calls.flatMap(([, platforms]: [string, string[]]) => platforms);
    expect(allMissingPlatforms).toContain('tiktok');
  });

  it('merges sources with website > search > ai_hint priority via mergeSocialSources', async () => {
    setupHappyPath();
    await getOrchestratorRun()(MOCK_PAYLOAD);

    // mergeSocialSources should be called once per competitor
    expect(mockMergeSocialSources).toHaveBeenCalledTimes(2);

    // Verify first call has website social links from extractWebsite result
    const firstCall = mockMergeSocialSources.mock.calls[0];
    expect(firstCall[0]).toEqual(MOCK_WEBSITE_RESULT_A.socialLinks);
    // Third arg should be AI hints from scored competitor
    expect(firstCall[2]).toEqual(MOCK_SCORED[0].socialProfiles);

    // Verify second call has empty social links (competitor B had no website links)
    const secondCall = mockMergeSocialSources.mock.calls[1];
    expect(secondCall[0]).toEqual(MOCK_WEBSITE_RESULT_B.socialLinks);
    expect(secondCall[2]).toEqual(MOCK_SCORED[1].socialProfiles);
  });

  it('handles Batch 1 failures gracefully -- still runs Batch 2 with AI hints', async () => {
    mockUpdateAnalysis.mockResolvedValue({} as ReturnType<typeof updateAnalysis> extends Promise<infer T> ? T : never);

    // Discovery
    mockBatch.triggerByTaskAndWait.mockResolvedValueOnce({
      runs: [
        { ok: true, output: MOCK_CANDIDATES },
        { ok: true, output: [] },
        { ok: true, output: [] },
        { ok: true, output: [] },
      ],
    });

    mockScoreCompetitors.mockResolvedValue(MOCK_SCORED);

    mockCreateCompetitor
      .mockResolvedValueOnce(MOCK_SAVED_COMPETITORS[0])
      .mockResolvedValueOnce(MOCK_SAVED_COMPETITORS[1]);

    // Batch 1: one website run fails
    mockBatch.triggerByTaskAndWait.mockResolvedValueOnce({
      runs: [
        { ok: false, output: null },
        { ok: true, output: MOCK_WEBSITE_RESULT_B },
      ],
    });

    // mergeSocialSources still called for failed competitor (with empty social links)
    mockFindSocialProfiles.mockResolvedValue({ instagram: null, tiktok: null });
    mockMergeSocialSources.mockReturnValue({ instagram: null, tiktok: null });

    // Batch 2 still runs
    mockBatch.triggerByTaskAndWait.mockResolvedValueOnce({
      runs: [{ ok: true }, { ok: true }, { ok: true }, { ok: true }],
    });

    // Batch 3: viral
    mockExtractViralTrigger.mockResolvedValueOnce({ ok: true, output: {} });

    const result = await getOrchestratorRun()(MOCK_PAYLOAD) as Record<string, unknown>;
    expect(result).toBeDefined();

    // Batch 2 was called (3rd batch.triggerByTaskAndWait call)
    expect(mockBatch.triggerByTaskAndWait).toHaveBeenCalledTimes(3);

    // mergeSocialSources was called for both competitors, even the failed one
    expect(mockMergeSocialSources).toHaveBeenCalledTimes(2);

    // Failed competitor uses empty social links as first arg
    const failedCompCall = mockMergeSocialSources.mock.calls[0];
    expect(failedCompCall[0]).toEqual({
      instagram: null, tiktok: null, facebook: null, youtube: null, linkedin: null, twitter: null,
    });
  });

  it('handles findSocialProfilesViaSearch failure gracefully', async () => {
    mockUpdateAnalysis.mockResolvedValue({} as ReturnType<typeof updateAnalysis> extends Promise<infer T> ? T : never);

    // Discovery
    mockBatch.triggerByTaskAndWait.mockResolvedValueOnce({
      runs: [
        { ok: true, output: MOCK_CANDIDATES },
        { ok: true, output: [] },
        { ok: true, output: [] },
        { ok: true, output: [] },
      ],
    });

    mockScoreCompetitors.mockResolvedValue(MOCK_SCORED);

    mockCreateCompetitor
      .mockResolvedValueOnce(MOCK_SAVED_COMPETITORS[0])
      .mockResolvedValueOnce(MOCK_SAVED_COMPETITORS[1]);

    // Batch 1: website only
    mockBatch.triggerByTaskAndWait.mockResolvedValueOnce({
      runs: [
        { ok: true, output: MOCK_WEBSITE_RESULT_A },
        { ok: true, output: MOCK_WEBSITE_RESULT_B },
      ],
    });

    // findSocialProfilesViaSearch throws
    mockFindSocialProfiles.mockRejectedValue(new Error('Google Search API error'));
    mockMergeSocialSources.mockReturnValue({ instagram: null, tiktok: null });

    // Batch 2 still runs
    mockBatch.triggerByTaskAndWait.mockResolvedValueOnce({
      runs: [{ ok: true }, { ok: true }, { ok: true }, { ok: true }],
    });

    // Batch 3: viral
    mockExtractViralTrigger.mockResolvedValueOnce({ ok: true, output: {} });

    const result = await getOrchestratorRun()(MOCK_PAYLOAD) as Record<string, unknown>;
    expect(result).toBeDefined();

    // Batch 2 was still called despite search failure
    expect(mockBatch.triggerByTaskAndWait).toHaveBeenCalledTimes(3);
    // mergeSocialSources still called (with empty search results)
    expect(mockMergeSocialSources).toHaveBeenCalledTimes(2);
  });
});
