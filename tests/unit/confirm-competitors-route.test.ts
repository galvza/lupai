import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase queries
vi.mock('@/lib/supabase/queries', () => ({
  getAnalysis: vi.fn(),
}));

// Mock Trigger.dev SDK
vi.mock('@trigger.dev/sdk/v3', () => ({
  wait: {
    completeToken: vi.fn(),
  },
}));

import { POST } from '@/app/api/analyze/[id]/confirm-competitors/route';
import { getAnalysis } from '@/lib/supabase/queries';
import { wait } from '@trigger.dev/sdk/v3';

const mockGetAnalysis = vi.mocked(getAnalysis);
const mockCompleteToken = vi.mocked(wait.completeToken);

const MOCK_ANALYSIS = {
  id: 'analysis-123',
  nicheInput: 'clinicas odontologicas',
  nicheInterpreted: { niche: 'odontologia', segment: 'clinicas', region: 'SP' },
  mode: 'quick' as const,
  status: 'waiting_confirmation' as const,
  userBusinessUrl: null,
  triggerRunId: 'run-abc',
  viralPatterns: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const VALID_COMPETITORS = [
  {
    name: 'Clinica A',
    url: 'https://clinica-a.com',
    score: 85,
    segmentMatch: 20,
    productMatch: 20,
    sizeMatch: 15,
    regionMatch: 15,
    digitalPresence: 15,
    reasoning: 'Relevante',
    socialProfiles: { instagram: '@clinicaa', tiktok: null, facebook: null },
  },
];

const VALID_BODY = {
  tokenId: 'token-abc',
  competitors: VALID_COMPETITORS,
};

/** Helper para criar Request objects */
const createRequest = (body: unknown, id = 'analysis-123'): [Request, { params: Promise<{ id: string }> }] => [
  new Request(`http://localhost/api/analyze/${id}/confirm-competitors`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }),
  { params: Promise.resolve({ id }) },
];

describe('POST /api/analyze/[id]/confirm-competitors', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAnalysis.mockResolvedValue(MOCK_ANALYSIS);
    mockCompleteToken.mockResolvedValue(undefined as unknown as ReturnType<typeof wait.completeToken> extends Promise<infer T> ? T : never);
  });

  it('deve confirmar concorrentes e chamar wait.completeToken', async () => {
    const [request, ctx] = createRequest(VALID_BODY);
    const response = await POST(request, ctx);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('confirmed');
    expect(data.analysisId).toBe('analysis-123');
    expect(mockCompleteToken).toHaveBeenCalledWith('token-abc', {
      competitors: VALID_COMPETITORS,
    });
  });

  it('deve retornar 404 se analise nao existir', async () => {
    mockGetAnalysis.mockResolvedValue(null);

    const [request, ctx] = createRequest(VALID_BODY);
    const response = await POST(request, ctx);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toContain('Analise nao encontrada');
  });

  it('deve retornar 400 se analise nao esta aguardando confirmacao', async () => {
    mockGetAnalysis.mockResolvedValue({ ...MOCK_ANALYSIS, status: 'processing' as const });

    const [request, ctx] = createRequest(VALID_BODY);
    const response = await POST(request, ctx);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('nao esta aguardando confirmacao');
  });

  it('deve retornar 400 se body invalido (sem tokenId)', async () => {
    const [request, ctx] = createRequest({ competitors: VALID_COMPETITORS });
    const response = await POST(request, ctx);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Dados invalidos');
  });

  it('deve retornar 400 se nenhum concorrente selecionado', async () => {
    const [request, ctx] = createRequest({ tokenId: 'token-abc', competitors: [] });
    const response = await POST(request, ctx);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Dados invalidos');
  });

  it('deve retornar 500 em erro interno', async () => {
    mockCompleteToken.mockRejectedValue(new Error('Trigger.dev error'));

    const [request, ctx] = createRequest(VALID_BODY);
    const response = await POST(request, ctx);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain('Erro ao confirmar concorrentes');
  });
});
