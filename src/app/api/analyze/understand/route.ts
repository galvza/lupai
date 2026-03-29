import { NextResponse } from 'next/server';
import { z } from 'zod';

import { classifyInput } from '@/lib/ai/classify';
import { understandNiche } from '@/lib/ai/understand';
import { understandRequestSchema } from '@/utils/validators';
import type { UnderstandResponse } from '@/types/analysis';

/**
 * POST /api/analyze/understand
 * Classifica o input do usuario e retorna interpretacao do nicho.
 * NONSENSE e MINIMAL nao chamam Gemini — economizam tokens.
 */
export const POST = async (request: Request): Promise<NextResponse<UnderstandResponse>> => {
  console.log('[DEBUG understand] GEMINI_API_KEY exists:', !!process.env.GEMINI_API_KEY);
  console.log('[DEBUG understand] GEMINI_API_KEY length:', process.env.GEMINI_API_KEY?.length);

  try {
    const body = await request.json();
    console.log('[DEBUG understand] Request body:', JSON.stringify(body));

    const { nicheInput } = understandRequestSchema.parse(body);
    console.log('[DEBUG understand] Parsed nicheInput:', nicheInput);

    const classification = classifyInput(nicheInput);
    console.log('[DEBUG understand] Classification:', classification);

    switch (classification) {
      case 'NONSENSE':
        return NextResponse.json(
          {
            classification: 'NONSENSE',
            error: 'Nao consegui entender. Descreva o nicho do seu negocio com mais detalhes.',
          },
          { status: 400 }
        );

      case 'MINIMAL':
        return NextResponse.json({
          classification: 'MINIMAL',
          followUpQuestions: [
            'Que tipo de negocio voce tem?',
            'Qual a regiao ou cidade?',
            'Qual o publico-alvo?',
          ],
        });

      case 'URL':
        return NextResponse.json({
          classification: 'URL',
          interpreted: {
            niche: 'negocio online',
            segment: 'a definir apos analise do site',
            region: 'Brasil',
          },
          urlDetected: nicheInput.trim(),
        });

      case 'MEDIUM':
      case 'EXCESSIVE': {
        console.log('[DEBUG understand] Calling understandNiche for:', classification);
        const interpreted = await understandNiche(nicheInput);
        console.log('[DEBUG understand] Gemini response:', JSON.stringify(interpreted));
        return NextResponse.json({
          classification,
          interpreted,
        });
      }
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          classification: 'NONSENSE',
          error: 'Input invalido. Descreva seu nicho em texto.',
        },
        { status: 400 }
      );
    }

    console.error('[DEBUG understand] Unhandled error:', error);
    console.error('[DEBUG understand] Error name:', (error as Error).name);
    console.error('[DEBUG understand] Error message:', (error as Error).message);
    console.error('[DEBUG understand] Error stack:', (error as Error).stack);
    return NextResponse.json(
      {
        classification: 'NONSENSE',
        error: 'Erro ao interpretar nicho. Tente novamente.',
      },
      { status: 500 }
    );
  }
};
