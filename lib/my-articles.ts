import { createClient } from "@/lib/supabase/server";
import type { Article, ArticleStatus } from "@/lib/types";

export interface MyArticle {
  id: string;
  slug: string;
  title: string;
  lede: string | null;
  status: ArticleStatus;
  published_at: string | null;
  created_at: string;
  /** Numéro de la révision courante (1 = jamais révisé). */
  revisionNumber: number | null;
  /** Suggestions encore ouvertes (à traiter dans la file). */
  openSuggestions: number;
}

/**
 * Liste les articles de l'auteur pour l'écran de gestion « Mes articles »,
 * enrichis du numéro de révision courante et du nombre de propositions ouvertes.
 * Les requêtes secondaires sont parallélisées (base en eu-central-1, ~0,7 s/AR).
 */
export async function getMyArticles(userId: string): Promise<MyArticle[]> {
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from("articles")
    .select("id, slug, title, lede, status, published_at, created_at, current_revision_id")
    .eq("author_id", userId)
    .order("created_at", { ascending: false });

  const articles = (rows as (Article & { current_revision_id: string | null })[]) ?? [];
  if (articles.length === 0) return [];

  const ids = articles.map((a) => a.id);
  const revisionIds = articles.map((a) => a.current_revision_id).filter(Boolean) as string[];

  const [{ data: revs }, { data: open }] = await Promise.all([
    revisionIds.length
      ? supabase.from("revisions").select("id, number").in("id", revisionIds)
      : Promise.resolve({ data: [] as { id: string; number: number }[] }),
    supabase
      .from("suggestions")
      .select("article_id")
      .in("article_id", ids)
      .eq("status", "open"),
  ]);

  const numberByRevId = new Map((revs as { id: string; number: number }[] ?? []).map((r) => [r.id, r.number]));
  const openByArticle = new Map<string, number>();
  for (const s of (open as { article_id: string }[]) ?? []) {
    openByArticle.set(s.article_id, (openByArticle.get(s.article_id) ?? 0) + 1);
  }

  return articles.map((a) => ({
    id: a.id,
    slug: a.slug,
    title: a.title,
    lede: a.lede,
    status: a.status,
    published_at: a.published_at,
    created_at: a.created_at,
    revisionNumber: a.current_revision_id ? numberByRevId.get(a.current_revision_id) ?? null : null,
    openSuggestions: openByArticle.get(a.id) ?? 0,
  }));
}
