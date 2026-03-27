import { createClient } from '@supabase/supabase-js';

import type { Database } from '@/types/database';

/**
 * Cria cliente Supabase para uso no servidor (service role).
 * Usa variavel de ambiente diretamente para evitar Zod parse em modulos de edge.
 */
export const createServerClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      'Variaveis de ambiente do Supabase nao configuradas (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)'
    );
  }
  return createClient<Database>(url, key);
};

/**
 * Cria cliente Supabase para uso no navegador (anon key).
 */
export const createBrowserClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      'Variaveis de ambiente do Supabase nao configuradas (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)'
    );
  }
  return createClient<Database>(url, key);
};
