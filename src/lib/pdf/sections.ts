import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Analysis } from '@/types/analysis';
import type { Competitor } from '@/types/competitor';
import type { ViralContent } from '@/types/viral';
import type { ViralPatterns } from '@/types/viral';
import type { Recommendation, CreativeScript, Synthesis } from '@/types/database';

const PAGE_MARGIN = 15; // mm
const BOTTOM_MARGIN = 20; // mm
const PAGE_HEIGHT = 297; // A4 mm
const PAGE_WIDTH = 210; // A4 mm
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN * 2; // 180mm

/** Cor principal da marca LupAI */
const BRAND_COLOR: [number, number, number] = [99, 102, 241]; // #6366f1 indigo

/** Adiciona nova pagina se Y ultrapassar o limite inferior */
const checkPageBreak = (doc: jsPDF, y: number, neededHeight: number): number => {
  if (y + neededHeight > PAGE_HEIGHT - BOTTOM_MARGIN) {
    doc.addPage();
    return PAGE_MARGIN;
  }
  return y;
};

/** Adiciona titulo de secao com estilo padronizado */
const addSectionTitle = (doc: jsPDF, title: string, y: number): number => {
  y = checkPageBreak(doc, y, 15);
  doc.setFontSize(16);
  doc.setTextColor(...BRAND_COLOR);
  doc.text(title, PAGE_MARGIN, y);
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  return y + 10;
};

/** Formata numero com separadores de milhar */
const formatNumber = (n: number | null): string => {
  if (n === null || n === undefined) return '-';
  return n.toLocaleString('pt-BR');
};

/**
 * Adiciona pagina de capa com branding LupAI.
 * Inclui titulo, nicho, segmento, regiao, modo e data.
 *
 * @param doc - Documento jsPDF
 * @param analysis - Dados da analise
 */
export const addCoverPage = (doc: jsPDF, analysis: Analysis): void => {
  const centerX = PAGE_WIDTH / 2;

  // Titulo principal
  doc.setFontSize(36);
  doc.setTextColor(...BRAND_COLOR);
  doc.text('LupAI', centerX, 80, { align: 'center' });

  // Subtitulo
  doc.setFontSize(14);
  doc.setTextColor(100, 100, 100);
  doc.text('Relatorio de Inteligencia de Marketing', centerX, 95, { align: 'center' });

  // Nicho
  const nicheName = analysis.nicheInterpreted?.niche ?? analysis.nicheInput;
  doc.setFontSize(18);
  doc.setTextColor(0, 0, 0);
  doc.text(nicheName, centerX, 125, { align: 'center' });

  // Segmento e regiao
  if (analysis.nicheInterpreted) {
    doc.setFontSize(12);
    doc.setTextColor(80, 80, 80);
    const segment = analysis.nicheInterpreted.segment ?? '';
    const region = analysis.nicheInterpreted.region ?? '';
    if (segment) {
      doc.text(segment, centerX, 138, { align: 'center' });
    }
    if (region) {
      doc.text(region, centerX, 148, { align: 'center' });
    }
  }

  // Modo
  doc.setFontSize(11);
  doc.setTextColor(100, 100, 100);
  const modeLabel = analysis.mode === 'complete' ? 'Modo Completo' : 'Modo Rapido';
  doc.text(modeLabel, centerX, 170, { align: 'center' });

  // Data
  const now = new Date();
  const dateStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
  doc.setFontSize(10);
  doc.text(`Gerado em ${dateStr}`, centerX, 185, { align: 'center' });

  // Nova pagina apos capa
  doc.addPage();
};

/**
 * Adiciona secao de visao geral do mercado.
 *
 * @param doc - Documento jsPDF
 * @param synthesis - Dados da sintese
 * @param y - Posicao Y atual
 * @returns Nova posicao Y
 */
export const addMarketOverview = (doc: jsPDF, synthesis: Synthesis, y: number): number => {
  y = addSectionTitle(doc, 'Visao Geral do Mercado', y);

  if (!synthesis.strategicOverview) {
    doc.text('Dados nao disponiveis.', PAGE_MARGIN, y);
    return y + 8;
  }

  doc.setFontSize(10);
  const lines = doc.splitTextToSize(synthesis.strategicOverview, CONTENT_WIDTH);
  for (const line of lines) {
    y = checkPageBreak(doc, y, 6);
    doc.text(line, PAGE_MARGIN, y);
    y += 5;
  }

  return y + 5;
};

/**
 * Adiciona tabela de concorrentes analisados.
 *
 * @param doc - Documento jsPDF
 * @param competitors - Lista de concorrentes
 * @param y - Posicao Y atual
 * @returns Nova posicao Y
 */
