import { createClient } from "@/lib/supabase/server";
import type { NotificationKind } from "@/lib/types";

export interface NotificationView {
  id: string;
  kind: NotificationKind;
  read_at: string | null;
  created_at: string;
  text: string;
  href: string | null;
}

/** Notifications du destinataire, enrichies d'un texte lisible et d'un lien. */
export async function getNotifications(userId: string): Promise<NotificationView[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("recipient_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  const rows =
    (data as {
      id: string;
      kind: NotificationKind;
      payload: Record<string, string>;
      read_at: string | null;
      created_at: string;
    }[]) ?? [];
  if (rows.length === 0) return [];

  // Résout titres/handles des articles et noms des acteurs.
  const articleIds = Array.from(new Set(rows.map((r) => r.payload.article_id).filter(Boolean)));
  const actorIds = Array.from(new Set(rows.map((r) => r.payload.author_id).filter(Boolean)));

  const [{ data: arts }, { data: actors }] = await Promise.all([
    articleIds.length
      ? supabase.from("articles").select("id, slug, title, author_id").in("id", articleIds)
      : Promise.resolve({ data: [] }),
    actorIds.length
      ? supabase.from("profiles").select("id, display_name").in("id", actorIds)
      : Promise.resolve({ data: [] }),
  ]);

  const artById = new Map((arts as { id: string; slug: string; title: string; author_id: string }[] ?? []).map((a) => [a.id, a]));
  const authorIds = Array.from(new Set([...artById.values()].map((a) => a.author_id)));
  const { data: authorProfiles } = authorIds.length
    ? await supabase.from("profiles").select("id, handle").in("id", authorIds)
    : { data: [] };
  const handleById = new Map((authorProfiles as { id: string; handle: string }[] ?? []).map((p) => [p.id, p.handle]));
  const actorName = new Map((actors as { id: string; display_name: string }[] ?? []).map((p) => [p.id, p.display_name]));

  return rows.map((r) => {
    const art = r.payload.article_id ? artById.get(r.payload.article_id) : undefined;
    const title = art?.title ?? "un article";
    const href = art ? `/@${handleById.get(art.author_id) ?? ""}/${art.slug}` : null;
    const who = r.payload.author_id ? actorName.get(r.payload.author_id) ?? "Quelqu'un" : "Quelqu'un";

    let text: string;
    switch (r.kind) {
      case "suggestion_received":
        text = `${who} a proposé une réécriture sur « ${title} ».`;
        break;
      case "suggestion_accepted":
        text = `Votre proposition sur « ${title} » a été acceptée (révision ${r.payload.revision ?? "+1"}).`;
        break;
      case "suggestion_rejected":
        text = `Votre proposition sur « ${title} » n'a pas été retenue.`;
        break;
      case "comment":
        text = `${who} a commenté votre proposition sur « ${title} ».`;
        break;
      default:
        text = "Nouvelle notification.";
    }
    return { id: r.id, kind: r.kind, read_at: r.read_at, created_at: r.created_at, text, href };
  });
}
