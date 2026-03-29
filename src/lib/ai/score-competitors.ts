import { GoogleGenAI } from '@google/genai';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { z } from 'zod';

import type { RawCompetitorCandidate } from '@/utils/competitors';
import { SCORE_COMPETITORS_PROMPT } from './prompts';

/** Schema Zod para validacao da resposta de scoring de concorrentes */
export const scoredCompetitorSchema = z.object({
  competitors: z.array(z.object({
    name: z.string(),
    url: z.string(),
    score: z.number().min(0).max(100),
    segmentMatch: z.number().min(0).max(25),
    productMatch: z.number().min(0).max(25),
    sizeMatch: z.number().min(0).max(20),
    regionMatch: z.number().min(0).max(15),
    digitalPresence: z.number().min(0).max(15),
    reasoning: z.string(),
    socialProfiles: z.object({
      instagram: z.string().nullable(),
      tiktok: z.string().nullable(),
      facebook: z.string().nullable(),
    }),
  })),
});

/** Concorrente pontuado pela IA com sub-scores e justificativa */
export type ScoredCompetitor = z.infer<typeof scoredCompetitorSchema>['competitors'][number];

/**
 * Envia candidatos a concorrentes para o Gemini pontuar e filtrar.
 * @param candidates - Lista de candidatos brutos de diversas fontes
 * @param niche - Nicho de mercado identificado
 * @param segment - Segmento especifico dentro do nicho
 * @param region - Regiao geografica
 * @returns Lista de concorrentes pontuados com score >= 70, ordenados por score desc, max 4
 */
export const scoreCompetitorsWithAI = async (
  candidates: RawCompetitorCandidate[],
  niche: string,
  segment: string,
  region: string
): Promise<ScoredCompetitor[]> => {
  const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

  try {
    const candidateList = buildCandidateList(candidates);
    const contents = buildPromptContents(niche, segment, region, candidateList);

    const response = await genai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents,
      config: {
        responseMimeType: 'application/json',
        responseJsonSchema: zodToJsonSchema(scoredCompetitorSchema),
      },
    });

    const text = response.text ?? '';
    const parsed = scoredCompetitorSchema.parse(JSON.parse(text));

    return filterAndSortCompetitors(parsed.competitors);
  } catch (error) {
    throw new Error(
      `Erro ao pontuar concorrentes com IA: ${(error as Error).message}`
    );
  }
};

/**
 * Monta a lista formatada de candidatos para o prompt.
 * @param candidates - Candidatos brutos
 * @returns String formatada com cada candidato numerado
 */
const buildCandidateList = (candidates: RawCompetitorCandidate[]): string => {
  return candidates
    .map((c, i) => `${i + 1}. "${c.name}" - URL: ${c.url} - ${c.description} (fonte: ${c.source})`)
    .join('\n');
};

/**
 * Monta o conteudo completo do prompt com contexto do nicho.
 * @param niche - Nicho de mercado
 * @param segment - Segmento especifico
 * @param region - Regiao geografica
 * @param candidateList - Lista formatada de candidatos
 * @returns Conteudo completo para o Gemini
 */
const buildPromptContents = (
  niche: string,
  segment: string,
  region: string,
  candidateList: string
): string => {
  return `${SCORE_COMPETITORS_PROMPT}

Nicho: ${niche}
Segmento: ${segment}
Regiao: ${region}

Candidatos:
${candidateList}`;
};

/**
 * Filtra concorrentes com score >= 70, ordena desc e limita a 4.
 * @param competitors - Concorrentes pontuados pela IA
 * @returns Concorrentes filtrados, ordenados e limitados
 */
const filterAndSortCompetitors = (competitors: ScoredCompetitor[]): ScoredCompetitor[] => {
  return competitors
    .filter((c) => c.score >= 70)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);
};
