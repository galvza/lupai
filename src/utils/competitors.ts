/** Dominios bloqueados: marketplaces (D-05), portais genericos (D-06) e redes sociais */
export const BLOCKED_DOMAINS: string[] = [
  'amazon.com.br',
  'mercadolivre.com.br',
  'shopee.com.br',
  'magazineluiza.com.br',
  'americanas.com.br',
  'aliexpress.com',
  'casasbahia.com.br',
  'wikipedia.org',
  'youtube.com',
  'reddit.com',
  'reclameaqui.com.br',
  'yelp.com',
  'facebook.com',
  'instagram.com',
  'tiktok.com',
  'twitter.com',
  'x.com',
  'linkedin.com',
  'pinterest.com',
  'google.com',
  'google.com.br',
];

/** Candidato bruto a concorrente antes do scoring pela IA */
export interface RawCompetitorCandidate {
  name: string;
  url: string;
  description: string;
  source: 'google-search' | 'google-maps' | 'facebook-ads' | 'similarweb';
}

/**
 * Extrai o dominio base de uma URL, removendo www. e protocolo.
 * @param url - URL completa
 * @returns Dominio base em minusculo ou string vazia em caso de erro
 */
export const extractBaseDomain = (url: string): string => {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return '';
  }
};

/**
 * Verifica se um dominio esta na lista de bloqueio.
 * @param url - URL a ser verificada
 * @returns true se o dominio esta bloqueado ou se a URL e invalida
 */
export const isBlockedDomain = (url: string): boolean => {
  const domain = extractBaseDomain(url);
  if (!domain) return true;
  return BLOCKED_DOMAINS.some((blocked) => domain.includes(blocked));
};

/**
 * Filtra candidatos removendo os que pertencem a dominios bloqueados.
 * @param candidates - Lista de candidatos brutos
 * @returns Candidatos que passaram pelo filtro de blocklist
 */
export const filterBlockedDomains = (
  candidates: RawCompetitorCandidate[]
): RawCompetitorCandidate[] => {
  return candidates.filter((c) => !isBlockedDomain(c.url));
};

/**
 * Remove candidatos duplicados por dominio base, mantendo a entrada com descricao mais longa.
 * @param candidates - Lista de candidatos brutos
 * @returns Candidatos deduplicados por dominio
 */
export const deduplicateCandidates = (
  candidates: RawCompetitorCandidate[]
): RawCompetitorCandidate[] => {
  const seen = new Map<string, RawCompetitorCandidate>();

  for (const candidate of candidates) {
    const domain = extractBaseDomain(candidate.url);
    if (!domain) continue;

    const existing = seen.get(domain);
    if (!existing || candidate.description.length > existing.description.length) {
      seen.set(domain, candidate);
    }
  }

  return Array.from(seen.values());
};
