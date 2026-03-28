import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase queries
vi.mock('@/lib/supabase/queries', () => ({
  getAnalysis: vi.fn(),
}));

import { GET } from '@/app/api/analysis/[id]/status/route';
import { getAnalysis } from '@/lib/supabase/queries';
import { createAnalysis } from '../fixtures/factories';

const mockGetAnalysis = vi.mocked(getAnalysis);

/** Helper para criar params no formato Next.js 15 (async) */
const createParams = (id: string) => ({ params: Promise.resolve({ id }) });

/** Helper para chamar o GET handler */
const callGet = (id: string) =>
  GET(
    new Request('http://localhost/api/analysis/' + id + '/status'),
    createParams(id)
  );

describe('GET /api/analysis/[id]/status', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna 404 com erro PT-BR quando analise nao existe', async () => {
    mockGetAnalysis.mockResolvedValue(null);

    const response = await callGet('nao-existe');
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Analise nao encontrada.');
  });

  it('retorna 200 com status de analise em processing', async () => {
    const processingAnalysis = createAnalysis({
      id: 'analysis-001',
      status: 'processing',
      mode: 'quick',
      createdAt: '2026-03-27T12:00:00Z',
      updatedAt: '2026-03-27T12:01:00Z',
    });
    mockGetAnalysis.mockResolvedValue(processingAnalysis);

    const response = await callGet('analysis-001');
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      analysisId: 'analysis-001',
      status: 'processing',
      mode: 'quick',
      createdAt: '2026-03-27T12:00:00Z',
      updatedAt: '2026-03-27T12:01:00Z',
    });
  });

  it('retorna 200 com status de analise em completed', async () => {
    const completedAnalysis = createAnalysis({
      id: 'analysis-002',
      status: 'completed',
      mode: 'complete',
      createdAt: '2026-03-27T12:00:00Z',
      updatedAt: '2026-03-27T12:05:00Z',
    });
    mockGetAnalysis.mockResolvedValue(completedAnalysis);

    const response = await callGet('analysis-002');
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.analysisId).toBe('analysis-002');
    expect(data.status).toBe('completed');
    expect(data.mode).toBe('complete');
  });

  it('resposta NAO contem dados completos (competitors, synthesis, viralContent, sectionStatuses)', async () => {
    const analysis = createAnalysis({ id: 'analysis-003', status: 'completed' });
    mockGetAnalysis.mockResolvedValue(analysis);

    const response = await callGet('analysis-003');
    const data = await response.json();

    expect(data).not.toHaveProperty('competitors');
    expect(data).not.toHaveProperty('synthesis');
    expect(data).not.toHaveProperty('viralContent');
    expect(data).not.toHaveProperty('sectionStatuses');
  });
});
