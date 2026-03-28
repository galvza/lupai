import type { Analysis, SectionStatus } from '@/types/analysis';
import type { Competitor } from '@/types/competitor';
import type { ViralContent } from '@/types/viral';
import type { Synthesis } from '@/types/database';

/**
 * Deriva o status de presenca de dados para um campo de competitors.
 * Retorna 'available' se todos tem, 'partial' se alguns tem, 'unavailable' se nenhum tem.
 *
 * @param competitors - Lista de concorrentes
 * @param hasField - Funcao que verifica se um competitor possui o campo
 */
const deriveCompetitorFieldStatus = (
  competitors: Competitor[],
  hasField: (c: Competitor) => boolean
): 'available' | 'partial' | 'unavailable' => {
  if (competitors.length === 0) return 'unavailable';

  const count = competitors.filter(hasField).length;
  if (count === competitors.length) return 'available';
  if (count > 0) return 'partial';
  return 'unavailable';
};

/** Verifica se um competitor tem pelo menos metaAdsData ou googleAdsData */
const hasMainAdsData = (c: Competitor): boolean =>
  c.metaAdsData !== null || c.googleAdsData !== null;

/** Verifica se um competitor tem qualquer dado de ads (meta, google ou gmb) */
const hasAnyAdsData = (c: Competitor): boolean =>
  c.metaAdsData !== null || c.googleAdsData !== null || c.gmbData !== null;

/**
 * Deriva o status da secao de ads.
 * 'available' se todos tem metaAdsData ou googleAdsData.
 * 'partial' se alguns tem qualquer dado de ads (incluindo gmbData).
 * 'unavailable' se nenhum tem qualquer dado.
 *
 * @param competitors - Lista de concorrentes
 */
const deriveAdsStatus = (competitors: Competitor[]): 'available' | 'partial' | 'unavailable' => {
  if (competitors.length === 0) return 'unavailable';

  const allHaveMain = competitors.every(hasMainAdsData);
  if (allHaveMain) return 'available';

  const someHaveAny = competitors.some(hasAnyAdsData);
  if (someHaveAny) return 'partial';

  return 'unavailable';
};

/**
 * Deriva o status da secao comparativa a partir da sintese.
 *
 * @param synthesis - Sintese estrategica ou null
 */
const deriveComparativeStatus = (synthesis: Synthesis | null): 'available' | 'partial' | 'unavailable' => {
  if (!synthesis?.comparativeAnalysis) return 'unavailable';

  const { comparativeStatus } = synthesis.comparativeAnalysis;
  if (comparativeStatus === 'full') return 'available';
  if (comparativeStatus === 'partial') return 'partial';
  return 'unavailable';
};

/**
 * Deriva o status de disponibilidade de dados para cada secao do dashboard.
 * Funcao pura que determina per-section data availability a partir dos dados reais.
 * Nao depende de nenhum dado armazenado em DB — calcula em tempo de query.
 *
 * @param analysis - Dados da analise
 * @param competitors - Lista de concorrentes (excluindo user_business)
 * @param viralContent - Lista de conteudo viral
 * @param synthesis - Sintese estrategica ou null
 * @returns Array com exatamente 10 SectionStatus entries
 */
export const deriveSectionStatuses = (
  analysis: Analysis,
  competitors: Competitor[],
  viralContent: ViralContent[],
  synthesis: Synthesis | null
): SectionStatus[] => {
  return [
    {
      section: 'overview',
      status: analysis.nicheInterpreted !== null ? 'available' : 'unavailable',
    },
    {
      section: 'competitors',
      status: competitors.length > 0 ? 'available' : 'unavailable',
    },
    {
      section: 'website',
      status: deriveCompetitorFieldStatus(competitors, (c) => c.websiteData !== null),
    },
    {
      section: 'seo',
      status: deriveCompetitorFieldStatus(competitors, (c) => c.seoData !== null),
    },
    {
      section: 'social',
      status: deriveCompetitorFieldStatus(competitors, (c) => c.socialData !== null),
    },
    {
      section: 'ads',
      status: deriveAdsStatus(competitors),
    },
    {
      section: 'viral',
      status: viralContent.length > 0 ? 'available' : 'unavailable',
    },
    {
      section: 'recommendations',
      status: (synthesis?.recommendations?.length ?? 0) > 0 ? 'available' : 'unavailable',
    },
    {
      section: 'scripts',
      status: (synthesis?.creativeScripts?.length ?? 0) > 0 ? 'available' : 'unavailable',
    },
    {
      section: 'comparative',
      status: deriveComparativeStatus(synthesis),
    },
  ];
};
