import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { PenLine, Sparkles, Rss } from "lucide-react";
import { getProfileView } from "@/lib/profile";
import { getFollowCounts } from "@/lib/follows";
import { C } from "@/lib/tokens";
import { Avatar } from "@/components/ui/Avatar";
import { FollowButton } from "@/components/follow/FollowButton";
import { timeAgo } from "@/lib/time";

// Profil public : rendu en Server Component avec cache ISR (client anon,
// aucune lecture de session → cacheable).
export const revalidate = 60;

function parseHandle(raw: string): string | null {
  const decoded = decodeURIComponent(raw);
  return decoded.startsWith("@") ? decoded.slice(1) : null;
}

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }): Promise<Metadata> {
  const { handle: raw } = await params;
  const handle = parseHandle(raw);
  if (!handle) return {};
  const view = await getProfileView(handle);
  if (!view) return {};
  return {
    title: `${view.profile.display_name} (@${handle}) — Marge`,
    alternates: { types: { "application/rss+xml": `/@${handle}/rss.xml` } },
  };
}

export default async function ProfilePage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle: raw } = await params;
  const handle = parseHandle(raw);
  if (!handle) notFound();

  const view = await getProfileView(handle);
  if (!view) notFound();
  const { profile, articles, contributions } = view;
  const counts = await getFollowCounts(profile.id);

  return (
    <div style={{ minHeight: "100vh", background: C.paper, color: C.ink }}>
      <header style={{ borderBottom: `1px solid ${C.rule}`, background: C.headerBg }}>
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "11px 22px" }}>
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 22, height: 22, borderRadius: 6, background: C.ink, color: C.paper, display: "grid", placeItems: "center", fontSize: 12, fontWeight: 700 }}>M</div>
            <span style={{ fontWeight: 700, fontSize: 14.5 }}>Marge</span>
          </Link>
        </div>
      </header>

      <main style={{ maxWidth: 720, margin: "0 auto", padding: "40px 22px 90px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 10 }}>
          <Avatar name={profile.display_name} size={56} tone="pencil" />
          <div style={{ flex: 1 }}>
            <h1 style={{ fontFamily: "var(--serif)", fontSize: 28, fontWeight: 500, margin: 0, letterSpacing: "-.02em" }}>
              {profile.display_name}
            </h1>
            <span style={{ fontSize: 13.5, color: C.inkFaint }}>@{profile.handle}</span>
          </div>
          <FollowButton targetId={profile.id} />
        </div>
        {profile.bio && <p style={{ fontSize: 15, color: C.inkSoft, lineHeight: 1.6, margin: "0 0 8px", maxWidth: 520 }}>{profile.bio}</p>}

        <div style={{ display: "flex", gap: 20, margin: "18px 0 34px", fontSize: 13, flexWrap: "wrap" }}>
          <span style={{ color: C.inkSoft }}><strong style={{ color: C.ink }}>{articles.length}</strong> article{articles.length > 1 ? "s" : ""}</span>
          <span style={{ color: C.inkSoft }}><strong style={{ color: C.ink }}>{contributions.length}</strong> contribution{contributions.length > 1 ? "s" : ""} acceptée{contributions.length > 1 ? "s" : ""}</span>
          <span style={{ color: C.inkSoft }}><strong style={{ color: C.ink }}>{counts.followers}</strong> abonné{counts.followers > 1 ? "s" : ""}</span>
          <span style={{ color: C.inkSoft }}><strong style={{ color: C.ink }}>{counts.following}</strong> abonnement{counts.following > 1 ? "s" : ""}</span>
          <a href={`/@${profile.handle}/rss.xml`} title="Flux RSS" style={{ display: "inline-flex", alignItems: "center", gap: 4, color: C.stale, fontWeight: 600 }}>
            <Rss size={13} /> RSS
          </a>
        </div>

        {/* Articles écrits */}
        <section style={{ marginBottom: 36 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 14, color: C.inkFaint, fontSize: 11, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase" }}>
            <PenLine size={13} /> Articles
          </div>
          {articles.length === 0 ? (
            <p style={{ fontSize: 13.5, color: C.inkFaint, margin: 0 }}>Aucun article publié pour l&apos;instant.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {articles.map((a) => (
                <Link key={a.id} href={`/@${profile.handle}/${a.slug}`} style={{ border: `1px solid ${C.rule}`, borderRadius: 11, padding: 16, display: "block" }}>
                  <div style={{ fontFamily: "var(--serif)", fontSize: 19, fontWeight: 500, marginBottom: 4 }}>{a.title}</div>
                  {a.lede && <div style={{ fontSize: 13.5, color: C.inkSoft, lineHeight: 1.5 }}>{a.lede}</div>}
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Contributions acceptées ailleurs */}
        <section>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 14, color: C.inkFaint, fontSize: 11, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase" }}>
            <Sparkles size={13} /> Contributions acceptées
          </div>
          {contributions.length === 0 ? (
            <p style={{ fontSize: 13.5, color: C.inkFaint, margin: 0 }}>Pas encore de contribution acceptée.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {contributions.map((c) => (
                <Link key={c.suggestion_id} href={`/@${c.author_handle}/${c.article_slug}`} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: C.panel, borderRadius: 9, fontSize: 13.5 }}>
                  <Sparkles size={13} color={C.accepted} />
                  <span style={{ flex: 1 }}>a amélioré « {c.article_title} »</span>
                  <span style={{ fontSize: 12, color: C.inkFaint }}>{timeAgo(c.created_at)}</span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
