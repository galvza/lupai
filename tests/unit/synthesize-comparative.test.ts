import { describe, it, expect, vi, beforeEach } from 'vitest';

import comparativeFixture from '../fixtures/gemini-synthesis-comparative-v1.json';
import standardFixture from '../fixtures/gemini-synthesis-v2.json';
import creativeFixture from '../fixtures/gemini-creative-v2.json';
import {
  createAnalysis,
  createCompetitor,
  createViralContent,
} from '../fixtures/factories';

import type { SynthesisOutput } from '@/types/database';

// === Hoisted mocks for ALL groups ===

const {
  mockGenerateContent,
  mockCountTokens,
  mockSynthesizeAnalysis,
  mockBuildComparativeAnalysis,
  mockGenerateCreativeScripts,
  mockGetAnalysis,
  mockGetCompetitorsByAnalysis,
  mockGetViralContentByAnalysis,
  mockGetUserBusinessByAnalysis,
  mockUpsertSynthesis,
  mockMetadataSet,
  captured,
} = vi.hoisted(() => ({
  mockGenerateContent: vi.fn(),
  mockCountTokens: vi.fn(),
  mockSynthesizeAnalysis: vi.fn(),
  mockBuildComparativeAnalysis: vi.fn(),
  mockGenerateCreativeScripts: vi.fn(),
  mockGetAnalysis: vi.fn(),
  mockGetCompetitorsByAnalysis: vi.fn(),
  mockGetViralContentByAnalysis: vi.fn(),
  mockGetUserBusinessByAnalysis: vi.fn(),
  mockUpsertSynthesis: vi.fn(),
  mockMetadataSet: vi.fn(),
  captured: { runFn: null as ((payload: unknown) => Promise<unknown>) | null },
}));

vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    models = {
      generateContent: mockGenerateContent,
      countTokens: mockCountTokens,
    };
  },
}));

vi.mock('zod-to-json-schema', () => ({
  zodToJsonSchema: vi.fn().mockReturnValue({}),
}));

vi.mock('@/lib/ai/synthesize', () => ({
  synthesizeAnalysis: (...args: unknown[]) => mockSynthesizeAnalysis(...args),
  buildComparativeAnalysis: (...args: unknown[]) => mockBuildComparativeAnalysis(...args),
}));

vi.mock('@/lib/ai/creative', () => ({
  generateCreativeScripts: (...args: unknown[]) => mockGenerateCreativeScripts(...args),
}));

vi.mock('@/lib/supabase/queries', () => ({
  getAnalysis: (...args: unknown[]) => mockGetAnalysis(...args),
  getCompetitorsByAnalysis: (...args: unknown[]) => mockGetCompetitorsByAnalysis(...args),
  getViralContentByAnalysis: (...args: unknown[]) => mockGetViralContentByAnalysis(...args),
  getUserBusinessByAnalysis: (...args: unknown[]) => mockGetUserBusinessByAnalysis(...args),
  upsertSynthesis: (...args: unknown[]) => mockUpsertSynthesis(...args),
}));

vi.mock('@trigger.dev/sdk', () => ({
  task: (config: { id: string; run: (payload: unknown) => Promise<unknown> }) => {
    captured.runFn = config.run;
    return { id: config.id, triggerAndWait: vi.fn() };
  },
  metadata: {
    set: (...args: unknown[]) => mockMetadataSet(...args),
  },
}));

// Import AFTER mocks to trigger task registration
import '@/trigger/synthesize';

// === Group A: synthesizeAnalysis comparative behavior ===
// Uses vi.importActual to get the real synthesizeAnalysis (bypassing mock)
// while @google/genai remains mocked