export const addCompetitorTable = (doc: jsPDF, competitors: Competitor[], y: number): number => {
  y = addSectionTitle(doc, 'Concorrentes Analisados', y);

  if (competitors.length === 0) {
    doc.text('Nenhum concorrente analisado.', PAGE_MARGIN, y);
    return y + 8;
  }

  const headers = ['Nome', 'Website', 'Instagram', 'TikTok', 'Meta Ads', 'Google Ads'];
  const rows = competitors.map((c) => [
    c.name,
    c.websiteUrl ?? '-',
    formatNumber(c.socialData?.instagram?.followers ?? null),
    formatNumber(c.socialData?.tiktok?.followers ?? null),
    c.metaAdsData ? String(c.metaAdsData.activeAdsCount) : '-',
    c.googleAdsData?.hasSearchAds ? 'Sim' : 'Nao',
  ]);

  autoTable(doc, {
    startY: y,
    head: [headers],
    body: rows,
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
    styles: { font: 'Roboto', fontSize: 8 },
    headStyles: { fillColor: BRAND_COLOR },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const finalY = (doc as any).lastAutoTable?.finalY as number | undefined;
  return finalY !== undefined ? finalY + 8 : y + 30;
};

/**
 * Adiciona secao de website e SEO.
 *
 * @param doc - Documento jsPDF
 * @param competitors - Lista de concorrentes
 * @param y - Posicao Y atual
 * @returns Nova posicao Y
 */
export const addWebsiteSeoSection = (doc: jsPDF, competitors: Competitor[], y: number): number => {
  y = addSectionTitle(doc, 'Website e SEO', y);

  const relevantCompetitors = competitors.filter((c) => c.websiteData || c.seoData);

  if (relevantCompetitors.length === 0) {
    doc.text('Dados nao disponiveis.', PAGE_MARGIN, y);
    return y + 8;
  }

  const headers = ['Nome', 'Posicionamento', 'Palavras-chave', 'Trafego Est.', 'Backlinks'];
  const rows = relevantCompetitors.map((c) => [
    c.name,
    c.websiteData?.positioning ?? '-',
    c.seoData?.topKeywords?.join(', ') ?? '-',
    formatNumber(c.seoData?.estimatedTraffic ?? null),
    formatNumber(c.seoData?.backlinks ?? null),
  ]);

  autoTable(doc, {
    startY: y,
    head: [headers],
    body: rows,
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
    styles: { font: 'Roboto', fontSize: 8 },
    headStyles: { fillColor: BRAND_COLOR },
    columnStyles: { 1: { cellWidth: 40 }, 2: { cellWidth: 40 } },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tableEndY = (doc as any).lastAutoTable?.finalY as number | undefined;
  return tableEndY !== undefined ? tableEndY + 8 : y + 30;
};

/**
 * Adiciona secao de redes sociais.
 *
 * @param doc - Documento jsPDF
 * @param competitors - Lista de concorrentes
 * @param y - Posicao Y atual
 * @returns Nova posicao Y
 */
export const addSocialSection = (doc: jsPDF, competitors: Competitor[], y: number): number => {
  y = addSectionTitle(doc, 'Redes Sociais', y);

  const headers = ['Nome', 'Plataforma', 'Seguidores', 'Frequencia', 'Engajamento'];
  const rows: string[][] = [];

  for (const c of competitors) {
    if (c.socialData?.instagram) {
      rows.push([
        c.name,
        'Instagram',
        formatNumber(c.socialData.instagram.followers),
        c.socialData.instagram.postingFrequency ?? '-',
        c.socialData.instagram.engagementRate !== null
          ? `${c.socialData.instagram.engagementRate.toFixed(2)}%`
          : '-',
      ]);
    }
    if (c.socialData?.tiktok) {
      rows.push([
        c.name,
        'TikTok',
        formatNumber(c.socialData.tiktok.followers),
        c.socialData.tiktok.postingFrequency ?? '-',
        c.socialData.tiktok.engagementRate !== null
          ? `${c.socialData.tiktok.engagementRate.toFixed(2)}%`
          : '-',
      ]);
    }
  }

  if (rows.length === 0) {
    doc.text('Dados nao disponiveis.', PAGE_MARGIN, y);
    return y + 8;
  }

  autoTable(doc, {
    startY: y,
    head: [headers],
    body: rows,
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
    styles: { font: 'Roboto', fontSize: 8 },
    headStyles: { fillColor: BRAND_COLOR },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tableEndY = (doc as any).lastAutoTable?.finalY as number | undefined;
  return tableEndY !== undefined ? tableEndY + 8 : y + 30;
};

/**
 * Adiciona secao de inteligencia de anuncios.
 *
 * @param doc - Documento jsPDF
 * @param competitors - Lista de concorrentes
 * @param y - Posicao Y atual
 * @returns Nova posicao Y
 */
export const addAdsSection = (doc: jsPDF, competitors: Competitor[], y: number): number => {
  y = addSectionTitle(doc, 'Inteligencia de Anuncios', y);

  const headers = ['Nome', 'Meta Ads', 'Google Ads Keywords', 'GMB Rating'];
  const rows = competitors
    .filter((c) => c.metaAdsData || c.googleAdsData || c.gmbData)
    .map((c) => [
      c.name,
      c.metaAdsData ? `${c.metaAdsData.activeAdsCount} anuncios ativos` : '-',
      c.googleAdsData?.paidKeywords?.join(', ') ?? '-',
      c.gmbData?.rating !== null && c.gmbData?.rating !== undefined
        ? `${c.gmbData.rating}/5 (${c.gmbData.reviewCount ?? 0} avaliacoes)`
        : '-',
    ]);

  if (rows.length === 0) {
    doc.text('Dados nao disponiveis.', PAGE_MARGIN, y);
    return y + 8;
  }

  autoTable(doc, {
    startY: y,
    head: [headers],
    body: rows,
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
    styles: { font: 'Roboto', fontSize: 8 },
    headStyles: { fillColor: BRAND_COLOR },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tableEndY = (doc as any).lastAutoTable?.finalY as number | undefined;
  return tableEndY !== undefined ? tableEndY + 8 : y + 30;
};

/**
 * Adiciona secao de conteudo viral do nicho.
 *
 * @param doc - Documento jsPDF
 * @param viralContent - Lista de conteudo viral
 * @param viralPatterns - Padroes virais identificados (pode ser null)
 * @param y - Posicao Y atual
 * @returns Nova posicao Y
 */
export const addViralSection = (
  doc: jsPDF,
  viralContent: ViralContent[],
  viralPatterns: ViralPatterns | null,
  y: number
): number => {
  y = addSectionTitle(doc, 'Conteudo Viral do Nicho', y);

  if (viralContent.length === 0 && !viralPatterns) {
    doc.text('Dados nao disponiveis.', PAGE_MARGIN, y);
    return y + 8;
  }

  // Resumo de padroes
  if (viralPatterns) {
    doc.setFontSize(10);
    y = checkPageBreak(doc, y, 20);
    doc.text(`Videos analisados: ${viralPatterns.totalVideosAnalyzed}`, PAGE_MARGIN, y);
    y += 5;
    doc.text(`Tom dominante: ${viralPatterns.dominantTone}`, PAGE_MARGIN, y);
    y += 5;
    doc.text(
      `Duracao ideal: ${viralPatterns.bestPerformingDuration.averageSeconds}s (${viralPatterns.bestPerformingDuration.range})`,
      PAGE_MARGIN,
      y
    );
    y += 8;

    // Hook patterns
    if (viralPatterns.hookPatterns.length > 0) {
      y = checkPageBreak(doc, y, 10);
      doc.setFontSize(9);
      doc.text('Padroes de Hook:', PAGE_MARGIN, y);
      y += 5;
      for (const hp of viralPatterns.hookPatterns.slice(0, 3)) {
        y = checkPageBreak(doc, y, 6);
        doc.text(`  - ${hp.pattern} (${hp.frequency}x)`, PAGE_MARGIN, y);
        y += 4;
      }
      y += 3;
    }
  }

  // Tabela de conteudo viral
  if (viralContent.length > 0) {
    const headers = ['Plataforma', 'Criador', 'Visualizacoes', 'Curtidas', 'Compartilhamentos'];
    const rows = viralContent.slice(0, 10).map((vc) => [
      vc.platform,
      vc.creatorHandle ?? '-',
      formatNumber(vc.engagementMetrics.views),
      formatNumber(vc.engagementMetrics.likes),
      formatNumber(vc.engagementMetrics.shares),
    ]);

    autoTable(doc, {
      startY: y,
      head: [headers],
      body: rows,
      margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
      styles: { font: 'Roboto', fontSize: 8 },
      headStyles: { fillColor: BRAND_COLOR },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const viralTableEndY = (doc as any).lastAutoTable?.finalY as number | undefined;
    y = viralTableEndY !== undefined ? viralTableEndY + 8 : y + 30;
  }

  return y;
};

/**
 * Adiciona secao de recomendacoes estrategicas.
 *
 * @param doc - Documento jsPDF
 * @param recommendations - Lista de recomendacoes
 * @param y - Posicao Y atual
 * @returns Nova posicao Y
 */
export const addRecommendationsSection = (doc: jsPDF, recommendations: Recommendation[], y: number): number => {
  y = addSectionTitle(doc, 'Recomendacoes Estrategicas', y);

  if (!recommendations || recommendations.length === 0) {
    doc.text('Dados nao disponiveis.', PAGE_MARGIN, y);
    return y + 8;
  }

  /** Cor de texto por prioridade */
  const priorityColor = (p: string): [number, number, number] => {
    switch (p) {
      case 'alta': return [220, 38, 38]; // red
      case 'media': return [234, 88, 12]; // orange
      case 'baixa': return [22, 163, 74]; // green
      default: return [0, 0, 0];
    }
  };

  for (let i = 0; i < recommendations.length; i++) {
    const rec = recommendations[i];
    const blockHeight = 30;
    y = checkPageBreak(doc, y, blockHeight);

    // Numero e acao
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    const actionLines = doc.splitTextToSize(`${i + 1}. ${rec.action}`, CONTENT_WIDTH);
    for (const line of actionLines) {
      doc.text(line, PAGE_MARGIN, y);
      y += 5;
    }

    // Motivo
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    const reasonLines = doc.splitTextToSize(rec.reason, CONTENT_WIDTH - 5);
    for (const line of reasonLines) {
      y = checkPageBreak(doc, y, 5);
      doc.text(line, PAGE_MARGIN + 5, y);
      y += 4;
    }

    // Tags de prioridade e esforco
    y = checkPageBreak(doc, y, 6);
    const [pr, pg, pb] = priorityColor(rec.priority);
    doc.setTextColor(pr, pg, pb);
    doc.text(`Prioridade: ${rec.priority}`, PAGE_MARGIN + 5, y);
    doc.setTextColor(80, 80, 80);
    doc.text(`| Esforco: ${rec.effort}`, PAGE_MARGIN + 55, y);
    y += 4;

    // Impacto esperado
    y = checkPageBreak(doc, y, 5);
    doc.text(`Impacto: ${rec.expected_impact}`, PAGE_MARGIN + 5, y);
    y += 7;
  }

  doc.setTextColor(0, 0, 0);
  return y;
};

/**
 * Adiciona secao de roteiros criativos sugeridos.
 *
 * @param doc - Documento jsPDF
 * @param scripts - Lista de roteiros criativos
 * @param y - Posicao Y atual
 * @returns Nova posicao Y
 */
export const addCreativeScriptsSection = (doc: jsPDF, scripts: CreativeScript[], y: number): number => {
  y = addSectionTitle(doc, 'Roteiros Criativos Sugeridos', y);

  if (!scripts || scripts.length === 0) {
    doc.text('Dados nao disponiveis.', PAGE_MARGIN, y);
    return y + 8;
  }

  for (const script of scripts) {
    const blockHeight = 50;
    y = checkPageBreak(doc, y, blockHeight);

    // Titulo
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text(script.title, PAGE_MARGIN, y);
    y += 5;

    // Formato e duracao
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text(`Formato: ${script.format} | Duracao: ${script.estimated_duration_seconds}s`, PAGE_MARGIN + 5, y);
    y += 6;

    // Gancho
    y = checkPageBreak(doc, y, 8);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.text('Gancho:', PAGE_MARGIN + 5, y);
    y += 4;
    doc.setTextColor(80, 80, 80);
    const hookLines = doc.splitTextToSize(
      `${script.hook.text} (${script.hook.timing_seconds}s)`,
      CONTENT_WIDTH - 10
    );
    for (const line of hookLines) {
      y = checkPageBreak(doc, y, 4);
      doc.text(line, PAGE_MARGIN + 10, y);
      y += 4;
    }
    y += 2;

    // Corpo
    y = checkPageBreak(doc, y, 8);
    doc.setTextColor(0, 0, 0);
    doc.text('Corpo:', PAGE_MARGIN + 5, y);
    y += 4;
    doc.setTextColor(80, 80, 80);
    const bodyLines = doc.splitTextToSize(script.body.text, CONTENT_WIDTH - 10);
    for (const line of bodyLines) {
      y = checkPageBreak(doc, y, 4);
      doc.text(line, PAGE_MARGIN + 10, y);
      y += 4;
    }
    y += 2;

    // CTA
    y = checkPageBreak(doc, y, 8);
    doc.setTextColor(0, 0, 0);
    doc.text('CTA:', PAGE_MARGIN + 5, y);
    y += 4;
    doc.setTextColor(80, 80, 80);
    doc.text(`${script.cta.text} (${script.cta.action})`, PAGE_MARGIN + 10, y);
    y += 5;

    // Tom e inspiracao
    y = checkPageBreak(doc, y, 10);
    doc.text(`Tom: ${script.tone}`, PAGE_MARGIN + 5, y);
    y += 4;
    const inspLines = doc.splitTextToSize(`Inspiracao: ${script.inspiration_source}`, CONTENT_WIDTH - 10);
    for (const line of inspLines) {
      y = checkPageBreak(doc, y, 4);
      doc.text(line, PAGE_MARGIN + 5, y);
      y += 4;
    }
    y += 6;
  }

  doc.setTextColor(0, 0, 0);
  return y;
};
