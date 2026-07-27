import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

/**
 * Récupère l'utilisateur connecté et son profil (ou null). À utiliser dans les
 * Server Components et Route Handlers.
 */
export async function getSessionProfile(): Promise<{
  userId: string | null;
  profile: Profile | null;
}> {
  const supabase = await createClient();
  // getSession() lit le cookie localement (aucun aller-retour réseau). La
  // validation du jeton est faite une fois par requête dans le middleware, et
  // la RLS protège toutes les données côté base : lire l'uid ici est sûr et
  // évite ~0,7 s de latence par page (base en eu-central-1).
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) return { userId: null, profile: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return { userId: user.id, profile: (profile as Profile) ?? null };
}

/** Un handle est « provisoire » tant que l'utilisateur ne l'a pas choisi. */
export function isProvisionalHandle(handle: string | undefined | null): boolean {
  return !!handle && /^user_[0-9a-f]{10}$/.test(handle);
}
