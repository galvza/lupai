import type { SocialLinks } from '@/types/competitor';

/** Paths de redes sociais que nao sao perfis de usuario */
const NON_PROFILE_PATHS = new Set([
  'explore',
  'reels',
  'stories',
  'p',
  'reel',
  'tv',
  'sharer',
  'share',
  'intent',
  'hashtag',
  'login',
  'signup',
  'register',
  'help',
  'about',
  'legal',
  'privacy',
  'terms',
  'settings',
  'watch',
  'channel',
  'playlist',
]);

/** Padroes regex para extrair usernames de cada plataforma */
const SOCIAL_PATTERNS: Record<keyof SocialLinks, RegExp> = {
  instagram: /(?:https?:\/\/)?(?:www\.)?instagram\.com\/([a-zA-Z0-9_.]{1,30})/gi,
  tiktok: /(?:https?:\/\/)?(?:www\.)?tiktok\.com\/@?([a-zA-Z0-9_.]{1,30})/gi,
  facebook: /(?:https?:\/\/)?(?:www\.)?(?:facebook|fb)\.com\/([a-zA-Z0-9_.]{1,50})/gi,
  youtube: /(?:https?:\/\/)?(?:www\.)?youtube\.com\/(?:c\/|channel\/|@)([a-zA-Z0-9_-]{1,50})/gi,
  linkedin: /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/(?:company|in)\/([a-zA-Z0-9_-]{1,100})/gi,
  twitter: /(?:https?:\/\/)?(?:www\.)?(?:twitter|x)\.com\/([a-zA-Z0-9_]{1,15})/gi,
};

/**
 * Retorna o item mais frequente de um array de strings.
 * Agrupa case-insensitive mas preserva a forma original da primeira ocorrencia.
 * @param arr - Array de strings
 * @returns O item com maior frequencia, ou string vazia se array vazio
 */
const getMostFrequent = (arr: string[]): string => {
  if (arr.length === 0) return '';
  const freq = new Map<string, number>();
  const original = new Map<string, string>();
  for (const item of arr) {
    const lower = item.toLowerCase();
    freq.set(lower, (freq.get(lower) ?? 0) + 1);
    if (!original.has(lower)) {
      original.set(lower, item);
    }
  }
  let maxCount = 0;
  let maxKey = '';
  for (const [key, count] of freq) {
    if (count > maxCount) {
      maxCount = count;
      maxKey = key;
    }
  }
  return original.get(maxKey) ?? maxKey;
};

/**
 * Extrai links de redes sociais de um texto (paginas do site concatenadas).
 * Para cada plataforma, encontra todas as ocorrencias de URLs,
 * filtra paths que nao sao perfis, e retorna o username mais frequente.
 * @param pagesText - Texto concatenado das paginas do site
 * @returns Objeto SocialLinks com username ou null por plataforma
 */
export const extractSocialLinksFromText = (pagesText: string): SocialLinks => {
  const result: SocialLinks = {
    instagram: null,
    tiktok: null,
    facebook: null,
    youtube: null,
    linkedin: null,
    twitter: null,
  };

  for (const platform of Object.keys(SOCIAL_PATTERNS) as (keyof SocialLinks)[]) {
    const regex = SOCIAL_PATTERNS[platform];
    regex.lastIndex = 0;

    const usernames: string[] = [];
    let match: RegExpExecArray | null;

    while ((match = regex.exec(pagesText)) !== null) {
      const username = match[1];
      if (username && !NON_PROFILE_PATHS.has(username.toLowerCase())) {
        usernames.push(username);
      }
    }

    if (usernames.length > 0) {
      result[platform] = getMostFrequent(usernames);
    }
  }

  return result;
};
