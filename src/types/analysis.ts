import type { ViralPatterns } from './viral';

/** Modos de analise disponiveis */
export type AnalysisMode = 'quick' | 'complete';

/** Status possiveis de uma analise */
export type AnalysisStatus = 'pending' | 'processing' | 'discovering' | 'waiting_confirmation' | 'extracting' | 'completed' | 'failed';

/** Interpretacao do nicho pela IA */
export interface NicheInterpreted {
  niche: string;
  segment: string;
  region: string;
}

/** Input do usuario para iniciar uma analise */
export interface AnalysisInput {
  nicheInput: string;
  mode: AnalysisMode;
  userBusinessUrl?: string | null;
}

/** Analise completa como retornada do banco */
export interface Analysis {
  id: string;
  nicheInput: string;
  nicheInterpreted: NicheInterpreted | null;
  mode: AnalysisMode;
  status: AnalysisStatus;
  userBusinessUrl: string | null;
  triggerRunId: string | null;
  viralPatterns: ViralPatterns | null;
  createdAt: string;
  updatedAt: string;
}

/** Campos atualizaveis de uma analise */
export interface AnalysisUpdate {
  nicheInterpreted?: NicheInterpreted;
  status?: AnalysisStatus;
  triggerRunId?: string;
}

/** Classificacao do input antes de enviar ao Gemini (per D-19) */
export type InputClassification = 'MINIMAL' | 'MEDIUM' | 'URL' | 'EXCESSIVE' | 'NONSENSE';

/** Etapas do fluxo na homepage */
export type FlowStep = 'input' | 'understanding' | 'confirmation' | 'starting' | 'error';

/** Resposta do endpoint POST /api/analyze/understand */
export interface UnderstandResponse {
  classification: InputClassification;
  interpreted?: NicheInterpreted;
  followUpQuestions?: string[];
  urlDetected?: string;
  error?: string;
}

/** Resposta do endpoint POST /api/analyze */
export interface StartAnalysisResponse {
  analysisId: string;
  runId: string;
  publicAccessToken: string;
  redirectUrl: string;
}
