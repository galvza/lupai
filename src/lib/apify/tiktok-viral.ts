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
 * Deriva keywords de busca a partir do nicho e segmento para TikTok keyword search.
 * Prioriza o segmento (termo mais especifico e buscavel).
 * @param niche - Nicho principal (ex: "academia")
 * @param segment - Segmento especifico (ex: "crossfit")
 * @returns Array de keywords para busca (max 3)
 */
export const deriveKeywords = (niche: string, segment: string): string[] => {
  const nicheClean = niche.toLowerCase().trim();
  const segmentClean = segment.toLowerCase().trim();

  const keywords: string[] = [];

  // Segment is the most specific/searchable term
  if (segmentClean) {
    keywords.push(segmentClean);
  }

  // Combined: "segment niche" for more specific search
  if (nicheClean && segmentClean && nicheClean !== segmentClean) {
    keywords.push(`${segmentClean} ${nicheClean}`);
  }

  // Niche alone as broader fallback
  if (nicheClean && nicheClean !== segmentClean) {
    keywords.push(nicheClean);
  }

  return [...new Set(keywords)].slice(0, 3);
};

/**
 * Deriva hashtags a partir do nicho e segmento para busca no Instagram.
 * Gera 3-5 hashtags relevantes com o segmento como principal.
 * @param niche - Nicho principal (ex: "academia")
 * @param segment - Segmento especifico (ex: "crossfit")
 * @returns Array de hashtags para busca (max 5, sem #)
 */
export const deriveHashtags = (niche: string, segment: string): string[] => {
  const clean = (s: string) => s.toLowerCase().trim().replace(/\s+/g, '');
  const nicheWord = clean(niche);
  const segmentWord = clean(segment);
  // Extract first word of niche for shorter/broader hashtag
  const nicheFirstWord = niche.toLowerCase().trim().split(/\s+/)[0] ?? '';

  const hashtags: string[] = [];

  // Niche alone (broader, more likely to have Reels)
  if (nicheWord) {
    hashtags.push(nicheWord);
  }

  // First word of niche (even broader — e.g. "suplementos" from "suplementos esportivos")
  if (nicheFirstWord && nicheFirstWord !== nicheWord) {
    hashtags.push(nicheFirstWord);
  }

  // Segment (most specific)
  if (segmentWord && segmentWord !== nicheWord) {
    hashtags.push(segmentWord);
  }

  // Niche + brasil for local reach
  if (nicheWord) {
    hashtags.push(`${nicheWord}brasil`);
  }

  // Niche + dicas (tips — high Reels density)
  if (nicheFirstWord) {
    hashtags.push(`${nicheFirstWord}dicas`);
  }

  return [...new Set(hashtags)].slice(0, 5);
};

/**
 * Mapeia item bruto do TikTok Data Extractor (free-tiktok-scraper) para ViralVideoCandidate.
 * Retorna null se item invalido (sem URL, duracao > 240s, ou ad).
 * @param item - Item bruto do actor TikTok
 * @returns ViralVideoCandidate ou null se invalido
 */
