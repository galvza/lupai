import { ApifyClient } from 'apify-client';

import type { WebsiteData, SocialLinks } from '@/types/competitor';
import { extractSocialLinksFromText } from '@/utils/socialLinks';
import { extractBusinessIdentifiers } from '@/utils/businessIdentifiers';
import type { BusinessIdentifiers } from '@/utils/businessIdentifiers';

const ACTOR_ID = 'apify/website-content-crawler';

/** Resultado completo do scraping de website incluindo social links e identificadores */
export interface WebsiteScrapingResult {
  websiteData: WebsiteData | null;
  socialLinks: SocialLinks;
  businessIdentifiers: BusinessIdentifiers;
  rawPagesText: string;
}

/**
 * Extrai dados do site de um concorrente usando Apify Website Content Crawler.
 * Retorna dados de website, links de redes sociais extraidos do texto,
 * identificadores de negocio (CNPJ, email) e o texto bruto das paginas.
 * @param websiteUrl - URL do site a ser analisado
 * @returns Resultado completo do scraping ou null se vazio
 */
export const scrapeWebsite = async (websiteUrl: string): Promise<WebsiteScrapingResult | null> => {
  const client = new ApifyClient({ token: process.env.APIFY_API_TOKEN });

  try {
    const run = await client.actor(ACTOR_ID).call({
      startUrls: [{ url: websiteUrl }],
      maxCrawlPages: 5,
    });

    const { items } = await client.dataset(run.defaultDatasetId).listItems();

    if (!items.length) return null;

    // Filter relevant fields only (per D-15)
    const mainPage = items[0] as Record<string, unknown>;
    const allText = items
      .map((item) => (item as Record<string, unknown>).text as string)
      .filter(Boolean)
      .join('\n');

    // Extrair social links e identificadores do texto concatenado (per D-09, D-03)
    const socialLinks = extractSocialLinksFromText(allText);
    const businessIds = extractBusinessIdentifiers(allText);

    const websiteData: WebsiteData = {
      positioning: allText.slice(0, 500) || null,
      offer: null, // Extraido pela IA na fase de sintese
      pricing: null, // Extraido pela IA na fase de sintese
      metaTags: {
        title: (mainPage.title as string) ?? null,
        description:
          (mainPage.description as string) ??
          (mainPage.metaDescription as string) ??
          null,
        keywords: ((mainPage.keywords as string) ?? '')
          .split(',')
          .map((k: string) => k.trim())
          .filter(Boolean),
      },
      businessIdentifiers: businessIds,
    };

    return {
      websiteData,
      socialLinks,
      businessIdentifiers: businessIds,
      rawPagesText: allText,
    };
  } catch (error) {
    throw new Error(
      `Erro ao extrair dados do site "${websiteUrl}": ${(error as Error).message}`
    );
  }
};
