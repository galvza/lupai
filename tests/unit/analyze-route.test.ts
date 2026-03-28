import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase queries
vi.mock('@/lib/supabase/queries', () => ({
  createAnalysis: vi.fn(),
  updateAnalysis: vi.fn(),
  findCachedAnalysis: vi.fn(),
}));

// Mock Trigger.dev SDK
vi.mock('@trigger.dev/sdk/v3', () => ({
  tasks: {
    trigger: vi.fn(),
  },
}));

import { POST } from '@/app/api/analyze/route';
import { createAnalysis, updateAnalysis, findCachedAnalysis } from '@/lib/supabase/queries';
import { tasks } from '@trigger.dev/sdk/v3';

const mockCreateAnalysis = vi.mocked(createAnalysis);
const mockUpdateAnalysis = vi.mocked(updateAnalysis);
const mockFindCachedAnalysis = vi.mocked(findCachedAnalysis);
const mockTasksTrigger = vi.mocked(tasks.trigger);

const MOCK_ANALYSIS = {
  id: 'test-uuid',
  nicheInput: 'loja de suplementos esportivos em Campinas',
  mode: 'quick' as const,
  status: 'pending' as const,
  nicheInterpreted: null,
  userBusinessUrl: null,
  triggerRunId: null,
  viralPatterns: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const VALID_BODY = {
  nicheInput: 'loja de suplementos esportivos em Campinas',
  nicheInterpreted: {
    niche: 'suplementos',
    segment: 'esportivos',
    region: 'Campinas',
  },
  mode: 'quick',
};

/** Helper para criar Request objects */
const createRequest = (body: unknown): Request =>
  new Request('http://localhost/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

describe('POST /api/analyze', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindCachedAnalysis.mockResolvedValue(null);
    mockCreateAnalysis.mockResolvedValue(MOCK_ANALYSIS);
    mockUpdateAnalysis.mockResolvedValue({
      ...MOCK_ANALYSIS,
      nicheInterpreted: VALID_BODY.nicheInterpreted,
      status: 'processing',
      triggerRunId: 'run-123',
    });
    mockTasksTrigger.mockResolvedValue({
      id: 'run-123',
      publicAccessToken: 'token-abc',
    } as ReturnType<typeof tasks.trigger> extends Promise<infer T> ? T : never);
  });

  it('retorna 200 com analysisId, runId, publicAccessToken e redirectUrl', async () => {
    const request = createRequest(VALID_BODY);
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.analysisId).toBe('test-uuid');
    expect(data.runId).toBe('run-123');
    expect(data.publicAccessToken).toBe('token-abc');
    expect(data.redirectUrl).toBe('/analysis/test-uuid');
  });

  it('chama createAnalysis com nicheInput, mode e userBusinessUrl', async () => {
    const request = createRequest(VALID_BODY);
    await POST(request);

    expect(mockCreateAnalysis).toHaveBeenCalledWith({
      nicheInput: 'loja de suplementos esportivos em Campinas',
      mode: 'quick',
      userBusinessUrl: undefined,
    });
  });

  it('chama tasks.trigger com analyze-market e payload correto', async () => {
    const request = createRequest(VALID_BODY);
    await POST(request);

    expect(mockTasksTrigger).toHaveBeenCalledWith('analyze-market', {
      analysisId: 'test-uuid',
      niche: 'suplementos',
      segment: 'esportivos',
      region: 'Campinas',
      mode: 'quick',
      userBusinessUrl: null,
    });
  });

  it('chama updateAnalysis com nicheInterpreted, status e triggerRunId', async () => {
    const request = createRequest(VALID_BODY);
    await POST(request);

    expect(mockUpdateAnalysis).toHaveBeenCalledWith('test-uuid', {
      nicheInterpreted: {
        niche: 'suplementos',
        segment: 'esportivos',
        region: 'Campinas',
      },
      status: 'processing',
      triggerRunId: 'run-123',
    });
  });

  it('retorna 400 para request sem nicheInterpreted', async () => {
    const request = createRequest({
      nicheInput: 'loja de suplementos',
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Dados invalidos');
  });

  it('retorna 400 para request sem nicheInput', async () => {
    const request = createRequest({
      nicheInterpreted: { niche: 'test', segment: 'test', region: 'test' },
    });
    const response = await POST(request);

    expect(response.status).toBe(400);
  });

  it('retorna 500 quando createAnalysis falha', async () => {
    mockCreateAnalysis.mockRejectedValue(new Error('Erro no banco'));

    const request = createRequest(VALID_BODY);
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain('Erro ao iniciar analise');
  });

  it('retorna 500 quando tasks.trigger falha', async () => {
    mockTasksTrigger.mockRejectedValue(new Error('Trigger.dev error'));

    const request = createRequest(VALID_BODY);
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain('Erro ao iniciar analise');
  });

  it('suporta modo complete com userBusinessUrl', async () => {
    const request = createRequest({
      ...VALID_BODY,
      mode: 'complete',
      userBusinessUrl: 'https://meunegocio.com.br',
    });
    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mockCreateAnalysis).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'complete',
        userBusinessUrl: 'https://meunegocio.com.br',
      })
    );
  });

  it('retorna cached:true e analysisId existente quando cache hit', async () => {
    const cachedAnalysis = {
      ...MOCK_ANALYSIS,
      id: 'cached-uuid',
      status: 'completed' as const,
      triggerRunId: 'run-old',
      nicheInterpreted: VALID_BODY.nicheInterpreted,
    };
    mockFindCachedAnalysis.mockResolvedValue(cachedAnalysis);

    const request = createRequest(VALID_BODY);
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.analysisId).toBe('cached-uuid');
    expect(data.cached).toBe(true);
    expect(data.redirectUrl).toBe('/analysis/cached-uuid');
    expect(data.runId).toBe('run-old');
  });

  it('nao chama createAnalysis nem tasks.trigger quando cache hit', async () => {
    mockFindCachedAnalysis.mockResolvedValue({
      ...MOCK_ANALYSIS,
      id: 'cached-uuid',
      status: 'completed' as const,
      triggerRunId: 'run-old',
    });

    const request = createRequest(VALID_BODY);
    await POST(request);

    expect(mockCreateAnalysis).not.toHaveBeenCalled();
    expect(mockTasksTrigger).not.toHaveBeenCalled();
    expect(mockUpdateAnalysis).not.toHaveBeenCalled();
  });

  it('segue fluxo normal quando findCachedAnalysis retorna null', async () => {
    mockFindCachedAnalysis.mockResolvedValue(null);

    const request = createRequest(VALID_BODY);
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.cached).toBeUndefined();
    expect(mockCreateAnalysis).toHaveBeenCalled();
    expect(mockTasksTrigger).toHaveBeenCalled();
  });
});
