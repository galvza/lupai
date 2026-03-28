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
