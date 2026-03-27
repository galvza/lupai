import { task, metadata } from '@trigger.dev/sdk';

/** Payload para extracao de dados de website de um concorrente */
export interface ExtractWebsitePayload {
  analysisId: string;
  competitorId: string;
  competitorName: string;
  websiteUrl: string;
}

/**
 * Extrai dados do website de um concorrente.
 * Stub para Phase 4 — implementacao completa na Phase 4.
 */
export const extractWebsite = task({
  id: 'extract-website',
  maxDuration: 120,
  run: async (payload: ExtractWebsitePayload) => {
    metadata.set('status', 'running');
    metadata.set('competitor', payload.competitorName);

    // Stub: full extraction in Phase 4
    metadata.set('status', 'completed');
    return { competitorId: payload.competitorId, extracted: false, message: 'Stub - Phase 4' };
  },
});
