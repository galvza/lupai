import { task, metadata } from '@trigger.dev/sdk';

import { scrapeInstagram } from '@/lib/apify/instagram';
import { scrapeTiktok } from '@/lib/apify/tiktok';
import { updateCompetitor } from '@/lib/supabase/queries';
import { socialDataSchema, validateOrNull } from '@/lib/validation/extractionSchemas';
import type { SocialProfileInput, ExtractSocialResult, SocialData } from '@/types/competitor';

/** Payload para extracao de dados de redes sociais de um concorrente */
export interface ExtractSocialPayload {
  analysisId: string;
  competitorId: string;
  competitorName: string;
  socialProfiles: {
    instagram: SocialProfileInput | null;
    tiktok: SocialProfileInput | null;
  };
}

/**
 * Extrai dados de redes sociais de um concorrente em paralelo.
 * Roda Instagram e TikTok scraping simultaneamente via Promise.allSettled (per D-06, D-21).
 * Pula plataformas com perfil null graciosamente (per D-24).
 * Valida dados com Zod schema e armazena no Supabase.
 * Nunca lanca excecoes nao tratadas (per D-35, D-42).
 */
export const extractSocial = task({
  id: 'extract-social',
  maxDuration: 120,
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 2000,
    maxTimeoutInMs: 10000,
    factor: 2,
  },
  run: async (payload: ExtractSocialPayload): Promise<ExtractSocialResult> => {
    try {
      metadata.set('status', 'running');
      metadata.set('competitor', payload.competitorName);

      const warnings: string[] = [];
      const { instagram: igProfile, tiktok: ttProfile } = payload.socialProfiles;

      // Step 1: Check if any profiles are provided
      if (!igProfile && !ttProfile) {
        // No profiles to scrape (per D-24)
        warnings.push(`Nenhum perfil social fornecido para ${payload.competitorName}`);

        await updateCompetitor(payload.competitorId, {
          social_data: null,
        });

        metadata.set('status', 'completed');
        metadata.set('subTasks', { instagram: 'skipped', tiktok: 'skipped' });

        return {
          competitorId: payload.competitorId,
          socialData: null,
          warnings,
        };
      }

      // Step 2: Build scrape promises only for non-null profiles (per D-24)
      const igPromise = igProfile
        ? scrapeInstagram(igProfile.username)
        : Promise.resolve(null);
      const ttPromise = ttProfile
        ? scrapeTiktok(ttProfile.username)
        : Promise.resolve(null);

      // Step 3: Run in parallel using Promise.allSettled (per D-21)
      const [igResult, ttResult] = await Promise.allSettled([igPromise, ttPromise]);

      // Step 4: Extract results
      const igData = igResult.status === 'fulfilled' ? igResult.value : null;
      const ttData = ttResult.status === 'fulfilled' ? ttResult.value : null;

      // Step 5: Build warnings from failed results
      if (igProfile && igResult.status === 'rejected') {
        warnings.push(`Instagram indisponivel para ${payload.competitorName}: ${(igResult.reason as Error).message}`);
      }
      if (ttProfile && ttResult.status === 'rejected') {
        warnings.push(`TikTok indisponivel para ${payload.competitorName}: ${(ttResult.reason as Error).message}`);
      }

      // Step 6: Build SocialData object
      const rawSocialData: SocialData = {
        instagram: igData,
        tiktok: ttData,
      };

      // Step 7: Validate with Zod schema (per D-31, D-32)
      const validatedSocialData = validateOrNull(socialDataSchema, rawSocialData);

      if (!validatedSocialData) {
        warnings.push(`Dados sociais insuficientes para ${payload.competitorName}`);
      }

      // Step 8: Store in Supabase (snake_case column)
      await updateCompetitor(payload.competitorId, {
        social_data: validatedSocialData,
      });

      // Step 9: Update metadata for progress tracking (per D-47)
      metadata.set('status', 'completed');
      metadata.set('subTasks', {
        instagram: igProfile ? (igData ? 'success' : 'failed') : 'skipped',
        tiktok: ttProfile ? (ttData ? 'success' : 'failed') : 'skipped',
      });

      // Step 10: Return result for orchestrator
      return {
        competitorId: payload.competitorId,
        socialData: validatedSocialData,
        warnings,
      };
    } catch (error) {
      // Global catch per D-35/D-42: never throw unhandled errors
      metadata.set('status', 'failed');
      return {
        competitorId: payload.competitorId,
        socialData: null,
        warnings: [`Erro geral na extracao social para ${payload.competitorName}: ${(error as Error).message}`],
      };
    }
  },
});
