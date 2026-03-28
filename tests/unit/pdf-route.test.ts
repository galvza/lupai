import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase queries
vi.mock('@/lib/supabase/queries', () => ({
  getAnalysis: vi.fn(),
}));

// Mock PDF generation
vi.mock('@/lib/pdf/generate', () => ({
  generateAnalysisPdf: vi.fn(),
}));

import { GET } from '@/app/api/report/[id]/route';
import { getAnalysis } from '@/lib/supabase/queries';
import { generateAnalysisPdf } from '@/lib/pdf/generate';
import { createAnalysis } from '../fixtures/factories';

const mockGetAnalysis = vi.mocked(getAnalysis);
const mockGeneratePdf = vi.mocked(generateAnalysisPdf);

/** Helper para criar params no formato Next.js 15 (async) */
const createParams = (id: string) => ({ params: Promise.resolve({ id }) });

/** Helper para chamar o GET handler */
const callGet = (id: string) =>
  GET(new Request('http://localhost/api/report/' + id), createParams(id));

describe('GET /api/report/[id]', () => {
  const mockAnalysis = createAnalysis({ id: 'pdf-001', status: 'completed' });
  const mockPdfBuffer = new ArrayBuffer(256);

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAnalysis.mockResolvedValue(mockAnalysis);
    mockGeneratePdf.mockResolvedValue(mockPdfBuffer);
  });

  it('retorna 404 com erro PT-BR quando analise nao encontrada', async () => {
    mockGetAnalysis.mockResolvedValue(null);

    const response = await callGet('nao-existe');
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Analise nao encontrada.');
  });

  it('retorna 400 com erro PT-BR quando analise esta em processing', async () => {
    mockGetAnalysis.mockResolvedValue(createAnalysis({ status: 'processing' }));

    const response = await callGet('test-id');
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Somente analises concluidas podem ser exportadas como PDF.');
  });

  it('retorna 400 para status failed', async () => {
    mockGetAnalysis.mockResolvedValue(createAnalysis({ status: 'failed' }));

    const response = await callGet('test-id');
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Somente analises concluidas');
  });

  it('retorna 400 para status pending', async () => {
    mockGetAnalysis.mockResolvedValue(createAnalysis({ status: 'pending' }));

    const response = await callGet('test-id');

    expect(response.status).toBe(400);
  });

  it('retorna 200 com Content-Type application/pdf para analise completa', async () => {
    const response = await callGet('pdf-001');

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/pdf');
  });

  it('retorna Content-Disposition com filename pattern lupai-{slug}-{date}.pdf', async () => {
    const response = await callGet('pdf-001');

    const disposition = response.headers.get('Content-Disposition');
    expect(disposition).toContain('attachment; filename="lupai-');
    expect(disposition).toContain('.pdf"');
    // Niche is 'odontologia' from factory default
    expect(disposition).toContain('lupai-odontologia-');
  });

  it('retorna Content-Length correspondente ao tamanho do buffer', async () => {
    const response = await callGet('pdf-001');

    expect(response.headers.get('Content-Length')).toBe('256');
  });

  it('chama generateAnalysisPdf com o ID da analise', async () => {
    await callGet('pdf-001');

    expect(mockGeneratePdf).toHaveBeenCalledWith('pdf-001');
  });

  it('retorna 500 com erro PT-BR quando generateAnalysisPdf lanca excecao', async () => {
    mockGeneratePdf.mockRejectedValue(new Error('Erro interno'));

    const response = await callGet('pdf-001');
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Erro ao gerar relatorio PDF.');
  });

  it('slug e minusculo e caracteres especiais substituidos por hifens', async () => {
    mockGetAnalysis.mockResolvedValue(
      createAnalysis({
        status: 'completed',
        nicheInterpreted: {
          niche: 'Clínicas Odontológicas & Estética',
          segment: 'saude',
          region: 'SP',
        },
      })
    );

    const response = await callGet('test-id');
    const disposition = response.headers.get('Content-Disposition');

    // Special chars and spaces should become hyphens, accented chars removed
    expect(disposition).toContain('lupai-cl-nicas-odontol-gicas-est-tica-');
  });

  it('usa "analise" como slug fallback quando nicheInterpreted e null', async () => {
    mockGetAnalysis.mockResolvedValue(
      createAnalysis({
        status: 'completed',
        nicheInterpreted: null,
      })
    );

    const response = await callGet('test-id');
    const disposition = response.headers.get('Content-Disposition');

    expect(disposition).toContain('lupai-analise-');
  });
});
