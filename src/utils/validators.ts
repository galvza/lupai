import { z } from 'zod';

/** Schema de validacao do input de analise */
export const analysisInputSchema = z.object({
  nicheInput: z.string()
    .min(3, 'Descricao do nicho deve ter pelo menos 3 caracteres')
    .max(500, 'Descricao do nicho deve ter no maximo 500 caracteres'),
  mode: z.enum(['quick', 'complete']).default('quick'),
  userBusinessUrl: z.string().url('URL do negocio invalida').nullable().optional(),
});

/** Schema de validacao da interpretacao do nicho */
export const nicheInterpretedSchema = z.object({
  niche: z.string().min(1),
  segment: z.string().min(1),
  region: z.string().min(1),
});

export type AnalysisInputValidated = z.infer<typeof analysisInputSchema>;
export type NicheInterpretedValidated = z.infer<typeof nicheInterpretedSchema>;
