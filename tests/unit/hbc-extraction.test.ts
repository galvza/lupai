import { describe, it, expect, vi, beforeEach } from 'vitest';

import hbcFixture from '../fixtures/hbc-extraction.json';

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

import { extractHookBodyCta } from '@/lib/ai/hbc-extraction';

describe('hbc-extraction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna HookBodyCta valido a partir de transcricao via Gemini mockado', async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(hbcFixture),
    });

    const result = await extractHookBodyCta(
      'Voce sabia que 70% das pessoas fazem clareamento dental errado? Neste video vou te mostrar os 3 erros mais comuns...',
      32
    );

    expect(result).not.toBeNull();
    expect(result!.hook).toBe(hbcFixture.hook);
    expect(result!.body).toBe(hbcFixture.body);
    expect(result!.cta).toBe(hbcFixture.cta);
    expect(result!.hookDurationSeconds).toBe(3);
    expect(result!.totalDurationSeconds).toBe(32);
  });

  it('retorna null para transcricao vazia (per D-29)', async () => {
    const result = await extractHookBodyCta('', null);

    expect(result).toBeNull();
    // Should NOT call Gemini for empty transcription
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });

  it('retorna null para transcricao somente com espacos', async () => {
    const result = await extractHookBodyCta('   ', null);

    expect(result).toBeNull();
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });

  it('retorna null quando Gemini retorna JSON invalido', async () => {
    mockGenerateContent.mockResolvedValue({
      text: 'not valid json at all',
    });

    const result = await extractHookBodyCta('Alguma transcricao de teste', 30);
    expect(result).toBeNull();
  });

  it('valida resposta com hookBodyCtaSchema (rejeita dados incompletos)', async () => {
    // Missing required fields (hook/body/cta must be non-empty per schema min(1))
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify({
        hook: '',
        body: '',
        cta: '',
        hookDurationSeconds: null,
        totalDurationSeconds: null,
      }),
    });

    const result = await extractHookBodyCta('Alguma transcricao de teste', 30);
    // hookBodyCtaSchema requires min(1) for hook, body, cta — empty strings should fail
    expect(result).toBeNull();
  });

  it('inclui duracao do video no contexto do prompt', async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(hbcFixture),
    });

    await extractHookBodyCta('Teste transcricao', 45);

    expect(mockGenerateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        contents: expect.stringContaining('45 segundos'),
      })
    );
  });

  it('usa modelo gemini-2.0-flash', async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(hbcFixture),
    });

    await extractHookBodyCta('Teste transcricao', 30);

    expect(mockGenerateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gemini-2.5-flash',
      })
    );
  });
});
