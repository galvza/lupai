import { NextResponse } from 'next/server';
import { getAnalysis } from '@/lib/supabase/queries';
import { generateAnalysisPdf } from '@/lib/pdf/generate';

/**
 * GET /api/report/[id]
 * Gera e retorna relatorio PDF de uma analise concluida.
 * Retorna 404 se analise nao encontrada, 400 se nao concluida.
 *
 * @param request - Request HTTP
 * @param params - Parametros da rota (id da analise, async no Next.js 15)
 * @returns Response com PDF binario ou erro JSON
 */
export const GET = async (
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> => {
  try {
    const { id } = await params;
    const analysis = await getAnalysis(id);

    if (!analysis) {
      return NextResponse.json(
        { error: 'Analise nao encontrada.' },
        { status: 404 }
      );
    }

    if (analysis.status !== 'completed') {
      return NextResponse.json(
        { error: 'Somente analises concluidas podem ser exportadas como PDF.' },
        { status: 400 }
      );
    }

    const pdfBuffer = await generateAnalysisPdf(id);

    const nicheSlug = (analysis.nicheInterpreted?.niche ?? 'analise')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    const dateStr = new Date().toISOString().split('T')[0];

    return new Response(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="lupai-${nicheSlug}-${dateStr}.pdf"`,
        'Content-Length': String(pdfBuffer.byteLength),
      },
    });
  } catch {
    return NextResponse.json(
      { error: 'Erro ao gerar relatorio PDF.' },
      { status: 500 }
    );
  }
};
