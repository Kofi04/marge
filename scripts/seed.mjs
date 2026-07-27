/**
 * Seed de Marge — crée les données de démonstration du prototype :
 * l'article « Le bloc, et pas la ligne », sa révision 1, et deux suggestions.
 *
 * Utilise la clé service_role (contourne la RLS) et l'API admin d'auth pour
 * créer de vrais utilisateurs. Idempotent : relançable sans dupliquer.
 *
 * Usage : `node scripts/seed.mjs` (charge .env.local).
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

// Chargement minimal de .env.local (sans dépendance dotenv).
try {
  const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  for (const line of env.split("\n")) {
    const m = line.match(/^\s*([\w.]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch {
  /* .env.local absent : on suppose les variables déjà dans l'environnement. */
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Manque NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const SEED_BLOCKS = [
  { id: "b1", type: "h1", text: "Le bloc, et pas la ligne" },
  { id: "b2", type: "lede", text: "Pourquoi un système de contribution pour du texte ne doit surtout pas copier Git." },
  { id: "b3", type: "p", text: "Git compare des lignes. C'est le bon choix quand on écrit du code : une ligne y est une unité de sens, et deux personnes qui touchent la même ligne ont probablement un vrai conflit à résoudre." },
  { id: "b4", type: "p", text: "Le texte ne fonctionne pas comme ça. Un lecteur qui corrige un article ne pense jamais en lignes. Il pense « cette phrase est bancale », « ce paragraphe manque une source ». L'unité mentale est le bloc." },
  { id: "b5", type: "quote", text: "Un diff ligne à ligne sur de la prose produit un mur rouge et vert que personne ne relit." },
  { id: "b6", type: "p", text: "En ancrant chaque proposition sur un identifiant de bloc stable, trois problèmes disparaissent d'un coup : le diff redevient lisible, les conflits de fusion n'existent plus, et détecter qu'une proposition est périmée devient trivial — le bloc a changé, donc la proposition ne s'applique plus." },
];

const USERS = [
  { email: "yao@marge.demo", handle: "yao", display_name: "Yao Mensah" },
  { email: "selim@marge.demo", handle: "selim", display_name: "Selim Rahmani" },
  { email: "fatou@marge.demo", handle: "fatou", display_name: "Fatou Diallo" },
];

/** Crée l'utilisateur s'il n'existe pas, renvoie son id. */
async function ensureUser({ email, display_name }) {
  const { data: list } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const existing = list?.users.find((u) => u.email === email);
  if (existing) return existing.id;
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { full_name: display_name },
  });
  if (error) throw error;
  return data.user.id;
}

async function main() {
  const ids = {};
  for (const u of USERS) {
    const id = await ensureUser(u);
    ids[u.handle] = id;
    // Le trigger a créé un profil provisoire ; on fixe handle / display_name.
    const { error } = await supabase
      .from("profiles")
      .update({ handle: u.handle, display_name: u.display_name })
      .eq("id", id);
    if (error) throw error;
  }

  // Article (idempotent sur author_id + slug).
  const slug = "le-bloc-et-pas-la-ligne";
  const { data: article, error: aErr } = await supabase
    .from("articles")
    .upsert(
      {
        author_id: ids.yao,
        slug,
        title: "Le bloc, et pas la ligne",
        lede: SEED_BLOCKS[1].text,
        status: "published",
        published_at: new Date().toISOString(),
      },
      { onConflict: "author_id,slug" },
    )
    .select()
    .single();
  if (aErr) throw aErr;

  // Révision 1 (idempotent sur article_id + number).
  const { data: rev, error: rErr } = await supabase
    .from("revisions")
    .upsert(
      { article_id: article.id, number: 1, blocks: SEED_BLOCKS, note: "Publication initiale", created_by: ids.yao },
      { onConflict: "article_id,number" },
    )
    .select()
    .single();
  if (rErr) throw rErr;

  await supabase.from("articles").update({ current_revision_id: rev.id }).eq("id", article.id);

  // Deux suggestions ouvertes (sur b3 réécriture, sur b6 correction).
  const seedSuggestions = [
    {
      article_id: article.id,
      block_id: "b3",
      base_revision_id: rev.id,
      original_text: SEED_BLOCKS[2].text,
      proposed_text:
        "Git compare des lignes. C'est le bon choix quand on écrit du code : une ligne y est une unité de sens, et deux personnes qui modifient la même ligne ont presque toujours un vrai conflit à résoudre.",
      reason: "« touchent » est un peu vague pour un texte technique.",
      kind: "edit",
      status: "open",
      author_id: ids.selim,
    },
    {
      article_id: article.id,
      block_id: "b6",
      base_revision_id: rev.id,
      original_text: SEED_BLOCKS[5].text,
      proposed_text: SEED_BLOCKS[5].text.replace("trivial", "immédiat"),
      reason: "« immédiat » se lit un peu mieux ici.",
      kind: "typo",
      status: "open",
      author_id: ids.fatou,
    },
  ];

  // Évite les doublons : on ne réinsère pas si des suggestions existent déjà.
  const { count } = await supabase
    .from("suggestions")
    .select("id", { count: "exact", head: true })
    .eq("article_id", article.id);
  if (!count) {
    const { error: sErr } = await supabase.from("suggestions").insert(seedSuggestions);
    if (sErr) throw sErr;
  }

  console.log(`Seed OK — article ${article.id} (@yao/${slug}), révision 1, ${count || seedSuggestions.length} suggestion(s).`);
}

main().catch((e) => {
  console.error("Seed échoué :", e.message ?? e);
  process.exit(1);
});
