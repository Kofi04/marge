import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { Article } from "@/lib/types";

function err(status: number, message: string) {
  return NextResponse.json({ error: "article_error", message }, { status });
}

const patchSchema = z.object({
  status: z.enum(["draft", "published", "archived"]),
});

/** Charge l'article et vérifie que l'appelant en est l'auteur. */
async function loadOwned(supabase: Awaited<ReturnType<typeof createClient>>, id: string, userId: string) {
  const { data } = await supabase.from("articles").select("*").eq("id", id).single();
  const article = data as Article | null;
  if (!article) return { error: err(404, "Article introuvable.") as NextResponse };
  if (article.author_id !== userId) return { error: err(403, "Article d'un autre auteur.") as NextResponse };
  return { article };
}

/** Change le statut d'un article (brouillon / publié / archivé). */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return err(401, "Connexion requise.");

  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) return err(400, parsed.error.issues[0].message);

  const owned = await loadOwned(supabase, id, user.id);
  if ("error" in owned) return owned.error;
  const { article } = owned;

  const update: Record<string, unknown> = { status: parsed.data.status };
  // Première publication : on horodate. Une republication ne réécrit pas la date.
  if (parsed.data.status === "published" && !article.published_at) {
    update.published_at = new Date().toISOString();
  }

  const { error: updErr } = await supabase.from("articles").update(update).eq("id", id);
  if (updErr) return err(400, updErr.message);

  return NextResponse.json({ id, status: parsed.data.status });
}

/** Supprime un article (révisions, suggestions et fils sont supprimés en cascade). */
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return err(401, "Connexion requise.");

  const owned = await loadOwned(supabase, id, user.id);
  if ("error" in owned) return owned.error;

  const { error: delErr } = await supabase.from("articles").delete().eq("id", id);
  if (delErr) return err(400, delErr.message);

  return NextResponse.json({ id, deleted: true });
}
