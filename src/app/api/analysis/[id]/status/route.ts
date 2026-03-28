import { NextResponse } from 'next/server';
import { getAnalysis } from '@/lib/supabase/queries';

/** Resposta leve do endpoint de status (sem dados completos da analise) */
interface AnalysisStatusResponse {
  analysisId: string;
  status: string;
  mode: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * GET /api/analysis/[id]/status
 *
 * Endpoint leve de fallback para clientes que nao usam Realtime (per D-05).
 * Retorna apenas o status da analise, modo e timestamps.
 * Nao inclui dados completos (competitors, synthesis, viralContent).
 *
 * Use o endpoint GET /api/analysis/[id] para a resposta agregada completa.
 *
 * @param request - Request HTTP
 * @param params - Parametros da rota (id da analise, async no Next.js 15)
 * @returns AnalysisStatusResponse com status 200, ou erro com status 404/500
 */
export const GET = async (
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<AnalysisStatusResponse | { error: string }>> => {
  try {
    const { id } = await params;

    const analysis = await getAnalysis(id);
    if (!analysis) {
      return NextResponse.json(
        { error: 'Analise nao encontrada.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      analysisId: analysis.id,
      status: analysis.status,
      mode: analysis.mode,
      createdAt: analysis.createdAt,
      updatedAt: analysis.updatedAt,
    });
  } catch {
    return NextResponse.json(
      { error: 'Erro ao buscar status da analise.' },
      { status: 500 }
    );
  }
};
