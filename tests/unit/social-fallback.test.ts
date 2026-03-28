import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  isBrandNameSimilar,
  mergeSocialSources,
  findSocialProfilesViaSearch,
} from '@/utils/socialFallback';
import type { SocialLinks, SocialProfileInput } from '@/types/competitor';

// Mock scrapeGoogleSearch
vi.mock('@/lib/apify/google-search', () => ({
  scrapeGoogleSearch: vi.fn(),
}));

import { scrapeGoogleSearch } from '@/lib/apify/google-search';

describe('isBrandNameSimilar', () => {
  it('retorna true quando handle normalizado inclui brand normalizado', () => {
    expect(isBrandNameSimilar('Acme Fitness', 'acmefitness')).toBe(true);
  });

  it('retorna true quando handle com underscore inclui brand', () => {
    expect(isBrandNameSimilar('Acme Fitness', 'acme_fitness')).toBe(true);
  });

  it('retorna false para nomes completamente diferentes', () => {
    expect(isBrandNameSimilar('Acme Fitness', 'totallydifferent')).toBe(false);
  });

  it('retorna false para match parcial abaixo de 50% das palavras', () => {
    expect(isBrandNameSimilar('Padaria Bom Pao', 'bomp')).toBe(false);
  });

  it('retorna true para nomes com acentos (normaliza acentos)', () => {
    expect(isBrandNameSimilar('Clínica São Paulo', 'clinicasaopaulo')).toBe(true);
  });

  it('retorna true quando brand normalizado inclui handle', () => {
    expect(isBrandNameSimilar('acmefitnessbrazil', 'acmefitness')).toBe(true);
  });

  it('retorna true quando >= 50% das palavras do brand estao no handle', () => {
    expect(isBrandNameSimilar('Acme Fitness Studio', 'acmefitness')).toBe(true);
  });
});

describe('mergeSocialSources', () => {
  const emptyLinks: SocialLinks = {
    instagram: null,
    tiktok: null,
    facebook: null,
    youtube: null,
    linkedin: null,
    twitter: null,
  };

  it('prioriza website sobre search_fallback e ai_hint', () => {
    const websiteLinks: SocialLinks = {
      ...emptyLinks,
      instagram: 'ig_from_website',
      tiktok: 'tk_from_website',
    };
    const searchResults: Record<string, SocialProfileInput | null> = {
      instagram: { username: 'ig_from_search', source: 'search_fallback' },
      tiktok: { username: 'tk_from_search', source: 'search_fallback' },
    };
    const aiHints = { instagram: 'ig_from_ai', tiktok: 'tk_from_ai', facebook: 'fb_from_ai' };

    const merged = mergeSocialSources(websiteLinks, searchResults, aiHints);
    expect(merged.instagram?.username).toBe('ig_from_website');
    expect(merged.instagram?.source).toBe('website');
    expect(merged.tiktok?.username).toBe('tk_from_website');
    expect(merged.tiktok?.source).toBe('website');
  });

  it('usa search_fallback quando website nao tem', () => {
    const searchResults: Record<string, SocialProfileInput | null> = {
      instagram: { username: 'ig_search', source: 'search_fallback' },
      tiktok: null,
    };
    const aiHints = { instagram: null, tiktok: 'tk_ai', facebook: null };

    const merged = mergeSocialSources(emptyLinks, searchResults, aiHints);
    expect(merged.instagram?.username).toBe('ig_search');
    expect(merged.instagram?.source).toBe('search_fallback');
  });

  it('usa ai_hint como ultimo recurso', () => {
    const searchResults: Record<string, SocialProfileInput | null> = {
      instagram: null,
      tiktok: null,
    };
    const aiHints = { instagram: 'ig_ai', tiktok: null, facebook: null };

    const merged = mergeSocialSources(emptyLinks, searchResults, aiHints);
    expect(merged.instagram?.username).toBe('ig_ai');
    expect(merged.instagram?.source).toBe('ai_hint');
    expect(merged.tiktok).toBeNull();
  });

  it('retorna null para plataformas sem nenhuma fonte', () => {
    const searchResults: Record<string, SocialProfileInput | null> = {
      instagram: null,
      tiktok: null,
    };
    const aiHints = { instagram: null, tiktok: null, facebook: null };

    const merged = mergeSocialSources(emptyLinks, searchResults, aiHints);
    expect(merged.instagram).toBeNull();
    expect(merged.tiktok).toBeNull();
  });
});

describe('findSocialProfilesViaSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna perfis com source search_fallback quando Google encontra URLs validas', async () => {
    const mockResults = [
      { title: 'Acme Fitness (@acmefitness) Instagram', url: 'https://instagram.com/acmefitness', description: 'Perfil oficial' },
    ];
    vi.mocked(scrapeGoogleSearch).mockResolvedValue(mockResults);

    const result = await findSocialProfilesViaSearch('Acme Fitness', ['instagram']);
    expect(result.instagram).not.toBeNull();
    expect(result.instagram?.username).toBe('acmefitness');
    expect(result.instagram?.source).toBe('search_fallback');
  });

  it('retorna null quando Google nao encontra URLs de redes sociais', async () => {
    vi.mocked(scrapeGoogleSearch).mockResolvedValue([
      { title: 'Acme', url: 'https://acme.com', description: 'Site principal' },
    ]);

    const result = await findSocialProfilesViaSearch('Acme Fitness', ['instagram']);
    expect(result.instagram).toBeNull();
  });

  it('retorna todos null em caso de erro (golden rule D-42)', async () => {
    vi.mocked(scrapeGoogleSearch).mockRejectedValue(new Error('Network error'));

    const result = await findSocialProfilesViaSearch('Acme', ['instagram', 'tiktok']);
    expect(result.instagram).toBeNull();
    expect(result.tiktok).toBeNull();
  });

  it('rejeita handle quando brand name nao e similar', async () => {
    vi.mocked(scrapeGoogleSearch).mockResolvedValue([
      { title: 'Some random page', url: 'https://instagram.com/totallyrandom', description: '' },
    ]);

    const result = await findSocialProfilesViaSearch('Acme Fitness', ['instagram']);
    expect(result.instagram).toBeNull();
  });
});
