import { jsPDF } from 'jspdf';
import { ROBOTO_REGULAR_BASE64 } from './fonts';
import {
  addCoverPage,
  addMarketOverview,
  addCompetitorTable,
  addWebsiteSeoSection,
  addSocialSection,
  addAdsSection,
  addViralSection,
  addRecommendationsSection,
  addCreativeScriptsSection,
} from './sections';
import {
  getAnalysis,
  getCompetitorsByAnalysis,
  getUserBusinessByAnalysis,
  getViralContentByAnalysis,
  getSynthesisByAnalysis,
} from '@/lib/supabase/queries';
import type { Competitor } from '@/types/competitor';
import type { ViralContent } from '@/types/viral';
import type { Synthesis } from '@/types/database';

/**
 * Executa query com fallback seguro (mesmo padrao de analysis/[id]/route.ts).
 *
 * @param fn - Funcao async que executa a query
 * @param fallback - Valor padrao retornado em caso de erro
 */
const safeQuery = async <T>(fn: () => Promise<T>, fallback: T): Promise<T> => {
  try {
    return await fn();
  } catch {
    return fallback;
  }
};

/**
 * Cria documento jsPDF com fonte Roboto para suporte PT-BR.
 *
 * @returns Documento jsPDF configurado com fonte Roboto
 */
const createPdfDoc = (): jsPDF => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  doc.addFileToVFS('Roboto-Regular.ttf', ROBOTO_REGULAR_BASE64);
  doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
  doc.setFont('Roboto');
  return doc;
};

/**
 * Gera PDF completo de uma analise concluida.
 * Busca todos os dados do Supabase e monta o documento com todas as secoes.
 *
 * @param analysisId - ID da analise (deve estar com status 'completed')
 * @returns ArrayBuffer do PDF gerado
 * @throws Error se analise nao encontrada ou nao completada
 */
export const generateAnalysisPdf = async (analysisId: string): Promise<ArrayBuffer> => {
  // Buscar dados em paralelo
  const [analysis, competitors, _userBusiness, viralContent, synthesis] = await Promise.all([
    getAnalysis(analysisId),
    safeQuery(() => getCompetitorsByAnalysis(analysisId), [] as Competitor[]),
    safeQuery(() => getUserBusinessByAnalysis(analysisId), null),
    safeQuery(() => getViralContentByAnalysis(analysisId), [] as ViralContent[]),
    safeQuery(() => getSynthesisByAnalysis(analysisId), null as Synthesis | null),
  ]);

  if (!analysis) {
    throw new Error('Analise nao encontrada');
  }

  if (analysis.status !== 'completed') {
    throw new Error('Analise nao concluida');
  }

  const doc = createPdfDoc();

  // Secoes em ordem conforme D-14
  addCoverPage(doc, analysis);

  let y = 15; // Start Y apos nova pagina (cover adiciona pagina)

  if (synthesis) {
    y = addMarketOverview(doc, synthesis, y);
  }

  y = addCompetitorTable(doc, competitors, y);
  y = addWebsiteSeoSection(doc, competitors, y);
  y = addSocialSection(doc, competitors, y);
  y = addAdsSection(doc, competitors, y);
  y = addViralSection(doc, viralContent, analysis.viralPatterns, y);

  if (synthesis) {
    y = addRecommendationsSection(doc, synthesis.recommendations, y);
    addCreativeScriptsSection(doc, synthesis.creativeScripts, y);
  }

  return doc.output('arraybuffer');
};
