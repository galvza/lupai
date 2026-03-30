import { defineConfig } from "@trigger.dev/sdk";
import { syncEnvVars, additionalPackages } from "@trigger.dev/build/extensions/core";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/** Keys que os tasks do Trigger.dev precisam em runtime */
const REQUIRED_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "APIFY_API_TOKEN",
  "GEMINI_API_KEY",
  "ASSEMBLY_AI_API_KEY",
  "BUNNY_STORAGE_API_KEY",
  "BUNNY_STORAGE_ZONE_NAME",
  "BUNNY_CDN_URL",
];

export default defineConfig({
  project: "proj_njzymjocoedxkkigeeya",
  dirs: ["src/trigger"],
  maxDuration: 900,
  build: {
    // proxy-agent é dependência transitiva do apify-client, requerida dinamicamente.
    // O bundler do Trigger.dev não inclui deps dinâmicas — additionalPackages instala no container.
    external: ["proxy-agent"],
    extensions: [
      additionalPackages({ packages: ["proxy-agent@6.5.0"] }),
      syncEnvVars(async () => {
        // Carrega .env.local como fonte das env vars para o deploy
        const envPath = resolve(process.cwd(), ".env.local");
        const content = readFileSync(envPath, "utf-8");
        const vars: Array<{ name: string; value: string }> = [];
        for (const line of content.split("\n")) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith("#")) continue;
          const eqIndex = trimmed.indexOf("=");
          if (eqIndex === -1) continue;
          const key = trimmed.slice(0, eqIndex);
          const value = trimmed.slice(eqIndex + 1);
          if (REQUIRED_KEYS.includes(key)) {
            vars.push({ name: key, value });
          }
        }
        return vars;
      }),
    ],
  },
});
