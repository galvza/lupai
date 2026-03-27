import { describe, it, expect } from 'vitest';
import {
  createAnalysis,
  createCompetitor,
  createViralContent,
  createSynthesis,
  createRecommendation,
  createCreativeScript,
} from '../fixtures/factories';

describe('Factory: createAnalysis', () => {
  it('retorna analise com todos os campos obrigatorios', () => {
    const analysis = createAnalysis();
    expect(analysis.id).toBe('test-analysis-001');
    expect(analysis.nicheInput).toBe('clinicas odontologicas em SP');
    expect(analysis.mode).toBe('quick');
    expect(analysis.status).toBe('completed');
    expect(analysis.nicheInterpreted).not.toBeNull();
    expect(analysis.nicheInterpreted?.niche).toBe('odontologia');
  });

  it('permite sobrescrever campos individuais', () => {
    const analysis = createAnalysis({ status: 'failed', mode: 'complete' });
    expect(analysis.status).toBe('failed');
    expect(analysis.mode).toBe('complete');
    expect(analysis.nicheInput).toBe('clinicas odontologicas em SP');
  });

  it('permite nicheInterpreted nulo', () => {
    const analysis = createAnalysis({ nicheInterpreted: null });
    expect(analysis.nicheInterpreted).toBeNull();
  });
});

describe('Factory: createCompetitor', () => {
  it('retorna concorrente com todos os campos obrigatorios', () => {
    const competitor = createCompetitor();
    expect(competitor.id).toBe('test-competitor-001');
    expect(competitor.name).toBe('Clinica Sorriso SP');
    expect(competitor.analysisId).toBe('test-analysis-001');
    expect(competitor.websiteUrl).toBe('https://clinicasorriso.com.br');
  });

  it('permite sobrescrever nome e website', () => {
    const competitor = createCompetitor({
      name: 'Dental Plus',
      websiteUrl: 'https://dentalplus.com.br',
    });
    expect(competitor.name).toBe('Dental Plus');
    expect(competitor.websiteUrl).toBe('https://dentalplus.com.br');
  });

  it('campos JSONB iniciam como null', () => {
    const competitor = createCompetitor();
    expect(competitor.websiteData).toBeNull();
    expect(competitor.seoData).toBeNull();
    expect(competitor.socialData).toBeNull();
    expect(competitor.metaAdsData).toBeNull();
    expect(competitor.googleAdsData).toBeNull();
    expect(competitor.gmbData).toBeNull();
  });
});

describe('Factory: createViralContent', () => {
  it('retorna conteudo viral com metricas de engajamento', () => {
    const viral = createViralContent();
    expect(viral.platform).toBe('instagram');
    expect(viral.engagementMetrics.likes).toBe(1200);
    expect(viral.engagementMetrics.views).toBe(15000);
  });

  it('permite sobrescrever plataforma', () => {
    const viral = createViralContent({ platform: 'tiktok' });
    expect(viral.platform).toBe('tiktok');
  });
});

describe('Factory: createSynthesis', () => {
  it('retorna sintese com recomendacoes e roteiros', () => {
    const synthesis = createSynthesis();
    expect(synthesis.recommendations.length).toBeGreaterThan(0);
    expect(synthesis.creativeScripts.length).toBeGreaterThan(0);
    expect(synthesis.strategicOverview).toContain('odontologicas');
  });

  it('comparative analysis e null por padrao', () => {
    const synthesis = createSynthesis();
    expect(synthesis.comparativeAnalysis).toBeNull();
  });
});

describe('Factory: createRecommendation', () => {
  it('retorna recomendacao com prioridade alta por padrao', () => {
    const rec = createRecommendation();
    expect(rec.priority).toBe('high');
    expect(rec.title).toBeTruthy();
    expect(rec.description).toBeTruthy();
  });
});

describe('Factory: createCreativeScript', () => {
  it('retorna roteiro com hook, corpo e CTA', () => {
    const script = createCreativeScript();
    expect(script.hook).toBeTruthy();
    expect(script.body).toBeTruthy();
    expect(script.cta).toBeTruthy();
    expect(script.estimatedDurationSeconds).toBeGreaterThan(0);
  });
});
