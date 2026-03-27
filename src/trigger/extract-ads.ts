import { task, metadata } from '@trigger.dev/sdk';

/** Payload para extracao de dados de anuncios de um concorrente */
export interface ExtractAdsPayload {
  analysisId: string;
  competitorId: string;
  competitorName: string;
  websiteUrl: string;
}

/**
 * Extrai dados de anuncios Meta e Google Ads de um concorrente.
 * Stub para Phase 5 — implementacao completa na Phase 5.
 */
export const extractAds = task({
  id: 'extract-ads',
  maxDuration: 120,
  run: async (payload: ExtractAdsPayload) => {
    metadata.set('status', 'running');
    metadata.set('competitor', payload.competitorName);
    metadata.set('status', 'completed');
    return { competitorId: payload.competitorId, extracted: false, message: 'Stub - Phase 5' };
  },
});
