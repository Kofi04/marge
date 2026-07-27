import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { saveArticleSchema } from "@/lib/schemas";
import { slugify } from "@/lib/slug";
import type { Article } from "@/lib/types";

function err(status: number, message: string) {
  return NextResponse.json({ error: "article_error", message }, { status });
}

/** Crée un article (+ révision 1) ou enregistre une nouvelle révision. */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return err(401, "Connexion requise.");

  const parsed = saveArticleSchema.safeParse(await request.json());
  if (!parsed.success) return err(400, parsed.error.issues[0].message);
  const input = parsed.data;

  const { data: profile } = await supabase.from("profiles").select("handle").eq("id", user.id).single();
  const handle = (profile as { handle: string } | null)?.handle;
  if (!handle) return err(400, "Profil incomplet.");

  let articleId = input.id;
  let slug: string;

  if (articleId) {
    // Édition d'un article existant : mise à jour des méta.
    const { data: existing } = await supabase.from("articles").select("*").eq("id", articleId).single();
    const article = existing as Article | null;
    if (!article) return err(404, "Article introuvable.");
    if (article.author_id !== user.id) return err(403, "Article d'un autre auteur.");
    slug = article.slug;

    const update: Record<string, unknown> = { title: input.title, lede: input.lede || null, status: input.status };
    if (input.status === "published" && !article.published_at) update.published_at = new Date().toISOString();
    const { error: updErr } = await supabase.from("articles").update(update).eq("id", articleId);
    if (updErr) return err(400, updErr.message);
  } else {
    // Nouvel article : slug unique par auteur.
    const base = slugify(input.title);
    slug = base;
    for (let i = 2; i < 50; i++) {
      const { data: clash } = await supabase
        .from("articles")
        .select("id")
        .eq("author_id", user.id)
        .eq("slug", slug)
        .maybeSingle();
      if (!clash) break;
      slug = `${base}-${i}`;
    }

    const { data: created, error: insErr } = await supabase
      .from("articles")
      .insert({
        author_id: user.id,
        slug,
        title: input.title,
        lede: input.lede || null,
        status: input.status,
        published_at: input.status === "published" ? new Date().toISOString() : null,
      })
      .select("id")
      .single();
    if (insErr || !created) return err(400, insErr?.message ?? "Création impossible.");
    articleId = (created as { id: string }).id;
  }

  // Nouvelle révision via la fonction security definer (seul chemin d'insert).
  const { error: revErr } = await supabase.rpc("create_revision", {
    a_id: articleId,
    new_blocks: input.blocks,
    a_note: input.note || (input.id ? "Révision" : "Publication initiale"),
  });
  if (revErr) return err(400, revErr.message);

  return NextResponse.json({ id: articleId, handle, slug, url: `/@${handle}/${slug}` }, { status: input.id ? 200 : 201 });
}
