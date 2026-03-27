import { GoogleGenAI } from '@google/genai';

import type { ViralContent } from '@/types/viral';
import type { CreativeScript } from '@/types/database';
import { CREATIVE_PROMPT } from './prompts';

/**
 * Gera roteiros criativos baseados em conteudo viral do nicho usando Gemini.
 * @param input - Dados do nicho e conteudo viral identificado
 * @returns Array de roteiros criativos com hook, body e CTA
 */
export const generateCreativeScripts = async (input: {
  niche: string;
  viralContent: ViralContent[];
}): Promise<CreativeScript[]> => {
  const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

  try {
    const viralContext = input.viralContent
      .filter((v) => v.hookBodyCta)
      .slice(0, 5)
      .map((v) => ({
        platform: v.platform,
        hook: v.hookBodyCta?.hook,
        body: v.hookBodyCta?.body,
        cta: v.hookBodyCta?.cta,
        engagement: v.engagementMetrics,
      }));

    const response = await genai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: `${CREATIVE_PROMPT}\n\nNicho: ${input.niche}\nPadroes virais encontrados:\n${JSON.stringify(viralContext)}`,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const text = response.text ?? '';
    return JSON.parse(text) as CreativeScript[];
  } catch (error) {
    throw new Error(`Erro ao gerar roteiros criativos: ${(error as Error).message}`);
  }
};
