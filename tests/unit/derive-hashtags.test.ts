import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGenerateContent = vi.fn();

vi.mock('@google/genai', () => ({
  GoogleGenAI: class MockGoogleGenAI {
    models = { generateContent: mockGenerateContent };
  },
}));

import { deriveViralHashtags } from '@/lib/ai/derive-hashtags';

describe('deriveViralHashtags', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna hashtags geradas pelo Gemini quando resposta valida', async () => {
    mockGenerateContent.mockResolvedValue({
      text: '["barba","barbeiro","cortemasculino","fadecut","degrade"]',
    });

    const result = await deriveViralHashtags('barbearia', 'barbearia masculina', 'Belo Horizonte');

    expect(result).toEqual(['barba', 'barbeiro', 'cortemasculino', 'fadecut', 'degrade']);
    expect(mockGenerateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gemini-2.5-flash',
        config: expect.objectContaining({
          responseMimeType: 'application/json',
        }),
      })
    );
  });

  it('limpa hashtags: lowercase, remove #, trim', async () => {
    mockGenerateContent.mockResolvedValue({
      text: '["#Barba","  BARBEIRO ","#CorteNovo"]',
    });

    const result = await deriveViralHashtags('barbearia', 'barbearia masculina', 'SP');

    expect(result).toEqual(['barba', 'barbeiro', 'cortenovo']);
  });

  it('limita a 8 hashtags maximo', async () => {
    mockGenerateContent.mockResolvedValue({
      text: '["a","b","c","d","e","f","g","h","i","j"]',
    });

    const result = await deriveViralHashtags('test', 'test', 'BR');

    expect(result).toHaveLength(8);
  });

  it('retorna fallback com niche quando Gemini retorna array vazio', async () => {
    mockGenerateContent.mockResolvedValue({ text: '[]' });

    const result = await deriveViralHashtags('barbearia', 'barbearia masculina', 'SP');

    expect(result).toEqual(['barbearia']);
  });

  it('retorna fallback com niche e segment quando Gemini falha', async () => {
    mockGenerateContent.mockRejectedValue(new Error('API error'));

    const result = await deriveViralHashtags('barbearia', 'barbearia masculina', 'SP');

    expect(result).toEqual(['barbearia', 'barbeariamasculina']);
  });

  it('retorna fallback sem duplicatas quando niche e segment sao iguais', async () => {
    mockGenerateContent.mockRejectedValue(new Error('API error'));

    const result = await deriveViralHashtags('crossfit', 'crossfit', 'SP');

    expect(result).toEqual(['crossfit']);
  });
});
