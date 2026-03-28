import { createServerClient } from './client';

import type { Analysis, AnalysisStatus, NicheInterpreted } from '@/types/analysis';
import type { Competitor } from '@/types/competitor';
import type { ViralContent, ContentPlatform, EngagementMetrics, HookBodyCta, ViralPatterns } from '@/types/viral';
import type { Synthesis, Recommendation, CreativeScript, ComparativeAnalysis } from '@/types/database';

// --- Analysis queries ---

/** Cria uma nova analise e retorna o registro criado */
export const createAnalysis = async (input: {
  nicheInput: string;
  mode?: 'quick' | 'complete';
  userBusinessUrl?: string | null;
}): Promise<Analysis> => {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('analyses')
    .insert({
      niche_input: input.nicheInput,
      mode: input.mode ?? 'quick',
      user_business_url: input.userBusinessUrl ?? null,
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Erro ao criar analise: ${error?.message ?? 'Dados nao retornados'}`);
  }

  return mapAnalysisRow(data);
};

/** Busca uma analise por ID */
export const getAnalysis = async (id: string): Promise<Analysis | null> => {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('analyses')
    .select()
    .eq('id', id)
    .single();

  if (error) return null;
  return data ? mapAnalysisRow(data) : null;
};

/** Atualiza campos de uma analise */
export const updateAnalysis = async (
  id: string,
  updates: {
    status?: AnalysisStatus;
    nicheInterpreted?: NicheInterpreted;
    triggerRunId?: string;
  }
): Promise<Analysis> => {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('analyses')
    .update({
      ...(updates.status && { status: updates.status }),
      ...(updates.nicheInterpreted && { niche_interpreted: updates.nicheInterpreted }),
      ...(updates.triggerRunId && { trigger_run_id: updates.triggerRunId }),
    })
    .eq('id', id)
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Erro ao atualizar analise ${id}: ${error?.message ?? 'Dados nao retornados'}`);
  }

  return mapAnalysisRow(data);
};

/** Lista analises recentes (para historico) */
export const listAnalyses = async (limit = 20): Promise<Analysis[]> => {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('analyses')
    .select()
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Erro ao listar analises: ${error.message}`);
  }

  return (data ?? []).map(mapAnalysisRow);
};

// --- Competitor queries ---

/** Cria um concorrente vinculado a uma analise */
export const createCompetitor = async (input: {
  analysisId: string;
  name: string;
  websiteUrl?: string | null;
}): Promise<Competitor> => {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('competitors')
    .insert({
      analysis_id: input.analysisId,
      name: input.name,
      website_url: input.websiteUrl ?? null,
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Erro ao criar concorrente: ${error?.message ?? 'Dados nao retornados'}`);
  }

  return mapCompetitorRow(data);
};

/** Busca concorrentes de uma analise */
export const getCompetitorsByAnalysis = async (analysisId: string): Promise<Competitor[]> => {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('competitors')
    .select()
    .eq('analysis_id', analysisId);

  if (error) {
    throw new Error(`Erro ao buscar concorrentes: ${error.message}`);
  }

  return (data ?? []).map(mapCompetitorRow);
};

/** Atualiza dados de um concorrente (JSONB columns) */
export const updateCompetitor = async (
  id: string,
  updates: Record<string, unknown>
): Promise<void> => {
  const supabase = createServerClient();
  const { error } = await supabase
    .from('competitors')
    .update(updates)
    .eq('id', id);

  if (error) {
    throw new Error(`Erro ao atualizar concorrente ${id}: ${error.message}`);
  }
};

// --- Viral content queries ---

