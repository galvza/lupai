import { z } from 'zod';

/** Schema para secao individual da sintese (per D-02) */
export const synthesisSectionSchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  metrics: z.record(z.string(), z.union([z.string(), z.number()])),
  tags: z.array(z.string()),
  detailed_analysis: z.string().min(1),
});

/** Schema para recomendacao individual (per D-08) */
export const recommendationSchema = z.object({
  action: z.string().min(1),
  reason: z.string().min(1),
  priority: z.enum(['alta', 'media', 'baixa']),
  effort: z.enum(['alto', 'medio', 'baixo']),
  expected_impact: z.string().min(1),
});

/** Schema completo do output de sintese (per D-03 Modo Rapido + D-19 Modo Completo) */
export const synthesisOutputSchema = z.object({
  marketOverview: synthesisSectionSchema,
  competitorAnalysis: synthesisSectionSchema,
  gapsAndOpportunities: synthesisSectionSchema,
  viralPatterns: synthesisSectionSchema,
  recommendations: z.array(recommendationSchema).min(3).max(10),
  // Comparative sections (optional — Modo Completo only, per D-19)
  userVsMarket: synthesisSectionSchema.optional(),
  gapsVsCompetitors: synthesisSectionSchema.optional(),
  competitiveAdvantages: synthesisSectionSchema.optional(),
});

/** Schema para analise comparativa armazenada no banco (per D-22) */
export const comparativeAnalysisSchema = z.object({
  comparativeStatus: z.enum(['full', 'partial', 'unavailable']),
  userVsMarket: synthesisSectionSchema.nullable(),
  gapsVsCompetitors: synthesisSectionSchema.nullable(),
  competitiveAdvantages: synthesisSectionSchema.nullable(),
  personalizedRecommendations: z.array(recommendationSchema),
  degradedReason: z.string().optional(),
});

/** Schema para roteiro criativo individual (per D-12) */
export const creativeScriptSchema = z.object({
  title: z.string().min(1),
  format: z.enum(['Reels', 'TikTok', 'YouTube Shorts', 'Stories']),
  estimated_duration_seconds: z.number().min(10).max(120),
  hook: z.object({
    text: z.string().min(1),
    timing_seconds: z.number().min(1).max(10),
  }),
  body: z.object({
    text: z.string().min(1),
    structure_notes: z.string().min(1),
  }),
  cta: z.object({
    text: z.string().min(1),
    action: z.string().min(1),
  }),
  tone: z.string().min(1),
  inspiration_source: z.string().min(1),
});

/** Schema completo do output de roteiros criativos */
export const creativeOutputSchema = z.object({
  scripts: z.array(creativeScriptSchema).min(3).max(5),
});
