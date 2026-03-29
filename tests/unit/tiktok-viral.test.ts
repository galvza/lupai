import { describe, it, expect, vi, beforeEach } from 'vitest';

import tiktokFixture from '../fixtures/tiktok-viral.json';

const mockCall = vi.fn();
const mockListItems = vi.fn();

vi.mock('apify-client', () => ({
  ApifyClient: class MockApifyClient {
    actor = () => ({ call: mockCall });
    dataset = () => ({ listItems: mockListItems });
  },
}));

import {
  mapTiktokItem,
  calculateEngagementRate,
  deriveHashtags,
  deriveKeywords,
  filterAndSortCandidates,
  searchViralTiktok,
} from '@/lib/apify/tiktok-viral';
import type { EngagementMetrics, ViralVideoCandidate } from '@/types/viral';

describe('tiktok-viral', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('mapTiktokItem', () => {
    it('mapeia item valido do fixture para ViralVideoCandidate com campos corretos', () => {
      const item = tiktokFixture[0] as unknown as Record<string, unknown>;
      const result = mapTiktokItem(item);

      expect(result).not.toBeNull();
      expect(result!.videoUrl).toBe('https://www.tiktok.com/@drdentes/video/001');
      expect(result!.caption).toBe(
        '3 erros que todo dentista comete no Instagram #dentista #odontologia'
      );
      expect(result!.creatorHandle).toBe('drdentes');
      expect(result!.platform).toBe('tiktok');
      expect(result!.durationSeconds).toBe(32);
      expect(result!.engagement.views).toBe(890000);
      expect(result!.engagement.likes).toBe(45200);
      expect(result!.engagement.comments).toBe(1820);
      expect(result!.engagement.shares).toBe(3100);
      expect(result!.engagement.saves).toBe(5600);
    });

    it('retorna null para item com duracao > 240s (fixture tt_viral_006 tem 350s)', () => {
      const item = tiktokFixture[5] as unknown as Record<string, unknown>;
      expect(item.id).toBe('tt_viral_006');
      const result = mapTiktokItem(item);
      expect(result).toBeNull();
    });

    it('retorna null para item sem videoUrl e sem webVideoUrl', () => {
      const item = {
        text: 'Teste sem URL',
        createTimeISO: '2026-03-15T10:00:00Z',
        webVideoUrl: null,
        videoUrl: null,
        diggCount: 100,
        shareCount: 10,
        playCount: 1000,
        commentCount: 5,
        collectCount: 20,
        isAd: false,
        authorMeta: { nickName: 'test' },
        videoMeta: { duration: 30 },
      } as unknown as Record<string, unknown>;

      const result = mapTiktokItem(item);
      expect(result).toBeNull();
    });

    it('retorna null para items onde isAd e true (fixture tt_viral_007)', () => {
      const item = tiktokFixture[6] as unknown as Record<string, unknown>;
      expect(item.id).toBe('tt_viral_007');
      expect(item.isAd).toBe(true);
      const result = mapTiktokItem(item);
      expect(result).toBeNull();
    });
  });

  describe('filterAndSortCandidates', () => {
    it('filtra por ultimos 30 dias, ordena por views descendente, retorna top 5', () => {
      // Map all valid items from fixture
      const candidates = tiktokFixture
        .map((item) => mapTiktokItem(item as unknown as Record<string, unknown>))
        .filter((c): c is ViralVideoCandidate => c !== null);

      // Should have 5 valid candidates (7 total - 1 duration > 240s - 1 isAd)
      expect(candidates).toHaveLength(5);

      const sorted = filterAndSortCandidates(candidates, 5);

      // Verify sorted by views descending (primary sort)
      for (let i = 1; i < sorted.length; i++) {
        const prevViews = sorted[i - 1].engagement.views ?? 0;
        const currViews = sorted[i].engagement.views ?? 0;
        expect(prevViews).toBeGreaterThanOrEqual(currViews);
      }

      // Verify max 5 results
      expect(sorted.length).toBeLessThanOrEqual(5);

      // Top result should be the most viewed
      expect(sorted[0].engagement.views).toBe(2100000);
    });
  });

  describe('calculateEngagementRate', () => {
    it('computa (likes + comments + shares) / max(views, 1)', () => {
      const metrics: EngagementMetrics = {
        views: 1000,
        likes: 100,
        comments: 50,
        shares: 30,
        saves: 20,
      };

      const rate = calculateEngagementRate(metrics);
      // (100 + 50 + 30) / 1000 = 0.18
      expect(rate).toBeCloseTo(0.18, 5);
    });

    it('usa max(views, 1) quando views e null', () => {
      const metrics: EngagementMetrics = {
        views: null,
        likes: 10,
        comments: 5,
        shares: null,
        saves: null,
      };

      const rate = calculateEngagementRate(metrics);
      // (10 + 5 + 0) / 1 = 15
      expect(rate).toBe(15);
    });
  });

  describe('searchViralTiktok', () => {
    it('chama ApifyClient com APIFY_ACTORS.viralTiktok e input de keyword search correto', async () => {
      mockCall.mockResolvedValue({ defaultDatasetId: 'ds-001' });
      mockListItems.mockResolvedValue({ items: tiktokFixture });

      await searchViralTiktok('odontologia', 'estetica');

      expect(mockCall).toHaveBeenCalledWith(
        expect.objectContaining({
          searchQueries: expect.any(Array),
          resultsPerPage: 20,
        })
      );
    });

    it('retorna array vazio quando Apify retorna 0 items', async () => {
      mockCall.mockResolvedValue({ defaultDatasetId: 'ds-002' });
      mockListItems.mockResolvedValue({ items: [] });

      const result = await searchViralTiktok('odontologia', 'estetica');
      expect(result).toEqual([]);
    });

    it('faz retry com keyword mais ampla quando busca primaria falha (fallback)', async () => {
      // First call (primary keywords) fails
      mockCall
        .mockRejectedValueOnce(new Error('Actor failed'))
        // Second call (broader) succeeds
        .mockResolvedValueOnce({ defaultDatasetId: 'ds-003' });

      mockListItems.mockResolvedValue({ items: tiktokFixture });

      const result = await searchViralTiktok('odontologia', 'estetica');

      // Should have called the actor twice (primary + fallback)
      expect(mockCall).toHaveBeenCalledTimes(2);
      // Should still return results from the fallback
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('deriveHashtags', () => {
    it('gera 3-5 hashtags com segmento como principal', () => {
      const hashtags = deriveHashtags('odontologia', 'estetica');

      // Niche should be first (broader, more likely to have Reels)
      expect(hashtags[0]).toBe('odontologia');
      expect(hashtags).toContain('estetica');
      expect(hashtags).toContain('odontologiabrasil');
      expect(hashtags.length).toBeGreaterThanOrEqual(3);
      expect(hashtags.length).toBeLessThanOrEqual(5);
    });

    it('remove espacos e converte para lowercase', () => {
      const hashtags = deriveHashtags('Marketing Digital', 'Redes Sociais');

      hashtags.forEach((h) => {
        expect(h).not.toContain(' ');
        expect(h).toBe(h.toLowerCase());
      });
    });

    it('nao duplica quando nicho e segmento sao iguais', () => {
      const hashtags = deriveHashtags('dentista', 'dentista');
      // Should deduplicate
      expect(new Set(hashtags).size).toBe(hashtags.length);
    });
  });

  describe('deriveKeywords', () => {
    it('gera keywords com segmento como principal', () => {
      const keywords = deriveKeywords('academia', 'crossfit');

      expect(keywords[0]).toBe('crossfit');
      expect(keywords).toContain('crossfit academia');
      expect(keywords).toContain('academia');
      expect(keywords.length).toBeLessThanOrEqual(3);
    });

    it('nao duplica quando nicho e segmento sao iguais', () => {
      const keywords = deriveKeywords('crossfit', 'crossfit');
      expect(new Set(keywords).size).toBe(keywords.length);
      expect(keywords).toContain('crossfit');
    });
  });
});
