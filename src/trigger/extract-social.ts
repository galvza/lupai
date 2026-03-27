import { task, metadata } from '@trigger.dev/sdk';

/** Payload para extracao de dados de redes sociais de um concorrente */
export interface ExtractSocialPayload {
  analysisId: string;
  competitorId: string;
  competitorName: string;
  socialProfiles: {
    instagram: string | null;
    tiktok: string | null;
    facebook: string | null;
  };
}

/**
 * Extrai dados de redes sociais de um concorrente.
 * Stub para Phase 4 — implementacao completa na Phase 4.
 */
export const extractSocial = task({
  id: 'extract-social',
  maxDuration: 120,
  run: async (payload: ExtractSocialPayload) => {
    metadata.set('status', 'running');
    metadata.set('competitor', payload.competitorName);
    metadata.set('status', 'completed');
    return { competitorId: payload.competitorId, extracted: false, message: 'Stub - Phase 4' };
  },
});
