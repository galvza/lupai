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

vi.mock('./extract-viral', () => ({
  extractViral: { id: 'extract-viral' },
}));

import { scoreCompetitorsWithAI } from '@/lib/ai/score-competitors';
import { filterBlockedDomains, deduplicateCandidates } from '@/utils/competitors';
import { createCompetitor, updateAnalysis } from '@/lib/supabase/queries';

// Force module load to capture run functions
import '@/trigger/analyze-market';

const mockScoreCompetitors = vi.mocked(scoreCompetitorsWithAI);
const mockFilterBlocked = vi.mocked(filterBlockedDomains);
const mockDeduplicate = vi.mocked(deduplicateCandidates);
const mockCreateCompetitor = vi.mocked(createCompetitor);
const mockUpdateAnalysis = vi.mocked(updateAnalysis);

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
  { id: 'comp-1', analysisId: 'analysis-123', name: 'Clinica A', websiteUrl: 'https://clinica-a.com', websiteData: null, seoData: null, socialData: null, metaAdsData: null, googleAdsData: null, gmbData: null, createdAt: '2026-01-01' },
  { id: 'comp-2', analysisId: 'analysis-123', name: 'Clinica B', websiteUrl: 'https://clinica-b.com', websiteData: null, seoData: null, socialData: null, metaAdsData: null, googleAdsData: null, gmbData: null, createdAt: '2026-01-01' },
];

