import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase client
const mockMaybeSingle = vi.fn();
const mockLimit = vi.fn(() => ({ maybeSingle: mockMaybeSingle }));
const mockOrder = vi.fn(() => ({ limit: mockLimit }));
const mockGt = vi.fn(() => ({ order: mockOrder }));
const mockEqMode = vi.fn(() => ({ gt: mockGt }));
const mockEqStatus = vi.fn(() => ({ eq: mockEqMode }));
const mockIlikeRegion = vi.fn(() => ({ eq: mockEqStatus }));
const mockIlikeSegment = vi.fn(() => ({ ilike: mockIlikeRegion }));
const mockIlikeNiche = vi.fn(() => ({ ilike: mockIlikeSegment }));
const mockSelect = vi.fn(() => ({ ilike: mockIlikeNiche }));
const mockFrom = vi.fn(() => ({ select: mockSelect }));

vi.mock('@/lib/supabase/client', () => ({
  createServerClient: vi.fn(() => ({
    from: mockFrom,
  })),
}));

import { findCachedAnalysis } from '@/lib/supabase/queries';

const VALID_PARAMS = {
  niche: 'odontologia',
  segment: 'clinicas',
  region: 'SP',
  mode: 'quick' as const,
};

const MOCK_ROW = {
  id: 'cached-uuid',
  niche_input: 'clinicas odontologicas em SP',
  niche_interpreted: { niche: 'odontologia', segment: 'clinicas', region: 'SP' },
  mode: 'quick',
  status: 'completed',
  user_business_url: null,
  trigger_run_id: 'run-old',
  viral_patterns: null,
  created_at: '2026-03-28T10:00:00Z',
  updated_at: '2026-03-28T10:05:00Z',
};

describe('findCachedAnalysis', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMaybeSingle.mockResolvedValue({ data: MOCK_ROW, error: null });
  });

  it('retorna Analysis quando analise completada existe dentro de 24h', async () => {
    const result = await findCachedAnalysis(VALID_PARAMS);

    expect(result).not.toBeNull();
    expect(result!.id).toBe('cached-uuid');
    expect(result!.status).toBe('completed');
    expect(result!.nicheInterpreted).toEqual({ niche: 'odontologia', segment: 'clinicas', region: 'SP' });
  });

  it('retorna null quando nenhuma analise encontrada', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });

    const result = await findCachedAnalysis(VALID_PARAMS);

    expect(result).toBeNull();
  });

  it('usa ilike para matching case-insensitive nos campos JSONB', async () => {
    await findCachedAnalysis({ ...VALID_PARAMS, niche: 'ODONTOLOGIA', segment: 'CLINICAS', region: 'sp' });

    expect(mockIlikeNiche).toHaveBeenCalledWith('niche_interpreted->>niche', 'odontologia');
    expect(mockIlikeSegment).toHaveBeenCalledWith('niche_interpreted->>segment', 'clinicas');
    expect(mockIlikeRegion).toHaveBeenCalledWith('niche_interpreted->>region', 'sp');
  });

  it('filtra por status completed e mode correto', async () => {
    await findCachedAnalysis(VALID_PARAMS);

    expect(mockEqStatus).toHaveBeenCalledWith('status', 'completed');
    expect(mockEqMode).toHaveBeenCalledWith('mode', 'quick');
  });

  it('filtra por created_at maior que 24h atras', async () => {
    await findCachedAnalysis(VALID_PARAMS);

    expect(mockGt).toHaveBeenCalledWith('created_at', expect.any(String));
    // Verify the timestamp is approximately 24h ago
    const passedTimestamp = mockGt.mock.calls[0][1] as string;
    const diff = Date.now() - new Date(passedTimestamp).getTime();
    const twentyFourHoursMs = 24 * 60 * 60 * 1000;
    expect(diff).toBeGreaterThanOrEqual(twentyFourHoursMs - 1000);
    expect(diff).toBeLessThanOrEqual(twentyFourHoursMs + 5000);
  });

  it('usa maybeSingle e limit(1) para retornar no maximo 1 resultado', async () => {
    await findCachedAnalysis(VALID_PARAMS);

    expect(mockLimit).toHaveBeenCalledWith(1);
    expect(mockMaybeSingle).toHaveBeenCalled();
  });

  it('retorna null quando supabase retorna erro', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: { message: 'DB error' } });

    const result = await findCachedAnalysis(VALID_PARAMS);

    expect(result).toBeNull();
  });
});
