import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { computeKind } from "@/lib/suggestion";
import type { Article, Block, Revision } from "@/lib/types";

const bodySchema = z.object({
  article_id: z.string().uuid(),
  block_id: z.string().min(1),
  proposed_text: z.string().min(1).max(5000),
  reason: z.string().trim().max(500).optional().default(""),
});

// Anti-abus minimal (section 6 du brief).
const MAX_PER_HOUR = 10;
const HIGH_TRAFFIC_24H = 20; // suggestions/24 h au-delà desquelles l'article est « à fort trafic »
const MIN_ACCOUNT_AGE_MS = 24 * 60 * 60 * 1000;

function err(status: number, message: string) {
  return NextResponse.json({ error: "suggestion_error", message }, { status });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return err(401, "Connexion requise pour proposer une modification.");

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return err(400, "Requête invalide.");
  }

  // Article visible (RLS) + révision courante.
  const { data: articleRow } = await supabase
    .from("articles")
    .select("*")
    .eq("id", body.article_id)
    .single();
  if (!articleRow) return err(404, "Article introuvable.");
  const article = articleRow as Article;
  if (!article.current_revision_id) return err(409, "Article sans révision publiée.");

  const { data: revRow } = await supabase
    .from("revisions")
    .select("*")
    .eq("id", article.current_revision_id)
    .single();
  const revision = revRow as Revision | null;
  const block = revision?.blocks.find((b: Block) => b.id === body.block_id);
  if (!block) return err(400, "Bloc introuvable dans la révision courante.");

  // Ancre et nature recalculées côté serveur (on ne fait pas confiance au client).
  const originalText = block.text;
  if (body.proposed_text.trim() === originalText.trim()) {
    return err(400, "La proposition doit différer du texte actuel.");
  }
  const kind = computeKind(originalText, body.proposed_text);
  if (kind === "edit" && !body.reason.trim()) {
    return err(400, "Une réécriture exige un motif.");
  }

  // Blocage par l'auteur.
  const { data: blocked } = await supabase
    .from("author_blocks")
    .select("author_id")
    .eq("author_id", article.author_id)
    .eq("blocked_id", user.id)
    .maybeSingle();
  if (blocked) return err(403, "Vous ne pouvez pas proposer sur cet article.");

  // Rate limit : 10 suggestions / heure / utilisateur.
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count: lastHour } = await supabase
    .from("suggestions")
    .select("id", { count: "exact", head: true })
    .eq("author_id", user.id)
    .gte("created_at", oneHourAgo);
  if ((lastHour ?? 0) >= MAX_PER_HOUR) {
    return err(429, "Limite de 10 propositions par heure atteinte. Réessayez plus tard.");
  }

  // Âge du compte > 24 h pour proposer sur un article à fort trafic.
  const dayAgo = new Date(Date.now() - MIN_ACCOUNT_AGE_MS).toISOString();
  const { count: recentOnArticle } = await supabase
    .from("suggestions")
    .select("id", { count: "exact", head: true })
    .eq("article_id", article.id)
    .gte("created_at", dayAgo);
  if ((recentOnArticle ?? 0) >= HIGH_TRAFFIC_24H) {
    const accountAge = Date.now() - new Date(user.created_at).getTime();
    if (accountAge < MIN_ACCOUNT_AGE_MS) {
      return err(403, "Cet article reçoit beaucoup de propositions ; un compte de plus de 24 h est requis pour y contribuer.");
    }
  }

  // Insertion (RLS : author_id doit être l'appelant, et non bloqué).
  const { data: inserted, error } = await supabase
    .from("suggestions")
    .insert({
      article_id: article.id,
      block_id: body.block_id,
      base_revision_id: article.current_revision_id,
      original_text: originalText,
      proposed_text: body.proposed_text,
      reason: body.reason.trim() || null,
      kind,
      author_id: user.id,
    })
    .select("*")
    .single();

  if (error) return err(400, error.message);
  return NextResponse.json({ suggestion: inserted }, { status: 201 });
}
