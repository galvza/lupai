import type { AnalysisResultsResponse, AnalysisSummary } from '@/types/analysis';
import type { Competitor } from '@/types/competitor';
import type {
  AnalysisResult,
  UICompetitor,
  UIRecommendation,
  SummaryCard,
  HistoryItem,
  CompetitorTag,
  MarketSection,
} from '@/types/ui';

/** Formata numero grande para display (1200000 -> "1.2M") */
const formatLargeNumber = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
};

/** Gera tags automaticas baseado nos dados do concorrente */
const deriveTags = (comp: Competitor): CompetitorTag[] => {
  const tags: CompetitorTag[] = [];

  if (comp.seoData?.estimatedAuthority != null && comp.seoData.estimatedAuthority >= 30) {
    tags.push({ label: 'SEO forte', type: 'positive' });
  } else if (comp.seoData?.estimatedAuthority != null && comp.seoData.estimatedAuthority < 15) {
    tags.push({ label: 'SEO fraco', type: 'negative' });
  }

  if (comp.metaAdsData && comp.metaAdsData.activeAdsCount > 5) {
    tags.push({ label: 'Ads ativos', type: 'positive' });
  } else if (!comp.metaAdsData || comp.metaAdsData.activeAdsCount === 0) {
    tags.push({ label: 'Sem ads', type: 'negative' });
  }

  if (comp.socialData?.instagram?.followers && comp.socialData.instagram.followers > 100_000) {
    tags.push({ label: 'Forte no Instagram', type: 'positive' });
  }

  if (comp.socialData?.tiktok?.followers && comp.socialData.tiktok.followers > 50_000) {
    tags.push({ label: 'Forte no TikTok', type: 'positive' });
  }

  return tags.slice(0, 3);
};

/** Tenta parsear strategicOverview como JSON e extrair seções formatadas */
const parseStrategicOverview = (
  raw: string
): { sections: MarketSection[]; competition: string; trend: string; strongChannels: string } | null => {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return null;

  try {
    const parsed = JSON.parse(trimmed);
    if (typeof parsed !== 'object' || parsed === null) return null;

    const sections: MarketSection[] = [];
    let competition = 'N/A';
    let trend = 'N/A';
    let strongChannels = 'N/A';

    const knownKeys = ['marketOverview', 'competitorAnalysis', 'gapsAndOpportunities', 'viralPatterns'];

    for (const key of knownKeys) {
      const s = parsed[key];
      if (!s || typeof s !== 'object') continue;
      sections.push({
        key,
        title: s.title ?? key,
        summary: s.summary ?? '',
        tags: Array.isArray(s.tags) ? s.tags : undefined,
        detailedAnalysis: s.detailed_analysis ?? s.detailedAnalysis ?? undefined,
        metrics: s.metrics && typeof s.metrics === 'object' ? s.metrics : undefined,
      });
      if (key === 'competitorAnalysis' && s.metrics) {
        competition = String(s.metrics.competition_level ?? s.metrics.competitionLevel ?? competition);
      }
      if (key === 'marketOverview' && s.metrics) {
        trend = String(s.metrics.trend ?? s.metrics.market_trend ?? trend);
        strongChannels = String(s.metrics.strong_channels ?? s.metrics.strongChannels ?? strongChannels);
      }
    }

    // Fuzzy fallback: scan ALL sections' metrics for known indicators
    if (competition === 'N/A' || trend === 'N/A' || strongChannels === 'N/A') {
      for (const s of sections) {
        if (!s.metrics) continue;
        for (const [mk, mv] of Object.entries(s.metrics)) {
          const lk = mk.toLowerCase();
          if (competition === 'N/A' && (/compet/.test(lk) || /concorr/.test(lk))) {
            competition = String(mv);
          }
          if (trend === 'N/A' && (/trend/.test(lk) || /tendenc/.test(lk))) {
            trend = String(mv);
          }
          if (strongChannels === 'N/A' && (/canal/.test(lk) || /channel/.test(lk))) {
            strongChannels = String(mv);
          }
        }
      }
    }

    // Fallback: iterate all keys if none of the known keys matched
    if (sections.length === 0) {
      for (const [key, value] of Object.entries(parsed)) {
        if (typeof value === 'object' && value !== null && 'title' in (value as Record<string, unknown>)) {
          const v = value as Record<string, unknown>;
          sections.push({
            key,
            title: String(v.title ?? key),
            summary: String(v.summary ?? ''),
            tags: Array.isArray(v.tags) ? v.tags as string[] : undefined,
            detailedAnalysis: v.detailed_analysis != null ? String(v.detailed_analysis) : v.detailedAnalysis != null ? String(v.detailedAnalysis) : undefined,
            metrics: v.metrics && typeof v.metrics === 'object' ? v.metrics as Record<string, string | number> : undefined,
          });
        }
      }
    }

    if (sections.length === 0) return null;
    return { sections, competition, trend, strongChannels };
  } catch {
    return null;
  }
};

