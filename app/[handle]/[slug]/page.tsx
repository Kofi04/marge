import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getArticleView } from "@/lib/queries";
import { getSessionProfile } from "@/lib/auth";
import { ArticleView } from "@/components/article/ArticleView";

// Rendu dynamique : la page lit la session (cookies) et exécute des requêtes
// live à chaque requête, ce qui garde la boucle temps réel (proposition →
// acceptation → révision) toujours correcte. La fraîcheur est assurée par
// Supabase Realtime côté client.
export const dynamic = "force-dynamic";

/** Retire le « @ » de tête du segment handle (exigé pour les routes de profil). */
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
  const view = await getArticleView(handle, slug);
  if (!view) return {};
  return { title: `${view.article.title} — Marge`, description: view.article.lede ?? undefined };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ handle: string; slug: string }>;
}) {
  const { handle: rawHandle, slug } = await params;
  const handle = parseHandle(rawHandle);
  if (!handle) notFound();

  // Données de l'article et session récupérées en parallèle (moins de latence).
  const [view, { userId, profile }] = await Promise.all([
    getArticleView(handle, slug),
    getSessionProfile(),
  ]);
  if (!view) notFound();

  const isArticleAuthor = !!userId && userId === view.article.author_id;

  return (
    <ArticleView
      data={view}
      currentUser={userId ? { id: userId, displayName: profile?.display_name ?? "Vous" } : null}
      isArticleAuthor={isArticleAuthor}
      articleUrl={`/@${handle}/${slug}`}
    />
  );
}
