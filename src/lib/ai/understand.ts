import { GoogleGenAI } from '@google/genai';

import type { NicheInterpreted } from '@/types/analysis';
import { UNDERSTAND_NICHE_PROMPT } from './prompts';

/**
 * Interpreta o input do usuario e extrai nicho, segmento e regiao usando Gemini.
 * @param userInput - Texto livre do usuario descrevendo seu nicho/segmento
 * @returns Nicho interpretado com niche, segment e region
 */
export const understandNiche = async (userInput: string): Promise<NicheInterpreted> => {
  const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

  try {
    const response = await genai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: `${UNDERSTAND_NICHE_PROMPT}\n\nInput do usuario: "${userInput}"`,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const text = response.text ?? '';
    const parsed = JSON.parse(text) as NicheInterpreted;

    if (!parsed.niche || !parsed.segment || !parsed.region) {
      throw new Error('Resposta da IA incompleta');
    }

    return parsed;
  } catch (error) {
    throw new Error(`Erro ao interpretar nicho: ${(error as Error).message}`);
  }
};
