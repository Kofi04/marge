import { redirect } from "next/navigation";
import Link from "next/link";
import { PenLine, Compass, Sparkles, Users } from "lucide-react";
import { getSessionProfile, isProvisionalHandle } from "@/lib/auth";
import { getArticleFeed } from "@/lib/feed";
import { getFollowingFeed } from "@/lib/follows";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/AppHeader";
import { SearchBox } from "@/components/search/SearchBox";
import { ArticleCard } from "@/components/feed/ArticleCard";
import { C } from "@/lib/tokens";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ feed?: string }>;
}) {
  const { userId, profile } = await getSessionProfile();
  if (!userId || !profile) redirect("/login?next=/home");
  if (isProvisionalHandle(profile.handle)) redirect("/welcome");

  const { feed: feedParam } = await searchParams;
  const tab: "discover" | "following" = feedParam === "following" ? "following" : "discover";

  const supabase = await createClient();
  const [feed, { count: myArticles }] = await Promise.all([
    tab === "following" ? getFollowingFeed(userId, 20) : getArticleFeed(20),
    supabase.from("articles").select("id", { count: "exact", head: true }).eq("author_id", userId),
  ]);
  const isNew = (myArticles ?? 0) === 0;

  return (
    <div style={{ minHeight: "100vh", background: C.paper }}>
      <AppHeader profile={profile} active="home" />
      <main style={{ maxWidth: 720, margin: "0 auto", padding: "34px 22px 90px" }}>
        {/* Accueil / onboarding */}
        <section
          style={{
            border: `1px solid ${C.rule}`, borderRadius: 14, padding: 24, marginBottom: 34,
            background: `linear-gradient(180deg, ${C.pencilSoft} 0%, ${C.paper} 100%)`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: C.pencil, fontSize: 12, fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase", marginBottom: 10 }}>
            <Sparkles size={13} /> {isNew ? "Bienvenue sur Marge" : `Bonjour, ${profile.display_name}`}
          </div>
          <h1 style={{ fontFamily: "var(--serif)", fontSize: 28, fontWeight: 500, letterSpacing: "-.02em", margin: "0 0 10px", lineHeight: 1.2 }}>
            {isNew ? "Publiez, et laissez vos lecteurs améliorer vos textes." : "Vos lecteurs corrigent, vous tranchez."}
          </h1>
          <p style={{ fontSize: 14.5, color: C.inkSoft, lineHeight: 1.6, margin: "0 0 18px", maxWidth: 520 }}>
            {isNew
              ? "Écrivez un premier article : chaque lecteur pourra proposer des corrections dans la marge, que vous acceptez en un clic. Ou explorez les articles ci-dessous pour contribuer."
              : "Retrouvez la file de relecture de vos articles, écrivez une nouvelle publication, ou explorez le fil ci-dessous."}
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link href="/write" style={{ display: "inline-flex", alignItems: "center", gap: 7, background: C.ink, color: C.paper, padding: "10px 16px", borderRadius: 9, fontSize: 14, fontWeight: 600 }}>
              <PenLine size={15} /> Écrire un article
            </Link>
            <Link href="/review" style={{ display: "inline-flex", alignItems: "center", gap: 7, border: `1px solid ${C.rule}`, padding: "10px 16px", borderRadius: 9, fontSize: 14, fontWeight: 500, color: C.ink, background: C.paper }}>
              File de relecture
            </Link>
          </div>
        </section>

        {/* Recherche */}
        <div style={{ marginBottom: 26 }}>
          <SearchBox />
        </div>

        {/* Bascule Découvrir / Suivis */}
        <div style={{ display: "flex", gap: 4, marginBottom: 18, borderBottom: `1px solid ${C.rule}` }}>
          <FeedTab href="/home" active={tab === "discover"} icon={<Compass size={14} />} label="Découvrir" />
          <FeedTab href="/home?feed=following" active={tab === "following"} icon={<Users size={14} />} label="Suivis" />
        </div>

        {feed.length === 0 ? (
          <div style={{ border: `1px dashed ${C.rule}`, borderRadius: 12, padding: 32, textAlign: "center" }}>
            {tab === "following" ? (
              <p style={{ margin: 0, fontSize: 14, color: C.inkSoft }}>
                Vous ne suivez encore personne, ou vos auteurs n&apos;ont rien publié. Passez sur <Link href="/home" style={{ color: C.pencil, fontWeight: 600 }}>Découvrir</Link> pour trouver des auteurs à suivre.
              </p>
            ) : (
              <p style={{ margin: 0, fontSize: 14, color: C.inkSoft }}>
                Aucun article publié pour l&apos;instant. Soyez le premier — <Link href="/write" style={{ color: C.pencil, fontWeight: 600 }}>écrivez le vôtre</Link>.
              </p>
            )}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {feed.map((a) => <ArticleCard key={a.id} item={a} />)}
          </div>
        )}
      </main>
      <style>{`.feed-card { transition: border-color .2s, transform .2s; } .feed-card:hover { border-color: #C9CBD2; transform: translateY(-2px); }`}</style>
    </div>
  );
}

/** Onglet de bascule du fil (Découvrir / Suivis). */
function FeedTab({ href, active, icon, label }: { href: string; active: boolean; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 14px", fontSize: 13.5, fontWeight: 600,
        color: active ? C.ink : C.inkFaint, borderBottom: `2px solid ${active ? C.ink : "transparent"}`, marginBottom: -1,
      }}
    >
      {icon} {label}
    </Link>
  );
}
