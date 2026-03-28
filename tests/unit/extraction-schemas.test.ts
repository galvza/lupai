import { describe, it, expect } from 'vitest';
import {
  websiteDataSchema,
  seoDataSchema,
  socialDataSchema,
  validateOrNull,
} from '@/lib/validation/extractionSchemas';
import { z } from 'zod';

describe('websiteDataSchema', () => {
  it('aceita dados validos com positioning definido', () => {
    const data = {
      positioning: 'Clinica de odontologia premium',
      offer: null,
      pricing: null,
      metaTags: { title: 'Clinica Sorriso', description: null, keywords: [] },
    };
    expect(() => websiteDataSchema.parse(data)).not.toThrow();
  });

  it('aceita dados com apenas metaTags.title definido (D-29)', () => {
    const data = {
      positioning: null,
      offer: null,
      pricing: null,
      metaTags: { title: 'Clinica Sorriso', description: null, keywords: [] },
    };
    expect(() => websiteDataSchema.parse(data)).not.toThrow();
  });

  it('rejeita dados com todos os campos null (positioning, title, description)', () => {
    const data = {
      positioning: null,
      offer: null,
      pricing: null,
      metaTags: { title: null, description: null, keywords: [] },
    };
    expect(() => websiteDataSchema.parse(data)).toThrow();
  });

  it('aceita dados com apenas metaTags.description definido', () => {
    const data = {
      positioning: null,
      offer: null,
      pricing: null,
      metaTags: { title: null, description: 'Uma clinica incrivel', keywords: [] },
    };
    expect(() => websiteDataSchema.parse(data)).not.toThrow();
  });
});

describe('seoDataSchema', () => {
  it('aceita dados com apenas topKeywords (D-30)', () => {
    const data = {
      estimatedAuthority: null,
      topKeywords: ['odontologia', 'clinica dental'],
      estimatedTraffic: null,
      backlinks: null,
    };
    expect(() => seoDataSchema.parse(data)).not.toThrow();
  });

  it('aceita dados completos', () => {
    const data = {
      estimatedAuthority: 42,
      topKeywords: ['odontologia'],
      estimatedTraffic: 5000,
      backlinks: 120,
    };
    expect(() => seoDataSchema.parse(data)).not.toThrow();
  });

  it('rejeita dados completamente vazios', () => {
    const data = {
      estimatedAuthority: null,
      topKeywords: [],
      estimatedTraffic: null,
      backlinks: null,
    };
    expect(() => seoDataSchema.parse(data)).toThrow();
  });

  it('aceita dados com apenas estimatedAuthority', () => {
    const data = {
      estimatedAuthority: 10,
      topKeywords: [],
      estimatedTraffic: null,
      backlinks: null,
    };
    expect(() => seoDataSchema.parse(data)).not.toThrow();
  });
});

describe('socialDataSchema', () => {
  it('aceita dados com instagram valido e tiktok null (D-31 parcial)', () => {
    const data = {
      instagram: {
        followers: 5000,
        postingFrequency: '3 posts/semana',
        engagementRate: 0.045,
        topPosts: [
          { url: 'https://instagram.com/p/abc', caption: 'Teste', likes: 100, comments: 10, shares: null, postedAt: null },
        ],
      },
      tiktok: null,
    };
    expect(() => socialDataSchema.parse(data)).not.toThrow();
  });

  it('aceita dados com ambos null (schema valido, downstream cuida)', () => {
    const data = {
      instagram: null,
      tiktok: null,
    };
    expect(() => socialDataSchema.parse(data)).not.toThrow();
  });

  it('aceita dados com tiktok valido e instagram null', () => {
    const data = {
      instagram: null,
      tiktok: {
        followers: 10000,
        postingFrequency: '5 videos/semana',
        engagementRate: 0.08,
        topPosts: [],
      },
    };
    expect(() => socialDataSchema.parse(data)).not.toThrow();
  });

  it('rejeita dados com topPosts invalido (faltando url)', () => {
    const data = {
      instagram: {
        followers: 5000,
        postingFrequency: null,
        engagementRate: null,
        topPosts: [{ caption: 'Sem url', likes: 10, comments: 1, shares: null, postedAt: null }],
      },
      tiktok: null,
    };
    expect(() => socialDataSchema.parse(data)).toThrow();
  });
});

describe('validateOrNull', () => {
  const simpleSchema = z.object({ name: z.string() });

  it('retorna dados validos parseados', () => {
    const result = validateOrNull(simpleSchema, { name: 'Teste' });
    expect(result).toEqual({ name: 'Teste' });
  });

  it('retorna null para dados invalidos', () => {
    const result = validateOrNull(simpleSchema, { name: 123 });
    expect(result).toBeNull();
  });

  it('retorna null para null input', () => {
    const result = validateOrNull(simpleSchema, null);
    expect(result).toBeNull();
  });

  it('retorna null para undefined input', () => {
    const result = validateOrNull(simpleSchema, undefined);
    expect(result).toBeNull();
  });
});
