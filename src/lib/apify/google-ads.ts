import { ApifyClient } from 'apify-client';

import type { GoogleAdsData } from '@/types/competitor';

const ACTOR_ID = 'apify/google-ads-scraper';

/**
 * Extrai dados de presenca no Google Ads de uma empresa usando Apify.
 * @param companyName - Nome da empresa para buscar
 * @returns Dados de Google Ads filtrados
 */
export const scrapeGoogleAds = async (companyName: string): Promise<GoogleAdsData> => {
  const client = new ApifyClient({ token: process.env.APIFY_API_TOKEN });

  try {
    const run = await client.actor(ACTOR_ID).call({
      queries: [companyName],
    });

    const { items } = await client.dataset(run.defaultDatasetId).listItems();

    // Filter relevant fields only (per D-15)
    const paidKeywords = (items as Array<Record<string, unknown>>)
      .map((item) => (item.keyword as string) ?? (item.query as string) ?? '')
      .filter(Boolean)
      .slice(0, 20);

    return {
      hasSearchAds: items.length > 0,
      paidKeywords,
      estimatedBudget: null, // Estimativa requer dados mais profundos
    };
  } catch (error) {
    throw new Error(
      `Erro ao extrair dados do Google Ads para "${companyName}": ${(error as Error).message}`
    );
  }
};
