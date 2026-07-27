import { redirect } from "next/navigation";
import Link from "next/link";
import { PenLine, ArrowRight, Compass, Sparkles } from "lucide-react";
import { getSessionProfile, isProvisionalHandle } from "@/lib/auth";
import { getArticleFeed } from "@/lib/feed";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/AppHeader";
import { Avatar } from "@/components/ui/Avatar";
import { timeAgo } from "@/lib/time";
import { C } from "@/lib/tokens";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { userId, profile } = await getSessionProfile();
  if (!userId || !profile) redirect("/login?next=/home");
  if (isProvisionalHandle(profile.handle)) redirect("/welcome");

  const supabase = await createClient();
  const [feed, { count: myArticles }] = await Promise.all([
    getArticleFeed(20),
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

        {/* Fil d'actualité */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, color: C.inkFaint, fontSize: 11, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase" }}>
          <Compass size={13} /> Fil d&apos;actualité
        </div>

        {feed.length === 0 ? (
          <div style={{ border: `1px dashed ${C.rule}`, borderRadius: 12, padding: 32, textAlign: "center" }}>
            <p style={{ margin: 0, fontSize: 14, color: C.inkSoft }}>
              Aucun article publié pour l&apos;instant. Soyez le premier — <Link href="/write" style={{ color: C.pencil, fontWeight: 600 }}>écrivez le vôtre</Link>.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {feed.map((a) => (
              <Link
                key={a.id}
                href={`/@${a.author.handle}/${a.slug}`}
                style={{ border: `1px solid ${C.rule}`, borderRadius: 12, padding: 18, display: "block", background: C.paper }}
                className="feed-card"
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, fontSize: 12.5, color: C.inkFaint }}>
                  <Avatar name={a.author.display_name} size={20} />
                  <span style={{ color: C.ink, fontWeight: 600 }}>{a.author.display_name}</span>
                  {a.published_at && <><span>·</span><span>{timeAgo(a.published_at)}</span></>}
                </div>
                <div style={{ fontFamily: "var(--serif)", fontSize: 20, fontWeight: 500, letterSpacing: "-.01em", marginBottom: 4 }}>{a.title}</div>
                {a.lede && <div style={{ fontSize: 14, color: C.inkSoft, lineHeight: 1.55 }}>{a.lede}</div>}
                <div style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 10, fontSize: 12.5, color: C.pencil, fontWeight: 600 }}>
                  Lire et contribuer <ArrowRight size={13} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
      <style>{`.feed-card { transition: border-color .2s, transform .2s; } .feed-card:hover { border-color: #C9CBD2; transform: translateY(-2px); }`}</style>
    </div>
  );
}