export const mapTiktokItem = (item: Record<string, unknown>): ViralVideoCandidate | null => {
  const videoUrl = (item.webVideoUrl as string) ?? (item.videoUrl as string);
  if (!videoUrl) return null;

  // Filter ads
  if (item.isAd === true) return null;

  const videoMeta = item.videoMeta as Record<string, unknown> | undefined;
  const duration = (videoMeta?.duration as number) ?? 0;
  if (duration > 240) return null; // max 4 minutes

  const authorMeta = item.authorMeta as Record<string, unknown> | undefined;

  return {
    videoUrl,
    caption: (item.text as string) ?? '',
    creatorHandle: (authorMeta?.nickName as string) ?? (authorMeta?.name as string) ?? 'unknown',
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
 * Ordena candidatos por engajamento e retorna top N.
 * Sem filtro de data — videos virais antigos ainda sao valiosos para analise de padroes.
 * @param candidates - Array de candidatos a video viral
 * @param maxResults - Numero maximo de resultados (default: 5)
 * @returns Array ordenado de ViralVideoCandidate
 */
export const filterAndSortCandidates = (
  candidates: ViralVideoCandidate[],
  maxResults: number = 5
): ViralVideoCandidate[] => {
  return candidates
    .sort((a, b) => {
      // Primary sort: by views (most viral first)
      const aViews = a.engagement.views ?? 0;
      const bViews = b.engagement.views ?? 0;
      if (bViews !== aViews) return bViews - aViews;
      // Secondary sort: by engagement rate
      return calculateEngagementRate(b.engagement) - calculateEngagementRate(a.engagement);
    })
    .slice(0, maxResults);
};

/**
 * Executa busca de videos virais no TikTok via Apify keyword search.
 * Usa clockworks/free-tiktok-scraper com searchQueries.
 * @param client - Cliente Apify
 * @param keywords - Array de keywords para busca
 * @returns Array de ViralVideoCandidate
 */
const runTiktokSearch = async (
  client: InstanceType<typeof ApifyClient>,
  keywords: string[]
): Promise<ViralVideoCandidate[]> => {
  const run = await client.actor(APIFY_ACTORS.viralTiktok).call({
    searchQueries: keywords,
    resultsPerPage: 3,
    excludePinnedPosts: true,
    shouldDownloadCovers: false,
    shouldDownloadSlideshowImages: false,
    shouldDownloadSubtitles: false,
    shouldDownloadVideos: false,
  });

  const { items } = await client.dataset(run.defaultDatasetId).listItems();
  if (!items.length) return [];

  const candidates = (items as Array<Record<string, unknown>>)
    .map(mapTiktokItem)
    .filter((c): c is ViralVideoCandidate => c !== null);

  return filterAndSortCandidates(candidates, 5);
};

/**
 * Busca videos virais do TikTok por keyword usando Apify.
 * Implementa fallback de 3 niveis:
 *   1. Primary: keyword search com segment + niche combinados
 *   2. Fallback: broader single-word segment keyword
 *   3. Fallback 2: return [] (0 TikTok videos, continue with Instagram)
 * @param niche - Nicho de mercado
 * @param segment - Segmento especifico
 * @param hashtags - Hashtags geradas por Gemini (opcional, substitui deriveKeywords)
 * @returns Array de ViralVideoCandidate (max 5)
 */
export const searchViralTiktok = async (
  niche: string,
  segment: string,
  hashtags?: string[]
): Promise<ViralVideoCandidate[]> => {
  const client = new ApifyClient({ token: process.env.APIFY_API_TOKEN });
  const primaryKeywords = hashtags && hashtags.length > 0 ? hashtags : deriveKeywords(niche, segment);

  console.log(`[TikTok Viral] Buscando com keywords: ${JSON.stringify(primaryKeywords)}${hashtags ? ' (Gemini)' : ' (derived)'}`);


  // Tier 1: Primary keyword search
  try {
    const results = await runTiktokSearch(client, primaryKeywords);
    if (results.length > 0) {
      console.log(`[TikTok Viral] Encontrados ${results.length} videos (tier 1). Top views: ${results[0]?.engagement.views ?? 0}`);
      return results;
    }
  } catch (error) {
    console.warn(
      `Aviso: busca primaria TikTok falhou para "${niche}": ${(error as Error).message}. Tentando busca mais ampla...`
    );
  }

  // Tier 2: Broader single-word segment keyword fallback
  const broaderKeywords = [segment.toLowerCase().trim()];
  if (broaderKeywords[0] === primaryKeywords[0]) {
    // Already tried this keyword, try niche instead
    broaderKeywords[0] = niche.toLowerCase().trim();
  }

  console.log(`[TikTok Viral] Tentando fallback com keywords: ${JSON.stringify(broaderKeywords)}`);

  try {
    const results = await runTiktokSearch(client, broaderKeywords);
    if (results.length > 0) {
      console.log(`[TikTok Viral] Encontrados ${results.length} videos (tier 2). Top views: ${results[0]?.engagement.views ?? 0}`);
      return results;
    }
  } catch (error) {
    console.warn(
      `Aviso: busca ampla TikTok falhou para "${niche}": ${(error as Error).message}. Retornando 0 videos TikTok.`
    );
  }

  // Tier 3: Return 0 TikTok videos — pipeline continues with Instagram only
  console.log('[TikTok Viral] Nenhum video encontrado em nenhum tier.');
  return [];
};
