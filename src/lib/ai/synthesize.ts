import { GoogleGenAI } from '@google/genai';
import { zodToJsonSchema } from 'zod-to-json-schema';

import type { Competitor } from '@/types/competitor';
import type { ViralContent } from '@/types/viral';
import type { ViralPatterns } from '@/types/viral';
import type { SynthesisOutput, ComparativeAnalysis } from '@/types/database';
import { synthesisOutputSchema } from '@/lib/validation/synthesisSchemas';
import { validateOrNull } from '@/lib/validation/extractionSchemas';
import { SYNTHESIZE_PROMPT, COMPARATIVE_SYNTHESIS_SECTION } from './prompts';

/**
 * Pre-sumariza dados dos concorrentes para contexto do Gemini (per D-28, D-29, D-30).
 * Extrai apenas campos relevantes de cada concorrente, ignorando nulls.
 * @param competitors - Array de concorrentes com dados extraidos
 * @returns Array de objetos resumidos para inclusao no prompt
 */
const assembleCompetitorContext = (competitors: Competitor[]) => {
  return competitors.map((c) => ({
    name: c.name,
    websiteUrl: c.websiteUrl,
    ...(c.websiteData ? { positioning: c.websiteData.positioning } : {}),
    ...(c.seoData
      ? {
          topKeywords: c.seoData.topKeywords.slice(0, 5),
          estimatedTraffic: c.seoData.estimatedTraffic,
        }
      : {}),
    ...(c.socialData?.instagram
      ? {
          instagram: {
            followers: c.socialData.instagram.followers,
            engagementRate: c.socialData.instagram.engagementRate,
            postingFrequency: c.socialData.instagram.postingFrequency,
          },
        }
      : {}),
    ...(c.socialData?.tiktok
      ? {
          tiktok: {
            followers: c.socialData.tiktok.followers,
            engagementRate: c.socialData.tiktok.engagementRate,
            postingFrequency: c.socialData.tiktok.postingFrequency,
          },
        }
      : {}),
    ...(c.metaAdsData
      ? { activeAdsCount: c.metaAdsData.activeAdsCount }
      : {}),
    ...(c.googleAdsData
      ? {
          hasGoogleAds: c.googleAdsData.hasSearchAds,
          paidKeywords: c.googleAdsData.paidKeywords.slice(0, 5),
        }
      : {}),
    ...(c.gmbData
      ? { gmb: { rating: c.gmbData.rating, reviewCount: c.gmbData.reviewCount } }
      : {}),
  }));
};

/**
 * Sumariza dados de conteudo viral para contexto do Gemini.
 * Inclui padroes cross-video e top 5 items com HBC (sem transcricoes completas per D-29).
 * @param viralContent - Array de conteudos virais
 * @param viralPatterns - Padroes cross-video detectados
 * @returns Objeto com padroes e resumo dos top videos
 */
const assembleViralContext = (
  viralContent: ViralContent[],
  viralPatterns: ViralPatterns | null
) => {
  const topItems = viralContent
    .filter((v) => v.hookBodyCta)
    .slice(0, 5)
    .map((v) => ({
      platform: v.platform,
      caption: v.caption,
      hookBodyCta: v.hookBodyCta,
      engagement: v.engagementMetrics,
    }));

  return { viralPatterns, viralContent: topItems };
};

/**
 * Trunca contexto dinamicamente se exceder o orcamento de tokens do Gemini (per D-29).
 * Prioridade: competitor core data > viral patterns > individual video details.
 * @param fullPrompt - Prompt completo montado
 * @param competitorContext - Contexto resumido dos concorrentes
 * @param viralContext - Contexto viral com padroes e items
 * @param threshold - Limite de tokens (padrao 200k)
 * @returns Contextos possivelmente reduzidos
 */
export const truncateContextIfNeeded = async (
  fullPrompt: string,
  competitorContext: unknown,
  viralContext: { viralPatterns: ViralPatterns | null; viralContent: unknown[] },
  threshold: number = 200_000
): Promise<{ competitorContext: unknown; viralContext: unknown }> => {
  const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

  const tokenCount = await genai.models.countTokens({
    model: 'gemini-2.0-flash',
    contents: fullPrompt,
  });

  const totalTokens = tokenCount.totalTokens ?? 0;

  if (totalTokens <= threshold) {
    return { competitorContext, viralContext };
  }

  console.warn(
    `Aviso: contexto truncado de ${totalTokens} tokens para caber no orcamento do Gemini`
  );

  return {
    competitorContext,
    viralContext: {
      viralPatterns: viralContext.viralPatterns,
      viralContent: [],
    },
  };
};

/**
 * Gera sintese estrategica a partir dos dados coletados usando Gemini.
 * Usa Zod + zodToJsonSchema + validateOrNull para output estruturado (per D-05).
 * Quando userBusiness e fornecido, inclui secoes comparativas no prompt (per D-17, D-19).
 * @param input - Dados do nicho, concorrentes, conteudo viral e opcionalmente negocio do usuario
 * @returns SynthesisOutput estruturado ou null se falha
 */
