import { redirect } from "next/navigation";
import Link from "next/link";
import { Eye, Check, Clock, TrendingUp, Users } from "lucide-react";
import { getSessionProfile, isProvisionalHandle } from "@/lib/auth";
import { getDashboard } from "@/lib/dashboard";
import { AppHeader } from "@/components/AppHeader";
import { Avatar } from "@/components/ui/Avatar";
import { C } from "@/lib/tokens";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { userId, profile } = await getSessionProfile();
  if (!userId || !profile) redirect("/login?next=/dashboard");
  if (isProvisionalHandle(profile.handle)) redirect("/welcome");

  const d = await getDashboard(userId);
  const rate = d.acceptanceRate === null ? "—" : `${Math.round(d.acceptanceRate * 100)} %`;

  return (
    <div style={{ minHeight: "100vh", background: C.paper }}>
      <AppHeader profile={profile} active="dashboard" />
      <main style={{ maxWidth: 820, margin: "0 auto", padding: "34px 22px 90px" }}>
        <h1 style={{ fontFamily: "var(--serif)", fontSize: 30, fontWeight: 500, letterSpacing: "-.02em", margin: "0 0 24px" }}>
          Tableau de bord
        </h1>

        {d.totalArticles === 0 ? (
          <div style={{ border: `1px dashed ${C.rule}`, borderRadius: 12, padding: 32, textAlign: "center" }}>
            <p style={{ margin: 0, fontSize: 14, color: C.inkSoft }}>
              Aucune statistique pour l&apos;instant. <Link href="/write" style={{ color: C.pencil, fontWeight: 600 }}>Écrivez un article</Link> pour commencer.
            </p>
          </div>
        ) : (
          <>
            {/* Cartes de synthèse */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 34 }}>
              <StatCard icon={<Eye size={16} />} label="Vues totales" value={d.totalViews.toLocaleString("fr-FR")} />
              <StatCard icon={<Check size={16} />} label="Propositions acceptées" value={String(d.totalAccepted)} />
              <StatCard icon={<TrendingUp size={16} />} label="Taux d'acceptation" value={rate} />
              <StatCard icon={<Clock size={16} />} label="En attente" value={String(d.pendingTotal)} accent={d.pendingTotal > 0} />
            </div>

            {/* Par article */}
            <SectionTitle>Par article</SectionTitle>
            <div style={{ border: `1px solid ${C.rule}`, borderRadius: 12, overflow: "hidden", marginBottom: 34 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto", gap: 12, padding: "10px 16px", background: C.panel, fontSize: 11, fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase", color: C.inkFaint }}>
                <span>Article</span><span style={{ textAlign: "right" }}>Vues</span><span style={{ textAlign: "right" }}>Acceptées</span><span style={{ textAlign: "right" }}>En attente</span>
              </div>
              {d.articles.map((a) => (
                <div key={a.id} style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto", gap: 12, padding: "12px 16px", borderTop: `1px solid ${C.rule}`, alignItems: "center", fontSize: 13.5 }}>
                  <Link href={a.status === "published" ? `/@${profile.handle}/${a.slug}` : `/write?edit=${a.id}`} style={{ color: C.ink, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {a.title} {a.status !== "published" && <span style={{ fontSize: 11, color: C.inkFaint }}>({a.status === "draft" ? "brouillon" : "archivé"})</span>}
                  </Link>
                  <span style={{ textAlign: "right", color: C.inkSoft }}>{a.view_count.toLocaleString("fr-FR")}</span>
                  <span style={{ textAlign: "right", color: C.accepted, fontWeight: 600 }}>{a.accepted}</span>
                  <span style={{ textAlign: "right", color: a.open > 0 ? C.pencil : C.inkFaint, fontWeight: a.open > 0 ? 600 : 400 }}>{a.open}</span>
                </div>
              ))}
            </div>

            {/* Top contributeurs */}
            <SectionTitle>Meilleurs contributeurs</SectionTitle>
            {d.topContributors.length === 0 ? (
              <p style={{ fontSize: 13.5, color: C.inkFaint, margin: 0 }}>Pas encore de contribution acceptée.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {d.topContributors.map((c) => (
                  <Link key={c.handle || c.display_name} href={c.handle ? `/@${c.handle}` : "#"} style={{ display: "flex", alignItems: "center", gap: 10, border: `1px solid ${C.rule}`, borderRadius: 10, padding: "10px 14px" }}>
                    <Avatar name={c.display_name} size={26} tone="pencil" />
                    <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, color: C.ink }}>{c.display_name}</span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12.5, color: C.accepted, fontWeight: 600 }}>
                      <Check size={13} /> {c.count} acceptée{c.count > 1 ? "s" : ""}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function StatCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent?: boolean }) {
  return (
    <div style={{ border: `1px solid ${accent ? C.pencil : C.rule}`, borderRadius: 12, padding: "16px 18px", background: accent ? C.pencilSoft : C.paper }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, color: accent ? C.pencil : C.inkFaint, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-.02em", color: C.ink, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12, color: C.inkSoft, marginTop: 5 }}>{label}</div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 14, color: C.inkFaint, fontSize: 11, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase" }}>
      <Users size={13} /> {children}
    </div>
  );
}
