import { z } from 'zod';

const apifyConfigSchema = z.object({
  apiToken: z.string().min(1),
});

/** Configuracao da Apify validada via Zod */
export const apifyConfig = apifyConfigSchema.parse({
  apiToken: process.env.APIFY_API_TOKEN,
});

/** IDs dos actors da Apify usados no projeto */
export const APIFY_ACTORS = {
  instagram: 'apify/instagram-scraper',
  tiktok: 'clockworks/tiktok-scraper',
  facebookAds: 'apify/facebook-ads-scraper',
  similarweb: 'tri_angle/similarweb-scraper',
  googleMaps: 'compass/google-maps-scraper',
  googleAds: 'memo23/google-ad-transparency-scraper-cheerio',
  website: 'apify/website-content-crawler',
} as const;

export type ApifyConfig = z.infer<typeof apifyConfigSchema>;