/** Cria registro de conteudo viral */
export const createViralContent = async (input: {
  analysisId: string;
  platform: ContentPlatform;
  sourceUrl: string;
  engagementMetrics: EngagementMetrics;
  bunnyUrl?: string | null;
  caption?: string | null;
  creatorHandle?: string | null;
  durationSeconds?: number | null;
  postDate?: string | null;
}): Promise<ViralContent> => {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('viral_content')
    .insert({
      analysis_id: input.analysisId,
      platform: input.platform,
      source_url: input.sourceUrl,
      engagement_metrics: input.engagementMetrics,
      bunny_url: input.bunnyUrl ?? null,
      caption: input.caption ?? null,
      creator_handle: input.creatorHandle ?? null,
      duration_seconds: input.durationSeconds ?? null,
      post_date: input.postDate ?? null,
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Erro ao criar conteudo viral: ${error?.message ?? 'Dados nao retornados'}`);
  }

  return mapViralContentRow(data);
};

/** Busca conteudo viral de uma analise */
export const getViralContentByAnalysis = async (analysisId: string): Promise<ViralContent[]> => {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('viral_content')
    .select()
    .eq('analysis_id', analysisId);

  if (error) {
    throw new Error(`Erro ao buscar conteudo viral: ${error.message}`);
  }

  return (data ?? []).map(mapViralContentRow);
};

/** Atualiza campos de um registro de conteudo viral */
export const updateViralContent = async (
  id: string,
  updates: {
    bunnyUrl?: string;
    transcription?: string;
    hookBodyCta?: HookBodyCta;
  }
): Promise<void> => {
  const supabase = createServerClient();
  const { error } = await supabase
    .from('viral_content')
    .update({
      ...(updates.bunnyUrl !== undefined && { bunny_url: updates.bunnyUrl }),
      ...(updates.transcription !== undefined && { transcription: updates.transcription }),
      ...(updates.hookBodyCta !== undefined && { hook_body_cta: updates.hookBodyCta }),
    })
    .eq('id', id);
  if (error) throw new Error(`Erro ao atualizar conteudo viral ${id}: ${error.message}`);
};

/** Salva padroes virais cross-video na analise */
export const updateAnalysisViralPatterns = async (
  analysisId: string,
  viralPatterns: ViralPatterns
): Promise<void> => {
  const supabase = createServerClient();
  const { error } = await supabase
    .from('analyses')
    .update({ viral_patterns: viralPatterns })
    .eq('id', analysisId);
  if (error) throw new Error(`Erro ao salvar padroes virais para analise ${analysisId}: ${error.message}`);
};

// --- Synthesis queries ---

/** Cria ou atualiza sintese de uma analise */
export const upsertSynthesis = async (input: {
  analysisId: string;
  strategicOverview: string;
  recommendations: Recommendation[];
  creativeScripts: CreativeScript[];
  comparativeAnalysis?: ComparativeAnalysis | null;
}): Promise<Synthesis> => {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('synthesis')
    .upsert(
      {
        analysis_id: input.analysisId,
        strategic_overview: input.strategicOverview,
        recommendations: input.recommendations,
        creative_scripts: input.creativeScripts,
        comparative_analysis: input.comparativeAnalysis ?? null,
      },
      { onConflict: 'analysis_id' }
    )
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Erro ao salvar sintese: ${error?.message ?? 'Dados nao retornados'}`);
  }

  return mapSynthesisRow(data);
};

/** Busca sintese de uma analise */
export const getSynthesisByAnalysis = async (analysisId: string): Promise<Synthesis | null> => {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('synthesis')
    .select()
    .eq('analysis_id', analysisId)
    .single();

  if (error) return null;
  return data ? mapSynthesisRow(data) : null;
};

// --- Row mappers (snake_case DB -> camelCase TS) ---

const mapAnalysisRow = (row: Record<string, unknown>): Analysis => ({
  id: row.id as string,
  nicheInput: row.niche_input as string,
  nicheInterpreted: row.niche_interpreted as NicheInterpreted | null,
  mode: row.mode as 'quick' | 'complete',
  status: row.status as AnalysisStatus,
  userBusinessUrl: row.user_business_url as string | null,
  triggerRunId: row.trigger_run_id as string | null,
  viralPatterns: (row.viral_patterns as ViralPatterns | null) ?? null,
  createdAt: row.created_at as string,
  updatedAt: row.updated_at as string,
});

const mapCompetitorRow = (row: Record<string, unknown>): Competitor => ({
  id: row.id as string,
  analysisId: row.analysis_id as string,
  name: row.name as string,
  websiteUrl: row.website_url as string | null,
  websiteData: row.website_data as Competitor['websiteData'],
  seoData: row.seo_data as Competitor['seoData'],
  socialData: row.social_data as Competitor['socialData'],
  metaAdsData: row.meta_ads_data as Competitor['metaAdsData'],
  googleAdsData: row.google_ads_data as Competitor['googleAdsData'],
  gmbData: row.gmb_data as Competitor['gmbData'],
  createdAt: row.created_at as string,
});

const mapViralContentRow = (row: Record<string, unknown>): ViralContent => ({
  id: row.id as string,
  analysisId: row.analysis_id as string,
  platform: row.platform as ViralContent['platform'],
  sourceUrl: row.source_url as string,
  bunnyUrl: row.bunny_url as string | null,
  transcription: row.transcription as string | null,
  hookBodyCta: row.hook_body_cta as ViralContent['hookBodyCta'],
  engagementMetrics: row.engagement_metrics as ViralContent['engagementMetrics'],
  caption: row.caption as string | null,
  creatorHandle: row.creator_handle as string | null,
  durationSeconds: row.duration_seconds as number | null,
  postDate: row.post_date as string | null,
  createdAt: row.created_at as string,
});

const mapSynthesisRow = (row: Record<string, unknown>): Synthesis => ({
  id: row.id as string,
  analysisId: row.analysis_id as string,
  strategicOverview: row.strategic_overview as string,
  recommendations: row.recommendations as Recommendation[],
  creativeScripts: row.creative_scripts as CreativeScript[],
  comparativeAnalysis: row.comparative_analysis as ComparativeAnalysis | null,
  createdAt: row.created_at as string,
});
