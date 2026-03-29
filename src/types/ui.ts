/** UI-specific types for frontend components (separate from backend API types in analysis.ts) */

/** Status de um passo da análise */
export type StepStatus = "completed" | "active" | "pending";

/** Linha de log no terminal */
export interface LogLine {
  text: string;
  timestamp?: string;
  color: "green" | "white" | "muted";
}

/** Passo da análise com logs */
export interface AnalysisStep {
  id: string;
  title: string;
  subtitle?: string;
  status: StepStatus;
  logs: LogLine[];
}

/** Status geral da análise (UI polling shape) */
export interface UIAnalysisStatus {
  id: string;
  status: "processing" | "complete" | "error";
  progress: number;
  niche: string;
  region?: string;
  steps: AnalysisStep[];
}

/** Tag de um concorrente */
export interface CompetitorTag {
  label: string;
  type: "positive" | "negative";
}

/** Métricas de um concorrente */
export interface CompetitorMetrics {
  score: number;
  activeAds: number;
  postsPerWeek: number;
  monthlyTraffic?: string;
  igFollowers?: string;
}

/** Dados de um concorrente (UI display shape) */
export interface UICompetitor {
  id: string;
  name: string;
  url: string;
  tags: CompetitorTag[];
  metrics: CompetitorMetrics;
  siteAnalysis?: string;
  seoMetrics?: {
    authority: number;
    topKeywords: number;
    speed: string;
  };
  socialAnalysis?: string;
  platforms?: {
    name: string;
    status: "active" | "absent";
    stats?: string;
  }[];
  ads?: {
    copy: string;
    format: string;
    duration: string;
  }[];
  lessons?: string;
}

/** Seção parsed do strategic overview (quando Gemini retorna JSON) */
export interface MarketSection {
  key: string;
  title: string;
  summary: string;
  tags?: string[];
  detailedAnalysis?: string;
  metrics?: Record<string, string | number>;
}

/** Card de gap/viral/roteiro */
export interface SummaryCard {
  icon: string;
  label: string;
  value: number;
  subtitle: string;
  preview: string;
  expandedItems?: string[];
}

/** Recomendação (UI display shape) */
export interface UIRecommendation {
  text: string;
  impact: "ALTO" | "MÉDIO" | "BAIXO";
}

/** Resultado completo da análise (UI display shape) */
export interface AnalysisResult {
  id: string;
  niche: string;
  nicheKeyword: string;
  nicheAccent: string;
  region: string;
  timestamp: string;
  marketOverview: {
    summary: string;
    competition: string;
    trend: string;
    strongChannels: string;
    sections?: MarketSection[];
  };
  competitors: UICompetitor[];
  gaps: SummaryCard;
  virals: SummaryCard;
  scripts: SummaryCard;
  recommendations: UIRecommendation[];
  totalRecommendations: number;
}

/** Item do histórico (UI display shape) */
export interface HistoryItem {
  id: string;
  niche: string;
  icon: string;
  metadata: string;
  date: string;
  relativeTime: string;
  status: "complete" | "processing";
  competitors?: number;
}
