import { ApifyClient } from 'apify-client';

import { APIFY_ACTORS } from '@/config/apify';
import type { ViralVideoCandidate, ContentPlatform } from '@/types/viral';
import { deriveHashtags, filterAndSortCandidates } from './tiktok-viral';

/**
 * Mapeia item bruto do Instagram Hashtag Scraper para ViralVideoCandidate.
 * Retorna null se item invalido (nao Video, sem videoUrl, duracao > 240s) per D-07, D-11.
 * @param item - Item bruto do actor Instagram
 * @returns ViralVideoCandidate ou null se invalido
 */
export const mapInstagramItem = (item: Record<string, unknown>): ViralVideoCandidate | null => {
  const videoUrl = item.videoUrl as string;
  const type = item.type as string;
  if (!videoUrl || type !== 'Video') return null; // Only Reels/Video

  const duration = (item.videoDuration as number) ?? 0;
  if (duration > 240) return null; // D-07: max 4 minutes

  return {
    videoUrl,
    caption: (item.caption as string) ?? '',
    creatorHandle: (item.ownerUsername as string) ?? 'unknown',
    platform: 'instagram' as ContentPlatform,
    postDate: (item.timestamp as string) ?? '',
    durationSeconds: duration,
    engagement: {
      views: (item.videoPlayCount as number) ?? (item.videoViewCount as number) ?? null,
      likes: Math.max((item.likesCount as number) ?? 0, 0), // -1 means hidden, treat as 0
      comments: (item.commentsCount as number) ?? 0,
      shares: null, // Instagram hashtag scraper may not include shares
      saves: null,
    },
  };
};

/**
 * Busca videos virais do Instagram (Reels) por hashtag usando Apify.
 * Retorna top 5 Reels filtrados por duracao (<=240s) e data (30 dias), ordenados por engajamento.
 * Per D-02: busca niche-wide, nao limitada a concorrentes.
 * Per D-11: usa apify/instagram-hashtag-scraper.
 * @param niche - Nicho de mercado
 * @param segment - Segmento especifico
 * @returns Array de ViralVideoCandidate (max 5, per D-04)
 */
export const searchViralInstagram = async (
  niche: string,
  segment: string
): Promise<ViralVideoCandidate[]> => {
  const client = new ApifyClient({ token: process.env.APIFY_API_TOKEN });
  const hashtags = deriveHashtags(niche, segment);

  try {
    const run = await client.actor(APIFY_ACTORS.viralInstagram).call({
      hashtags,
      resultsPerHashtag: 20,
      searchType: 'recent',
    });

    const { items } = await client.dataset(run.defaultDatasetId).listItems();

    if (!items.length) return [];

    const candidates = (items as Array<Record<string, unknown>>)
      .map(mapInstagramItem)
      .filter((c): c is ViralVideoCandidate => c !== null);

    return filterAndSortCandidates(candidates, 5);
  } catch (error) {
    throw new Error(
      `Erro ao buscar videos virais do Instagram para "${niche}": ${(error as Error).message}`
    );
  }
};
