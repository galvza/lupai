import { ApifyClient } from 'apify-client';

import { APIFY_ACTORS } from '@/config/apify';
import type { MetaAd, MetaAdsData } from '@/types/competitor';

/**
 * Mapeia itens brutos da Apify para o formato MetaAd filtrado (per D-15).
 * @param items - Itens brutos retornados pelo actor da Apify
 * @returns Array de MetaAd com apenas campos relevantes
 */
const mapMetaAdsItems = (items: Array<Record<string, unknown>>): MetaAd[] =>
  items.map((item) => {
    const snapshot = (item.snapshot ?? {}) as Record<string, unknown>;
    const body = (snapshot.body ?? {}) as Record<string, unknown>;
    return {
      adId: (item.id as string) ?? (item.adArchiveID as string) ?? '',
      creativeUrl: (snapshot.body_markup as string) ?? null,
      copyText: (body.text as string) ?? null,
      format: (snapshot.card_type as string) ?? null,
      startedAt: (item.startDate as string) ?? null,
      isActive: (item.isActive as boolean) ?? true,
    };
  });

/**
 * Extrai dados de anuncios Meta (Facebook/Instagram) usando Apify.
 * Estrategia de fallback (per D-01, D-22): tenta pageUrl primeiro,
 * depois companyName como keyword se pageUrl falhar ou retornar vazio.
 * @param pageUrl - URL da pagina do Facebook (tentativa primaria, pode ser null)
 * @param companyName - Nome da empresa para busca por keyword (fallback)
 * @returns Dados de anuncios Meta filtrados
 */
export const scrapeFacebookAds = async (
  pageUrl: string | null,
  companyName: string
): Promise<MetaAdsData> => {
  const client = new ApifyClient({ token: process.env.APIFY_API_TOKEN });

  try {
    // Tentativa primaria: busca por URL da pagina (per D-01)
    if (pageUrl) {
      try {
        const run = await client.actor(APIFY_ACTORS.facebookAds).call({
          startUrls: [
            {
              url: `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=BR&q=${encodeURIComponent(pageUrl)}&search_type=keyword_unordered`,
            },
          ],
          maxItems: 20,
          country: 'BR',
        });

        const { items } = await client.dataset(run.defaultDatasetId).listItems();

        if (items.length > 0) {
          const ads = mapMetaAdsItems(items as Array<Record<string, unknown>>);
          return {
            activeAdsCount: ads.filter((a) => a.isActive).length,
            ads: ads.slice(0, 20),
          };
        }
      } catch {
        // Falha na tentativa primaria, continua para fallback
      }
    }

    // Fallback: busca por keyword (per D-22)
    const run = await client.actor(APIFY_ACTORS.facebookAds).call({
      search: companyName,
      country: 'BR',
      adType: 'all',
      maxItems: 20,
    });

    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    const ads = mapMetaAdsItems(items as Array<Record<string, unknown>>);

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
