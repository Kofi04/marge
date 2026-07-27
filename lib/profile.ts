import { createAnonClient } from "@/lib/supabase/anon";
import type { Article, Profile } from "@/lib/types";

export interface Contribution {
  suggestion_id: string;
  article_title: string;
  article_slug: string;
  author_handle: string;
  created_at: string;
}

export interface ProfileView {
  profile: Profile;
  articles: Pick<Article, "id" | "slug" | "title" | "lede" | "published_at">[];
  contributions: Contribution[];
}

/**
 * Vue publique d'un profil (cacheable, client anon) : articles publiés + toutes
 * les contributions acceptées ailleurs. L'attribution est le produit.
 */
export async function getProfileView(handle: string): Promise<ProfileView | null> {
  const supabase = createAnonClient();

  const { data: profileRow } = await supabase.from("profiles").select("*").eq("handle", handle).single();
  if (!profileRow) return null;
  const profile = profileRow as Profile;

  const { data: articleRows } = await supabase
    .from("articles")
    .select("id, slug, title, lede, published_at")
    .eq("author_id", profile.id)
    .eq("status", "published")
    .order("published_at", { ascending: false });
  const articles = (articleRows as ProfileView["articles"]) ?? [];

  // Contributions acceptées de cette personne, sur les articles des autres.
  const { data: sugRows } = await supabase
    .from("suggestions")
    .select("id, article_id, created_at")
    .eq("author_id", profile.id)
    .eq("status", "accepted")
    .order("created_at", { ascending: false });
  const sugs = (sugRows as { id: string; article_id: string; created_at: string }[]) ?? [];

  const contributions: Contribution[] = [];
  if (sugs.length) {
    const articleIds = Array.from(new Set(sugs.map((s) => s.article_id)));
    const { data: arts } = await supabase
      .from("articles")
      .select("id, slug, title, author_id")
      .in("id", articleIds);
    const artById = new Map((arts as { id: string; slug: string; title: string; author_id: string }[] ?? []).map((a) => [a.id, a]));

    const authorIds = Array.from(new Set([...artById.values()].map((a) => a.author_id)));
    const { data: authors } = await supabase.from("profiles").select("id, handle").in("id", authorIds);
    const handleById = new Map((authors as { id: string; handle: string }[] ?? []).map((p) => [p.id, p.handle]));

    for (const s of sugs) {
      const a = artById.get(s.article_id);
      if (!a) continue;
      contributions.push({
        suggestion_id: s.id,
        article_title: a.title,
        article_slug: a.slug,
        author_handle: handleById.get(a.author_id) ?? "",
        created_at: s.created_at,
      });
    }
  }

  return { profile, articles, contributions };
}
