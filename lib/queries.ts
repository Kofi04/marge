import { createClient } from "@/lib/supabase/server";
import type {
  Article, Block, Profile, Revision, ResolvedSuggestion, SuggestionKind, SuggestionStatus,
} from "@/lib/types";

/** Ligne brute de la vue suggestions_resolved. */
interface ResolvedRow {
  id: string;
  article_id: string;
  block_id: string;
  base_revision_id: string;
  original_text: string;
  proposed_text: string;
  reason: string | null;
  kind: SuggestionKind;
  status: SuggestionStatus;
  author_id: string;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
  is_stale: boolean;
  resolved_status: ResolvedSuggestion["resolved_status"];
}

export interface Contributor {
  profile: Profile;
  count: number;
}

export interface ArticleView {
  article: Article;
  author: Profile;
  currentRevision: Revision | null;
  revisions: Pick<Revision, "id" | "number" | "note" | "created_by" | "created_at">[];
  suggestions: ResolvedSuggestion[];
  contributors: Contributor[];
}

export async function getProfileByHandle(handle: string): Promise<Profile | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("*").eq("handle", handle).single();
  return (data as Profile) ?? null;
}

/**
 * Assemble tout ce qu'il faut pour afficher un article et sa marge. Renvoie null
 * si l'auteur ou l'article n'existe pas (ou n'est pas visible selon la RLS).
 */
export async function getArticleView(handle: string, slug: string): Promise<ArticleView | null> {
  const supabase = await createClient();

  const author = await getProfileByHandle(handle);
  if (!author) return null;

  const { data: article } = await supabase
    .from("articles")
    .select("*")
    .eq("author_id", author.id)
    .eq("slug", slug)
    .single();
  if (!article) return null;
  const a = article as Article;

  const [{ data: currentRev }, { data: revs }, { data: rawSuggestions }] = await Promise.all([
    a.current_revision_id
      ? supabase.from("revisions").select("*").eq("id", a.current_revision_id).single()
      : Promise.resolve({ data: null }),
    supabase
      .from("revisions")
      .select("id, number, note, created_by, created_at")
      .eq("article_id", a.id)
      .order("number", { ascending: false }),
    supabase
      .from("suggestions_resolved")
      .select("*")
      .eq("article_id", a.id)
      .order("created_at", { ascending: false }),
  ]);

  const rows = (rawSuggestions as ResolvedRow[] | null) ?? [];

  // Auteurs des suggestions (résolus en un seul appel).
  const authorIds = Array.from(new Set(rows.map((r) => r.author_id)));
  const authorsById = new Map<string, Profile>();
  if (authorIds.length) {
    const { data: profs } = await supabase.from("profiles").select("*").in("id", authorIds);
    for (const p of (profs as Profile[]) ?? []) authorsById.set(p.id, p);
  }

  const suggestions: ResolvedSuggestion[] = rows.map((r) => ({
    ...r,
    author: authorsById.get(r.author_id),
  }));

  // Contributeurs = auteurs de suggestions acceptées, triés par nombre.
  const counts = new Map<string, Contributor>();
  for (const s of suggestions) {
    if (s.status !== "accepted" || !s.author) continue;
    const entry = counts.get(s.author_id) ?? { profile: s.author, count: 0 };
    entry.count += 1;
    counts.set(s.author_id, entry);
  }
  const contributors = [...counts.values()].sort((x, y) => y.count - x.count);

  return {
    article: a,
    author,
    currentRevision: (currentRev as Revision) ?? null,
    revisions: (revs as ArticleView["revisions"]) ?? [],
    suggestions,
    contributors,
  };
}

/** Blocs de la révision courante (liste vide si aucune). */
export function currentBlocks(view: ArticleView): Block[] {
  return view.currentRevision?.blocks ?? [];
}

export interface ReviewItem extends ResolvedSuggestion {
  article_title: string;
  article_slug: string;
  author_handle: string;
}

/**
 * File de relecture de l'auteur : toutes les suggestions ouvertes sur ses
 * articles, tous articles confondus, la plus récente d'abord.
 */
export async function getReviewQueue(userId: string): Promise<ReviewItem[]> {
  const supabase = await createClient();

  const { data: myArticles } = await supabase
    .from("articles")
    .select("id, slug, title")
    .eq("author_id", userId);
  const articles = (myArticles as { id: string; slug: string; title: string }[]) ?? [];
  if (articles.length === 0) return [];

  const byId = new Map(articles.map((a) => [a.id, a]));
  const { data: authorProfile } = await supabase
    .from("profiles")
    .select("handle")
    .eq("id", userId)
    .single();
  const handle = (authorProfile as { handle: string } | null)?.handle ?? "";

  const { data: rows } = await supabase
    .from("suggestions_resolved")
    .select("*")
    .in("article_id", articles.map((a) => a.id))
    .eq("status", "open")
    .order("created_at", { ascending: false });
  const list = (rows as ResolvedRow[] | null) ?? [];

  const authorIds = Array.from(new Set(list.map((r) => r.author_id)));
  const authorsById = new Map<string, Profile>();
  if (authorIds.length) {
    const { data: profs } = await supabase.from("profiles").select("*").in("id", authorIds);
    for (const p of (profs as Profile[]) ?? []) authorsById.set(p.id, p);
  }

  return list.map((r) => {
    const a = byId.get(r.article_id)!;
    return {
      ...r,
      author: authorsById.get(r.author_id),
      article_title: a.title,
      article_slug: a.slug,
      author_handle: handle,
    };
  });
}
