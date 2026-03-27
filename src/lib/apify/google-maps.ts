import { ApifyClient } from 'apify-client';

import type { GmbData } from '@/types/competitor';

const ACTOR_ID = 'compass/google-maps-scraper';

/**
 * Extrai dados do Google Meu Negocio usando Google Maps via Apify.
 * @param businessName - Nome do negocio
 * @param region - Regiao para busca
 * @returns Dados do GMB filtrados ou null se nao encontrado
 */
export const scrapeGoogleMaps = async (
  businessName: string,
  region: string
): Promise<GmbData | null> => {
  const client = new ApifyClient({ token: process.env.APIFY_API_TOKEN });

  try {
    const run = await client.actor(ACTOR_ID).call({
      searchStringsArray: [`${businessName} ${region}`],
    });

    const { items } = await client.dataset(run.defaultDatasetId).listItems();

    if (!items.length) return null;

    // Filter relevant fields only (per D-15)
    const place = items[0] as Record<string, unknown>;
    return {
      name: (place.title as string) ?? (place.name as string) ?? null,
      rating: (place.totalScore as number) ?? (place.rating as number) ?? null,
      reviewCount: (place.reviewsCount as number) ?? null,
      address: (place.address as string) ?? null,
      phone: (place.phone as string) ?? null,
      categories: ((place.categories as string[]) ?? []).slice(0, 5),
    };
  } catch (error) {
    throw new Error(
      `Erro ao extrair dados do Google Maps para "${businessName}": ${(error as Error).message}`
    );
  }
};
