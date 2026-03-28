import { describe, it, expect, vi, beforeEach } from 'vitest';

import synthesisFixture from '../fixtures/gemini-synthesis-v2.json';
import creativeFixture from '../fixtures/gemini-creative-v2.json';
import {
  createAnalysis,
  createCompetitor,
  createViralContent,
} from '../fixtures/factories';

import type { SynthesisOutput } from '@/types/database';

// vi.hoisted runs BEFORE vi.mock factories, so these are available during mock setup
const {
  mockSynthesizeAnalysis,
  mockGenerateCreativeScripts,
  mockGetAnalysis,
  mockGetCompetitorsByAnalysis,
  mockGetViralContentByAnalysis,
  mockUpsertSynthesis,
  mockMetadataSet,
  captured,
} = vi.hoisted(() => ({
  mockSynthesizeAnalysis: vi.fn(),
  mockGenerateCreativeScripts: vi.fn(),
  mockGetAnalysis: vi.fn(),
  mockGetCompetitorsByAnalysis: vi.fn(),
  mockGetViralContentByAnalysis: vi.fn(),
  mockUpsertSynthesis: vi.fn(),
  mockMetadataSet: vi.fn(),
  captured: { runFn: null as ((payload: unknown) => Promise<unknown>) | null },
}));

vi.mock('@/lib/ai/synthesize', () => ({
  synthesizeAnalysis: (...args: unknown[]) => mockSynthesizeAnalysis(...args),
}));

vi.mock('@/lib/ai/creative', () => ({
  generateCreativeScripts: (...args: unknown[]) => mockGenerateCreativeScripts(...args),
}));

vi.mock('@/lib/supabase/queries', () => ({
  getAnalysis: (...args: unknown[]) => mockGetAnalysis(...args),
  getCompetitorsByAnalysis: (...args: unknown[]) => mockGetCompetitorsByAnalysis(...args),
  getViralContentByAnalysis: (...args: unknown[]) => mockGetViralContentByAnalysis(...args),
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

const defaultPayload = {
  analysisId: 'test-analysis-001',
  niche: 'odontologia',
  segment: 'clinicas odontologicas',
  region: 'Sao Paulo, SP',
  mode: 'quick' as const,
};

const mockAnalysis = createAnalysis({
  id: 'test-analysis-001',
  viralPatterns: null,
});

const mockCompetitors = [
  createCompetitor({ id: 'comp-1', name: 'Clinica Sorriso SP' }),
  createCompetitor({ id: 'comp-2', name: 'DentalCare SP' }),
];

const mockViralContent = [
  createViralContent({ id: 'viral-1', platform: 'tiktok' }),
  createViralContent({ id: 'viral-2', platform: 'instagram' }),
];

describe('synthesizeTask', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mocks: everything succeeds
    mockGetAnalysis.mockResolvedValue(mockAnalysis);
    mockGetCompetitorsByAnalysis.mockResolvedValue(mockCompetitors);
    mockGetViralContentByAnalysis.mockResolvedValue(mockViralContent);
    mockSynthesizeAnalysis.mockResolvedValue(synthesisFixture as SynthesisOutput);
    mockGenerateCreativeScripts.mockResolvedValue(creativeFixture.scripts);
    mockUpsertSynthesis.mockResolvedValue({ id: 'synth-1' });
  });

  it('armazena sintese com todas as secoes no banco', async () => {
    const result = await captured.runFn!(defaultPayload);

    expect(mockUpsertSynthesis).toHaveBeenCalledTimes(1);
    const call = mockUpsertSynthesis.mock.calls[0][0];

    expect(call.analysisId).toBe('test-analysis-001');
    expect(call.strategicOverview).toContain('marketOverview');
    expect(call.recommendations).toBeInstanceOf(Array);
    expect(call.recommendations.length).toBeGreaterThanOrEqual(1);
    expect(call.recommendations[0].action).toBeDefined();
    expect(call.creativeScripts).toBeInstanceOf(Array);

    const resultTyped = result as { status: string };
    expect(resultTyped.status).toBe('success');
  });

  it('armazena roteiros criativos no banco', async () => {
    await captured.runFn!(defaultPayload);

    const call = mockUpsertSynthesis.mock.calls[0][0];
    expect(call.creativeScripts.length).toBeGreaterThanOrEqual(1);
    expect(call.creativeScripts[0].hook.text).toBeDefined();
    expect(call.creativeScripts[0].body.text).toBeDefined();
    expect(call.creativeScripts[0].cta.text).toBeDefined();
  });

  it('retorna status partial quando sintese falha mas criativo funciona', async () => {
    mockSynthesizeAnalysis.mockResolvedValue(null);

    const result = (await captured.runFn!(defaultPayload)) as {
      status: string;
      data: { synthesis: unknown; scripts: unknown };
    };

    expect(result.status).toBe('partial');
    expect(result.data.synthesis).toBeNull();
    expect(result.data.scripts).not.toBeNull();
  });

  it('retorna status partial quando criativo falha mas sintese funciona', async () => {
    mockGenerateCreativeScripts.mockResolvedValue(null);

    const result = (await captured.runFn!(defaultPayload)) as {
      status: string;
      data: { synthesis: unknown; scripts: unknown };
    };

    expect(result.status).toBe('partial');
    expect(result.data.synthesis).not.toBeNull();
    expect(result.data.scripts).toBeNull();
  });

  it('retorna status fallback quando ambos falham', async () => {
    mockSynthesizeAnalysis.mockResolvedValue(null);
    mockGenerateCreativeScripts.mockResolvedValue(null);

    const result = (await captured.runFn!(defaultPayload)) as {
      status: string;
      data: { synthesis: unknown; scripts: unknown };
    };

    expect(result.status).toBe('fallback');
    expect(mockUpsertSynthesis).toHaveBeenCalledTimes(1);
    // Fallback should still store data
    const call = mockUpsertSynthesis.mock.calls[0][0];
    expect(call.strategicOverview).toContain('concorrentes analisados');
  });

  it('busca dados do Supabase antes de chamar IA', async () => {
    await captured.runFn!(defaultPayload);

    expect(mockGetAnalysis).toHaveBeenCalledWith('test-analysis-001');
    expect(mockGetCompetitorsByAnalysis).toHaveBeenCalledWith('test-analysis-001');
    expect(mockGetViralContentByAnalysis).toHaveBeenCalledWith('test-analysis-001');
  });

  it('atualiza metadata com etapas de progresso', async () => {
    await captured.runFn!(defaultPayload);

    const stepCalls = mockMetadataSet.mock.calls
      .filter(([key]: [string]) => key === 'step')
      .map(([, value]: [string, string]) => value);

    expect(stepCalls).toContain('Buscando dados para sintese...');
    expect(stepCalls).toContain('Gerando sintese e recomendacoes...');
    expect(stepCalls).toContain('Gerando roteiros criativos...');
    expect(stepCalls).toContain('Salvando resultados...');
  });

  it('retorna unavailable quando analise nao encontrada no banco', async () => {
    mockGetAnalysis.mockResolvedValue(null);

    const result = (await captured.runFn!(defaultPayload)) as {
      status: string;
      reason: string;
    };

    expect(result.status).toBe('unavailable');
    expect(result.reason).toContain('nao encontrada');
  });
});
