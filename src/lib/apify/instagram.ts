import { ApifyClient } from 'apify-client';

import type { SocialData } from '@/types/competitor';

const ACTOR_ID = 'apify/instagram-scraper';

/**
 * Extrai dados do Instagram de um perfil usando Apify.
 * @param username - Nome de usuario do Instagram (sem @)
 * @returns Dados do perfil filtrados ou null se vazio
 */
export const scrapeInstagram = async (username: string): Promise<SocialData['instagram']> => {
  const client = new ApifyClient({ token: process.env.APIFY_API_TOKEN });

  try {
    const run = await client.actor(ACTOR_ID).call({
      usernames: [username],
      resultsLimit: 12,
    });

    const { items } = await client.dataset(run.defaultDatasetId).listItems();

    if (!items.length) return null;

    // Filter relevant fields only (per D-15)
    const profile = items[0] as Record<string, unknown>;
    return {
      followers: (profile.followersCount as number) ?? null,
      postingFrequency: null, // Calculated in synthesis phase
      engagementRate: (profile.avgEngagementRate as number) ?? null,
      topPosts: ((profile.latestPosts as Array<Record<string, unknown>>) ?? [])
        .slice(0, 6)
        .map((post) => ({
          url: (post.url as string) ?? '',
          caption: (post.caption as string) ?? null,
          likes: (post.likesCount as number) ?? 0,
          comments: (post.commentsCount as number) ?? 0,
          shares: null,
          postedAt: (post.timestamp as string) ?? null,
        })),
    };
  } catch (error) {
    throw new Error(
      `Erro ao extrair dados do Instagram para @${username}: ${(error as Error).message}`
    );
  }
};
