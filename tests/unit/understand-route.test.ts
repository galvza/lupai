import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock understandNiche before importing route
vi.mock('@/lib/ai/understand', () => ({
  understandNiche: vi.fn(),
}));

import { POST } from '@/app/api/analyze/understand/route';
import { understandNiche } from '@/lib/ai/understand';

const mockUnderstandNiche = vi.mocked(understandNiche);

/** Helper para criar Request objects */
const createRequest = (body: unknown): Request =>
  new Request('http://localhost/api/analyze/understand', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

describe('POST /api/analyze/understand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna 400 com NONSENSE para input invalido', async () => {
    const request = createRequest({ nicheInput: 'asd' });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.classification).toBe('NONSENSE');
    expect(data.error).toContain('Nao consegui entender');
    expect(mockUnderstandNiche).not.toHaveBeenCalled();
  });

  it('retorna 200 com MINIMAL e followUpQuestions para input curto', async () => {
    const request = createRequest({ nicheInput: 'suplementos' });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.classification).toBe('MINIMAL');
    expect(data.followUpQuestions).toBeInstanceOf(Array);
    expect(data.followUpQuestions.length).toBeGreaterThanOrEqual(3);
    expect(mockUnderstandNiche).not.toHaveBeenCalled();
  });

  it('retorna 200 com URL e urlDetected para input de URL', async () => {
    const request = createRequest({ nicheInput: 'www.loja.com.br' });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.classification).toBe('URL');
    expect(data.urlDetected).toBe('www.loja.com.br');
    expect(data.interpreted).toBeDefined();
    expect(data.interpreted.niche).toBe('negocio online');
    expect(mockUnderstandNiche).not.toHaveBeenCalled();
  });

  it('retorna 200 com MEDIUM e interpreted para input valido', async () => {
    mockUnderstandNiche.mockResolvedValue({
      niche: 'suplementos',
      segment: 'esportivos',
      region: 'Campinas',
    });

    const request = createRequest({ nicheInput: 'loja de suplementos esportivos em Campinas' });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.classification).toBe('MEDIUM');
    expect(data.interpreted).toEqual({
      niche: 'suplementos',
      segment: 'esportivos',
      region: 'Campinas',
    });
    expect(mockUnderstandNiche).toHaveBeenCalledWith('loja de suplementos esportivos em Campinas');
  });

  it('retorna 200 com EXCESSIVE e interpreted para input longo', async () => {
    const longInput = Array(35).fill('palavra').join(' ');
    mockUnderstandNiche.mockResolvedValue({
      niche: 'generico',
      segment: 'variado',
      region: 'Brasil',
    });

    const request = createRequest({ nicheInput: longInput });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.classification).toBe('EXCESSIVE');
    expect(data.interpreted).toBeDefined();
    expect(mockUnderstandNiche).toHaveBeenCalledWith(longInput);
  });

  it('retorna 400 para body vazio', async () => {
    const request = createRequest({});
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Input invalido');
  });

  it('retorna 400 para body sem nicheInput', async () => {
    const request = createRequest({ outroField: 'valor' });
    const response = await POST(request);

    expect(response.status).toBe(400);
  });

  it('retorna 500 quando Gemini falha', async () => {
    mockUnderstandNiche.mockRejectedValue(new Error('Gemini API Error'));

    const request = createRequest({ nicheInput: 'loja de roupas femininas em Sao Paulo' });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain('Erro ao interpretar nicho');
  });
});
