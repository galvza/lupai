import { GoogleGenAI } from '@google/genai';
import { zodToJsonSchema } from 'zod-to-json-schema';

import type { Competitor } from '@/types/competitor';
import type { ViralContent } from '@/types/viral';
import type { ViralPatterns } from '@/types/viral';
import type { CreativeScript } from '@/types/database';
import { creativeOutputSchema } from '@/lib/validation/synthesisSchemas';
import { validateOrNull } from '@/lib/validation/extractionSchemas';
import { CREATIVE_PROMPT } from './prompts';

/**
 * Monta contexto viral para geracao de roteiros.
 * Se viralPatterns nulo, usa fallback de dados dos concorrentes (per D-14).
 * @param input - Dados de viral e concorrentes
 * @returns Contexto formatado para o prompt
 */
const assembleCreativeContext = (input: {
  niche: string;
  segment: string;
  viralContent: ViralContent[];
  viralPatterns: ViralPatterns | null;
  competitors: Competitor[];
}): string => {
  const parts: string[] = [`Nicho: ${input.niche}\nSegmento: ${input.segment}`];

  if (input.viralPatterns) {
    parts.push(
      `Padroes virais detectados:\n${JSON.stringify({
        hookPatterns: input.viralPatterns.hookPatterns,
        ctaPatterns: input.viralPatterns.ctaPatterns,
        recurringFormulas: input.viralPatterns.recurringFormulas,
        dominantTone: input.viralPatterns.dominantTone,
        bestPerformingDuration: input.viralPatterns.bestPerformingDuration,
      })}`
    );
  } else {
    const competitorSummary = input.competitors.map((c) => ({
      name: c.name,
      instagram: c.socialData?.instagram
        ? {
            followers: c.socialData.instagram.followers,
            engagementRate: c.socialData.instagram.engagementRate,
          }
        : null,
      tiktok: c.socialData?.tiktok
        ? {
            followers: c.socialData.tiktok.followers,
            engagementRate: c.socialData.tiktok.engagementRate,
          }
        : null,
    }));

    parts.push(
      'Sem padroes virais disponiveis. Gere roteiros baseados na analise dos concorrentes e melhores praticas do nicho.'
    );
    parts.push(`Dados dos concorrentes:\n${JSON.stringify(competitorSummary)}`);
  }

  const topViral = input.viralContent
    .filter((v) => v.hookBodyCta)
    .slice(0, 3)
    .map((v) => ({
      platform: v.platform,
      hookBodyCta: v.hookBodyCta,
      engagement: v.engagementMetrics,
    }));

  if (topViral.length > 0) {
    parts.push(`Exemplos de conteudo viral:\n${JSON.stringify(topViral)}`);
  }

  return parts.join('\n\n');
};

/**
 * Gera roteiros criativos baseados em conteudo viral do nicho usando Gemini.
 * Usa Zod + zodToJsonSchema + validateOrNull para output estruturado (per D-05).
 * Fallback: se viralPatterns nulo, gera a partir de dados dos concorrentes (per D-14).
 * @param input - Dados do nicho, conteudo viral e concorrentes
 * @returns Array de roteiros criativos ou null se falha
 */
export const generateCreativeScripts = async (input: {
  niche: string;
  segment: string;
  viralContent: ViralContent[];
  viralPatterns: ViralPatterns | null;
  competitors: Competitor[];
}): Promise<CreativeScript[] | null> => {
  const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

  try {
    const context = assembleCreativeContext(input);
    const fullPrompt = `${CREATIVE_PROMPT}\n\n${context}`;

    const response = await genai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: fullPrompt,
      config: {
        responseMimeType: 'application/json',
        responseJsonSchema: zodToJsonSchema(creativeOutputSchema),
        maxOutputTokens: 8192,
      },
    });

    const text = response.text ?? '';
    const parsed = JSON.parse(text);
    const validated = validateOrNull(creativeOutputSchema, parsed);

    if (!validated) {
      return null;
    }

    return validated.scripts;
  } catch (error) {
    console.warn(
      `Aviso: falha na geracao de roteiros criativos: ${(error as Error).message}`
    );
    return null;
  }
};
