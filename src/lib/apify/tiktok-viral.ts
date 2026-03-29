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
  const clean = (s: string) => s.toLowerCase().trim().replace(/\s+/g, '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const nicheWord = clean(niche);
  const segmentWord = clean(segment);
  // Extract first word of niche for shorter/broader hashtag
  const nicheFirstWord = (niche.toLowerCase().trim().split(/\s+/)[0] ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');

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
 * Mapeia item bruto do sociavault/tiktok-keyword-search-scraper para ViralVideoCandidate.
 * O actor retorna dados no formato raw da API TikTok com aweme_info aninhado.
 * Retorna null se item invalido (sem URL de download, duracao > 240s, ou anuncio).
 * @param item - Item bruto do actor (contém aweme_info)
 * @returns ViralVideoCandidate ou null se invalido
 */
export const mapTiktokItem = (item: Record<string, unknown>): ViralVideoCandidate | null => {
  const aweme = item.aweme_info as Record<string, unknown> | undefined;
  if (!aweme) return null;

  // Video object with download URLs
  const video = aweme.video as Record<string, unknown> | undefined;
  if (!video) return null;

  // Prefer no-watermark URL, fallback to play_addr
  const dlNoWm = video.download_no_watermark_addr as Record<string, unknown> | undefined;
  const dlNoWmUrls = dlNoWm?.url_list as string[] | undefined;
  const playAddr = video.play_addr as Record<string, unknown> | undefined;
  const playUrls = playAddr?.url_list as string[] | undefined;

  const downloadUrl = dlNoWmUrls?.[0] ?? playUrls?.[0] ?? null;
  if (!downloadUrl) return null;

  // Filter ads
  if (aweme.is_ads === true) return null;

  // Duration is in milliseconds — convert to seconds
  const durationMs = (video.duration as number) ?? 0;
  const durationSeconds = Math.round(durationMs / 1000);
  if (durationSeconds > 240) return null; // max 4 minutes

  // Author info
  const author = aweme.author as Record<string, unknown> | undefined;

  // Statistics
  const stats = aweme.statistics as Record<string, unknown> | undefined;

  // Construct web URL from aweme_id and author unique_id
  const awemeId = aweme.aweme_id as string | undefined;
  const uniqueId = author?.unique_id as string | undefined;
  const webUrl = awemeId && uniqueId
    ? `https://www.tiktok.com/@${uniqueId}/video/${awemeId}`
    : undefined;

  // Create time (unix timestamp) to ISO string
  const createTime = aweme.create_time as number | undefined;
  const postDate = createTime ? new Date(createTime * 1000).toISOString() : '';

  return {
    videoUrl: downloadUrl,
    sourceWebUrl: webUrl,
    caption: (aweme.desc as string) ?? '',
    creatorHandle: (author?.nickname as string) ?? (author?.unique_id as string) ?? 'unknown',
    platform: 'tiktok' as ContentPlatform,
    postDate,
    durationSeconds,
    engagement: {
      views: (stats?.play_count as number) ?? null,
      likes: (stats?.digg_count as number) ?? 0,
      comments: (stats?.comment_count as number) ?? 0,
      shares: (stats?.share_count as number) ?? null,
      saves: (stats?.collect_count as number) ?? null,
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
 * Busca videos virais do TikTok por keyword usando sociavault/tiktok-keyword-search-scraper.
 * O actor aceita uma query string e retorna resultados com CDN download URLs.
 * @param niche - Nicho de mercado
 * @param segment - Segmento especifico
 * @param hashtags - Hashtags geradas por Gemini (opcional, usa primeira como query)
 * @returns Array de ViralVideoCandidate (max 5)
 */
export const searchViralTiktok = async (
  niche: string,
  segment: string,
  hashtags?: string[]
): Promise<ViralVideoCandidate[]> => {
  const client = new ApifyClient({ token: process.env.APIFY_API_TOKEN });

  // Build search query: prefer Gemini hashtag, fallback to segment
  const query = hashtags && hashtags.length > 0
    ? hashtags[0]
    : segment.toLowerCase().trim() || niche.toLowerCase().trim();

  console.log(`[TikTok Viral] Buscando com query: "${query}"${hashtags ? ' (Gemini)' : ' (derived)'}`);

  try {
    const run = await client.actor(APIFY_ACTORS.viralTiktok).call({
      query,
      maxResults: 30,
    });

    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    if (!items.length) {
      console.log('[TikTok Viral] Actor retornou 0 items.');
      return [];
    }

    console.log(`[TikTok Viral] Actor retornou ${items.length} items brutos.`);

    const candidates = (items as Array<Record<string, unknown>>)
      .map(mapTiktokItem)
      .filter((c): c is ViralVideoCandidate => c !== null);

    console.log(`[TikTok Viral] ${candidates.length} videos validos apos filtragem (<=240s, com URL, sem ads).`);

    const sorted = filterAndSortCandidates(candidates, 5);

    if (sorted.length > 0) {
      console.log(`[TikTok Viral] Top video: ${sorted[0].engagement.views ?? 0} views, ${sorted[0].engagement.likes} likes`);
    }

    return sorted;
  } catch (error) {
    console.warn(`Aviso: busca TikTok falhou para "${query}": ${(error as Error).message}`);
    return [];
  }
};
