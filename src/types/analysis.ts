/** Modos de analise disponiveis */
export type AnalysisMode = 'quick' | 'complete';

/** Status possiveis de uma analise */
export type AnalysisStatus = 'pending' | 'processing' | 'completed' | 'failed';

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
  createdAt: string;
  updatedAt: string;
}

/** Campos atualizaveis de uma analise */
export interface AnalysisUpdate {
  nicheInterpreted?: NicheInterpreted;
  status?: AnalysisStatus;
  triggerRunId?: string;
}
