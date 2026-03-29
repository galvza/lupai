import { ApifyClient } from 'apify-client';

const ACTOR_ID = 'apify/google-search-scraper';

/** Resultado filtrado de uma busca no Google */
export interface GoogleSearchResult {
  title: string;
  url: string;
  description: string;
}

/**
 * Busca resultados organicos do Google usando Apify Google Search Scraper.
 * @param queries - Lista de queries de busca
 * @param countryCode - Codigo do pais para busca (padrao: 'BR')
 * @returns Lista de resultados organicos filtrados
 */
export const scrapeGoogleSearch = async (
  queries: string[],
  countryCode = 'BR'
): Promise<GoogleSearchResult[]> => {
  const client = new ApifyClient({ token: process.env.APIFY_API_TOKEN });

  try {
    const run = await client.actor(ACTOR_ID).call({
      queries: queries.join('\n'),
      countryCode: countryCode.toLowerCase(),
      languageCode: 'pt-BR',
      maxPagesPerQuery: 1,
      resultsPerPage: 10,
    });

    const { items } = await client.dataset(run.defaultDatasetId).listItems();

    return extractOrganicResults(items as Record<string, unknown>[]);
  } catch (error) {
    throw new Error(
      `Erro ao buscar resultados do Google para "${queries.join(', ')}": ${(error as Error).message}`
    );
  }
};

/**
 * Extrai e filtra resultados organicos dos items retornados pelo actor.
 * @param items - Items brutos do dataset da Apify
 * @returns Resultados organicos filtrados com title, url e description
 */
const extractOrganicResults = (items: Record<string, unknown>[]): GoogleSearchResult[] => {
  return items
    .flatMap((page) => (page.organicResults as Record<string, unknown>[]) ?? [])
    .filter((result) => result.url && result.title)
    .map((result) => ({
      title: result.title as string,
      url: result.url as string,
      description: (result.description as string) ?? '',
    }));
};
