import { z } from 'zod';

const assemblyaiConfigSchema = z.object({
  apiKey: z.string().min(1),
});

/** Configuracao do AssemblyAI validada via Zod */
export const assemblyaiConfig = assemblyaiConfigSchema.parse({
  apiKey: process.env.ASSEMBLY_AI_API_KEY,
});

export type AssemblyAIConfig = z.infer<typeof assemblyaiConfigSchema>;
