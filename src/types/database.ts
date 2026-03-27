import type { AnalysisMode, AnalysisStatus, NicheInterpreted } from './analysis';
import type { WebsiteData, SeoData, SocialData, MetaAdsData, GoogleAdsData, GmbData } from './competitor';
import type { ContentPlatform, EngagementMetrics, HookBodyCta } from './viral';

/** Recomendacao estrategica gerada pela IA */
export interface Recommendation {
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  category: string;
}

/** Roteiro criativo gerado pela IA */
export interface CreativeScript {
  title: string;
  hook: string;
  body: string;
  cta: string;
  format: string;
  estimatedDurationSeconds: number;
  platform: string;
}

/** Analise comparativa (Modo Completo) */
export interface ComparativeAnalysis {
  userBusinessData: Record<string, unknown>;
  comparisons: Array<{
    competitorId: string;
    competitorName: string;
    insights: string[];
  }>;
  personalizedRecommendations: string[];
}

/** Sintese como retornada do banco */
export interface Synthesis {
  id: string;
  analysisId: string;
  strategicOverview: string;
  recommendations: Recommendation[];
  creativeScripts: CreativeScript[];
  comparativeAnalysis: ComparativeAnalysis | null;
  createdAt: string;
}

/** Tipo Database para Supabase client generico */
export interface Database {
  public: {
    Tables: {
      analyses: {
        Row: {
          id: string;
          niche_input: string;
          niche_interpreted: NicheInterpreted | null;
          mode: AnalysisMode;
          status: AnalysisStatus;
          user_business_url: string | null;
          trigger_run_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          niche_input: string;
          niche_interpreted?: NicheInterpreted | null;
          mode?: AnalysisMode;
          status?: AnalysisStatus;
          user_business_url?: string | null;
          trigger_run_id?: string | null;
        };
        Update: {
          niche_interpreted?: NicheInterpreted | null;
          mode?: AnalysisMode;
          status?: AnalysisStatus;
          user_business_url?: string | null;
          trigger_run_id?: string | null;
        };
      };
      competitors: {
        Row: {
          id: string;
          analysis_id: string;
          name: string;
          website_url: string | null;
          website_data: WebsiteData | null;
          seo_data: SeoData | null;
          social_data: SocialData | null;
          meta_ads_data: MetaAdsData | null;
          google_ads_data: GoogleAdsData | null;
          gmb_data: GmbData | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          analysis_id: string;
          name: string;
          website_url?: string | null;
          website_data?: WebsiteData | null;
          seo_data?: SeoData | null;
          social_data?: SocialData | null;
          meta_ads_data?: MetaAdsData | null;
          google_ads_data?: GoogleAdsData | null;
          gmb_data?: GmbData | null;
        };
        Update: {
          name?: string;
          website_url?: string | null;
          website_data?: WebsiteData | null;
          seo_data?: SeoData | null;
          social_data?: SocialData | null;
          meta_ads_data?: MetaAdsData | null;
          google_ads_data?: GoogleAdsData | null;
          gmb_data?: GmbData | null;
        };
      };
      viral_content: {
        Row: {
          id: string;
          analysis_id: string;
          platform: ContentPlatform;
          source_url: string;
          bunny_url: string | null;
          transcription: string | null;
          hook_body_cta: HookBodyCta | null;
          engagement_metrics: EngagementMetrics;
          created_at: string;
        };
        Insert: {
          id?: string;
          analysis_id: string;
          platform: ContentPlatform;
          source_url: string;
          bunny_url?: string | null;
          transcription?: string | null;
          hook_body_cta?: HookBodyCta | null;
          engagement_metrics: EngagementMetrics;
        };
        Update: {
          platform?: ContentPlatform;
          source_url?: string;
          bunny_url?: string | null;
          transcription?: string | null;
          hook_body_cta?: HookBodyCta | null;
          engagement_metrics?: EngagementMetrics;
        };
      };
      synthesis: {
        Row: {
          id: string;
          analysis_id: string;
          strategic_overview: string;
          recommendations: Recommendation[];
          creative_scripts: CreativeScript[];
          comparative_analysis: ComparativeAnalysis | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          analysis_id: string;
          strategic_overview: string;
          recommendations: Recommendation[];
          creative_scripts: CreativeScript[];
          comparative_analysis?: ComparativeAnalysis | null;
        };
        Update: {
          strategic_overview?: string;
          recommendations?: Recommendation[];
          creative_scripts?: CreativeScript[];
          comparative_analysis?: ComparativeAnalysis | null;
        };
      };
    };
  };
}

/** Helper type para acessar tabelas */
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];

/** Re-export domain types for convenience */
export type { Analysis, AnalysisMode, AnalysisStatus, NicheInterpreted } from './analysis';
export type { Competitor, WebsiteData, SeoData, SocialData, MetaAdsData, GoogleAdsData, GmbData } from './competitor';
export type { ViralContent, ContentPlatform, EngagementMetrics, HookBodyCta } from './viral';
