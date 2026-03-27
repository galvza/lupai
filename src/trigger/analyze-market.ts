import { task, metadata } from '@trigger.dev/sdk';

/** Payload para o job de analise de mercado */
export interface AnalyzeMarketPayload {
  analysisId: string;
  niche: string;
  segment: string;
  region: string;
  mode: 'quick' | 'complete';
  userBusinessUrl: string | null;
}

/**
 * Job principal de analise de mercado.
 * Stub para Phase 2 — orquestracao completa implementada na Phase 3.
 */
export const analyzeMarket = task({
  id: 'analyze-market',
  maxDuration: 300,
  run: async (payload: AnalyzeMarketPayload) => {
    metadata.set('status', 'started');
    metadata.set('step', 'Analise iniciada');
    metadata.set('progress', 0);

    // Stub: full orchestration in Phase 3
    return {
      analysisId: payload.analysisId,
      message: 'Analise iniciada com sucesso',
    };
  },
});
