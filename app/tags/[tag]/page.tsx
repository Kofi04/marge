import Link from "next/link";
import type { Metadata } from "next";
import { Tag } from "lucide-react";
import { getSessionProfile } from "@/lib/auth";
import { getArticlesByTag, normalizeTag } from "@/lib/search";
import { AppHeader } from "@/components/AppHeader";
import { ArticleCard } from "@/components/feed/ArticleCard";
import { C } from "@/lib/tokens";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ tag: string }> }): Promise<Metadata> {
  const { tag } = await params;
  return { title: `#${normalizeTag(decodeURIComponent(tag))} — Marge` };
}

export default async function TagPage({ params }: { params: Promise<{ tag: string }> }) {
  const { tag: rawTag } = await params;
  const tag = normalizeTag(decodeURIComponent(rawTag));

  const [{ profile }, results] = await Promise.all([
    getSessionProfile(),
    getArticlesByTag(tag),
  ]);

  return (
    <div style={{ minHeight: "100vh", background: C.paper }}>
      {profile ? <AppHeader profile={profile} /> : (
        <header style={{ borderBottom: `1px solid ${C.rule}`, background: "rgba(252,252,250,.88)" }}>
          <div style={{ maxWidth: 720, margin: "0 auto", padding: "11px 22px" }}>
            <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 22, height: 22, borderRadius: 6, background: C.ink, color: C.paper, display: "grid", placeItems: "center", fontSize: 12, fontWeight: 700 }}>M</div>
              <span style={{ fontWeight: 700, fontSize: 14.5 }}>Marge</span>
            </Link>
          </div>
        </header>
      )}
      <main style={{ maxWidth: 720, margin: "0 auto", padding: "34px 22px 90px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 6 }}>
          <span style={{ display: "inline-grid", placeItems: "center", width: 34, height: 34, borderRadius: 9, background: C.pencilSoft, color: C.pencil }}>
            <Tag size={16} />
          </span>
          <h1 style={{ fontFamily: "var(--serif)", fontSize: 28, fontWeight: 500, letterSpacing: "-.02em", margin: 0 }}>#{tag}</h1>
        </div>
        <p style={{ fontSize: 13.5, color: C.inkSoft, margin: "0 0 24px" }}>
          {results.length} article{results.length > 1 ? "s" : ""} publié{results.length > 1 ? "s" : ""} sous ce tag.
        </p>

        {results.length === 0 ? (
          <p style={{ fontSize: 14, color: C.inkSoft }}>
            Aucun article sous ce tag pour l&apos;instant. Explorez le <Link href="/home" style={{ color: C.pencil, fontWeight: 600 }}>fil d&apos;actualité</Link>.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {results.map((a) => <ArticleCard key={a.id} item={a} />)}
          </div>
        )}
      </main>
      <style>{`.feed-card { transition: border-color .2s, transform .2s; } .feed-card:hover { border-color: #C9CBD2; transform: translateY(-2px); }`}</style>
    </div>
  );
}
