/** Plataformas de conteudo viral */
export type ContentPlatform = 'tiktok' | 'instagram' | 'facebook';

/** Metricas de engajamento */
export interface EngagementMetrics {
  views: number | null;
  likes: number;
  comments: number;
  shares: number | null;
  saves: number | null;
}

/** Estrutura gancho-corpo-CTA de um video */
export interface HookBodyCta {
  hook: string;
  body: string;
  cta: string;
  hookDurationSeconds: number | null;
  totalDurationSeconds: number | null;
}

/** Conteudo viral como retornado do banco */
export interface ViralContent {
  id: string;
  analysisId: string;
  platform: ContentPlatform;
  sourceUrl: string;
  bunnyUrl: string | null;
  transcription: string | null;
  hookBodyCta: HookBodyCta | null;
  engagementMetrics: EngagementMetrics;
  caption: string | null;
  creatorHandle: string | null;
  durationSeconds: number | null;
  postDate: string | null;
  createdAt: string;
}

/** Input para criar conteudo viral */
export interface ViralContentInput {
  analysisId: string;
  platform: ContentPlatform;
  sourceUrl: string;
  engagementMetrics: EngagementMetrics;
  bunnyUrl?: string | null;
  caption?: string | null;
  creatorHandle?: string | null;
  durationSeconds?: number | null;
  postDate?: string | null;
}

/** Candidato a video viral pre-download (output dos Apify actors filtrado) */
export interface ViralVideoCandidate {
  videoUrl: string;
  sourceWebUrl?: string;
  caption: string;
  creatorHandle: string;
  platform: ContentPlatform;
  postDate: string;
  durationSeconds: number;
  engagement: EngagementMetrics;
}

/** Padrao de hook identificado em multiplos videos */
export interface HookPattern {
  pattern: string;
  frequency: number;
  examples: string[];
}

/** Estrutura de corpo identificada em multiplos videos */
export interface BodyStructure {
  structure: string;
  frequency: number;
}

/** Padrao de CTA identificado em multiplos videos */
export interface CtaPattern {
  pattern: string;
  frequency: number;
  examples: string[];
}

/** Formula recorrente em multiplos videos */
export interface RecurringFormula {
  formula: string;
  videoCount: number;
}

/** Resultado da analise de padroes cross-video (per D-30 to D-34) */
export interface ViralPatterns {
  hookPatterns: HookPattern[];
  bodyStructures: BodyStructure[];
  ctaPatterns: CtaPattern[];
  dominantTone: string;
  bestPerformingDuration: {
    averageSeconds: number;
    range: string;
  };
  recurringFormulas: RecurringFormula[];
  totalVideosAnalyzed: number;
  analysisConfidence: 'high' | 'medium' | 'low';
}
