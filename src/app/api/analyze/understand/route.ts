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
  try {
    const body = await request.json();
    const { nicheInput } = understandRequestSchema.parse(body);

    const classification = classifyInput(nicheInput);

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
        const interpreted = await understandNiche(nicheInput);
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

    return NextResponse.json(
      {
        classification: 'NONSENSE',
        error: 'Erro ao interpretar nicho. Tente novamente.',
      },
      { status: 500 }
    );
  }
};
