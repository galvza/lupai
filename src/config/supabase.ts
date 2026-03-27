import { z } from 'zod';

const supabaseConfigSchema = z.object({
  url: z.string().url().min(1),
  anonKey: z.string().min(1),
  serviceRoleKey: z.string().min(1),
});

/** Configuracao do Supabase validada via Zod. Falha no import se variaveis ausentes. */
export const supabaseConfig = supabaseConfigSchema.parse({
  url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
});

export type SupabaseConfig = z.infer<typeof supabaseConfigSchema>;
