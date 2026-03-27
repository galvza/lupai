import { ApifyClient } from 'apify-client';

import type { MetaAdsData } from '@/types/competitor';

const ACTOR_ID = 'apify/facebook-ads-scraper';

/**
 * Extrai dados de anuncios Meta (Facebook/Instagram) de uma empresa usando Apify.
 * @param companyName - Nome da empresa para buscar na Biblioteca de Anuncios
 * @returns Dados de anuncios filtrados
 */
export const scrapeFacebookAds = async (companyName: string): Promise<MetaAdsData> => {
  const client = new ApifyClient({ token: process.env.APIFY_API_TOKEN });

  try {
    const run = await client.actor(ACTOR_ID).call({
      searchQuery: companyName,
      country: 'BR',
    });

    const { items } = await client.dataset(run.defaultDatasetId).listItems();

    // Filter relevant fields only (per D-15)
    const ads = (items as Array<Record<string, unknown>>).map((ad) => {
      const snapshot = (ad.snapshot ?? {}) as Record<string, unknown>;
      const body = (snapshot.body ?? {}) as Record<string, unknown>;
      return {
        adId: (ad.id as string) ?? (ad.adArchiveID as string) ?? '',
        creativeUrl: (snapshot.body_markup as string) ?? null,
        copyText: (body.text as string) ?? null,
        format: (snapshot.card_type as string) ?? null,
        startedAt: (ad.startDate as string) ?? null,
        isActive: (ad.isActive as boolean) ?? true,
      };
    });

    return {
      activeAdsCount: ads.filter((a) => a.isActive).length,
      ads: ads.slice(0, 20),
    };
  } catch (error) {
    throw new Error(
      `Erro ao extrair anuncios Meta para "${companyName}": ${(error as Error).message}`
    );
  }
};
