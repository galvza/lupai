import { z } from 'zod';

const triggerConfigSchema = z.object({
  secretKey: z.string().min(1),
});

/** Configuracao do Trigger.dev validada via Zod */
export const triggerConfig = triggerConfigSchema.parse({
  secretKey: process.env.TRIGGER_SECRET_KEY,
});

export type TriggerConfig = z.infer<typeof triggerConfigSchema>;
