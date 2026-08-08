import { createClient } from "@/lib/supabase/server";
import { attachAuthors, CARD_COLUMNS, type ArticleCardRow, type FeedItem } from "@/lib/feed";

/** Normalise une requête (espaces réduits) pour tester si elle est vide. */
export function normalizeQuery(raw: string): string {
  return raw.replace(/\s+/g, " ").trim();
}

/** Normalise un tag comme le schéma : minuscules, tirets. */
export function normalizeTag(raw: string): string {
  return raw.trim().toLowerCase();
}

/**
 * Recherche plein texte des articles publiés via la RPC `search_articles`
 * (titre + chapô + texte des blocs + tags). Renvoie une liste vide pour une
 * requête vide (on n'interroge pas la base pour rien).
 */
export async function searchArticles(rawQuery: string): Promise<FeedItem[]> {
  const q = normalizeQuery(rawQuery);
  if (!q) return [];
  const supabase = await createClient();
  const { data } = await supabase.rpc("search_articles", { q });
  return attachAuthors((data as ArticleCardRow[]) ?? []);
}

/** Articles publiés portant le tag donné, les plus récents d'abord. */
export async function getArticlesByTag(rawTag: string): Promise<FeedItem[]> {
  const tag = normalizeTag(rawTag);
  if (!tag) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("articles")
    .select(CARD_COLUMNS)
    .eq("status", "published")
    .contains("tags", [tag])
    .order("published_at", { ascending: false })
    .limit(40);
  return attachAuthors((data as ArticleCardRow[]) ?? []);
}
