import { ApifyClient } from 'apify-client';

import { APIFY_ACTORS } from '@/config/apify';
import type { ViralVideoCandidate, ContentPlatform } from '@/types/viral';
import { deriveHashtags, filterAndSortCandidates } from './tiktok-viral';

/**
 * Mapeia item bruto do Instagram Hashtag Scraper para ViralVideoCandidate.
 * Retorna null se item invalido (nao Video, sem videoUrl, duracao > 240s).
 * @param item - Item bruto do actor Instagram
 * @returns ViralVideoCandidate ou null se invalido
 */
export const mapInstagramItem = (item: Record<string, unknown>): ViralVideoCandidate | null => {
  const videoUrl = item.videoUrl as string;
  const type = item.type as string;
  // Accept Video type OR clips/reels productType (hashtag scraper uses productType)
  const productType = item.productType as string | undefined;
  const isVideo = type === 'Video' || productType === 'clips' || productType === 'reels';
  if (!videoUrl || !isVideo) return null;

  const duration = (item.videoDuration as number) ?? 0;
  if (duration > 240) return null; // max 4 minutes

  return {
    videoUrl,
    sourceWebUrl: (item.url as string) ?? undefined,
    caption: (item.caption as string) ?? '',
    creatorHandle: (item.ownerUsername as string) ?? 'unknown',
    platform: 'instagram' as ContentPlatform,
    postDate: (item.timestamp as string) ?? '',
    durationSeconds: duration,
    engagement: {
      // Hashtag scraper may not include play counts; fall back to likes as proxy
      views: (item.videoPlayCount as number) ?? (item.videoViewCount as number) ?? null,
      likes: Math.max((item.likesCount as number) ?? 0, 0), // -1 means hidden, treat as 0
      comments: (item.commentsCount as number) ?? 0,
      shares: null,
      saves: null,
    },
  };
};

/**
 * Busca videos virais do Instagram (Reels) por hashtag usando Apify.
 * Retorna top 5 Reels filtrados por duracao (<=240s) e data (30 dias), ordenados por engajamento.
 * Gera 3-5 hashtags relevantes a partir de niche + segment.
 * @param niche - Nicho de mercado
 * @param segment - Segmento especifico
 * @param aiHashtags - Hashtags geradas por Gemini (opcional, substitui deriveHashtags)
 * @returns Array de ViralVideoCandidate (max 5)
 */
export const searchViralInstagram = async (
  niche: string,
  segment: string,
  aiHashtags?: string[]
): Promise<ViralVideoCandidate[]> => {
  const client = new ApifyClient({ token: process.env.APIFY_API_TOKEN });
  const hashtags = aiHashtags && aiHashtags.length > 0 ? aiHashtags : deriveHashtags(niche, segment);

  console.log(`[Instagram Viral] Buscando com hashtags: ${JSON.stringify(hashtags)}${aiHashtags ? ' (Gemini)' : ' (derived)'}`);

  const maxAttempts = 2;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`[Instagram Viral] Tentativa ${attempt}/${maxAttempts}...`);
      const run = await client.actor(APIFY_ACTORS.viralInstagram).call(
        {
          hashtags,
          resultsType: 'reels',
          resultsLimit: 20,
        },
        { timeout: 120 }
      );

      const { items } = await client.dataset(run.defaultDatasetId).listItems();

      console.log(`[Instagram Viral] Actor retornou ${items.length} items brutos`);

      if (!items.length) {
        if (attempt < maxAttempts) {
          console.warn(`[Instagram Viral] 0 items na tentativa ${attempt}, retentando...`);
          continue;
        }
        return [];
      }

      const candidates = (items as Array<Record<string, unknown>>)
        .map(mapInstagramItem)
        .filter((c): c is ViralVideoCandidate => c !== null);

      console.log(`[Instagram Viral] ${candidates.length} videos validos apos filtragem (Reels only, <=240s)`);

      const sorted = filterAndSortCandidates(candidates, 5);

      if (sorted.length > 0) {
        console.log(`[Instagram Viral] Top video: ${sorted[0].engagement.views ?? 0} views, ${sorted[0].engagement.likes} likes`);
      }

      return sorted;
    } catch (error) {
      console.error(`[Instagram Viral] Erro na tentativa ${attempt}/${maxAttempts}: ${(error as Error).message}`);
      if (attempt === maxAttempts) {
        throw new Error(
          `Erro ao buscar videos virais do Instagram para "${niche}": ${(error as Error).message}`
        );
      }
    }
  }
  return [];
};
