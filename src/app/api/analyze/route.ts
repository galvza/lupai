import { NextResponse } from 'next/server';
import { z } from 'zod';
import { tasks } from '@trigger.dev/sdk/v3';

import { createAnalysis, updateAnalysis, findCachedAnalysis } from '@/lib/supabase/queries';
import { nicheInterpretedSchema } from '@/utils/validators';
import type { analyzeMarket } from '@/trigger/analyze-market';
import type { StartAnalysisResponse } from '@/types/analysis';

/** Schema de validacao do request POST /api/analyze */
const startAnalysisSchema = z.object({
  nicheInput: z.string().min(3).max(500),
  nicheInterpreted: nicheInterpretedSchema,
  mode: z.enum(['quick', 'complete']).default('quick'),
  userBusinessUrl: z.string().url().nullable().optional(),
});

/**
 * POST /api/analyze
 * Cria registro no banco, dispara job no Trigger.dev e retorna analysisId + redirectUrl.
 * Deve completar em menos de 10s (limite Vercel hobby).
 */
export const POST = async (request: Request): Promise<NextResponse<StartAnalysisResponse | { error: string }>> => {
  try {
    const body = await request.json();
    const validated = startAnalysisSchema.parse(body);

    // Cache check: busca analise completada nas ultimas 24h com mesmo niche_interpreted + mode (per D-04)
    const cached = await findCachedAnalysis({
      niche: validated.nicheInterpreted.niche,
      segment: validated.nicheInterpreted.segment,
      region: validated.nicheInterpreted.region,
      mode: validated.mode,
    });

    if (cached) {
      return NextResponse.json({
        analysisId: cached.id,
        runId: cached.triggerRunId ?? '',
        publicAccessToken: '',
        redirectUrl: `/analysis/${cached.id}`,
        cached: true,
      });
    }

    // 1. Criar registro no banco
    const analysis = await createAnalysis({
      nicheInput: validated.nicheInput,
      mode: validated.mode,
      userBusinessUrl: validated.userBusinessUrl,
    });

    // 2. Disparar job no Trigger.dev
    const handle = await tasks.trigger<typeof analyzeMarket>('analyze-market', {
      analysisId: analysis.id,
      niche: validated.nicheInterpreted.niche,
      segment: validated.nicheInterpreted.segment,
      region: validated.nicheInterpreted.region,
      mode: validated.mode,
      userBusinessUrl: validated.userBusinessUrl ?? null,
    });

    // 3. Atualizar registro com dados interpretados e ID do job
    await updateAnalysis(analysis.id, {
      nicheInterpreted: validated.nicheInterpreted,
      status: 'processing',
      triggerRunId: handle.id,
    });

    // 4. Retornar resposta
    return NextResponse.json({
      analysisId: analysis.id,
      runId: handle.id,
      publicAccessToken: handle.publicAccessToken,
      redirectUrl: `/analysis/${analysis.id}`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados invalidos. Verifique os campos e tente novamente.' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Erro ao iniciar analise. Tente novamente.' },
      { status: 500 }
    );
  }
};
