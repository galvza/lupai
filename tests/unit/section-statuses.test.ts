import { describe, it, expect } from 'vitest';
import { deriveSectionStatuses } from '@/lib/api/section-statuses';
import {
  createAnalysis,
  createCompetitor,
  createViralContent,
  createSynthesis,
  createComparativeAnalysis,
  createRecommendation,
  createCreativeScript,
} from '../fixtures/factories';
import type { SectionStatus } from '@/types/analysis';

/** Helper para encontrar status de uma secao pelo nome */
const findSection = (statuses: SectionStatus[], name: string): SectionStatus => {
  const found = statuses.find((s) => s.section === name);
  if (!found) throw new Error(`Secao "${name}" nao encontrada nos statuses`);
  return found;
};

describe('deriveSectionStatuses', () => {
  describe('estrutura do retorno', () => {
    it('retorna exatamente 10 SectionStatus entries', () => {
      const analysis = createAnalysis();
      const statuses = deriveSectionStatuses(analysis, [], [], null);

      expect(statuses).toHaveLength(10);
    });

    it('cobre todas as 10 secoes do dashboard', () => {
      const analysis = createAnalysis();
      const statuses = deriveSectionStatuses(analysis, [], [], null);

      const sectionNames = statuses.map((s) => s.section);
      expect(sectionNames).toEqual(
        expect.arrayContaining([
          'overview',
          'competitors',
          'website',
          'seo',
          'social',
          'ads',
          'viral',
          'recommendations',
          'scripts',
          'comparative',
        ])
      );
    });

    it('cada entry tem section (string), status e message opcional', () => {
      const analysis = createAnalysis();
      const statuses = deriveSectionStatuses(analysis, [], [], null);

      for (const s of statuses) {
        expect(typeof s.section).toBe('string');
        expect(['available', 'partial', 'unavailable', 'failed']).toContain(s.status);
        if (s.message !== undefined) {
          expect(typeof s.message).toBe('string');
        }
      }
    });
  });

  describe('overview', () => {
    it('available quando analysis.nicheInterpreted e non-null', () => {
      const analysis = createAnalysis({
        nicheInterpreted: { niche: 'odontologia', segment: 'clinicas', region: 'SP' },
      });
      const statuses = deriveSectionStatuses(analysis, [], [], null);

      expect(findSection(statuses, 'overview').status).toBe('available');
    });

    it('unavailable quando analysis.nicheInterpreted e null', () => {
      const analysis = createAnalysis({ nicheInterpreted: null });
      const statuses = deriveSectionStatuses(analysis, [], [], null);

      expect(findSection(statuses, 'overview').status).toBe('unavailable');
    });
  });

  describe('competitors', () => {
    it('available quando competitors.length > 0', () => {
      const analysis = createAnalysis();
      const competitors = [createCompetitor()];
      const statuses = deriveSectionStatuses(analysis, competitors, [], null);

      expect(findSection(statuses, 'competitors').status).toBe('available');
    });

    it('unavailable quando competitors esta vazio', () => {
      const analysis = createAnalysis();
      const statuses = deriveSectionStatuses(analysis, [], [], null);

      expect(findSection(statuses, 'competitors').status).toBe('unavailable');
    });
  });

  describe('website', () => {
    it('available quando TODOS competitors tem websiteData', () => {
      const analysis = createAnalysis();
      const competitors = [
        createCompetitor({
          id: 'c1',
          websiteData: { positioning: 'top', offer: null, pricing: null, metaTags: { title: null, description: null, keywords: [] } },
        }),
        createCompetitor({
          id: 'c2',
          websiteData: { positioning: null, offer: 'servicos', pricing: null, metaTags: { title: 'Test', description: null, keywords: [] } },
        }),
      ];
      const statuses = deriveSectionStatuses(analysis, competitors, [], null);

      expect(findSection(statuses, 'website').status).toBe('available');
    });

    it('partial quando ALGUNS competitors tem websiteData', () => {
      const analysis = createAnalysis();
      const competitors = [
        createCompetitor({
          id: 'c1',
          websiteData: { positioning: 'top', offer: null, pricing: null, metaTags: { title: null, description: null, keywords: [] } },
        }),
        createCompetitor({ id: 'c2', websiteData: null }),
      ];
      const statuses = deriveSectionStatuses(analysis, competitors, [], null);

      expect(findSection(statuses, 'website').status).toBe('partial');
    });

    it('unavailable quando NENHUM competitor tem websiteData', () => {
      const analysis = createAnalysis();
      const competitors = [
        createCompetitor({ id: 'c1', websiteData: null }),
        createCompetitor({ id: 'c2', websiteData: null }),
      ];
      const statuses = deriveSectionStatuses(analysis, competitors, [], null);

      expect(findSection(statuses, 'website').status).toBe('unavailable');
    });

    it('unavailable quando nao ha competitors', () => {
      const analysis = createAnalysis();
      const statuses = deriveSectionStatuses(analysis, [], [], null);

      expect(findSection(statuses, 'website').status).toBe('unavailable');
    });
  });

  describe('seo', () => {
    it('available quando TODOS competitors tem seoData', () => {
      const analysis = createAnalysis();
      const competitors = [
        createCompetitor({ id: 'c1', seoData: { estimatedAuthority: 50, topKeywords: ['dentista'], estimatedTraffic: 1000, backlinks: 200 } }),
        createCompetitor({ id: 'c2', seoData: { estimatedAuthority: 30, topKeywords: [], estimatedTraffic: null, backlinks: null } }),
      ];
      const statuses = deriveSectionStatuses(analysis, competitors, [], null);

      expect(findSection(statuses, 'seo').status).toBe('available');
    });

    it('partial quando ALGUNS competitors tem seoData', () => {
      const analysis = createAnalysis();
      const competitors = [
        createCompetitor({ id: 'c1', seoData: { estimatedAuthority: 50, topKeywords: [], estimatedTraffic: null, backlinks: null } }),
        createCompetitor({ id: 'c2', seoData: null }),
      ];
      const statuses = deriveSectionStatuses(analysis, competitors, [], null);

      expect(findSection(statuses, 'seo').status).toBe('partial');
    });

    it('unavailable quando NENHUM competitor tem seoData', () => {
      const analysis = createAnalysis();
      const competitors = [
        createCompetitor({ id: 'c1', seoData: null }),
        createCompetitor({ id: 'c2', seoData: null }),
      ];
      const statuses = deriveSectionStatuses(analysis, competitors, [], null);

      expect(findSection(statuses, 'seo').status).toBe('unavailable');
    });
  });

  describe('social', () => {
    it('available quando TODOS competitors tem socialData', () => {
      const analysis = createAnalysis();
      const competitors = [
        createCompetitor({ id: 'c1', socialData: { instagram: null, tiktok: { followers: 1000, postingFrequency: null, engagementRate: null, topPosts: [] } } }),
        createCompetitor({ id: 'c2', socialData: { instagram: { followers: 500, postingFrequency: null, engagementRate: null, topPosts: [] }, tiktok: null } }),
      ];
      const statuses = deriveSectionStatuses(analysis, competitors, [], null);

      expect(findSection(statuses, 'social').status).toBe('available');
    });

    it('partial quando ALGUNS competitors tem socialData', () => {
      const analysis = createAnalysis();
      const competitors = [
        createCompetitor({ id: 'c1', socialData: { instagram: null, tiktok: null } }),
        createCompetitor({ id: 'c2', socialData: null }),
      ];
      const statuses = deriveSectionStatuses(analysis, competitors, [], null);

      expect(findSection(statuses, 'social').status).toBe('partial');
    });

    it('unavailable quando NENHUM competitor tem socialData', () => {
      const analysis = createAnalysis();
      const competitors = [
        createCompetitor({ id: 'c1', socialData: null }),
        createCompetitor({ id: 'c2', socialData: null }),
      ];
      const statuses = deriveSectionStatuses(analysis, competitors, [], null);

      expect(findSection(statuses, 'social').status).toBe('unavailable');
    });
  });

  describe('ads', () => {
    it('available quando TODOS competitors tem metaAdsData ou googleAdsData', () => {
      const analysis = createAnalysis();
      const competitors = [
        createCompetitor({
          id: 'c1',
          metaAdsData: { activeAdsCount: 5, ads: [] },
          googleAdsData: null,
        }),
        createCompetitor({
          id: 'c2',
          metaAdsData: null,
          googleAdsData: { hasSearchAds: true, paidKeywords: ['dentista'], estimatedBudget: null },
        }),
      ];
      const statuses = deriveSectionStatuses(analysis, competitors, [], null);

      expect(findSection(statuses, 'ads').status).toBe('available');
    });

    it('partial quando ALGUNS competitors tem dados de ads (incluindo gmbData)', () => {
      const analysis = createAnalysis();
      const competitors = [
        createCompetitor({
          id: 'c1',
          metaAdsData: null,
          googleAdsData: null,
          gmbData: { name: 'Clinica', rating: 4.5, reviewCount: 10, address: null, phone: null, categories: [] },
        }),
        createCompetitor({
          id: 'c2',
          metaAdsData: null,
          googleAdsData: null,
          gmbData: null,
        }),
      ];
      const statuses = deriveSectionStatuses(analysis, competitors, [], null);

      expect(findSection(statuses, 'ads').status).toBe('partial');
    });

    it('unavailable quando NENHUM competitor tem qualquer dado de ads', () => {
      const analysis = createAnalysis();
      const competitors = [
        createCompetitor({ id: 'c1', metaAdsData: null, googleAdsData: null, gmbData: null }),
        createCompetitor({ id: 'c2', metaAdsData: null, googleAdsData: null, gmbData: null }),
      ];
      const statuses = deriveSectionStatuses(analysis, competitors, [], null);

      expect(findSection(statuses, 'ads').status).toBe('unavailable');
    });
  });

  describe('viral', () => {
    it('available quando viralContent.length > 0', () => {
      const analysis = createAnalysis();
      const viralContent = [createViralContent()];
      const statuses = deriveSectionStatuses(analysis, [], viralContent, null);

      expect(findSection(statuses, 'viral').status).toBe('available');
    });

    it('unavailable quando viralContent esta vazio', () => {
      const analysis = createAnalysis();
      const statuses = deriveSectionStatuses(analysis, [], [], null);

      expect(findSection(statuses, 'viral').status).toBe('unavailable');
    });
  });

  describe('recommendations', () => {
    it('available quando synthesis.recommendations.length > 0', () => {
      const analysis = createAnalysis();
      const synthesis = createSynthesis({ recommendations: [createRecommendation()] });
      const statuses = deriveSectionStatuses(analysis, [], [], synthesis);

      expect(findSection(statuses, 'recommendations').status).toBe('available');
    });

    it('unavailable quando synthesis e null', () => {
      const analysis = createAnalysis();
      const statuses = deriveSectionStatuses(analysis, [], [], null);

      expect(findSection(statuses, 'recommendations').status).toBe('unavailable');
    });

    it('unavailable quando synthesis.recommendations esta vazio', () => {
      const analysis = createAnalysis();
      const synthesis = createSynthesis({ recommendations: [] });
      const statuses = deriveSectionStatuses(analysis, [], [], synthesis);

      expect(findSection(statuses, 'recommendations').status).toBe('unavailable');
    });
  });

  describe('scripts', () => {
    it('available quando synthesis.creativeScripts.length > 0', () => {
      const analysis = createAnalysis();
      const synthesis = createSynthesis({ creativeScripts: [createCreativeScript()] });
      const statuses = deriveSectionStatuses(analysis, [], [], synthesis);

      expect(findSection(statuses, 'scripts').status).toBe('available');
    });

    it('unavailable quando synthesis e null', () => {
      const analysis = createAnalysis();
      const statuses = deriveSectionStatuses(analysis, [], [], null);

      expect(findSection(statuses, 'scripts').status).toBe('unavailable');
    });

    it('unavailable quando synthesis.creativeScripts esta vazio', () => {
      const analysis = createAnalysis();
      const synthesis = createSynthesis({ creativeScripts: [] });
      const statuses = deriveSectionStatuses(analysis, [], [], synthesis);

      expect(findSection(statuses, 'scripts').status).toBe('unavailable');
    });
  });

  describe('comparative', () => {
    it('available quando synthesis.comparativeAnalysis.comparativeStatus === full', () => {
      const analysis = createAnalysis();
      const synthesis = createSynthesis({
        comparativeAnalysis: createComparativeAnalysis({ comparativeStatus: 'full' }),
      });
      const statuses = deriveSectionStatuses(analysis, [], [], synthesis);

      expect(findSection(statuses, 'comparative').status).toBe('available');
    });

    it('partial quando comparativeStatus e partial', () => {
      const analysis = createAnalysis();
      const synthesis = createSynthesis({
        comparativeAnalysis: createComparativeAnalysis({ comparativeStatus: 'partial' }),
      });
      const statuses = deriveSectionStatuses(analysis, [], [], synthesis);

      expect(findSection(statuses, 'comparative').status).toBe('partial');
    });

    it('unavailable quando comparativeAnalysis e null', () => {
      const analysis = createAnalysis();
      const synthesis = createSynthesis({ comparativeAnalysis: null });
      const statuses = deriveSectionStatuses(analysis, [], [], synthesis);

      expect(findSection(statuses, 'comparative').status).toBe('unavailable');
    });

    it('unavailable quando synthesis e null', () => {
      const analysis = createAnalysis();
      const statuses = deriveSectionStatuses(analysis, [], [], null);

      expect(findSection(statuses, 'comparative').status).toBe('unavailable');
    });
  });

  describe('cenarios integrados', () => {
    it('todos unavailable quando nao ha dados', () => {
      const analysis = createAnalysis({ nicheInterpreted: null });
      const statuses = deriveSectionStatuses(analysis, [], [], null);

      for (const s of statuses) {
        expect(s.status).toBe('unavailable');
      }
    });

    it('todos available quando todos os dados estao presentes', () => {
      const analysis = createAnalysis({
        nicheInterpreted: { niche: 'odontologia', segment: 'clinicas', region: 'SP' },
      });
      const competitors = [
        createCompetitor({
          id: 'c1',
          websiteData: { positioning: 'top', offer: null, pricing: null, metaTags: { title: null, description: null, keywords: [] } },
          seoData: { estimatedAuthority: 50, topKeywords: [], estimatedTraffic: null, backlinks: null },
          socialData: { instagram: { followers: 500, postingFrequency: null, engagementRate: null, topPosts: [] }, tiktok: null },
          metaAdsData: { activeAdsCount: 2, ads: [] },
          googleAdsData: null,
        }),
      ];
      const viralContent = [createViralContent()];
      const synthesis = createSynthesis({
        recommendations: [createRecommendation()],
        creativeScripts: [createCreativeScript()],
        comparativeAnalysis: createComparativeAnalysis({ comparativeStatus: 'full' }),
      });
      const statuses = deriveSectionStatuses(analysis, competitors, viralContent, synthesis);

      for (const s of statuses) {
        expect(s.status).toBe('available');
      }
    });

    it('cenario misto com dados parciais em multiplas secoes', () => {
      const analysis = createAnalysis({
        nicheInterpreted: { niche: 'odontologia', segment: 'clinicas', region: 'SP' },
      });
      const competitors = [
        createCompetitor({
          id: 'c1',
          websiteData: { positioning: 'top', offer: null, pricing: null, metaTags: { title: null, description: null, keywords: [] } },
          seoData: { estimatedAuthority: 50, topKeywords: [], estimatedTraffic: null, backlinks: null },
          socialData: null,
          metaAdsData: { activeAdsCount: 2, ads: [] },
          googleAdsData: null,
          gmbData: null,
        }),
        createCompetitor({
          id: 'c2',
          websiteData: null,
          seoData: null,
          socialData: { instagram: { followers: 500, postingFrequency: null, engagementRate: null, topPosts: [] }, tiktok: null },
          metaAdsData: null,
          googleAdsData: null,
          gmbData: null,
        }),
      ];
      const viralContent = [createViralContent()];
      const synthesis = createSynthesis({
        recommendations: [createRecommendation()],
        creativeScripts: [],
        comparativeAnalysis: createComparativeAnalysis({ comparativeStatus: 'partial' }),
      });
      const statuses = deriveSectionStatuses(analysis, competitors, viralContent, synthesis);

      expect(findSection(statuses, 'overview').status).toBe('available');
      expect(findSection(statuses, 'competitors').status).toBe('available');
      expect(findSection(statuses, 'website').status).toBe('partial');
      expect(findSection(statuses, 'seo').status).toBe('partial');
      expect(findSection(statuses, 'social').status).toBe('partial');
      expect(findSection(statuses, 'ads').status).toBe('partial');
      expect(findSection(statuses, 'viral').status).toBe('available');
      expect(findSection(statuses, 'recommendations').status).toBe('available');
      expect(findSection(statuses, 'scripts').status).toBe('unavailable');
      expect(findSection(statuses, 'comparative').status).toBe('partial');
    });
  });
});
