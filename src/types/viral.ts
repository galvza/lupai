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
  createdAt: string;
}

/** Input para criar conteudo viral */
export interface ViralContentInput {
  analysisId: string;
  platform: ContentPlatform;
  sourceUrl: string;
  engagementMetrics: EngagementMetrics;
}