describe('synthesizeAnalysis comparative behavior', () => {
  let realSynthesizeAnalysis: typeof import('@/lib/ai/synthesize')['synthesizeAnalysis'];

  beforeEach(async () => {
    vi.clearAllMocks();
    process.env.GEMINI_API_KEY = 'test-key';
    mockCountTokens.mockResolvedValue({ totalTokens: 50000 });
    const mod = await vi.importActual<typeof import('@/lib/ai/synthesize')>('@/lib/ai/synthesize');
    realSynthesizeAnalysis = mod.synthesizeAnalysis;
  });

  it('sem userBusiness nao inclui COMPARATIVE_SYNTHESIS_SECTION no prompt', async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(standardFixture),
    });

    await realSynthesizeAnalysis({
      niche: 'odontologia',
      segment: 'clinicas odontologicas',
      region: 'Sao Paulo, SP',
      competitors: [createCompetitor()],
      viralContent: [createViralContent()],
      viralPatterns: null,
    });

    const prompt = mockGenerateContent.mock.calls[0][0].contents as string;
    expect(prompt).not.toContain('MODO COMPLETO');
  });

  it('com userBusiness inclui COMPARATIVE_SYNTHESIS_SECTION e dados do usuario no prompt', async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(comparativeFixture),
    });

    const userBusiness = createCompetitor({
      role: 'user_business',
      name: 'Minha Clinica',
      websiteData: {
        positioning: 'Clinica especializada em estetica dental',
        offer: null,
        pricing: null,
        metaTags: { title: 'Minha Clinica', description: 'Estetica dental', keywords: [] },
      },
      socialData: {
        instagram: { followers: 2100, postingFrequency: '2x/semana', engagementRate: 1.8, topPosts: [] },
        tiktok: null,
      },
    });

    await realSynthesizeAnalysis({
      niche: 'odontologia',
      segment: 'clinicas odontologicas',
      region: 'Sao Paulo, SP',
      competitors: [createCompetitor()],
      viralContent: [],
      viralPatterns: null,
      userBusiness,
    });

    const prompt = mockGenerateContent.mock.calls[0][0].contents as string;
    expect(prompt).toContain('MODO COMPLETO');
    expect(prompt).toContain('Minha Clinica');
  });

  it('com userBusiness retorna output com secoes comparativas', async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(comparativeFixture),
    });

    const userBusiness = createCompetitor({ role: 'user_business', name: 'Minha Clinica' });

    const result = await realSynthesizeAnalysis({
      niche: 'odontologia',
      segment: 'clinicas odontologicas',
      region: 'Sao Paulo, SP',
      competitors: [createCompetitor()],
      viralContent: [],
      viralPatterns: null,
      userBusiness,
    });

    expect(result).not.toBeNull();
    expect(result!.userVsMarket).toBeDefined();
    expect(result!.gapsVsCompetitors).toBeDefined();
    expect(result!.competitiveAdvantages).toBeDefined();
    expect(result!.userVsMarket!.title).toContain('mercado');
  });
});

// === Group B: synthesizeTask comparative flow ===

const mockAnalysis = createAnalysis({ id: 'test-analysis-001', viralPatterns: null });
const mockCompetitors = [createCompetitor({ id: 'comp-1', name: 'Clinica Sorriso SP' })];
const mockViralContentArr = [createViralContent({ id: 'viral-1', platform: 'tiktok' })];
const mockUserBusiness = createCompetitor({ id: 'ub-1', role: 'user_business', name: 'Minha Clinica' });

