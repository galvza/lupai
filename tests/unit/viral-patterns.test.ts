import { describe, it, expect, vi, beforeEach } from 'vitest';

import patternsFixture from '../fixtures/viral-patterns.json';

const mockGenerateContent = vi.fn();

vi.mock('@google/genai', () => ({
  GoogleGenAI: class MockGoogleGenAI {
    models = {
      generateContent: mockGenerateContent,
    };
  },
}));

vi.mock('zod-to-json-schema', () => ({
  zodToJsonSchema: vi.fn(() => ({})),
}));

import { detectViralPatterns } from '@/lib/ai/viral-patterns';
import type { PatternDetectionInput } from '@/lib/ai/viral-patterns';

const createInput = (overrides: Partial<PatternDetectionInput> = {}): PatternDetectionInput => ({
  transcription: 'Voce sabia que 70% das pessoas cometem esse erro?',
  platform: 'tiktok',
  caption: 'Dicas de dentista #odontologia',
  durationSeconds: 32,
  engagementRate: 0.05,
  ...overrides,
});

describe('viral-patterns', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna ViralPatterns valido a partir de array de transcricoes via Gemini mockado', async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(patternsFixture),
    });

    const inputs = [
      createInput({ transcription: 'Transcricao video 1' }),
      createInput({ transcription: 'Transcricao video 2', platform: 'instagram' }),
      createInput({ transcription: 'Transcricao video 3' }),
    ];

    const result = await detectViralPatterns(inputs);

    expect(result).not.toBeNull();
    expect(result!.hookPatterns).toHaveLength(2);
    expect(result!.bodyStructures).toHaveLength(2);
    expect(result!.ctaPatterns).toHaveLength(2);
    expect(result!.dominantTone).toBe('educacional');
    expect(result!.bestPerformingDuration.averageSeconds).toBe(30);
    expect(result!.recurringFormulas).toHaveLength(2);
    expect(result!.totalVideosAnalyzed).toBe(8);
    expect(result!.analysisConfidence).toBe('high');
  });

  it('retorna null quando menos de 2 transcricoes fornecidas (per D-48)', async () => {
    const inputs = [createInput()];

    const result = await detectViralPatterns(inputs);

    expect(result).toBeNull();
    // Should NOT call Gemini with < 2 inputs
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });

  it('retorna null para array vazio', async () => {
    const result = await detectViralPatterns([]);

    expect(result).toBeNull();
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });

  it('valida resposta com viralPatternsSchema (rejeita dados invalidos)', async () => {
    // Missing required fields
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify({
        hookPatterns: [],
        // missing other required fields
      }),
    });

    const inputs = [createInput(), createInput()];
    const result = await detectViralPatterns(inputs);

    expect(result).toBeNull();
  });

  it('envia todas as transcricoes em um unico call ao Gemini (per D-30)', async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(patternsFixture),
    });

    const inputs = [
      createInput({ transcription: 'Video 1 transcricao' }),
      createInput({ transcription: 'Video 2 transcricao' }),
      createInput({ transcription: 'Video 3 transcricao' }),
    ];

    await detectViralPatterns(inputs);

    // Should be called exactly once (batch call)
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);

    // The prompt should contain all 3 transcriptions
    const callArgs = mockGenerateContent.mock.calls[0][0];
    expect(callArgs.contents).toContain('Video 1 transcricao');
    expect(callArgs.contents).toContain('Video 2 transcricao');
    expect(callArgs.contents).toContain('Video 3 transcricao');
    expect(callArgs.contents).toContain('Total de videos: 3');
  });

  it('retorna null quando Gemini retorna JSON invalido', async () => {
    mockGenerateContent.mockResolvedValue({
      text: 'invalid json response',
    });

    const inputs = [createInput(), createInput()];
    const result = await detectViralPatterns(inputs);

    expect(result).toBeNull();
  });

  it('usa modelo gemini-2.0-flash', async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(patternsFixture),
    });

    const inputs = [createInput(), createInput()];
    await detectViralPatterns(inputs);

    expect(mockGenerateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gemini-2.0-flash',
      })
    );
  });

  it('inclui metadados de plataforma e engajamento no contexto', async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(patternsFixture),
    });

    const inputs = [
      createInput({ platform: 'tiktok', engagementRate: 0.08, durationSeconds: 25 }),
      createInput({ platform: 'instagram', engagementRate: 0.12, durationSeconds: 40 }),
    ];

    await detectViralPatterns(inputs);

    const callArgs = mockGenerateContent.mock.calls[0][0];
    expect(callArgs.contents).toContain('tiktok');
    expect(callArgs.contents).toContain('instagram');
    expect(callArgs.contents).toContain('25s');
    expect(callArgs.contents).toContain('40s');
  });
});
