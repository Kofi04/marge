import { createClient } from "@/lib/supabase/server";
import { getProfileByHandle } from "@/lib/queries";
import type { Article, Block, Profile } from "@/lib/types";

export interface HistoryRevision {
  id: string;
  number: number;
  note: string | null;
  blocks: Block[];
  created_at: string;
  author: Pick<Profile, "handle" | "display_name"> | null;
}

export interface ArticleHistory {
  article: Pick<Article, "id" | "title" | "slug" | "status" | "current_revision_id">;
  authorHandle: string;
  /** Révisions de la plus récente à la plus ancienne. */
  revisions: HistoryRevision[];
}

/**
 * Historique complet d'un article : toutes ses révisions avec leurs blocs, pour
 * comparer deux versions. Renvoie null si l'article n'existe pas ou n'est pas
 * visible (RLS : révisions lisibles seulement si l'article est publié ou si
 * l'appelant en est l'auteur).
 */
export async function getArticleHistory(handle: string, slug: string): Promise<ArticleHistory | null> {
  const supabase = await createClient();

  const author = await getProfileByHandle(handle);
  if (!author) return null;

  const { data: articleRow } = await supabase
    .from("articles")
    .select("id, title, slug, status, current_revision_id")
    .eq("author_id", author.id)
    .eq("slug", slug)
    .single();
  const article = articleRow as ArticleHistory["article"] | null;
  if (!article) return null;

  const { data: revRows } = await supabase
    .from("revisions")
    .select("id, number, note, blocks, created_by, created_at")
    .eq("article_id", article.id)
    .order("number", { ascending: false });
  const revs = (revRows as (HistoryRevision & { created_by: string | null })[]) ?? [];

  const creatorIds = Array.from(new Set(revs.map((r) => r.created_by).filter(Boolean) as string[]));
  const byId = new Map<string, Pick<Profile, "handle" | "display_name">>();
  if (creatorIds.length) {
    const { data: profs } = await supabase.from("profiles").select("id, handle, display_name").in("id", creatorIds);
    for (const p of (profs as (Profile & { id: string })[]) ?? []) {
      byId.set(p.id, { handle: p.handle, display_name: p.display_name });
    }
  }

  const revisions: HistoryRevision[] = revs.map((r) => ({
    id: r.id,
    number: r.number,
    note: r.note,
    blocks: r.blocks ?? [],
    created_at: r.created_at,
    author: r.created_by ? byId.get(r.created_by) ?? null : null,
  }));

  return { article, authorHandle: author.handle, revisions };
}
