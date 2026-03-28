import type { SocialLinks, SocialProfileInput } from '@/types/competitor';
import { scrapeGoogleSearch } from '@/lib/apify/google-search';

/** Dominios das plataformas que fazemos scraping (per D-21) */
const PLATFORM_DOMAINS: Record<string, string> = {
  instagram: 'instagram.com',
  tiktok: 'tiktok.com',
};

/** Padroes para extrair username de URL por plataforma */
const PLATFORM_URL_PATTERNS: Record<string, RegExp> = {
  instagram: /(?:https?:\/\/)?(?:www\.)?instagram\.com\/([a-zA-Z0-9_.]{1,30})/i,
  tiktok: /(?:https?:\/\/)?(?:www\.)?tiktok\.com\/@?([a-zA-Z0-9_.]{1,30})/i,
};

/**
 * Normaliza uma string removendo acentos, convertendo para minusculo
 * e removendo caracteres nao-alfanumericos.
 * @param str - String a ser normalizada
 * @returns String normalizada
 */
const normalize = (str: string): string => {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
};

/**
 * Verifica se um handle de rede social e similar ao nome da marca.
 * Usa normalizacao (remove acentos, pontuacao) e verifica inclusao
 * ou >= 50% de match por palavras.
 * @param brandName - Nome da marca/empresa
 * @param handle - Handle/username da rede social
 * @returns true se o handle e provavelmente da mesma marca
 */
export const isBrandNameSimilar = (brandName: string, handle: string): boolean => {
  const normalizedBrand = normalize(brandName);
  const normalizedHandle = normalize(handle);

  if (!normalizedBrand || !normalizedHandle) return false;

  // Verificacao de inclusao direta (a string menor deve ter ao menos 50% do tamanho da maior)
  const shorter = normalizedHandle.length <= normalizedBrand.length ? normalizedHandle : normalizedBrand;
  const longer = normalizedHandle.length > normalizedBrand.length ? normalizedHandle : normalizedBrand;
  if (longer.includes(shorter) && shorter.length >= longer.length * 0.5) {
    return true;
  }

  // Verificacao por palavras: >= 50% das palavras do brand devem estar no handle
  const brandWords = brandName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .split(/[\s_.-]+/)
    .filter((w) => w.length > 2);

  if (brandWords.length === 0) return false;

  const matchedWords = brandWords.filter((word) => normalizedHandle.includes(word));
  return matchedWords.length / brandWords.length >= 0.5;
};

/**
 * Extrai username de uma URL de rede social para a plataforma especificada.
 * @param url - URL completa do perfil
 * @param platform - Nome da plataforma (instagram, tiktok)
 * @returns Username extraido ou null
 */
export const extractUsernameFromUrl = (url: string, platform: string): string | null => {
  const pattern = PLATFORM_URL_PATTERNS[platform];
  if (!pattern) return null;

  const match = url.match(pattern);
  return match?.[1] ?? null;
};

/**
 * Busca perfis de redes sociais via Google Search como fallback
 * quando nao foram encontrados no site.
 * @param competitorName - Nome do concorrente
 * @param missingPlatforms - Plataformas nao encontradas no site
 * @returns Record com perfis encontrados ou null por plataforma
 */
export const findSocialProfilesViaSearch = async (
  competitorName: string,
  missingPlatforms: string[]
): Promise<Record<string, SocialProfileInput | null>> => {
  const result: Record<string, SocialProfileInput | null> = {};
  for (const platform of missingPlatforms) {
    result[platform] = null;
  }

  try {
    // Batch all queries into single call (per D-04, Pitfall 4)
    const queries = missingPlatforms.map((p) => `${competitorName} ${p}`);
    const searchResults = await scrapeGoogleSearch(queries);

    for (const searchResult of searchResults) {
      for (const platform of missingPlatforms) {
        // Ja encontrado? Skip
        if (result[platform] !== null) continue;

        const domain = PLATFORM_DOMAINS[platform];
        if (!domain || !searchResult.url.includes(domain)) continue;

        const username = extractUsernameFromUrl(searchResult.url, platform);
        if (!username) continue;

        // Valida com brand name similarity
        if (isBrandNameSimilar(competitorName, username)) {
          result[platform] = { username, source: 'search_fallback' };
        }
      }
    }

    return result;
  } catch {
    // Per D-42 golden rule: em caso de erro, retorna tudo null
    return result;
  }
};

/**
 * Mescla fontes de perfis sociais com prioridade: website > search_fallback > ai_hint.
 * Retorna apenas as 2 plataformas que fazemos scraping (instagram, tiktok).
 * @param websiteLinks - Links encontrados no site
 * @param searchResults - Resultados do fallback via Google Search
 * @param aiHints - Hints de perfis sociais vindos da IA
 * @returns Perfis mesclados para instagram e tiktok
 */
export const mergeSocialSources = (
  websiteLinks: SocialLinks,
  searchResults: Record<string, SocialProfileInput | null>,
  aiHints: { instagram: string | null; tiktok: string | null; facebook: string | null }
): { instagram: SocialProfileInput | null; tiktok: SocialProfileInput | null } => {
  const platforms = ['instagram', 'tiktok'] as const;
  const merged: { instagram: SocialProfileInput | null; tiktok: SocialProfileInput | null } = {
    instagram: null,
    tiktok: null,
  };

  for (const platform of platforms) {
    // Prioridade 1: website
    if (websiteLinks[platform]) {
      merged[platform] = { username: websiteLinks[platform]!, source: 'website' };
      continue;
    }

    // Prioridade 2: search_fallback
    if (searchResults[platform]) {
      merged[platform] = searchResults[platform];
      continue;
    }

    // Prioridade 3: ai_hint
    if (aiHints[platform]) {
      merged[platform] = { username: aiHints[platform]!, source: 'ai_hint' };
    }
  }

  return merged;
};
