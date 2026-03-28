import { ApifyClient } from 'apify-client';

import { APIFY_ACTORS } from '@/config/apify';
import type { GoogleAdsData } from '@/types/competitor';

/**
 * Mapeia itens brutos da Apify para o formato GoogleAdsData filtrado (per D-15).
 * @param items - Itens brutos retornados pelo actor do Google Ads Transparency
 * @returns Dados de Google Ads com apenas campos relevantes
 */
const mapGoogleAdsItems = (items: Array<Record<string, unknown>>): GoogleAdsData => {
  const paidKeywords = items
    .map(
      (item) =>
        (item.keyword as string) ??
        (item.query as string) ??
        (item.adText as string) ??
        ''
    )
    .filter(Boolean)
    .slice(0, 20);

  return {
    hasSearchAds: items.length > 0,
    paidKeywords,
    estimatedBudget: null, // Google Ads Transparency nao fornece dados de gasto
  };
};

/**
 * Extrai dados de presenca no Google Ads usando Apify (Google Ads Transparency Center).
 * Estrategia de fallback (per D-05, D-23): tenta domain primeiro,
 * depois companyName como topic se domain falhar.
 * @param domain - Dominio do concorrente (tentativa primaria)
 * @param companyName - Nome da empresa para busca por topic (fallback)
 * @returns Dados de Google Ads filtrados
 */
export const scrapeGoogleAds = async (
  domain: string,
  companyName: string
): Promise<GoogleAdsData> => {
  const client = new ApifyClient({ token: process.env.APIFY_API_TOKEN });

  try {
    // Tentativa primaria: busca por dominio (per D-05)
    try {
      const run = await client.actor(APIFY_ACTORS.googleAds).call({
        startUrls: [
          {
            url: `https://adstransparency.google.com/?region=BR&domain=${encodeURIComponent(domain)}`,
          },
        ],
        maxItems: 20,
      });

      const { items } = await client.dataset(run.defaultDatasetId).listItems();

      if (items.length > 0) {
        return mapGoogleAdsItems(items as Array<Record<string, unknown>>);
      }
    } catch {
      // Falha na tentativa primaria, continua para fallback
    }

    // Fallback: busca por topic/nome da empresa (per D-23)
    const run = await client.actor(APIFY_ACTORS.googleAds).call({
      startUrls: [
        {
          url: `https://adstransparency.google.com/?region=BR&topic=${encodeURIComponent(companyName)}`,
        },
      ],
      maxItems: 20,
    });

    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    return mapGoogleAdsItems(items as Array<Record<string, unknown>>);
  } catch (error) {
    throw new Error(
      `Erro ao extrair dados do Google Ads para "${companyName}": ${(error as Error).message}`
    );
  }
};
