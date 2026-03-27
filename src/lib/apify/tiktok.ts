import { ApifyClient } from 'apify-client';

import type { SocialData } from '@/types/competitor';

const ACTOR_ID = 'clockworks/tiktok-scraper';

/**
 * Extrai dados do TikTok de um perfil usando Apify.
 * @param username - Nome de usuario do TikTok (sem @)
 * @returns Dados do perfil filtrados ou null se vazio
 */
export const scrapeTiktok = async (username: string): Promise<SocialData['tiktok']> => {
  const client = new ApifyClient({ token: process.env.APIFY_API_TOKEN });

  try {
    const run = await client.actor(ACTOR_ID).call({
      profiles: [username],
      resultsPerPage: 12,
    });

    const { items } = await client.dataset(run.defaultDatasetId).listItems();

    if (!items.length) return null;

    // Filter relevant fields only (per D-15)
    const profile = items[0] as Record<string, unknown>;
    const videos = (items as Array<Record<string, unknown>>).filter(
      (item) => item.videoUrl || item.webVideoUrl
    );

    return {
      followers: (profile.authorMeta as Record<string, unknown>)?.fans as number ?? null,
      postingFrequency: null, // Calculated in synthesis phase
      engagementRate: null, // Calculated from metrics in synthesis phase
      topPosts: videos.slice(0, 6).map((video) => ({
        url: (video.webVideoUrl as string) ?? (video.videoUrl as string) ?? '',
        caption: (video.text as string) ?? null,
        likes: (video.diggCount as number) ?? 0,
        comments: (video.commentCount as number) ?? 0,
        shares: (video.shareCount as number) ?? null,
        postedAt: (video.createTimeISO as string) ?? null,
      })),
    };
  } catch (error) {
    throw new Error(
      `Erro ao extrair dados do TikTok para @${username}: ${(error as Error).message}`
    );
  }
};
