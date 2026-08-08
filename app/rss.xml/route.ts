import { createAnonClient } from "@/lib/supabase/anon";
import { buildRss, siteUrl, type RssItem } from "@/lib/rss";

// Revalidé toutes les 5 min : un flux n'a pas besoin d'être à la seconde.
export const revalidate = 300;

/** Flux RSS global : les articles publiés les plus récents, tous auteurs. */
export async function GET() {
  const supabase = createAnonClient();
  const base = siteUrl();

  const { data: articles } = await supabase
    .from("articles")
    .select("slug, title, lede, published_at, author_id")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(40);
  const rows = (articles as { slug: string; title: string; lede: string | null; published_at: string | null; author_id: string }[]) ?? [];

  const handleById = new Map<string, string>();
  if (rows.length) {
    const authorIds = Array.from(new Set(rows.map((a) => a.author_id)));
    const { data: profs } = await supabase.from("profiles").select("id, handle").in("id", authorIds);
    for (const p of (profs as { id: string; handle: string }[]) ?? []) handleById.set(p.id, p.handle);
  }

  const items: RssItem[] = rows.map((a) => {
    const url = `${base}/@${handleById.get(a.author_id) ?? ""}/${a.slug}`;
    return { title: a.title, link: url, guid: url, description: a.lede, pubDate: a.published_at };
  });

  const xml = buildRss({
    title: "Marge — fil d'actualité",
    description: "Les articles publiés les plus récents sur Marge.",
    siteUrl: base,
    feedUrl: `${base}/rss.xml`,
    items,
  });

  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
