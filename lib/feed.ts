import { createClient } from "@/lib/supabase/server";
import type { Article, Profile } from "@/lib/types";

export interface FeedItem {
  id: string;
  slug: string;
  title: string;
  lede: string | null;
  published_at: string | null;
  author: Pick<Profile, "handle" | "display_name">;
}

/**
 * Fil d'actualité : les articles publiés les plus récents, tous auteurs
 * confondus. Deux requêtes (articles puis profils) résolues efficacement.
 */
export async function getArticleFeed(limit = 20): Promise<FeedItem[]> {
  const supabase = await createClient();

  const { data: articleRows } = await supabase
    .from("articles")
    .select("id, slug, title, lede, published_at, author_id")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(limit);
  const articles = (articleRows as (Article & { author_id: string })[]) ?? [];
  if (articles.length === 0) return [];

  const authorIds = Array.from(new Set(articles.map((a) => a.author_id)));
  const { data: profs } = await supabase
    .from("profiles")
    .select("id, handle, display_name")
    .in("id", authorIds);
  const byId = new Map(
    (profs as { id: string; handle: string; display_name: string }[] ?? []).map((p) => [p.id, p]),
  );

  return articles.map((a) => {
    const author = byId.get(a.author_id);
    return {
      id: a.id,
      slug: a.slug,
      title: a.title,
      lede: a.lede,
      published_at: a.published_at,
      author: { handle: author?.handle ?? "", display_name: author?.display_name ?? "Auteur" },
    };
  });
}
