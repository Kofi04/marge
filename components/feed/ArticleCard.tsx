import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { C } from "@/lib/tokens";
import { Avatar } from "@/components/ui/Avatar";
import { timeAgo } from "@/lib/time";
import type { FeedItem } from "@/lib/feed";

/** Puce de tag cliquable → page du tag. */
export function TagChip({ tag }: { tag: string }) {
  return (
    <Link
      href={`/tags/${encodeURIComponent(tag)}`}
      style={{
        fontSize: 11.5, fontWeight: 600, color: C.pencil, background: C.pencilSoft,
        padding: "2px 8px", borderRadius: 999, textDecoration: "none",
      }}
    >
      #{tag}
    </Link>
  );
}

/** Carte d'article du fil (accueil, recherche, tags). */
export function ArticleCard({ item }: { item: FeedItem }) {
  return (
    <div style={{ border: `1px solid ${C.rule}`, borderRadius: 12, padding: 18, background: C.paper }} className="feed-card">
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, fontSize: 12.5, color: C.inkFaint }}>
        <Avatar name={item.author.display_name} size={20} />
        <Link href={`/@${item.author.handle}`} style={{ color: C.ink, fontWeight: 600 }}>{item.author.display_name}</Link>
        {item.published_at && <><span>·</span><span>{timeAgo(item.published_at)}</span></>}
      </div>

      <Link href={`/@${item.author.handle}/${item.slug}`} style={{ display: "block" }}>
        <div style={{ fontFamily: "var(--serif)", fontSize: 20, fontWeight: 500, letterSpacing: "-.01em", marginBottom: 4, color: C.ink }}>{item.title}</div>
        {item.lede && <div style={{ fontSize: 14, color: C.inkSoft, lineHeight: 1.55 }}>{item.lede}</div>}
      </Link>

      {item.tags.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
          {item.tags.map((t) => <TagChip key={t} tag={t} />)}
        </div>
      )}

      <Link href={`/@${item.author.handle}/${item.slug}`} style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 10, fontSize: 12.5, color: C.pencil, fontWeight: 600 }}>
        Lire et contribuer <ArrowRight size={13} />
      </Link>
    </div>
  );
}
