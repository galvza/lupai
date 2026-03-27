import { z } from 'zod';

const geminiConfigSchema = z.object({
  apiKey: z.string().min(1),
  model: z.string().default('gemini-2.0-flash'),
});

/** Configuracao da Gemini API validada via Zod */
export const geminiConfig = geminiConfigSchema.parse({
  apiKey: process.env.GEMINI_API_KEY,
  model: 'gemini-2.0-flash',
});

export type GeminiConfig = z.infer<typeof geminiConfigSchema>;
