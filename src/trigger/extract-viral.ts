import { task, metadata } from '@trigger.dev/sdk';

/** Payload para extracao de conteudo viral do nicho */
export interface ExtractViralPayload {
  analysisId: string;
  niche: string;
  segment: string;
  region: string;
}

/**
 * Extrai conteudo viral do nicho (TikTok, Instagram, Facebook).
 * Stub para Phase 6 — implementacao completa na Phase 6.
 */
export const extractViral = task({
  id: 'extract-viral',
  maxDuration: 180,
  run: async (payload: ExtractViralPayload) => {
    metadata.set('status', 'running');
    metadata.set('niche', payload.niche);
    metadata.set('status', 'completed');
    return { analysisId: payload.analysisId, extracted: false, message: 'Stub - Phase 6' };
  },
});
