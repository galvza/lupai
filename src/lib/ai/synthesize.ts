import { GoogleGenAI } from '@google/genai';

import type { Competitor } from '@/types/competitor';
import type { ViralContent } from '@/types/viral';
import type { Recommendation } from '@/types/database';
import { SYNTHESIZE_PROMPT } from './prompts';

/**
 * Gera sintese estrategica a partir dos dados coletados usando Gemini.
 * @param input - Dados do nicho, concorrentes e conteudo viral
 * @returns Overview estrategico e recomendacoes acionaveis
 */
export const synthesizeAnalysis = async (input: {
  niche: string;
  competitors: Competitor[];
  viralContent: ViralContent[];
}): Promise<{ strategicOverview: string; recommendations: Recommendation[] }> => {
  const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

  try {
    const dataContext = JSON.stringify({
      niche: input.niche,
      competitors: input.competitors.map((c) => ({
        name: c.name,
        website: c.websiteUrl,
        seo: c.seoData,
        social: c.socialData,
        ads: c.metaAdsData,
      })),
      viralContentCount: input.viralContent.length,
      viralPlatforms: [...new Set(input.viralContent.map((v) => v.platform))],
    });

    const response = await genai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: `${SYNTHESIZE_PROMPT}\n\nDados coletados:\n${dataContext}`,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const text = response.text ?? '';
    return JSON.parse(text) as { strategicOverview: string; recommendations: Recommendation[] };
  } catch (error) {
    throw new Error(`Erro ao gerar sintese: ${(error as Error).message}`);
  }
};
