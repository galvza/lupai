import { describe, it, expect, vi, beforeEach } from 'vitest';

import instagramFixture from '../fixtures/instagram-viral.json';

const mockCall = vi.fn();
const mockListItems = vi.fn();

vi.mock('apify-client', () => ({
  ApifyClient: class MockApifyClient {
    actor = () => ({ call: mockCall });
    dataset = () => ({ listItems: mockListItems });
  },
}));

import { mapInstagramItem, searchViralInstagram } from '@/lib/apify/instagram-viral';
import type { ViralVideoCandidate } from '@/types/viral';

describe('instagram-viral', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('mapInstagramItem', () => {
    it('mapeia item Video valido do fixture para ViralVideoCandidate com campos corretos', () => {
      const item = instagramFixture[0] as unknown as Record<string, unknown>;
      const result = mapInstagramItem(item);

      expect(result).not.toBeNull();
      expect(result!.videoUrl).toBe('https://scontent.cdninstagram.com/v/reel_001.mp4');
      expect(result!.caption).toBe(
        'O segredo que nenhum dentista conta sobre clareamento dental'
      );
      expect(result!.creatorHandle).toBe('dra.sorriso');
      expect(result!.platform).toBe('instagram');
      expect(result!.durationSeconds).toBe(28);
      expect(result!.engagement.views).toBe(780000);
      expect(result!.engagement.likes).toBe(34500);
      expect(result!.engagement.comments).toBe(1890);
    });

    it('retorna null para item com type !== "Video" (fixture ig_viral_004 e Sidecar)', () => {
      const item = instagramFixture[3] as unknown as Record<string, unknown>;
      expect(item.id).toBe('ig_viral_004');
      expect(item.type).toBe('Sidecar');
      const result = mapInstagramItem(item);
      expect(result).toBeNull();
    });

    it('retorna null para item com videoUrl null', () => {
      const item = {
        ...instagramFixture[0],
        videoUrl: null,
        type: 'Video',
      } as unknown as Record<string, unknown>;

      const result = mapInstagramItem(item);
      expect(result).toBeNull();
    });

    it('retorna null para item com duracao > 240s', () => {
      const item = {
        ...instagramFixture[0],
        videoDuration: 300,
        type: 'Video',
      } as unknown as Record<string, unknown>;

      const result = mapInstagramItem(item);
      expect(result).toBeNull();
    });

    it('trata likesCount de -1 como 0 (Instagram esconde likes)', () => {
      const item = {
        ...instagramFixture[0],
        likesCount: -1,
      } as unknown as Record<string, unknown>;

      const result = mapInstagramItem(item);
      expect(result).not.toBeNull();
      expect(result!.engagement.likes).toBe(0);
    });
  });

  describe('searchViralInstagram', () => {
    it('chama ApifyClient com APIFY_ACTORS.viralInstagram e input de hashtag', async () => {
      mockCall.mockResolvedValue({ defaultDatasetId: 'ds-ig-001' });
      mockListItems.mockResolvedValue({ items: instagramFixture });

      await searchViralInstagram('odontologia', 'estetica');

      expect(mockCall).toHaveBeenCalledWith(
        expect.objectContaining({
          hashtags: expect.any(Array),
          resultsPerHashtag: 20,
          searchType: 'recent',
        })
      );
    });

    it('retorna array vazio quando Apify retorna 0 items', async () => {
      mockCall.mockResolvedValue({ defaultDatasetId: 'ds-ig-002' });
      mockListItems.mockResolvedValue({ items: [] });

      const result = await searchViralInstagram('odontologia', 'estetica');
      expect(result).toEqual([]);
    });

    it('filtra itens nao-Video e retorna apenas candidatos validos', async () => {
      mockCall.mockResolvedValue({ defaultDatasetId: 'ds-ig-003' });
      mockListItems.mockResolvedValue({ items: instagramFixture });

      const result = await searchViralInstagram('odontologia', 'estetica');

      // 6 fixture items - 1 Sidecar = 5 valid Video items
      expect(result.length).toBeLessThanOrEqual(5);
      result.forEach((r: ViralVideoCandidate) => {
        expect(r.platform).toBe('instagram');
        expect(r.videoUrl).toBeTruthy();
      });
    });
  });
});
