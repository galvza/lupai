import { task, metadata } from '@trigger.dev/sdk';

import { scrapeWebsite } from '@/lib/apify/website';
import { scrapeSimilarweb } from '@/lib/apify/similarweb';
import { updateCompetitor } from '@/lib/supabase/queries';
import { websiteDataSchema, seoDataSchema, validateOrNull } from '@/lib/validation/extractionSchemas';
import type { ExtractWebsiteResult, SocialLinks } from '@/types/competitor';

/** Payload para extracao de dados de website de um concorrente */
export interface ExtractWebsitePayload {
  analysisId: string;
  competitorId: string;
  competitorName: string;
  websiteUrl: string;
}

/** Social links vazios (fallback) */
const EMPTY_SOCIAL_LINKS: SocialLinks = {
  instagram: null,
  tiktok: null,
  facebook: null,
  youtube: null,
  linkedin: null,
  twitter: null,
};

/**
 * Extrai dados do website e SEO de um concorrente em paralelo.
 * Compound task: website scraping + SimilarWeb SEO em paralelo (per D-08).
 * Extrai social links do conteudo crawleado para o orchestrador.
 * Valida dados com Zod schemas e armazena no Supabase.
 * Nunca lanca excecoes nao tratadas (per D-35, D-42).
 */
export const extractWebsite = task({
  id: 'extract-website',
  maxDuration: 120,
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 2000,
    maxTimeoutInMs: 10000,
    factor: 2,
  },
  run: async (payload: ExtractWebsitePayload): Promise<ExtractWebsiteResult> => {
    try {
      metadata.set('status', 'running');
      metadata.set('competitor', payload.competitorName);

      const warnings: string[] = [];

      // Step 1: Run website scraping and SimilarWeb SEO in parallel (per D-07, D-08)
      const [websiteResult, seoResult] = await Promise.allSettled([
        scrapeWebsite(payload.websiteUrl),
        scrapeSimilarweb(payload.websiteUrl),
      ]);

      // Step 2: Extract results from allSettled
      const websiteScrapingResult = websiteResult.status === 'fulfilled' ? websiteResult.value : null;
      const rawSeoData = seoResult.status === 'fulfilled' ? seoResult.value : null;

      // Step 3: Build warnings for failed promises
      if (websiteResult.status === 'rejected') {
        warnings.push(`Website indisponivel para ${payload.competitorName}: ${(websiteResult.reason as Error).message}`);
      }
      if (seoResult.status === 'rejected') {
        warnings.push(`SEO (SimilarWeb) indisponivel para ${payload.competitorName}: ${(seoResult.reason as Error).message}`);
      }

      // Step 4: Extract social links from website scraping result
      const socialLinks: SocialLinks = websiteScrapingResult?.socialLinks ?? EMPTY_SOCIAL_LINKS;

      // Step 5: Get and validate websiteData (per D-29, D-32)
      const rawWebsiteData = websiteScrapingResult?.websiteData ?? null;
      const validatedWebsiteData = rawWebsiteData
        ? validateOrNull(websiteDataSchema, rawWebsiteData)
        : null;

      if (rawWebsiteData && !validatedWebsiteData) {
        warnings.push(`Dados do website insuficientes para ${payload.competitorName}`);
      }

      // Step 6: Validate seoData (per D-30, D-32)
      const validatedSeoData = rawSeoData
        ? validateOrNull(seoDataSchema, rawSeoData)
        : null;

      if (rawSeoData && !validatedSeoData) {
        warnings.push(`Dados de SEO insuficientes para ${payload.competitorName}`);
      }

      // Step 7: Get business identifiers
      const businessIdentifiers = websiteScrapingResult?.businessIdentifiers ?? null;

      // Step 8: Store validated data in Supabase (snake_case DB columns)
      await updateCompetitor(payload.competitorId, {
        website_data: validatedWebsiteData,
        seo_data: validatedSeoData,
      });

      // Step 9: Update metadata for progress tracking (per D-47)
      metadata.set('status', 'completed');
      metadata.set('subTasks', {
        website: websiteScrapingResult ? 'success' : 'failed',
        seo: validatedSeoData ? 'success' : 'failed',
      });

      // Step 10: Return result for orchestrator
      return {
        competitorId: payload.competitorId,
        websiteData: validatedWebsiteData,
        seoData: validatedSeoData,
        socialLinks,
        businessIdentifiers,
        warnings,
      };
    } catch (error) {
      // Global catch per D-35/D-42: never throw unhandled errors
      metadata.set('status', 'failed');
      return {
        competitorId: payload.competitorId,
        websiteData: null,
        seoData: null,
        socialLinks: EMPTY_SOCIAL_LINKS,
        businessIdentifiers: null,
        warnings: [`Erro geral na extracao de website para ${payload.competitorName}: ${(error as Error).message}`],
      };
    }
  },
});
