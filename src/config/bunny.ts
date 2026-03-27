import { z } from 'zod';

const bunnyConfigSchema = z.object({
  storageApiKey: z.string().min(1),
  storageZoneName: z.string().min(1),
  cdnUrl: z.string().url().min(1),
});

/** Configuracao do Bunny CDN + Storage validada via Zod */
export const bunnyConfig = bunnyConfigSchema.parse({
  storageApiKey: process.env.BUNNY_STORAGE_API_KEY,
  storageZoneName: process.env.BUNNY_STORAGE_ZONE_NAME,
  cdnUrl: process.env.BUNNY_CDN_URL,
});

export type BunnyConfig = z.infer<typeof bunnyConfigSchema>;