export const synthesizeAnalysis = async (input: {
  niche: string;
  segment: string;
  region: string;
  competitors: Competitor[];
  viralContent: ViralContent[];
  viralPatterns: ViralPatterns | null;
  userBusiness?: Competitor | null;
}): Promise<SynthesisOutput | null> => {
  const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

  try {
    const competitorCtx = assembleCompetitorContext(input.competitors);
    const viralCtx = assembleViralContext(input.viralContent, input.viralPatterns);

    let fullPrompt =
      `${SYNTHESIZE_PROMPT}\n\nNicho: ${input.niche}\nSegmento: ${input.segment}\nRegiao: ${input.region}\n\n` +
      `Dados dos concorrentes:\n${JSON.stringify(competitorCtx)}\n\n` +
      `Padroes virais:\n${JSON.stringify(viralCtx)}`;

    // Append comparative section for Modo Completo (per D-17, D-20, D-21)
    if (input.userBusiness) {
      const userBusinessCtx = assembleCompetitorContext([input.userBusiness]);
      fullPrompt += `\n\n${COMPARATIVE_SYNTHESIS_SECTION}${JSON.stringify(userBusinessCtx[0])}`;
    }

    const truncated = await truncateContextIfNeeded(
      fullPrompt,
      competitorCtx,
      viralCtx
    );

    if (truncated.viralContext !== viralCtx) {
      fullPrompt =
        `${SYNTHESIZE_PROMPT}\n\nNicho: ${input.niche}\nSegmento: ${input.segment}\nRegiao: ${input.region}\n\n` +
        `Dados dos concorrentes:\n${JSON.stringify(truncated.competitorContext)}\n\n` +
        `Padroes virais:\n${JSON.stringify(truncated.viralContext)}`;

      // Re-append comparative section after truncation
      if (input.userBusiness) {
        const userBusinessCtx = assembleCompetitorContext([input.userBusiness]);
        fullPrompt += `\n\n${COMPARATIVE_SYNTHESIS_SECTION}${JSON.stringify(userBusinessCtx[0])}`;
      }
    }

    const response = await genai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: fullPrompt,
      config: {
        responseMimeType: 'application/json',
        responseJsonSchema: zodToJsonSchema(synthesisOutputSchema),
        maxOutputTokens: 8192,
      },
    });

    const text = response.text ?? '';
    const parsed = JSON.parse(text);

    return validateOrNull(synthesisOutputSchema, parsed);
  } catch (error) {
    console.warn(`Aviso: falha na sintese estrategica: ${(error as Error).message}`);
    return null;
  }
};

/**
 * Constroi objeto ComparativeAnalysis a partir do output da sintese (per D-22, D-30).
 * @param synthesisOutput - Output da sintese com campos comparativos opcionais
 * @param userBusiness - Dados do negocio do usuario (null se indisponivel)
 * @returns ComparativeAnalysis para armazenamento no banco
 */
export const buildComparativeAnalysis = (
  synthesisOutput: SynthesisOutput | null,
  userBusiness: Competitor | null
): ComparativeAnalysis => {
  if (!userBusiness) {
    return {
      comparativeStatus: 'unavailable',
      userVsMarket: null,
      gapsVsCompetitors: null,
      competitiveAdvantages: null,
      personalizedRecommendations: [],
      degradedReason: 'Dados do negocio do usuario indisponiveis',
    };
  }

  if (!synthesisOutput) {
    return {
      comparativeStatus: 'unavailable',
      userVsMarket: null,
      gapsVsCompetitors: null,
      competitiveAdvantages: null,
      personalizedRecommendations: [],
      degradedReason: 'Sintese estrategica indisponivel',
    };
  }

  const hasAll = synthesisOutput.userVsMarket && synthesisOutput.gapsVsCompetitors && synthesisOutput.competitiveAdvantages;
  const hasAny = synthesisOutput.userVsMarket || synthesisOutput.gapsVsCompetitors || synthesisOutput.competitiveAdvantages;

  let comparativeStatus: 'full' | 'partial' | 'unavailable';
  if (hasAll) comparativeStatus = 'full';
  else if (hasAny) comparativeStatus = 'partial';
  else comparativeStatus = 'unavailable';

  // Filter recommendations that contain comparative language
  const comparativeRecs = synthesisOutput.recommendations.filter(
    (r) => r.action.includes('concorrente') || r.reason.includes('concorrente') || r.action.includes('voce') || r.reason.includes('voce')
  );

  return {
    comparativeStatus,
    userVsMarket: synthesisOutput.userVsMarket ?? null,
    gapsVsCompetitors: synthesisOutput.gapsVsCompetitors ?? null,
    competitiveAdvantages: synthesisOutput.competitiveAdvantages ?? null,
    personalizedRecommendations: comparativeRecs.length > 0 ? comparativeRecs : synthesisOutput.recommendations,
  };
};
