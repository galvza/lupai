import { task, metadata } from '@trigger.dev/sdk';

import { synthesizeAnalysis, buildComparativeAnalysis } from '@/lib/ai/synthesize';
import { generateCreativeScripts } from '@/lib/ai/creative';
import {
  getAnalysis,
  getCompetitorsByAnalysis,
  getViralContentByAnalysis,
  getUserBusinessByAnalysis,
  upsertSynthesis,
} from '@/lib/supabase/queries';
import type { Competitor } from '@/types/competitor';
import type { SynthesisOutput, CreativeScript, ComparativeAnalysis } from '@/types/database';

/** Payload para o task de sintese com IA */
export interface SynthesizePayload {
  analysisId: string;
  niche: string;
  segment: string;
  region: string;
  mode: 'quick' | 'complete';
}

/** Resultado do task de sintese (never-fail pattern per D-23) */
export interface SynthesizeResult {
  status: 'success' | 'partial' | 'fallback' | 'unavailable';
  data: {
    synthesis: SynthesisOutput | null;
    scripts: CreativeScript[] | null;
  };
  reason?: string;
}

/**
 * Determina o status final da sintese com base nos resultados.
 * @param synthesis - Resultado da sintese estrategica
 * @param scripts - Resultado dos roteiros criativos
 * @returns Status consolidado
 */
const determineSynthesisStatus = (
  synthesis: SynthesisOutput | null,
  scripts: CreativeScript[] | null
): 'success' | 'partial' | 'fallback' => {
  if (synthesis && scripts) return 'success';
  if (synthesis || scripts) return 'partial';
  return 'fallback';
};

/**
 * Gera mensagem de fallback quando Gemini esta indisponivel (per D-22).
 * Retorna uma string com resumo dos dados coletados para que o usuario
 * ao menos veja os dados de extracao no dashboard.
 * @param competitorCount - Numero de concorrentes encontrados
 * @param viralCount - Numero de conteudos virais encontrados
 * @returns Mensagem de fallback
 */
const buildFallbackOverview = (
  competitorCount: number,
  viralCount: number
): string => {
  return `Sintese automatica indisponivel. Dados coletados: ${competitorCount} concorrentes analisados, ${viralCount} conteudos virais identificados. Consulte os dados individuais no dashboard.`;
};

/**
 * Task composto de sintese estrategica + geracao criativa.
 * Roda APOS toda a extracao completar no orchestrador.
 * Per D-18: compound task que chama synthesize e creative sequencialmente.
 * Per D-23: never-fail pattern — retorna status sem lancar excecoes.
 */
export const synthesizeTask = task({
  id: 'synthesize',
  maxDuration: 180,
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 5000,
    maxTimeoutInMs: 15000,
    factor: 2,
  },
  run: async (payload: SynthesizePayload): Promise<SynthesizeResult> => {
    // Stage 1: Fetch data from Supabase (per D-20, D-28)
    metadata.set('step', 'Buscando dados para sintese...');
    metadata.set('progress', 0);

    const [analysis, competitors, viralContent] = await Promise.all([
      getAnalysis(payload.analysisId),
      getCompetitorsByAnalysis(payload.analysisId),
      getViralContentByAnalysis(payload.analysisId),
    ]);

    if (!analysis) {
      return {
        status: 'unavailable',
        data: { synthesis: null, scripts: null },
        reason: 'Analise nao encontrada no banco de dados',
      };
    }

    const viralPatterns = analysis.viralPatterns ?? null;

    // Fetch user business for Modo Completo (per D-25)
    let userBusiness: Competitor | null = null;
    if (payload.mode === 'complete') {
      userBusiness = await getUserBusinessByAnalysis(payload.analysisId);
    }

    // Stage 2: Call synthesizeAnalysis (per D-15, D-17)
    metadata.set('step', 'Gerando sintese e recomendacoes...');
    metadata.set('progress', 30);

    let synthesisResult: SynthesisOutput | null = null;
    try {
      synthesisResult = await synthesizeAnalysis({
        niche: payload.niche,
        segment: payload.segment,
        region: payload.region,
        competitors,
        viralContent,
        viralPatterns,
        userBusiness,
      });
    } catch (error) {
      console.warn(`Aviso: sintese falhou: ${(error as Error).message}`);
    }

    // Stage 3: Call generateCreativeScripts (per D-15, D-17 — after synthesis)
    metadata.set('step', 'Gerando roteiros criativos...');
    metadata.set('progress', 60);

    let scriptsResult: CreativeScript[] | null = null;
    try {
      scriptsResult = await generateCreativeScripts({
        niche: payload.niche,
        segment: payload.segment,
        viralContent,
        viralPatterns,
        competitors,
      });
    } catch (error) {
      console.warn(`Aviso: geracao de roteiros falhou: ${(error as Error).message}`);
    }

    // Stage 4: Determine status and store (per D-23, D-24, D-31)
    metadata.set('step', 'Salvando resultados...');
    metadata.set('progress', 85);

    const status = determineSynthesisStatus(synthesisResult, scriptsResult);

    // Build strategicOverview string for DB (JSON of sections or fallback message)
    let strategicOverview: string;
    if (synthesisResult) {
      strategicOverview = JSON.stringify(synthesisResult);
    } else {
      strategicOverview = buildFallbackOverview(competitors.length, viralContent.length);
    }

    // Build reason for non-success statuses
    let reason: string | undefined;
    if (status === 'partial') {
      reason = synthesisResult
        ? 'Roteiros criativos indisponiveis'
        : 'Sintese estrategica indisponivel';
    } else if (status === 'fallback') {
      reason = 'Gemini indisponivel. Dados de extracao preservados.';
    }

    // Build comparative analysis for Modo Completo (per D-22, D-27)
    let comparativeAnalysis: ComparativeAnalysis | null = null;
    if (payload.mode === 'complete') {
      comparativeAnalysis = buildComparativeAnalysis(synthesisResult, userBusiness);
    }

    // Store in Supabase via upsert (per D-31, D-32, D-33)
    await upsertSynthesis({
      analysisId: payload.analysisId,
      strategicOverview,
      recommendations: synthesisResult?.recommendations ?? [],
      creativeScripts: scriptsResult ?? [],
      comparativeAnalysis,
    });

    metadata.set('progress', 100);

    return {
      status,
      data: {
        synthesis: synthesisResult,
        scripts: scriptsResult,
      },
      ...(reason ? { reason } : {}),
    };
  },
});
