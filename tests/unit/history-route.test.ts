import { describe, it, expect, vi, beforeEach } from 'vitest';

// Chainable Supabase query mock: every method returns `chain`,
// and awaiting `chain` resolves to `queryResult`
let queryResult: { data: unknown; error: unknown };
const mockLt = vi.fn();
const mockEq = vi.fn();
const mockLimit = vi.fn();
const mockOrder = vi.fn();
const mockSelect = vi.fn();
const mockFrom = vi.fn();

/** Creates the chainable query builder object */
const createChain = () => {
  const chain: Record<string, unknown> = {};
  chain.select = (...args: unknown[]) => { mockSelect(...args); return chain; };
  chain.order = (...args: unknown[]) => { mockOrder(...args); return chain; };
  chain.limit = (...args: unknown[]) => { mockLimit(...args); return chain; };
  chain.lt = (...args: unknown[]) => { mockLt(...args); return chain; };
  chain.eq = (...args: unknown[]) => { mockEq(...args); return chain; };
  // PromiseLike: when awaited, resolve with queryResult
  chain.then = (resolve: (v: unknown) => unknown) => Promise.resolve(queryResult).then(resolve);
  return chain;
};

vi.mock('@/lib/supabase/client', () => ({
  createServerClient: vi.fn(() => ({
    from: (...args: unknown[]) => { mockFrom(...args); return createChain(); },
  })),
}));

import { listAnalysesPaginated } from '@/lib/supabase/queries';

const createMockRows = (count: number) =>
  Array.from({ length: count }, (_, i) => ({
    id: `analysis-${i}`,
    niche_input: `nicho ${i}`,
    niche_interpreted: { niche: `niche-${i}`, segment: `seg-${i}`, region: `region-${i}` },
    mode: 'quick',
    status: 'completed',
    created_at: `2026-03-${String(28 - i).padStart(2, '0')}T12:00:00Z`,
  }));

describe('listAnalysesPaginated', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryResult = { data: createMockRows(20), error: null };
  });

  it('retorna ate 20 analises com shape AnalysisSummary correto', async () => {
    const result = await listAnalysesPaginated({});

    expect(result.analyses).toHaveLength(20);
    expect(result.analyses[0]).toEqual({
      id: 'analysis-0',
      nicheInput: 'nicho 0',
      nicheInterpreted: { niche: 'niche-0', segment: 'seg-0', region: 'region-0' },
      mode: 'quick',
      status: 'completed',
      createdAt: '2026-03-28T12:00:00Z',
    });
  });

  it('clamps limit para maximo 50', async () => {
    await listAnalysesPaginated({ limit: 100 });

    // limit + 1 = 51 (clamped 50 + 1)
    expect(mockLimit).toHaveBeenCalledWith(51);
  });

  it('usa cursor para filtrar por created_at anterior', async () => {
    const cursor = '2026-03-27T12:00:00Z';
    await listAnalysesPaginated({ cursor });

    expect(mockLt).toHaveBeenCalledWith('created_at', cursor);
  });

  it('filtra por status quando fornecido', async () => {
    await listAnalysesPaginated({ status: 'completed' });

    expect(mockEq).toHaveBeenCalledWith('status', 'completed');
  });

  it('retorna nextCursor null quando menos resultados que limit+1', async () => {
    queryResult = { data: createMockRows(10), error: null };

    const result = await listAnalysesPaginated({});

    expect(result.nextCursor).toBeNull();
  });

  it('retorna nextCursor com createdAt do ultimo item quando mais resultados existem', async () => {
    // Return 21 rows (limit 20 + 1 = 21)
    queryResult = { data: createMockRows(21), error: null };

    const result = await listAnalysesPaginated({});

    expect(result.analyses).toHaveLength(20);
    expect(result.nextCursor).toBe(result.analyses[19].createdAt);
  });

  it('lanca erro quando supabase retorna erro', async () => {
    queryResult = { data: null, error: { message: 'Connection failed' } };

    await expect(listAnalysesPaginated({})).rejects.toThrow('Erro ao listar analises: Connection failed');
  });

  it('usa limit padrao de 20 quando nao fornecido', async () => {
    await listAnalysesPaginated({});

    // limit + 1 = 21
    expect(mockLimit).toHaveBeenCalledWith(21);
  });

  it('mapeia snake_case para camelCase corretamente (mapAnalysisSummaryRow)', async () => {
    queryResult = {
      data: [{
        id: 'test-id',
        niche_input: 'test input',
        niche_interpreted: null,
        mode: 'complete',
        status: 'pending',
        created_at: '2026-03-28T00:00:00Z',
      }],
      error: null,
    };

    const result = await listAnalysesPaginated({});

    expect(result.analyses[0]).toEqual({
      id: 'test-id',
      nicheInput: 'test input',
      nicheInterpreted: null,
      mode: 'complete',
      status: 'pending',
      createdAt: '2026-03-28T00:00:00Z',
    });
  });
});
