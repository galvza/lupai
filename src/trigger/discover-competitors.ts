import { task } from '@trigger.dev/sdk';
import { ApifyClient } from 'apify-client';

import { scrapeGoogleSearch } from '@/lib/apify/google-search';
import type { RawCompetitorCandidate } from '@/utils/competitors';

/** Payload para tarefas de descoberta de concorrentes */
export interface DiscoveryPayload {
  niche: string;
  segment: string;
  region: string;
  seedUrl?: string;
}

/**
 * Descobre concorrentes via busca no Google.
 * @param payload - Nicho, segmento e regiao para construir queries
 * @returns Lista de candidatos brutos com source 'google-search'
 */
export const discoverFromGoogleSearch = task({
  id: 'discover-google-search',
  maxDuration: 120,
  run: async (payload: DiscoveryPayload): Promise<RawCompetitorCandidate[]> => {
    try {
      const queries = [
        `${payload.niche} ${payload.region}`,
        `${payload.segment} ${payload.region} empresa`,
        `${payload.niche} ${payload.region} loja site`,
      ];

      const results = await scrapeGoogleSearch(queries);

      return results.map((r) => ({
        name: r.title,
        url: r.url,
        description: r.description,
        source: 'google-search' as const,
      }));
    } catch (error) {
      console.error(`Erro na descoberta via Google Search: ${(error as Error).message}`);
      return [];
    }
  },
});

/**
 * Descobre concorrentes via Google Maps (multiplos resultados).
 * @param payload - Nicho, segmento e regiao para busca
 * @returns Lista de candidatos brutos com source 'google-maps'
 */
export const discoverFromGoogleMaps = task({
  id: 'discover-google-maps',
  maxDuration: 120,
  run: async (payload: DiscoveryPayload): Promise<RawCompetitorCandidate[]> => {
    try {
      const client = new ApifyClient({ token: process.env.APIFY_API_TOKEN });

      const run = await client.actor('compass/google-maps-scraper').call({
        searchStringsArray: [`${payload.niche} ${payload.region}`],
      });

      const { items } = await client.dataset(run.defaultDatasetId).listItems();

      return (items as Array<Record<string, unknown>>)
        .map((item) => ({
          name: (item.title as string) ?? '',
          url: (item.website as string) ?? '',
          description: ((item.categories as string[]) ?? []).join(', '),
          source: 'google-maps' as const,
        }))
        .filter((c) => c.url !== '');
    } catch (error) {
      console.error(`Erro na descoberta via Google Maps: ${(error as Error).message}`);
      return [];
    }
  },
});

/**
 * Descobre concorrentes via Biblioteca de Anuncios Meta (Facebook Ads).
 * @param payload - Nicho, segmento e regiao para busca de anunciantes
 * @returns Lista de candidatos brutos com source 'facebook-ads'
 */
export const discoverFromFacebookAds = task({
  id: 'discover-facebook-ads',
  maxDuration: 120,
  run: async (payload: DiscoveryPayload): Promise<RawCompetitorCandidate[]> => {
    try {
      const client = new ApifyClient({ token: process.env.APIFY_API_TOKEN });

      const run = await client.actor('apify/facebook-ads-scraper').call({
        searchQuery: `${payload.niche} ${payload.region}`,
        country: 'BR',
      });

      const { items } = await client.dataset(run.defaultDatasetId).listItems();

      const seen = new Set<string>();
      const candidates: RawCompetitorCandidate[] = [];

      for (const item of items as Array<Record<string, unknown>>) {
        const name = (item.pageName as string) ?? (item.advertiserName as string) ?? '';
        const url = (item.pageUrl as string) ?? (item.advertiserUrl as string) ?? '';
        const description = ((item.adText as string) ?? (item.bodyText as string) ?? '').slice(0, 200);

        if (!name && !url) continue;

        const dedupeKey = name.toLowerCase();
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);

        candidates.push({
          name,
          url,
          description,
          source: 'facebook-ads' as const,
        });
      }

      return candidates;
    } catch (error) {
      console.error(`Erro na descoberta via Facebook Ads: ${(error as Error).message}`);
      return [];
    }
  },
});

/**
 * Descobre concorrentes similares via SimilarWeb (requer seedUrl).
 * @param payload - Nicho, segmento, regiao e seedUrl opcional
 * @returns Lista de candidatos brutos com source 'similarweb', ou array vazio se sem seedUrl
 */
export const discoverFromSimilarWeb = task({
  id: 'discover-similarweb',
  maxDuration: 120,
  run: async (payload: DiscoveryPayload): Promise<RawCompetitorCandidate[]> => {
    if (!payload.seedUrl) {
      return [];
    }

    try {
      const client = new ApifyClient({ token: process.env.APIFY_API_TOKEN });

      const run = await client.actor('tri_angle/similarweb-scraper').call({
        urls: [payload.seedUrl],
      });

      const { items } = await client.dataset(run.defaultDatasetId).listItems();

      if (!items.length) return [];

      const siteData = items[0] as Record<string, unknown>;
      const similarSites = siteData.similarSites as Array<Record<string, unknown>> | undefined;

      if (!similarSites || !Array.isArray(similarSites)) return [];

      return similarSites.map((site) => ({
        name: (site.name as string) ?? (site.domain as string) ?? '',
        url: (site.url as string) ?? `https://${(site.domain as string) ?? ''}`,
        description: (site.category as string) ?? '',
        source: 'similarweb' as const,
      }));
    } catch (error) {
      console.error(`Erro na descoberta via SimilarWeb: ${(error as Error).message}`);
      return [];
    }
  },
});
