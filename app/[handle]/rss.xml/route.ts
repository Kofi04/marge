import { createAnonClient } from "@/lib/supabase/anon";
import { buildRss, siteUrl, type RssItem } from "@/lib/rss";

export const revalidate = 300;

function parseHandle(raw: string): string | null {
  const decoded = decodeURIComponent(raw);
  return decoded.startsWith("@") ? decoded.slice(1) : null;
}

/** Flux RSS d'un auteur : ses articles publiés, les plus récents d'abord. */
export async function GET(_request: Request, { params }: { params: Promise<{ handle: string }> }) {
  const { handle: raw } = await params;
  const handle = parseHandle(raw);
  if (!handle) return new Response("Not found", { status: 404 });

  const supabase = createAnonClient();
  const base = siteUrl();

  const { data: author } = await supabase
    .from("profiles")
    .select("id, handle, display_name")
    .eq("handle", handle)
    .single();
  if (!author) return new Response("Not found", { status: 404 });
  const a = author as { id: string; handle: string; display_name: string };

  const { data: articles } = await supabase
    .from("articles")
    .select("slug, title, lede, published_at")
    .eq("author_id", a.id)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(40);
  const rows = (articles as { slug: string; title: string; lede: string | null; published_at: string | null }[]) ?? [];

  const items: RssItem[] = rows.map((art) => {
    const url = `${base}/@${a.handle}/${art.slug}`;
    return { title: art.title, link: url, guid: url, description: art.lede, pubDate: art.published_at };
  });

  const xml = buildRss({
    title: `Marge — ${a.display_name} (@${a.handle})`,
    description: `Les articles publiés de ${a.display_name} sur Marge.`,
    siteUrl: `${base}/@${a.handle}`,
    feedUrl: `${base}/@${a.handle}/rss.xml`,
    items,
  });

  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
