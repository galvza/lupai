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
    it('mapeia item valido do fixture (sociavault format) para ViralVideoCandidate', () => {
      const item = tiktokFixture[0] as unknown as Record<string, unknown>;
      const result = mapTiktokItem(item);

      expect(result).not.toBeNull();
      // videoUrl should be the no-watermark CDN download URL
      expect(result!.videoUrl).toBe('https://v16m.tiktokcdn-us.com/video/001-no-wm.mp4');
      expect(result!.sourceWebUrl).toBe('https://www.tiktok.com/@drdentes/video/7571929778882612488');
      expect(result!.caption).toBe(
        '3 erros que todo dentista comete no Instagram #dentista #odontologia'
      );
      expect(result!.creatorHandle).toBe('Dr. Dentes');
      expect(result!.platform).toBe('tiktok');
      // Duration is ms in fixture (32000ms = 32s)
      expect(result!.durationSeconds).toBe(32);
      expect(result!.engagement.views).toBe(890000);
      expect(result!.engagement.likes).toBe(45200);
      expect(result!.engagement.comments).toBe(1820);
      expect(result!.engagement.shares).toBe(3100);
      expect(result!.engagement.saves).toBe(5600);
    });

    it('retorna null para item com duracao > 240s (fixture item 6 tem 350000ms = 350s)', () => {
      const item = tiktokFixture[5] as unknown as Record<string, unknown>;
      const result = mapTiktokItem(item);
      expect(result).toBeNull();
    });

    it('retorna null para item sem URLs de download (fixture item 3 tem null addr)', () => {
      const item = tiktokFixture[2] as unknown as Record<string, unknown>;
      const result = mapTiktokItem(item);
      expect(result).toBeNull();
    });

    it('retorna null para item sem aweme_info', () => {
      const item = {
        some_field: 'test',
      } as unknown as Record<string, unknown>;

      const result = mapTiktokItem(item);
      expect(result).toBeNull();
    });

    it('retorna null para items onde is_ads e true (fixture item 7)', () => {
      const item = tiktokFixture[6] as unknown as Record<string, unknown>;
      const aweme = (item as { aweme_info: Record<string, unknown> }).aweme_info;
      expect(aweme.is_ads).toBe(true);
      const result = mapTiktokItem(item);
      expect(result).toBeNull();
    });

    it('converte create_time unix para ISO string', () => {
      const item = tiktokFixture[0] as unknown as Record<string, unknown>;
      const result = mapTiktokItem(item);
      expect(result!.postDate).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('usa play_addr como fallback quando download_no_watermark_addr e null', () => {
      const item = {
        aweme_info: {
          aweme_id: 'test123',
          desc: 'Test video',
          create_time: 1742036400,
          is_ads: false,
          author: { unique_id: 'tester', nickname: 'Tester' },
          video: {
            duration: 30000,
            download_no_watermark_addr: null,
            play_addr: { url_list: ['https://cdn.example.com/play.mp4'] },
          },
          statistics: { play_count: 100, digg_count: 10, comment_count: 5, share_count: 2, collect_count: 1 },
        },
      } as unknown as Record<string, unknown>;

      const result = mapTiktokItem(item);
      expect(result).not.toBeNull();
      expect(result!.videoUrl).toBe('https://cdn.example.com/play.mp4');
    });
  });

  describe('filterAndSortCandidates', () => {
    it('ordena por views descendente e retorna top N', () => {
      const candidates = tiktokFixture
        .map((item) => mapTiktokItem(item as unknown as Record<string, unknown>))
        .filter((c): c is ViralVideoCandidate => c !== null);

      // Should have 4 valid candidates (7 total - 1 duration > 240s - 1 isAd - 1 no URLs)
      expect(candidates).toHaveLength(4);

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
    it('chama actor sociavault com query string e maxResults', async () => {
      mockCall.mockResolvedValue({ defaultDatasetId: 'ds-001' });
      mockListItems.mockResolvedValue({ items: tiktokFixture });

      await searchViralTiktok('odontologia', 'estetica');

      expect(mockCall).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.any(String),
          maxResults: 30,
        })
      );
    });

    it('retorna array vazio quando Apify retorna 0 items', async () => {
      mockCall.mockResolvedValue({ defaultDatasetId: 'ds-002' });
      mockListItems.mockResolvedValue({ items: [] });

      const result = await searchViralTiktok('odontologia', 'estetica');
      expect(result).toEqual([]);
    });

    it('retorna array vazio quando actor lanca erro (sem propagacao)', async () => {
      mockCall.mockRejectedValue(new Error('Actor failed'));

      const result = await searchViralTiktok('odontologia', 'estetica');
      expect(result).toEqual([]);
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
