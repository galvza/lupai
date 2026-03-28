import { describe, it, expect, vi, beforeEach } from 'vitest';

import creativeFixture from '../fixtures/gemini-creative-v2.json';
import { createCompetitor, createViralContent } from '../fixtures/factories';

// Mock @google/genai
const mockGenerateContent = vi.fn();
vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    models = {
      generateContent: mockGenerateContent,
    };
  },
}));

import { generateCreativeScripts } from '@/lib/ai/creative';

describe('generateCreativeScripts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GEMINI_API_KEY = 'test-key';
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(creativeFixture),
    });
  });

  it('retorna roteiros com hook/body/cta estruturados', async () => {
    const result = await generateCreativeScripts({
      niche: 'odontologia',
      segment: 'clinicas odontologicas',
      viralContent: [createViralContent({ hookBodyCta: { hook: 'test', body: 'test', cta: 'test', hookDurationSeconds: 3, totalDurationSeconds: 30 } })],
      viralPatterns: {
        hookPatterns: [{ pattern: 'pergunta provocativa', frequency: 5, examples: ['test'] }],
        bodyStructures: [{ structure: 'antes/depois', frequency: 3 }],
        ctaPatterns: [{ pattern: 'link na bio', frequency: 4, examples: ['test'] }],
        dominantTone: 'educacional',
        bestPerformingDuration: { averageSeconds: 30, range: '15-45' },
        recurringFormulas: [{ formula: 'hook + dicas + CTA', videoCount: 3 }],
        totalVideosAnalyzed: 8,
        analysisConfidence: 'high',
      },
      competitors: [createCompetitor()],
    });

    expect(result).not.toBeNull();
    expect(result!.length).toBeGreaterThanOrEqual(3);

    for (const script of result!) {
      expect(script.hook.text).toBeDefined();
      expect(script.hook.timing_seconds).toBeDefined();
      expect(script.body.text).toBeDefined();
      expect(script.body.structure_notes).toBeDefined();
      expect(script.cta.text).toBeDefined();
      expect(script.cta.action).toBeDefined();
    }
  });

  it('cada roteiro tem formato e duracao estimada', async () => {
    const result = await generateCreativeScripts({
      niche: 'odontologia',
      segment: 'clinicas odontologicas',
      viralContent: [],
      viralPatterns: null,
      competitors: [createCompetitor()],
    });

    expect(result).not.toBeNull();
    for (const script of result!) {
      expect(['Reels', 'TikTok', 'YouTube Shorts', 'Stories']).toContain(script.format);
      expect(script.estimated_duration_seconds).toBeGreaterThanOrEqual(10);
      expect(script.estimated_duration_seconds).toBeLessThanOrEqual(120);
    }
  });

  it('gera roteiros sem padroes virais usando fallback de concorrentes (per D-14)', async () => {
    const competitor = createCompetitor({ name: 'Clinica Sorriso SP' });

    const result = await generateCreativeScripts({
      niche: 'odontologia',
      segment: 'clinicas odontologicas',
      viralContent: [],
      viralPatterns: null,
      competitors: [competitor],
    });

    expect(result).not.toBeNull();

    // Verify the prompt included competitor data
    const callArgs = mockGenerateContent.mock.calls[0][0];
    expect(callArgs.contents).toContain('Clinica Sorriso SP');
    expect(callArgs.contents).toContain('Sem padroes virais disponiveis');
  });

  it('retorna null quando Gemini retorna JSON invalido', async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify({ invalid: true }),
    });

    const result = await generateCreativeScripts({
      niche: 'odontologia',
      segment: 'clinicas odontologicas',
      viralContent: [],
      viralPatterns: null,
      competitors: [createCompetitor()],
    });

    expect(result).toBeNull();
  });
});