describe('synthesizeTask comparative flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockGetAnalysis.mockResolvedValue(mockAnalysis);
    mockGetCompetitorsByAnalysis.mockResolvedValue(mockCompetitors);
    mockGetViralContentByAnalysis.mockResolvedValue(mockViralContentArr);
    mockGetUserBusinessByAnalysis.mockResolvedValue(mockUserBusiness);
    mockSynthesizeAnalysis.mockResolvedValue(comparativeFixture as SynthesisOutput);
    mockGenerateCreativeScripts.mockResolvedValue(creativeFixture.scripts);
    mockUpsertSynthesis.mockResolvedValue({ id: 'synth-1' });
    mockBuildComparativeAnalysis.mockReturnValue({
      comparativeStatus: 'full',
      userVsMarket: comparativeFixture.userVsMarket,
      gapsVsCompetitors: comparativeFixture.gapsVsCompetitors,
      competitiveAdvantages: comparativeFixture.competitiveAdvantages,
      personalizedRecommendations: comparativeFixture.recommendations,
    });
  });

  it('mode complete busca user business via getUserBusinessByAnalysis', async () => {
    await captured.runFn!({
      analysisId: 'test-analysis-001',
      niche: 'odontologia',
      segment: 'clinicas odontologicas',
      region: 'Sao Paulo, SP',
      mode: 'complete',
    });

    expect(mockGetUserBusinessByAnalysis).toHaveBeenCalledWith('test-analysis-001');
  });

  it('mode complete passa comparativeAnalysis para upsertSynthesis', async () => {
    await captured.runFn!({
      analysisId: 'test-analysis-001',
      niche: 'odontologia',
      segment: 'clinicas odontologicas',
      region: 'Sao Paulo, SP',
      mode: 'complete',
    });

    expect(mockUpsertSynthesis).toHaveBeenCalledTimes(1);
    const call = mockUpsertSynthesis.mock.calls[0][0];
    expect(call.comparativeAnalysis).toBeDefined();
    expect(call.comparativeAnalysis.comparativeStatus).toBe('full');
  });

  it('mode quick nao chama getUserBusinessByAnalysis', async () => {
    await captured.runFn!({
      analysisId: 'test-analysis-001',
      niche: 'odontologia',
      segment: 'clinicas odontologicas',
      region: 'Sao Paulo, SP',
      mode: 'quick',
    });

    expect(mockGetUserBusinessByAnalysis).not.toHaveBeenCalled();
  });

  it('mode complete sem user business gera comparativeAnalysis unavailable', async () => {
    mockGetUserBusinessByAnalysis.mockResolvedValue(null);
    mockBuildComparativeAnalysis.mockReturnValue({
      comparativeStatus: 'unavailable',
      userVsMarket: null,
      gapsVsCompetitors: null,
      competitiveAdvantages: null,
      personalizedRecommendations: [],
      degradedReason: 'Dados do negocio do usuario indisponiveis',
    });

    await captured.runFn!({
      analysisId: 'test-analysis-001',
      niche: 'odontologia',
      segment: 'clinicas odontologicas',
      region: 'Sao Paulo, SP',
      mode: 'complete',
    });

    expect(mockUpsertSynthesis).toHaveBeenCalledTimes(1);
    const call = mockUpsertSynthesis.mock.calls[0][0];
    expect(call.comparativeAnalysis).toBeDefined();
    expect(call.comparativeAnalysis.comparativeStatus).toBe('unavailable');
  });

  it('mode complete com sintese null gera comparativeAnalysis unavailable', async () => {
    mockSynthesizeAnalysis.mockResolvedValue(null);
    mockBuildComparativeAnalysis.mockReturnValue({
      comparativeStatus: 'unavailable',
      userVsMarket: null,
      gapsVsCompetitors: null,
      competitiveAdvantages: null,
      personalizedRecommendations: [],
      degradedReason: 'Sintese estrategica indisponivel',
    });

    await captured.runFn!({
      analysisId: 'test-analysis-001',
      niche: 'odontologia',
      segment: 'clinicas odontologicas',
      region: 'Sao Paulo, SP',
      mode: 'complete',
    });

    const call = mockUpsertSynthesis.mock.calls[0][0];
    expect(call.comparativeAnalysis).toBeDefined();
    expect(call.comparativeAnalysis.comparativeStatus).toBe('unavailable');
  });
});

// === Group C: buildComparativeAnalysis unit tests ===

describe('buildComparativeAnalysis', () => {
  const getRealBuild = async () => {
    const mod = await vi.importActual<typeof import('@/lib/ai/synthesize')>('@/lib/ai/synthesize');
    return mod.buildComparativeAnalysis;
  };

  it('userBusiness null retorna status unavailable', async () => {
    const realBuild = await getRealBuild();
    const result = realBuild(comparativeFixture as SynthesisOutput, null);
    expect(result.comparativeStatus).toBe('unavailable');
    expect(result.degradedReason).toContain('indisponiveis');
  });

  it('synthesisOutput null retorna status unavailable com degradedReason', async () => {
    const realBuild = await getRealBuild();
    const userBiz = createCompetitor({ role: 'user_business' });
    const result = realBuild(null, userBiz);
    expect(result.comparativeStatus).toBe('unavailable');
    expect(result.degradedReason).toContain('indisponivel');
  });

  it('todas secoes presentes retorna status full', async () => {
    const realBuild = await getRealBuild();
    const userBiz = createCompetitor({ role: 'user_business' });
    const result = realBuild(comparativeFixture as SynthesisOutput, userBiz);
    expect(result.comparativeStatus).toBe('full');
    expect(result.userVsMarket).not.toBeNull();
    expect(result.gapsVsCompetitors).not.toBeNull();
    expect(result.competitiveAdvantages).not.toBeNull();
  });

  it('apenas algumas secoes retorna status partial', async () => {
    const realBuild = await getRealBuild();
    const userBiz = createCompetitor({ role: 'user_business' });
    const partialOutput: SynthesisOutput = {
      ...standardFixture as SynthesisOutput,
      userVsMarket: comparativeFixture.userVsMarket as SynthesisOutput['userVsMarket'],
    };
    const result = realBuild(partialOutput, userBiz);
    expect(result.comparativeStatus).toBe('partial');
    expect(result.userVsMarket).not.toBeNull();
    expect(result.gapsVsCompetitors).toBeNull();
  });

  it('nenhuma secao comparativa retorna status unavailable', async () => {
    const realBuild = await getRealBuild();
    const userBiz = createCompetitor({ role: 'user_business' });
    const result = realBuild(standardFixture as SynthesisOutput, userBiz);
    expect(result.comparativeStatus).toBe('unavailable');
  });
});
