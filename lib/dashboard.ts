import { createClient } from "@/lib/supabase/server";
import type { ArticleStatus, Profile } from "@/lib/types";

export interface ArticleStat {
  id: string;
  slug: string;
  title: string;
  status: ArticleStatus;
  view_count: number;
  open: number;
  accepted: number;
}

export interface TopContributor {
  handle: string;
  display_name: string;
  count: number;
}

export interface Dashboard {
  totalArticles: number;
  publishedArticles: number;
  totalViews: number;
  totalAccepted: number;
  pendingTotal: number;
  /** accepted / (accepted + rejected), ou null si rien de tranché. */
  acceptanceRate: number | null;
  articles: ArticleStat[];
  topContributors: TopContributor[];
}

const EMPTY: Dashboard = {
  totalArticles: 0, publishedArticles: 0, totalViews: 0, totalAccepted: 0,
  pendingTotal: 0, acceptanceRate: null, articles: [], topContributors: [],
};

/** Agrège les statistiques des articles de l'auteur pour le tableau de bord. */
export async function getDashboard(userId: string): Promise<Dashboard> {
  const supabase = await createClient();

  const { data: articleRows } = await supabase
    .from("articles")
    .select("id, slug, title, status, view_count")
    .eq("author_id", userId)
    .order("view_count", { ascending: false });
  const articles = (articleRows as Pick<ArticleStat, "id" | "slug" | "title" | "status" | "view_count">[]) ?? [];
  if (articles.length === 0) return EMPTY;

  const ids = articles.map((a) => a.id);
  const { data: sugRows } = await supabase
    .from("suggestions")
    .select("article_id, status, author_id")
    .in("article_id", ids);
  const suggestions = (sugRows as { article_id: string; status: string; author_id: string }[]) ?? [];

  // Compteurs par article + totaux.
  const openByArticle = new Map<string, number>();
  const acceptedByArticle = new Map<string, number>();
  let totalAccepted = 0;
  let totalRejected = 0;
  const acceptedByAuthor = new Map<string, number>();

  for (const s of suggestions) {
    if (s.status === "open") openByArticle.set(s.article_id, (openByArticle.get(s.article_id) ?? 0) + 1);
    if (s.status === "accepted") {
      acceptedByArticle.set(s.article_id, (acceptedByArticle.get(s.article_id) ?? 0) + 1);
      totalAccepted += 1;
      acceptedByAuthor.set(s.author_id, (acceptedByAuthor.get(s.author_id) ?? 0) + 1);
    }
    if (s.status === "rejected") totalRejected += 1;
  }

  const stats: ArticleStat[] = articles.map((a) => ({
    ...a,
    open: openByArticle.get(a.id) ?? 0,
    accepted: acceptedByArticle.get(a.id) ?? 0,
  }));

  // Top contributeurs (auteurs de suggestions acceptées).
  const topIds = [...acceptedByAuthor.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  let topContributors: TopContributor[] = [];
  if (topIds.length) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, handle, display_name")
      .in("id", topIds.map(([id]) => id));
    const byId = new Map((profs as (Profile & { id: string })[] ?? []).map((p) => [p.id, p]));
    topContributors = topIds.map(([id, count]) => ({
      handle: byId.get(id)?.handle ?? "",
      display_name: byId.get(id)?.display_name ?? "Contributeur",
      count,
    }));
  }

  const resolved = totalAccepted + totalRejected;
  return {
    totalArticles: articles.length,
    publishedArticles: articles.filter((a) => a.status === "published").length,
    totalViews: articles.reduce((sum, a) => sum + (a.view_count ?? 0), 0),
    totalAccepted,
    pendingTotal: [...openByArticle.values()].reduce((s, n) => s + n, 0),
    acceptanceRate: resolved > 0 ? totalAccepted / resolved : null,
    articles: stats,
    topContributors,
  };
}
