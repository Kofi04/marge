import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Client Supabase anonyme sans cookies ni session. Pour les lectures publiques
 * qui doivent rester cacheables (ISR) — profils, contenus publiés. La RLS
 * s'applique au rôle `anon`.
 */
export function createAnonClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
