import Link from "next/link";
import { Search } from "lucide-react";
import { getSessionProfile } from "@/lib/auth";
import { searchArticles, normalizeQuery } from "@/lib/search";
import { AppHeader } from "@/components/AppHeader";
import { SearchBox } from "@/components/search/SearchBox";
import { ArticleCard } from "@/components/feed/ArticleCard";
import { C } from "@/lib/tokens";

export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q: rawQ } = await searchParams;
  const q = normalizeQuery(rawQ ?? "");

  const [{ profile }, results] = await Promise.all([
    getSessionProfile(),
    q ? searchArticles(q) : Promise.resolve([]),
  ]);

  const body = (
    <>
      <div style={{ marginBottom: 26 }}>
        <SearchBox initial={q} autoFocus={!q} />
      </div>

      {q ? (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, color: C.inkFaint, fontSize: 12.5 }}>
            <Search size={14} />
            {results.length === 0
              ? <>Aucun résultat pour « <strong style={{ color: C.ink }}>{q}</strong> »</>
              : <><strong style={{ color: C.ink }}>{results.length}</strong> résultat{results.length > 1 ? "s" : ""} pour « {q} »</>}
          </div>
          {results.length === 0 ? (
            <p style={{ fontSize: 14, color: C.inkSoft }}>
              Essayez d&apos;autres mots-clés, ou explorez le <Link href="/home" style={{ color: C.pencil, fontWeight: 600 }}>fil d&apos;actualité</Link>.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {results.map((a) => <ArticleCard key={a.id} item={a} />)}
            </div>
          )}
        </>
      ) : (
        <p style={{ fontSize: 14, color: C.inkSoft }}>
          Recherchez parmi les articles publiés : titre, chapô, contenu et tags.
        </p>
      )}
    </>
  );

  return (
    <div style={{ minHeight: "100vh", background: C.paper }}>
      {profile ? <AppHeader profile={profile} /> : <PublicHeader />}
      <main style={{ maxWidth: 720, margin: "0 auto", padding: "34px 22px 90px" }}>
        <h1 style={{ fontFamily: "var(--serif)", fontSize: 28, fontWeight: 500, letterSpacing: "-.02em", margin: "0 0 20px" }}>
          Recherche
        </h1>
        {body}
      </main>
      <style>{`.feed-card { transition: border-color .2s, transform .2s; } .feed-card:hover { border-color: #C9CBD2; transform: translateY(-2px); }`}</style>
    </div>
  );
}

function PublicHeader() {
  return (
    <header style={{ borderBottom: `1px solid ${C.rule}`, background: "rgba(252,252,250,.88)" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "11px 22px" }}>
        <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 22, height: 22, borderRadius: 6, background: C.ink, color: C.paper, display: "grid", placeItems: "center", fontSize: 12, fontWeight: 700 }}>M</div>
          <span style={{ fontWeight: 700, fontSize: 14.5 }}>Marge</span>
        </Link>
      </div>
    </header>
  );
}
