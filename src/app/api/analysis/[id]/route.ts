import { NextResponse } from 'next/server';
import {
  getAnalysis,
  getCompetitorsByAnalysis,
  getUserBusinessByAnalysis,
  getViralContentByAnalysis,
  getSynthesisByAnalysis,
} from '@/lib/supabase/queries';
import { deriveSectionStatuses } from '@/lib/api/section-statuses';
import type { AnalysisResultsResponse } from '@/types/analysis';

/**
 * Executa uma query de forma segura, retornando o fallback em caso de erro.
 * Garante que falha em uma sub-query nao derruba toda a resposta.
 *
 * @param fn - Funcao async que executa a query
 * @param fallback - Valor padrao retornado em caso de erro
 */
const safeQuery = async <T>(fn: () => Promise<T>, fallback: T): Promise<T> => {
  try {
    return await fn();
  } catch {
    return fallback;
  }
};

/**
 * GET /api/analysis/[id]
 *
 * Retorna todos os dados de uma analise agregados em uma unica resposta.
 * Inclui concorrentes, negocio do usuario, conteudo viral, sintese,
 * padroes virais e status por secao do dashboard.
 *
 * Queries paralelas com fallback seguro: falha em uma sub-query retorna
 * valor vazio (array vazio ou null) sem derrubar a resposta inteira.
 *
 * @param request - Request HTTP
 * @param params - Parametros da rota (id da analise, async no Next.js 15)
 * @returns AnalysisResultsResponse com status 200, ou erro com status 404/500
 */
export const GET = async (
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<AnalysisResultsResponse | { error: string }>> => {
  try {
    const { id } = await params;

    // 1. Buscar analise principal (obrigatoria)
    const analysis = await getAnalysis(id);
    if (!analysis) {
      return NextResponse.json(
        { error: 'Analise nao encontrada.' },
        { status: 404 }
      );
    }

    // 2. Buscar sub-dados em paralelo com fallback seguro
    const [competitors, userBusiness, viralContent, synthesis] = await Promise.all([
      safeQuery(() => getCompetitorsByAnalysis(id), []),
      safeQuery(() => getUserBusinessByAnalysis(id), null),
      safeQuery(() => getViralContentByAnalysis(id), []),
      safeQuery(() => getSynthesisByAnalysis(id), null),
    ]);

    // 3. Derivar status por secao do dashboard
    const sectionStatuses = deriveSectionStatuses(analysis, competitors, viralContent, synthesis);

    // 4. Montar resposta agregada
    const response: AnalysisResultsResponse = {
      analysis,
      competitors,
      userBusiness,
      viralContent,
      synthesis,
      viralPatterns: analysis.viralPatterns,
      sectionStatuses,
    };

    // 5. Definir Cache-Control baseado no status
    const cacheControl = analysis.status === 'completed'
      ? 'public, max-age=3600, stale-while-revalidate=86400'
      : 'no-cache, no-store';

    return NextResponse.json(response, {
      headers: { 'Cache-Control': cacheControl },
    });
  } catch {
    return NextResponse.json(
      { error: 'Erro ao buscar resultados da analise.' },
      { status: 500 }
    );
  }
};