/** Calcula score simples de um concorrente (0-100) */
const computeScore = (comp: Competitor): number => {
  let score = 50;
  if (comp.seoData?.estimatedAuthority) score += Math.min(comp.seoData.estimatedAuthority / 2, 15);
  if (comp.metaAdsData?.activeAdsCount && comp.metaAdsData.activeAdsCount >= 2) score += Math.min(comp.metaAdsData.activeAdsCount, 10);
  if (comp.socialData?.instagram?.followers) score += Math.min(comp.socialData.instagram.followers / 100_000, 15);
  if (comp.socialData?.tiktok?.followers) score += Math.min(comp.socialData.tiktok.followers / 50_000, 10);
  return Math.min(Math.round(score), 100);
};

/** Mapeia Competitor do backend para UICompetitor do frontend */
export const mapCompetitorToUI = (comp: Competitor): UICompetitor => ({
  id: comp.id,
  name: comp.name,
  url: comp.websiteUrl ?? '',
  tags: deriveTags(comp),
  metrics: {
    score: computeScore(comp),
    activeAds: comp.metaAdsData?.activeAdsCount ?? 0,
    postsPerWeek: 0,
    monthlyTraffic: comp.seoData?.estimatedTraffic
      ? formatLargeNumber(comp.seoData.estimatedTraffic)
      : undefined,
    igFollowers: comp.socialData?.instagram?.followers
      ? formatLargeNumber(comp.socialData.instagram.followers)
      : undefined,
  },
  siteAnalysis: comp.websiteData?.positioning ?? undefined,
  seoMetrics: comp.seoData
    ? {
        authority: comp.seoData.estimatedAuthority ?? 0,
        topKeywords: comp.seoData.topKeywords?.length ?? 0,
        speed: 'N/A',
      }
    : undefined,
  socialAnalysis: undefined,
  platforms: [
    ...(comp.socialData?.instagram
      ? [
          {
            name: 'Instagram',
            status: 'active' as const,
            stats: `${formatLargeNumber(comp.socialData.instagram.followers ?? 0)} seguidores`,
          },
        ]
      : []),
    ...(comp.socialData?.tiktok
      ? [
          {
            name: 'TikTok',
            status: 'active' as const,
            stats: `${formatLargeNumber(comp.socialData.tiktok.followers ?? 0)} seguidores`,
          },
        ]
      : []),
  ],
  ads:
    comp.metaAdsData?.ads.map((a) => ({
      copy: a.copyText ?? '',
      format: a.format ?? 'Formato não identificado',
      duration: a.startedAt
        ? `Desde ${new Date(a.startedAt).toLocaleDateString('pt-BR')}`
        : 'Data não disponível',
    })) ?? [],
  lessons: undefined,
});

