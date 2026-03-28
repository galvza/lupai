import { ApifyClient } from 'apify-client';

import { APIFY_ACTORS } from '@/config/apify';
import type { ViralVideoCandidate, EngagementMetrics, ContentPlatform } from '@/types/viral';

/**
 * Calcula taxa de engajamento de um video.
 * @param e - Metricas de engajamento
 * @returns Taxa de engajamento (0-1+)
 */
export const calculateEngagementRate = (e: EngagementMetrics): number => {
  const interactions = e.likes + e.comments + (e.shares ?? 0);
  const views = Math.max(e.views ?? 1, 1);
  return interactions / views;
};

/**
 * Deriva hashtags a partir do nicho e segmento para busca.
 * @param niche - Nicho principal (ex: "odontologia")
 * @param segment - Segmento especifico (ex: "estetica")
 * @returns Array de hashtags para busca
 */
export const deriveHashtags = (niche: string, segment: string): string[] => {
  const cleaned = (s: string) => s.toLowerCase().trim().replace(/\s+/g, '');
  const nicheWord = cleaned(niche);
  const segmentWord = cleaned(segment);
  const combined = `${nicheWord}${segmentWord}`;
  const hashtags = [nicheWord];
  if (segmentWord && segmentWord !== nicheWord) {
    hashtags.push(combined);
  }
  return [...new Set(hashtags)];
};

/**
 * Mapeia item bruto do TikTok Hashtag Scraper para ViralVideoCandidate.
 * Retorna null se item invalido (sem URL, duracao > 240s, ou ad) per D-07, D-12.
 * @param item - Item bruto do actor TikTok
 * @returns ViralVideoCandidate ou null se invalido
 */
export const mapTiktokItem = (item: Record<string, unknown>): ViralVideoCandidate | null => {
  const videoUrl = (item.webVideoUrl as string) ?? (item.videoUrl as string);
  if (!videoUrl) return null;

  // Filter ads per research recommendation
  if (item.isAd === true) return null;

  const videoMeta = item.videoMeta as Record<string, unknown> | undefined;
  const duration = (videoMeta?.duration as number) ?? 0;
  if (duration > 240) return null; // D-07: max 4 minutes

  const authorMeta = item.authorMeta as Record<string, unknown> | undefined;

  return {
    videoUrl,
    caption: (item.text as string) ?? '',
    creatorHandle: (authorMeta?.nickName as string) ?? 'unknown',
    platform: 'tiktok' as ContentPlatform,
    postDate: (item.createTimeISO as string) ?? '',
    durationSeconds: duration,
    engagement: {
      views: (item.playCount as number) ?? null,
      likes: (item.diggCount as number) ?? 0,
      comments: (item.commentCount as number) ?? 0,
      shares: (item.shareCount as number) ?? null,
      saves: (item.collectCount as number) ?? null,
    },
  };
};

/**
 * Filtra candidatos por data (ultimos 30 dias per D-05), ordena por engajamento (per D-06), retorna top N.
 * @param candidates - Array de candidatos a video viral
 * @param maxResults - Numero maximo de resultados (default: 5)
 * @returns Array filtrado e ordenado de ViralVideoCandidate
 */
export const filterAndSortCandidates = (
  candidates: ViralVideoCandidate[],
  maxResults: number = 5
): ViralVideoCandidate[] => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  return candidates
    .filter((c) => {
      if (!c.postDate) return true; // Keep if no date available
      const postDate = new Date(c.postDate);
      return postDate >= thirtyDaysAgo;
    })
    .sort((a, b) => calculateEngagementRate(b.engagement) - calculateEngagementRate(a.engagement))
    .slice(0, maxResults);
};

/**
 * Executa busca de videos virais no TikTok via Apify e retorna candidatos filtrados.
 * Helper interno — tenta uma busca com as hashtags fornecidas.
 * @param client - Cliente Apify
 * @param hashtags - Array de hashtags para busca
 * @returns Array de ViralVideoCandidate
 */
const runTiktokSearch = async (
  client: InstanceType<typeof ApifyClient>,
  hashtags: string[]
): Promise<ViralVideoCandidate[]> => {
  const run = await client.actor(APIFY_ACTORS.viralTiktok).call({
    hashtags,
    resultsPerPage: 20,
  });

  const { items } = await client.dataset(run.defaultDatasetId).listItems();
  if (!items.length) return [];

  const candidates = (items as Array<Record<string, unknown>>)
    .map(mapTiktokItem)
    .filter((c): c is ViralVideoCandidate => c !== null);

  return filterAndSortCandidates(candidates, 5);
};

/**
 * Busca videos virais do TikTok por hashtag/keyword usando Apify.
 * Implementa fallback de 3 niveis per D-40:
 *   1. Primary: hashtag search com niche+segment derivados
 *   2. Fallback: broader single-word niche hashtag
 *   3. Fallback 2: return [] (0 TikTok videos, continue with Instagram)
 * Per D-02: busca niche-wide, nao limitada a concorrentes.
 * Per D-10: usa clockworks/tiktok-hashtag-scraper.
 * @param niche - Nicho de mercado
 * @param segment - Segmento especifico
 * @returns Array de ViralVideoCandidate (max 5, per D-04)
 */
export const searchViralTiktok = async (
  niche: string,
  segment: string
): Promise<ViralVideoCandidate[]> => {
  const client = new ApifyClient({ token: process.env.APIFY_API_TOKEN });
  const primaryHashtags = deriveHashtags(niche, segment);

  // Tier 1: Primary hashtag search (per D-40)
  try {
    const results = await runTiktokSearch(client, primaryHashtags);
    if (results.length > 0) return results;
  } catch (error) {
    console.warn(
      `Aviso: busca primaria TikTok falhou para "${niche}": ${(error as Error).message}. Tentando busca mais ampla...`
    );
  }

  // Tier 2: Broader single-word niche keyword fallback (per D-40)
  const broaderHashtags = [niche.toLowerCase().trim().replace(/\s+/g, '')];
  try {
    const results = await runTiktokSearch(client, broaderHashtags);
    if (results.length > 0) return results;
  } catch (error) {
    console.warn(
      `Aviso: busca ampla TikTok falhou para "${niche}": ${(error as Error).message}. Retornando 0 videos TikTok.`
    );
  }

  // Tier 3: Return 0 TikTok videos — pipeline continues with Instagram only (per D-40)
  return [];
};
