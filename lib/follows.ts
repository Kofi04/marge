import { createClient } from "@/lib/supabase/server";
import { createAnonClient } from "@/lib/supabase/anon";
import { attachAuthors, CARD_COLUMNS, type ArticleCardRow, type FeedItem } from "@/lib/feed";

export interface FollowCounts {
  followers: number;
  following: number;
}

/**
 * Compteurs abonnés / abonnements d'un profil. Utilise le client anon (données
 * publiques, aucune session) pour rester compatible avec le rendu ISR du profil.
 */
export async function getFollowCounts(profileId: string): Promise<FollowCounts> {
  const supabase = createAnonClient();
  const [{ count: followers }, { count: following }] = await Promise.all([
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", profileId),
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", profileId),
  ]);
  return { followers: followers ?? 0, following: following ?? 0 };
}

/** Ids des auteurs suivis par `userId`. */
export async function getFollowingIds(userId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("follows").select("following_id").eq("follower_id", userId);
  return (data as { following_id: string }[] ?? []).map((r) => r.following_id);
}

/**
 * Fil personnalisé : articles publiés des auteurs suivis, les plus récents
 * d'abord. Liste vide si l'utilisateur ne suit personne (le /home propose alors
 * de basculer sur « Découvrir »).
 */
export async function getFollowingFeed(userId: string, limit = 20): Promise<FeedItem[]> {
  const ids = await getFollowingIds(userId);
  if (ids.length === 0) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("articles")
    .select(CARD_COLUMNS)
    .eq("status", "published")
    .in("author_id", ids)
    .order("published_at", { ascending: false })
    .limit(limit);
  return attachAuthors((data as ArticleCardRow[]) ?? []);
}