/** Mapeia AnalysisResultsResponse para AnalysisResult (dashboard UI) */
export const mapResultsToUI = (response: AnalysisResultsResponse): AnalysisResult => {
  const { analysis, competitors, synthesis, viralContent } = response;
  const niche = analysis.nicheInterpreted?.niche ?? analysis.nicheInput;
  const nicheWords = niche.split(' ');
  const lastWord = nicheWords.pop() ?? '';
  const restWords = nicheWords.join(' ');

  const createdDate = new Date(analysis.createdAt);
  const timestamp =
    createdDate.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }) +
    ' \u00b7 ' +
    createdDate.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });

  const recommendations: UIRecommendation[] =
    synthesis?.recommendations.map((r) => ({
      text: r.action,
      impact:
        r.priority === 'alta'
          ? ('ALTO' as const)
          : r.priority === 'media'
            ? ('M\u00c9DIO' as const)
            : ('BAIXO' as const),
    })) ?? [];

  const highPriorityRecs = synthesis?.recommendations.filter((r) => r.priority === 'alta') ?? [];

  const gaps: SummaryCard = {
    icon: 'search',
    label: 'Gaps identificados',
    value: highPriorityRecs.length,
    subtitle: 'oportunidades de alta prioridade',
    preview:
      highPriorityRecs
        .slice(0, 3)
        .map((r) => r.action)
        .join(' \u00b7 ') || 'Aguardando an\u00e1lise',
    expandedItems: highPriorityRecs.map((r) => `${r.action}\n${r.reason}`),
  };

  const virals: SummaryCard = {
    icon: 'play',
    label: 'Virais encontrados',
    value: viralContent.length,
    subtitle: 'v\u00eddeos analisados',
    preview:
      viralContent
        .slice(0, 3)
        .map((v) => v.caption ?? v.creatorHandle ?? 'V\u00eddeo viral')
        .join(' \u00b7 ') || 'Nenhum viral encontrado',
    expandedItems: viralContent.map((v) => {
      const handle = v.creatorHandle ? `@${v.creatorHandle}` : '';
      const views = v.engagementMetrics?.views ? `${formatLargeNumber(v.engagementMetrics.views)} views` : '';
      const caption = v.caption ?? 'V\u00eddeo viral';
      return [caption, handle, views].filter(Boolean).join(' \u2014 ');
    }),
  };

  const scripts: SummaryCard = {
    icon: 'trending',
    label: 'Roteiros gerados',
    value: synthesis?.creativeScripts.length ?? 0,
    subtitle: 'prontos para gravar',
    preview:
      synthesis?.creativeScripts
        .slice(0, 3)
        .map((s) => s.title)
        .join(' \u00b7 ') || 'Aguardando s\u00edntese',
    expandedItems: synthesis?.creativeScripts.map(
      (s) => `${s.title}\nGancho: ${s.hook.text}\nCorpo: ${s.body.text}\nCTA: ${s.cta.text}`
    ),
  };

  const overviewRaw = synthesis?.strategicOverview ?? '';
  const parsed = parseStrategicOverview(overviewRaw);

  return {
    id: analysis.id,
    niche,
    nicheKeyword: restWords || niche,
    nicheAccent: lastWord,
    region: analysis.nicheInterpreted?.region ?? 'Brasil',
    timestamp,
    marketOverview: {
      summary: parsed
        ? parsed.sections.map((s) => s.summary).filter(Boolean).join(' ')
        : overviewRaw || 'An\u00e1lise em processamento.',
      competition: parsed?.competition ?? 'N/A',
      trend: parsed?.trend ?? 'N/A',
      strongChannels: parsed?.strongChannels ?? 'N/A',
      sections: parsed?.sections,
    },
    competitors: competitors.filter((c) => c.role === 'competitor').map(mapCompetitorToUI),
    gaps,
    virals,
    scripts,
    recommendations,
    totalRecommendations: recommendations.length,
  };
};

/** Mapeia AnalysisSummary para HistoryItem */
export const mapSummaryToHistoryItem = (summary: AnalysisSummary): HistoryItem => {
  const niche = summary.nicheInterpreted?.niche ?? summary.nicheInput;
  const createdDate = new Date(summary.createdAt);
  const now = new Date();
  const diffMs = now.getTime() - createdDate.getTime();
  const diffMinutes = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  let relativeTime = '';
  if (diffMinutes < 60) relativeTime = `h\u00e1 ${diffMinutes} min`;
  else if (diffHours < 24) relativeTime = `h\u00e1 ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
  else relativeTime = `h\u00e1 ${diffDays} dia${diffDays > 1 ? 's' : ''}`;

  const statusMap: Record<string, 'complete' | 'processing'> = {
    completed: 'complete',
    failed: 'complete',
  };

  return {
    id: summary.id,
    niche,
    icon: 'shopping-cart',
    metadata: summary.nicheInterpreted
      ? `${summary.nicheInterpreted.segment} \u00b7 ${summary.nicheInterpreted.region}`
      : summary.mode === 'complete'
        ? 'Modo completo'
        : 'Modo r\u00e1pido',
    date: createdDate.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }),
    relativeTime,
    status: statusMap[summary.status] ?? 'processing',
  };
};
