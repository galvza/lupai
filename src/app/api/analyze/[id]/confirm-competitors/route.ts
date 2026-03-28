import { NextResponse } from 'next/server';
import { z } from 'zod';
import { wait } from '@trigger.dev/sdk/v3';

import { getAnalysis } from '@/lib/supabase/queries';

/** Schema de validacao do request POST /api/analyze/[id]/confirm-competitors */
const confirmCompetitorsSchema = z.object({
  tokenId: z.string().min(1, 'Token ID obrigatorio'),
  competitors: z.array(z.object({
    name: z.string(),
    url: z.string(),
    score: z.number(),
    segmentMatch: z.number(),
    productMatch: z.number(),
    sizeMatch: z.number(),
    regionMatch: z.number(),
    digitalPresence: z.number(),
    reasoning: z.string(),
    socialProfiles: z.object({
      instagram: z.string().nullable(),
      tiktok: z.string().nullable(),
      facebook: z.string().nullable(),
    }),
  })).min(1, 'Selecione pelo menos 1 concorrente'),
});

/**
 * POST /api/analyze/[id]/confirm-competitors
 * Confirma concorrentes selecionados e retoma o orchestrator via wait.completeToken.
 */
export const POST = async (
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> => {
  try {
    const { id } = await params;
    const body = await request.json();
    const validated = confirmCompetitorsSchema.parse(body);

    // Verificar se analise existe
    const analysis = await getAnalysis(id);
    if (!analysis) {
      return NextResponse.json(
        { error: 'Analise nao encontrada.' },
        { status: 404 }
      );
    }

    // Verificar se analise esta aguardando confirmacao
    if (analysis.status !== 'waiting_confirmation') {
      return NextResponse.json(
        { error: 'Analise nao esta aguardando confirmacao.' },
        { status: 400 }
      );
    }

    // Retomar orchestrator via waitpoint
    await wait.completeToken(validated.tokenId, { competitors: validated.competitors });

    return NextResponse.json({ status: 'confirmed', analysisId: id });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados invalidos. Verifique os campos e tente novamente.' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Erro ao confirmar concorrentes. Tente novamente.' },
      { status: 500 }
    );
  }
};
