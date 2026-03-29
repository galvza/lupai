import { GoogleGenAI } from '@google/genai';

import { DERIVE_VIRAL_HASHTAGS_PROMPT } from './prompts';

/**
 * Usa Gemini para gerar hashtags virais relevantes para o nicho.
 * Gera termos que criadores realmente usam no TikTok/Instagram,
 * em vez de termos formais de negocio.
 * @param niche - Nicho de mercado
 * @param segment - Segmento especifico
 * @param region - Regiao geografica
 * @returns Array de 5-8 hashtags (sem #)
 */
export const deriveViralHashtags = async (
  niche: string,
  segment: string,
  region: string
): Promise<string[]> => {
  const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

  try {
    const response = await genai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `${DERIVE_VIRAL_HASHTAGS_PROMPT}\n\nNicho: "${segment}" (categoria: "${niche}")\nRegiao: "${region}"`,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const text = response.text ?? '';
    const parsed = JSON.parse(text) as string[];

    if (!Array.isArray(parsed) || parsed.length === 0) {
      console.warn('[deriveViralHashtags] Gemini retornou array vazio, usando fallback');
      return [niche.toLowerCase().replace(/\s+/g, '')];
    }

    // Clean: lowercase, remove #, trim
    const cleaned = parsed
      .map((h) => h.toLowerCase().replace(/^#/, '').trim())
      .filter((h) => h.length > 0);

    console.log(`[deriveViralHashtags] Gemini gerou ${cleaned.length} hashtags: ${JSON.stringify(cleaned)}`);
    return cleaned.slice(0, 8);
  } catch (error) {
    console.warn(`[deriveViralHashtags] Gemini falhou: ${(error as Error).message}. Usando fallback.`);
    // Fallback: return niche and segment as basic hashtags
    const fallback = [
      niche.toLowerCase().replace(/\s+/g, ''),
      segment.toLowerCase().replace(/\s+/g, ''),
    ];
    return [...new Set(fallback)];
  }
};
