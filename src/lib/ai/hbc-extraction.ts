import { GoogleGenAI } from '@google/genai';
import { zodToJsonSchema } from 'zod-to-json-schema';

import type { HookBodyCta } from '@/types/viral';
import { hookBodyCtaSchema, validateOrNull } from '@/lib/validation/extractionSchemas';
import { HBC_EXTRACTION_PROMPT } from './prompts';

/**
 * Extrai estrutura Hook/Body/CTA de uma transcricao individual via Gemini.
 * Per D-25: analise individual por video.
 * Per D-26: identifica hook text + timing, body structure, CTA text.
 * Per D-29: retorna null se transcricao vazia ou nula.
 * @param transcription - Texto transcrito do video
 * @param durationSeconds - Duracao do video em segundos (para contexto)
 * @returns HookBodyCta ou null se transcricao insuficiente
 */
export const extractHookBodyCta = async (
  transcription: string,
  durationSeconds: number | null
): Promise<HookBodyCta | null> => {
  if (!transcription || transcription.trim().length === 0) {
    return null;
  }

  const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

  try {
    const durationContext = durationSeconds
      ? `\nDuracao do video: ${durationSeconds} segundos`
      : '';

    const response = await genai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: `${HBC_EXTRACTION_PROMPT}${durationContext}\n\nTranscricao:\n"${transcription}"`,
      config: {
        responseMimeType: 'application/json',
        responseJsonSchema: zodToJsonSchema(hookBodyCtaSchema),
      },
    });

    const text = response.text ?? '';
    const parsed = JSON.parse(text);

    return validateOrNull(hookBodyCtaSchema, parsed);
  } catch (error) {
    console.warn(`Aviso: falha na extracao HBC: ${(error as Error).message}`);
    return null;
  }
};
