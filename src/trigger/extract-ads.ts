import { task, metadata } from '@trigger.dev/sdk';

import { scrapeFacebookAds } from '@/lib/apify/facebook-ads';
import { scrapeGoogleAds } from '@/lib/apify/google-ads';
import { scrapeGoogleMaps } from '@/lib/apify/google-maps';
import { updateCompetitor } from '@/lib/supabase/queries';
import {
  metaAdsDataSchema,
  googleAdsDataSchema,
  gmbDataSchema,
  validateOrNull,
} from '@/lib/validation/extractionSchemas';
import type { ExtractAdsPayload, ExtractAdsResult, ExtractionStatus } from '@/types/competitor';

/** Extrai dominio limpo de uma URL, removendo www. */
const extractDomain = (websiteUrl: string): string => {
  try {
    const url = new URL(websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`);
    return url.hostname.replace(/^www\./, '');
  } catch {
    return websiteUrl.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
  }
};

/** Determina status baseado em quantos resultados estao presentes */
const determineStatus = (
  metaAds: unknown,
  googleAds: unknown,
  gmb: unknown
): ExtractionStatus => {
  const results = [metaAds, googleAds, gmb];
  const nonNull = results.filter((r) => r !== null).length;
  if (nonNull === 3) return 'success';
  if (nonNull > 0) return 'partial';
  return 'unavailable';
};

/**
 * Extrai dados de anuncios Meta, Google Ads e Google Meu Negocio de um concorrente.
 * Compound task: 3 extracoes em paralelo via Promise.allSettled (per D-14, D-15).
 * Valida dados com Zod schemas e armazena no Supabase.
 * Nunca lanca excecoes nao tratadas (per D-32).
 */
export const extractAds = task({
  id: 'extract-ads',
  maxDuration: 120,
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 2000,
    maxTimeoutInMs: 10000,
    factor: 2,
  },
  run: async (payload: ExtractAdsPayload): Promise<ExtractAdsResult> => {
    try {
      metadata.set('status', 'running');
      metadata.set('competitor', payload.competitorName);
      metadata.set('adsProgress', { meta: 'running', google: 'running', gmb: 'running' });

      const warnings: string[] = [];
      const domain = extractDomain(payload.websiteUrl);

      // Step 1: Three-way parallel extraction via Promise.allSettled (per D-14, D-15)
      const [metaResult, googleResult, gmbResult] = await Promise.allSettled([
        scrapeFacebookAds(payload.websiteUrl, payload.competitorName),
        scrapeGoogleAds(domain, payload.competitorName),
        scrapeGoogleMaps(payload.competitorName, payload.region),
      ]);

      // Step 2: Extract results + build warnings
      const rawMetaAds = metaResult.status === 'fulfilled' ? metaResult.value : null;
      if (metaResult.status === 'rejected') {
        warnings.push(`Meta Ads indisponivel para ${payload.competitorName}: ${(metaResult.reason as Error).message}`);
      }

      const rawGoogleAds = googleResult.status === 'fulfilled' ? googleResult.value : null;
      if (googleResult.status === 'rejected') {
        warnings.push(`Google Ads indisponivel para ${payload.competitorName}: ${(googleResult.reason as Error).message}`);
      }

      const rawGmb = gmbResult.status === 'fulfilled' ? gmbResult.value : null;
      if (gmbResult.status === 'rejected') {
        warnings.push(`Google Meu Negocio indisponivel para ${payload.competitorName}: ${(gmbResult.reason as Error).message}`);
      }

      // Step 3: Validate each result with Zod (per D-27, D-28, D-29, D-30, D-31)
      const validatedMetaAds = rawMetaAds ? validateOrNull(metaAdsDataSchema, rawMetaAds) : null;
      if (rawMetaAds && !validatedMetaAds) {
        warnings.push(`Dados de Meta Ads insuficientes para ${payload.competitorName}`);
      }

      const validatedGoogleAds = rawGoogleAds ? validateOrNull(googleAdsDataSchema, rawGoogleAds) : null;
      if (rawGoogleAds && !validatedGoogleAds) {
        warnings.push(`Dados de Google Ads insuficientes para ${payload.competitorName}`);
      }

      // GMB: null from scraper is valid (no listing), only validate if non-null
      const validatedGmb = rawGmb ? validateOrNull(gmbDataSchema, rawGmb) : null;
      if (rawGmb && !validatedGmb) {
        warnings.push(`Dados de Google Meu Negocio insuficientes para ${payload.competitorName}`);
      }

      // Step 4: Store in Supabase via single updateCompetitor call (per D-17)
      await updateCompetitor(payload.competitorId, {
        meta_ads_data: validatedMetaAds,
        google_ads_data: validatedGoogleAds,
        gmb_data: validatedGmb,
      });

      // Step 5: Determine overall status (per D-25, D-26)
      const status = determineStatus(validatedMetaAds, validatedGoogleAds, validatedGmb);

      // Step 6: Update metadata for progress tracking (per D-33)
      metadata.set('adsProgress', {
        meta: validatedMetaAds ? 'success' : 'failed',
        google: validatedGoogleAds ? 'success' : 'failed',
        gmb: validatedGmb ? 'success' : (rawGmb === null && gmbResult.status === 'fulfilled' ? 'no_listing' : 'failed'),
      });
      metadata.set('status', 'completed');

      // Step 7: Return result for orchestrator (per D-16)
      return {
        competitorId: payload.competitorId,
        metaAds: validatedMetaAds,
        googleAds: validatedGoogleAds,
        gmb: validatedGmb,
        warnings,
        status,
      };
    } catch (error) {
      // Global catch per D-32: never throw unhandled errors
      metadata.set('status', 'failed');
      return {
        competitorId: payload.competitorId,
        metaAds: null,
        googleAds: null,
        gmb: null,
        warnings: [`Erro geral na extracao de anuncios para ${payload.competitorName}: ${(error as Error).message}`],
        status: 'unavailable',
      };
    }
  },
});
