import { NextResponse } from 'next/server';
import { z } from 'zod';
import { listAnalysesPaginated } from '@/lib/supabase/queries';

/** Schema de validacao dos parametros de query do historico */
const historyParamsSchema = z.object({
  cursor: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  status: z.enum(['pending', 'processing', 'discovering', 'waiting_confirmation', 'extracting', 'completed', 'failed']).optional(),
});

/**
 * GET /api/history
 * Retorna lista paginada de analises passadas.
 * Suporta cursor-based pagination e filtro por status.
 * Per D-07, D-08, D-10.
 */
export const GET = async (request: Request) => {
  try {
    const { searchParams } = new URL(request.url);
    const params = historyParamsSchema.parse({
      cursor: searchParams.get('cursor') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
      status: searchParams.get('status') ?? undefined,
    });

    const result = await listAnalysesPaginated(params);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Parametros invalidos para consulta de historico.' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Erro ao buscar historico de analises.' },
      { status: 500 }
    );
  }
};
