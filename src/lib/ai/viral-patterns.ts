import { GoogleGenAI } from '@google/genai';
import { zodToJsonSchema } from 'zod-to-json-schema';

import type { ViralPatterns } from '@/types/viral';
import { viralPatternsSchema, validateOrNull } from '@/lib/validation/extractionSchemas';
import { VIRAL_PATTERNS_PROMPT } from './prompts';

/** Input para deteccao de padroes cross-video */
export interface PatternDetectionInput {
  transcription: string;
  platform: string;
  caption: string;
  durationSeconds: number | null;
  engagementRate: number;
}

/**
 * Detecta padroes cross-video a partir de multiplas transcricoes via Gemini.
 * Per D-30: envia TODAS transcricoes em um unico batch call.
 * Per D-31: detecta hook patterns, body structures, CTA patterns, dominant tone, best duration, recurring formulas.
 * Per D-48: precisa de ao menos 2 transcricoes para comparar.
 * @param inputs - Array de transcricoes com metadados
 * @returns ViralPatterns ou null se transcricoes insuficientes
 */
export const detectViralPatterns = async (
  inputs: PatternDetectionInput[]
): Promise<ViralPatterns | null> => {
  // Per D-48: need at least 2 transcriptions to detect patterns
  if (inputs.length < 2) {
    return null;
  }

  const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

  try {
    const transcriptionsContext = inputs
      .map(
        (input, i) =>
          `--- Video ${i + 1} (${input.platform}, ${input.durationSeconds ?? '?'}s, engajamento: ${(input.engagementRate * 100).toFixed(1)}%) ---\nCaption: ${input.caption}\nTranscricao: "${input.transcription}"`
      )
      .join('\n\n');

    const response = await genai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `${VIRAL_PATTERNS_PROMPT}\n\nTotal de videos: ${inputs.length}\n\n${transcriptionsContext}`,
      config: {
        responseMimeType: 'application/json',
        responseJsonSchema: zodToJsonSchema(viralPatternsSchema),
      },
    });

    const text = response.text ?? '';
    const parsed = JSON.parse(text);

    return validateOrNull(viralPatternsSchema, parsed);
  } catch (error) {
    console.warn(`Aviso: falha na deteccao de padroes virais: ${(error as Error).message}`);
    return null;
  }
};
