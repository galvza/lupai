import { describe, it, expect, vi, beforeEach } from 'vitest';

import synthesisFixture from '../fixtures/gemini-synthesis-v2.json';
import { createCompetitor, createViralContent } from '../fixtures/factories';

// Mock @google/genai
const mockGenerateContent = vi.fn();
const mockCountTokens = vi.fn();
vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    models = {
      generateContent: mockGenerateContent,
      countTokens: mockCountTokens,
    };
  },
}));

import { synthesizeAnalysis, truncateContextIfNeeded } from '@/lib/ai/synthesize';

describe('synthesizeAnalysis', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GEMINI_API_KEY = 'test-key';
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(synthesisFixture),
    });
    mockCountTokens.mockResolvedValue({ totalTokens: 50000 });
  });

  it('retorna sintese estruturada com todas as secoes', async () => {
    const result = await synthesizeAnalysis({
      niche: 'odontologia',
      segment: 'clinicas odontologicas',
      region: 'Sao Paulo, SP',
      competitors: [createCompetitor()],
      viralContent: [createViralContent()],
      viralPatterns: null,
    });

    expect(result).not.toBeNull();
    expect(result!.marketOverview).toBeDefined();
    expect(result!.competitorAnalysis).toBeDefined();
    expect(result!.gapsAndOpportunities).toBeDefined();
    expect(result!.viralPatterns).toBeDefined();

    for (const key of ['marketOverview', 'competitorAnalysis', 'gapsAndOpportunities', 'viralPatterns'] as const) {
      const section = result![key];
      expect(section.title).toBeDefined();
      expect(section.summary).toBeDefined();
      expect(section.metrics).toBeDefined();
      expect(section.tags).toBeDefined();
      expect(section.detailed_analysis).toBeDefined();
    }
  });

  it('recomendacoes tem campos action/reason/priority/effort/expected_impact', async () => {
    const result = await synthesizeAnalysis({
      niche: 'odontologia',
      segment: 'clinicas odontologicas',
      region: 'Sao Paulo, SP',
      competitors: [createCompetitor()],
      viralContent: [],
      viralPatterns: null,
    });

    expect(result).not.toBeNull();
    expect(result!.recommendations.length).toBeGreaterThanOrEqual(3);

    for (const rec of result!.recommendations) {
      expect(rec.action).toBeDefined();
      expect(rec.reason).toBeDefined();
      expect(['alta', 'media', 'baixa']).toContain(rec.priority);
      expect(['alto', 'medio', 'baixo']).toContain(rec.effort);
      expect(rec.expected_impact).toBeDefined();
    }
  });

  it('retorna null quando Gemini retorna JSON invalido', async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify({ invalid: true }),
    });

    const result = await synthesizeAnalysis({
      niche: 'odontologia',
      segment: 'clinicas odontologicas',
      region: 'Sao Paulo, SP',
      competitors: [createCompetitor()],
      viralContent: [],
      viralPatterns: null,
    });

    expect(result).toBeNull();
  });

  it('funciona com array vazio de concorrentes', async () => {
    const result = await synthesizeAnalysis({
      niche: 'odontologia',
      segment: 'clinicas odontologicas',
      region: 'Sao Paulo, SP',
      competitors: [],
      viralContent: [],
      viralPatterns: null,
    });

    expect(result).not.toBeNull();
    expect(result!.marketOverview).toBeDefined();
  });
});

describe('truncateContextIfNeeded', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GEMINI_API_KEY = 'test-key';
  });

  it('reduz contexto viral quando tokens excedem limite (per D-29)', async () => {
    mockCountTokens.mockResolvedValue({ totalTokens: 250000 });
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const viralContext = {
      viralPatterns: { hookPatterns: [], bodyStructures: [], ctaPatterns: [], dominantTone: 'educacional', bestPerformingDuration: { averageSeconds: 30, range: '15-45' }, recurringFormulas: [], totalVideosAnalyzed: 5, analysisConfidence: 'high' as const },
      viralContent: [{ platform: 'tiktok', caption: 'test', hookBodyCta: null, engagement: { views: 1000 } }],
    };

    const result = await truncateContextIfNeeded(
      'test prompt',
      [{ name: 'Competitor A' }],
      viralContext,
      200_000
    );

    expect(result.competitorContext).toEqual([{ name: 'Competitor A' }]);
    const resultViral = result.viralContext as { viralPatterns: unknown; viralContent: unknown[] };
    expect(resultViral.viralPatterns).toEqual(viralContext.viralPatterns);
    expect(resultViral.viralContent).toEqual([]);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('contexto truncado de 250000 tokens')
    );

    warnSpy.mockRestore();
  });

  it('preserva contexto quando abaixo do limite', async () => {
    mockCountTokens.mockResolvedValue({ totalTokens: 50000 });

    const viralContext = {
      viralPatterns: null,
      viralContent: [{ platform: 'tiktok' }],
    };

    const result = await truncateContextIfNeeded(
      'test prompt',
      [{ name: 'Competitor A' }],
      viralContext,
      200_000
    );

    expect(result.competitorContext).toEqual([{ name: 'Competitor A' }]);
    expect(result.viralContext).toBe(viralContext);
  });
});
