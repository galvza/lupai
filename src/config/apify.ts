import { z } from 'zod';

const apifyConfigSchema = z.object({
  apiToken: z.string().min(1),
});

/** Configuracao da Apify validada via Zod (lazy — evita erro em testes sem env vars) */
let _apifyConfig: z.infer<typeof apifyConfigSchema> | null = null;
export const getApifyConfig = () => {
  if (!_apifyConfig) {
    _apifyConfig = apifyConfigSchema.parse({
      apiToken: process.env.APIFY_API_TOKEN,
    });
  }
  return _apifyConfig;
};

/** IDs dos actors da Apify usados no projeto */
export const APIFY_ACTORS = {
  instagram: 'apify/instagram-scraper',
  tiktok: 'clockworks/tiktok-scraper',
  facebookAds: 'apify/facebook-ads-scraper',
  similarweb: 'tri_angle/similarweb-scraper',
  googleMaps: 'compass/google-maps-scraper',
  googleAds: 'memo23/google-ad-transparency-scraper-cheerio',
  website: 'apify/website-content-crawler',
  viralTiktok: 'clockworks/tiktok-hashtag-scraper',
  viralInstagram: 'apify/instagram-hashtag-scraper',
} as const;

export type ApifyConfig = z.infer<typeof apifyConfigSchema>;
