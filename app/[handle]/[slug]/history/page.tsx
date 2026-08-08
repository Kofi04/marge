import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getArticleHistory } from "@/lib/history";
import { getSessionProfile } from "@/lib/auth";
import { AppHeader } from "@/components/AppHeader";
import { RevisionHistoryView } from "@/components/history/RevisionHistoryView";
import { C } from "@/lib/tokens";

export const dynamic = "force-dynamic";

function parseHandle(raw: string): string | null {
  const decoded = decodeURIComponent(raw);
  return decoded.startsWith("@") ? decoded.slice(1) : null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string; slug: string }>;
}): Promise<Metadata> {
  const { handle: rawHandle, slug } = await params;
  const handle = parseHandle(rawHandle);
  if (!handle) return {};
  const history = await getArticleHistory(handle, slug);
  if (!history) return {};
  return { title: `Historique — ${history.article.title} — Marge` };
}

export default async function HistoryPage({
  params,
}: {
  params: Promise<{ handle: string; slug: string }>;
}) {
  const { handle: rawHandle, slug } = await params;
  const handle = parseHandle(rawHandle);
  if (!handle) notFound();

  const [history, { profile }] = await Promise.all([
    getArticleHistory(handle, slug),
    getSessionProfile(),
  ]);
  if (!history) notFound();

  const body = (
    <RevisionHistoryView
      title={history.article.title}
      articleUrl={`/@${handle}/${slug}`}
      revisions={history.revisions}
    />
  );

  // Auteur connecté : en-tête applicatif complet. Sinon, page nue centrée.
  return (
    <div style={{ minHeight: "100vh", background: C.paper }}>
      {profile && <AppHeader profile={profile} />}
      <main style={{ maxWidth: 900, margin: "0 auto", padding: "34px 22px 90px" }}>{body}</main>
    </div>
  );
}
