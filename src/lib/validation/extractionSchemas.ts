import { z, ZodError } from 'zod';

/**
 * Schema Zod para dados de website.
 * Regra D-29: ao menos um de positioning, metaTags.title ou metaTags.description deve ser nao-null.
 */
export const websiteDataSchema = z
  .object({
    positioning: z.string().nullable(),
    offer: z.string().nullable(),
    pricing: z.string().nullable(),
    metaTags: z.object({
      title: z.string().nullable(),
      description: z.string().nullable(),
      keywords: z.array(z.string()),
    }),
  })
  .refine(
    (data) =>
      data.positioning !== null ||
      data.metaTags.title !== null ||
      data.metaTags.description !== null,
    {
      message:
        'Dados de website invalidos: ao menos positioning, title ou description deve estar presente',
    }
  );

/**
 * Schema Zod para dados de SEO.
 * Regra D-30: ao menos um de estimatedAuthority, topKeywords (nao vazio) ou estimatedTraffic deve existir.
 */
export const seoDataSchema = z
  .object({
    estimatedAuthority: z.number().nullable(),
    topKeywords: z.array(z.string()),
    estimatedTraffic: z.number().nullable(),
    backlinks: z.number().nullable(),
  })
  .refine(
    (data) =>
      data.estimatedAuthority !== null ||
      data.topKeywords.length > 0 ||
      data.estimatedTraffic !== null,
    {
      message:
        'Dados de SEO invalidos: ao menos estimatedAuthority, topKeywords ou estimatedTraffic deve estar presente',
    }
  );

/** Schema para post de rede social */
const socialPostSchema = z.object({
  url: z.string(),
  caption: z.string().nullable(),
  likes: z.number(),
  comments: z.number(),
  shares: z.number().nullable(),
  postedAt: z.string().nullable(),
});

/** Schema para dados de uma plataforma social (nullable) */
const socialPlatformSchema = z
  .object({
    followers: z.number().nullable(),
    postingFrequency: z.string().nullable(),
    engagementRate: z.number().nullable(),
    topPosts: z.array(socialPostSchema),
  })
  .nullable();

/**
 * Schema Zod para dados sociais.
 * Regra D-31: ambos podem ser null (sucesso parcial). Downstream decide o que fazer.
 */
export const socialDataSchema = z.object({
  instagram: socialPlatformSchema,
  tiktok: socialPlatformSchema,
});

/**
 * Valida dados contra um schema Zod, retornando null em caso de erro.
 * Util para validacao defensiva onde dados invalidos nao devem interromper o fluxo.
 * @param schema - Schema Zod para validacao
 * @param data - Dados a serem validados
 * @returns Dados parseados ou null se invalidos
 */
export const validateOrNull = <T>(schema: z.ZodType<T>, data: unknown): T | null => {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof ZodError) {
      return null;
    }
    return null;
  }
};

// --- Schemas de Ads Intelligence (Phase 5) ---

/** Schema para anuncio individual do Meta */
const metaAdSchema = z.object({
  adId: z.string(),
  creativeUrl: z.string().nullable(),
  copyText: z.string().nullable(),
  format: z.string().nullable(),
  startedAt: z.string().nullable(),
  isActive: z.boolean(),
});

/**
 * Schema Zod para dados de Meta Ads.
 * Regra D-28: valido se activeAdsCount >= 0 AND ads e array.
 */
export const metaAdsDataSchema = z.object({
  activeAdsCount: z.number().min(0),
  ads: z.array(metaAdSchema),
});

/**
 * Schema Zod para dados de Google Ads.
 * Regra D-29: valido se hasSearchAds e boolean.
 */
export const googleAdsDataSchema = z.object({
  hasSearchAds: z.boolean(),
  paidKeywords: z.array(z.string()),
  estimatedBudget: z.string().nullable(),
});

/**
 * Schema Zod para dados do Google Meu Negocio.
 * Regra D-30: valido se ao menos name e nao-null.
 */
export const gmbDataSchema = z
  .object({
    name: z.string().nullable(),
    rating: z.number().nullable(),
    reviewCount: z.number().nullable(),
    address: z.string().nullable(),
    phone: z.string().nullable(),
    categories: z.array(z.string()),
  })
  .refine((data) => data.name !== null, {
    message: 'Dados de GMB invalidos: name deve estar presente',
  });

// --- Schemas de Viral Content (Phase 6) ---

/** Schema para metricas de engajamento */
export const engagementMetricsSchema = z.object({
  views: z.number().nullable(),
  likes: z.number(),
  comments: z.number(),
  shares: z.number().nullable(),
  saves: z.number().nullable(),
});

/** Schema para candidato a video viral (pre-download, per D-12, D-13) */
export const viralVideoCandidateSchema = z.object({
  videoUrl: z.string().min(1),
  caption: z.string(),
  creatorHandle: z.string(),
  platform: z.enum(['tiktok', 'instagram', 'facebook']),
  postDate: z.string(),
  durationSeconds: z.number().min(0).max(240),
  engagement: engagementMetricsSchema,
});

/** Schema para estrutura Hook/Body/CTA (per D-26, D-27) */
export const hookBodyCtaSchema = z.object({
  hook: z.string().min(1),
  body: z.string().min(1),
  cta: z.string().min(1),
  hookDurationSeconds: z.number().nullable(),
  totalDurationSeconds: z.number().nullable(),
});

/** Schema para padrao de hook */
const hookPatternSchema = z.object({
  pattern: z.string().min(1),
  frequency: z.number().min(0),
  examples: z.array(z.string()),
});

/** Schema para estrutura de corpo */
const bodyStructureSchema = z.object({
  structure: z.string().min(1),
  frequency: z.number().min(0),
});

/** Schema para padrao de CTA */
const ctaPatternSchema = z.object({
  pattern: z.string().min(1),
  frequency: z.number().min(0),
  examples: z.array(z.string()),
});

/** Schema para formula recorrente */
const recurringFormulaSchema = z.object({
  formula: z.string().min(1),
  videoCount: z.number().min(0),
});

/** Schema para padroes cross-video (per D-30 to D-34) */
export const viralPatternsSchema = z.object({
  hookPatterns: z.array(hookPatternSchema),
  bodyStructures: z.array(bodyStructureSchema),
  ctaPatterns: z.array(ctaPatternSchema),
  dominantTone: z.string().min(1),
  bestPerformingDuration: z.object({
    averageSeconds: z.number().min(0),
    range: z.string().min(1),
  }),
  recurringFormulas: z.array(recurringFormulaSchema),
  totalVideosAnalyzed: z.number().min(0),
  analysisConfidence: z.enum(['high', 'medium', 'low']),
});