/** Setup padrao para fluxo completo */
const setupHappyPath = () => {
  mockUpdateAnalysis.mockResolvedValue({} as ReturnType<typeof updateAnalysis> extends Promise<infer T> ? T : never);

  // Discovery runs: all succeed
  mockBatch.triggerByTaskAndWait.mockResolvedValueOnce({
    runs: [
      { ok: true, output: [MOCK_CANDIDATES[0]] },
      { ok: true, output: [MOCK_CANDIDATES[1]] },
      { ok: true, output: [] },
      { ok: true, output: [] },
    ],
  });

  mockScoreCompetitors.mockResolvedValue(MOCK_SCORED);

  mockWait.createToken.mockResolvedValue({ id: 'token-abc' });
  mockWait.forToken.mockResolvedValue({
    ok: true,
    output: { competitors: MOCK_SCORED },
  });

  mockCreateCompetitor
    .mockResolvedValueOnce(MOCK_SAVED_COMPETITORS[0])
    .mockResolvedValueOnce(MOCK_SAVED_COMPETITORS[1]);

  // Extraction runs: all succeed
  mockBatch.triggerByTaskAndWait.mockResolvedValueOnce({
    runs: [
      { ok: true, output: {} },
      { ok: true, output: {} },
      { ok: true, output: {} },
      { ok: true, output: {} },
      { ok: true, output: {} },
      { ok: true, output: {} },
      { ok: true, output: {} },
    ],
  });
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

  it('deve pausar para confirmacao com wait.forToken', async () => {
    setupHappyPath();
    await getOrchestratorRun()(MOCK_PAYLOAD);

    expect(mockWait.createToken).toHaveBeenCalledWith({ timeout: '1h' });
    expect(mockWait.forToken).toHaveBeenCalledWith('token-abc');
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

  it('deve fazer fan-out de extracao para sub-tasks', async () => {
    setupHappyPath();
    await getOrchestratorRun()(MOCK_PAYLOAD);

    // Second call to batch.triggerByTaskAndWait is for extraction
    const extractionCall = mockBatch.triggerByTaskAndWait.mock.calls[1][0];
    // 2 competitors x 3 tasks each + 1 viral = 7
    expect(extractionCall).toHaveLength(7);

    const taskIds = extractionCall.map((item: { task: { id: string } }) => item.task.id);
    expect(taskIds).toContain('extract-website');
    expect(taskIds).toContain('extract-social');
    expect(taskIds).toContain('extract-ads');
    expect(taskIds).toContain('extract-viral');
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

    // 2 succeed, 2 fail
    mockBatch.triggerByTaskAndWait.mockResolvedValueOnce({
      runs: [
        { ok: true, output: [MOCK_CANDIDATES[0]] },
        { ok: false },
        { ok: true, output: [MOCK_CANDIDATES[1]] },
        { ok: false },
      ],
    });

    mockScoreCompetitors.mockResolvedValue(MOCK_SCORED);
    mockWait.createToken.mockResolvedValue({ id: 'token-xyz' });
    mockWait.forToken.mockResolvedValue({
      ok: true,
      output: { competitors: MOCK_SCORED },
    });

    mockCreateCompetitor
      .mockResolvedValueOnce(MOCK_SAVED_COMPETITORS[0])
      .mockResolvedValueOnce(MOCK_SAVED_COMPETITORS[1]);

    mockBatch.triggerByTaskAndWait.mockResolvedValueOnce({
      runs: [{ ok: true }, { ok: true }, { ok: true }, { ok: true }, { ok: true }, { ok: true }, { ok: true }],
    });

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

    // Gemini scoring fails
    mockScoreCompetitors.mockRejectedValue(new Error('Gemini API error'));

    // Fallback will create candidates with score 50
    mockWait.createToken.mockResolvedValue({ id: 'token-fallback' });
    mockWait.forToken.mockResolvedValue({
      ok: true,
      output: {
        competitors: MOCK_CANDIDATES.map((c) => ({
          ...c,
          score: 50,
          segmentMatch: 0,
          productMatch: 0,
          sizeMatch: 0,
          regionMatch: 0,
          digitalPresence: 0,
          reasoning: 'Scoring automatico indisponivel. Candidato selecionado por relevancia de fonte.',
          socialProfiles: { instagram: null, tiktok: null, facebook: null },
        })),
      },
    });

    mockCreateCompetitor
      .mockResolvedValueOnce(MOCK_SAVED_COMPETITORS[0])
      .mockResolvedValueOnce(MOCK_SAVED_COMPETITORS[1]);

    mockBatch.triggerByTaskAndWait.mockResolvedValueOnce({
      runs: [{ ok: true }, { ok: true }, { ok: true }, { ok: true }, { ok: true }, { ok: true }, { ok: true }],
    });

    const result = await getOrchestratorRun()(MOCK_PAYLOAD);
    expect(result).toBeDefined();
    expect(mockMetadata.set).toHaveBeenCalledWith('warnings', 'Scoring com IA indisponivel. Usando selecao por relevancia.');
  });

  it('deve atualizar metadata em cada etapa', async () => {
    setupHappyPath();
    await getOrchestratorRun()(MOCK_PAYLOAD);

    const metadataCalls = mockMetadata.set.mock.calls.map(([key]: [string]) => key);
    expect(metadataCalls).toContain('status');
    expect(metadataCalls).toContain('step');
    expect(metadataCalls).toContain('progress');
    expect(metadataCalls).toContain('candidates');
    expect(metadataCalls).toContain('confirmationTokenId');
    expect(metadataCalls).toContain('subTasks');
    expect(metadataCalls).toContain('extractionSummary');

    // Verify specific status transitions
    const statusCalls = mockMetadata.set.mock.calls
      .filter(([key]: [string]) => key === 'status')
      .map(([, value]: [string, string]) => value);
    expect(statusCalls).toContain('discovering');
    expect(statusCalls).toContain('waiting_confirmation');
    expect(statusCalls).toContain('extracting');
    expect(statusCalls).toContain('completed');
  });

  it('deve falhar graciosamente se confirmacao expirar', async () => {
    mockUpdateAnalysis.mockResolvedValue({} as ReturnType<typeof updateAnalysis> extends Promise<infer T> ? T : never);

    mockBatch.triggerByTaskAndWait.mockResolvedValueOnce({
      runs: [
        { ok: true, output: MOCK_CANDIDATES },
        { ok: true, output: [] },
        { ok: true, output: [] },
        { ok: true, output: [] },
      ],
    });

    mockScoreCompetitors.mockResolvedValue(MOCK_SCORED);
    mockWait.createToken.mockResolvedValue({ id: 'token-expired' });
    mockWait.forToken.mockResolvedValue({ ok: false });

    await expect(getOrchestratorRun()(MOCK_PAYLOAD)).rejects.toThrow(
      'Confirmacao expirou. Inicie uma nova analise.'
    );
  });

  it('deve retornar resultado com contagem de competidores e extracao', async () => {
    setupHappyPath();
    const result = await getOrchestratorRun()(MOCK_PAYLOAD) as Record<string, unknown>;

    expect(result.analysisId).toBe('analysis-123');
    expect(result.competitorsFound).toBe(2);
    expect(result.extractionSuccess).toBe(7);
    expect(result.extractionFailed).toBe(0);
  });
});
