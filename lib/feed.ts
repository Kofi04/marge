import { createClient } from "@/lib/supabase/server";
import type { Article, Profile } from "@/lib/types";

export interface FeedItem {
  id: string;
  slug: string;
  title: string;
  lede: string | null;
  published_at: string | null;
  tags: string[];
  author: Pick<Profile, "handle" | "display_name">;
}

/** Colonnes minimales d'un article pour construire une carte de fil. */
type ArticleCardRow = Pick<Article, "id" | "slug" | "title" | "lede" | "published_at" | "tags"> & {
  author_id: string;
};

const CARD_COLUMNS = "id, slug, title, lede, published_at, tags, author_id";

/**
 * Résout les auteurs d'une liste d'articles en une seule requête et renvoie des
 * cartes de fil prêtes à l'affichage. Partagé par le fil, la recherche et les
 * pages de tags pour éviter la duplication de la jointure auteur.
 */
export async function attachAuthors(rows: ArticleCardRow[]): Promise<FeedItem[]> {
  if (rows.length === 0) return [];
  const supabase = await createClient();

  const authorIds = Array.from(new Set(rows.map((a) => a.author_id)));
  const { data: profs } = await supabase
    .from("profiles")
    .select("id, handle, display_name")
    .in("id", authorIds);
  const byId = new Map(
    (profs as { id: string; handle: string; display_name: string }[] ?? []).map((p) => [p.id, p]),
  );

  return rows.map((a) => {
    const author = byId.get(a.author_id);
    return {
      id: a.id,
      slug: a.slug,
      title: a.title,
      lede: a.lede,
      published_at: a.published_at,
      tags: a.tags ?? [],
      author: { handle: author?.handle ?? "", display_name: author?.display_name ?? "Auteur" },
    };
  });
}

/**
 * Fil d'actualité : les articles publiés les plus récents, tous auteurs
 * confondus.
 */
export async function getArticleFeed(limit = 20): Promise<FeedItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("articles")
    .select(CARD_COLUMNS)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(limit);
  return attachAuthors((data as ArticleCardRow[]) ?? []);
}

export { CARD_COLUMNS };
export type { ArticleCardRow };
