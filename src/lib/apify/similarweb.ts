import { ApifyClient } from 'apify-client';

import type { SeoData } from '@/types/competitor';

const ACTOR_ID = 'tri_angle/similarweb-scraper';

/**
 * Extrai dados de SEO e trafego de um site usando SimilarWeb via Apify.
 * @param websiteUrl - URL do site a ser analisado
 * @returns Dados de SEO filtrados ou null se vazio
 */
export const scrapeSimilarweb = async (websiteUrl: string): Promise<SeoData | null> => {
  const client = new ApifyClient({ token: process.env.APIFY_API_TOKEN });

  try {
    const run = await client.actor(ACTOR_ID).call({
      urls: [websiteUrl],
    });

    const { items } = await client.dataset(run.defaultDatasetId).listItems();

    if (!items.length) return null;

    // Filter relevant fields only (per D-15)
    const siteData = items[0] as Record<string, unknown>;
    return {
      estimatedAuthority: (siteData.globalRank as number) ?? null,
      topKeywords: ((siteData.topKeywords as Array<Record<string, unknown>>) ?? [])
        .slice(0, 10)
        .map((kw) => (kw.keyword as string) ?? (kw.name as string) ?? ''),
      estimatedTraffic: (siteData.totalVisits as number) ?? null,
      backlinks: (siteData.totalBacklinks as number) ?? null,
    };
  } catch (error) {
    throw new Error(
      `Erro ao extrair dados do SimilarWeb para "${websiteUrl}": ${(error as Error).message}`
    );
  }
};
