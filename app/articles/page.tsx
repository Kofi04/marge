import { redirect } from "next/navigation";
import Link from "next/link";
import { PenLine } from "lucide-react";
import { getSessionProfile, isProvisionalHandle } from "@/lib/auth";
import { getMyArticles } from "@/lib/my-articles";
import { AppHeader } from "@/components/AppHeader";
import { MyArticlesList } from "@/components/articles/MyArticlesList";
import { C } from "@/lib/tokens";

export const dynamic = "force-dynamic";

export default async function MyArticlesPage() {
  const { userId, profile } = await getSessionProfile();
  if (!userId || !profile) redirect("/login?next=/articles");
  if (isProvisionalHandle(profile.handle)) redirect("/welcome");

  const articles = await getMyArticles(userId);

  return (
    <div style={{ minHeight: "100vh", background: C.paper }}>
      <AppHeader profile={profile} active="articles" />
      <main style={{ maxWidth: 720, margin: "0 auto", padding: "34px 22px 90px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <h1 style={{ fontFamily: "var(--serif)", fontSize: 30, fontWeight: 500, letterSpacing: "-.02em", margin: 0 }}>
            Mes articles
          </h1>
          <Link href="/write" style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 7, background: C.ink, color: C.paper, padding: "9px 15px", borderRadius: 9, fontSize: 14, fontWeight: 600 }}>
            <PenLine size={15} /> Écrire
          </Link>
        </div>

        <MyArticlesList articles={articles} handle={profile.handle} />
      </main>
    </div>
  );
}
