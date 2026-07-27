/**
 * Réattribue l'article de démonstration (« Le bloc, et pas la ligne ») à ton
 * compte, pour tester l'acceptation des suggestions et la recette côté auteur.
 *
 * Usage : `node scripts/reassign-demo.mjs ton-email@exemple.com`
 * (le compte doit s'être connecté au moins une fois à l'app).
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

try {
  const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  for (const line of env.split("\n")) {
    const m = line.match(/^\s*([\w.]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch {}

const email = process.argv[2] || process.env.DEMO_OWNER_EMAIL;
if (!email) {
  console.error("Usage : node scripts/reassign-demo.mjs ton-email@exemple.com");
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

async function main() {
  const { data: list } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const user = list?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!user) {
    console.error(`Aucun utilisateur avec l'e-mail ${email}. Connecte-toi une fois à l'app d'abord.`);
    process.exit(1);
  }

  const { data: article, error } = await supabase
    .from("articles")
    .update({ author_id: user.id })
    .eq("slug", "le-bloc-et-pas-la-ligne")
    .select("id, title")
    .single();
  if (error) throw error;

  const { data: profile } = await supabase.from("profiles").select("handle").eq("id", user.id).single();
  console.log(`OK — « ${article.title} » t'appartient désormais.`);
  console.log(`Ouvre : /@${profile?.handle ?? "<ton-handle>"}/le-bloc-et-pas-la-ligne`);
  console.log("Tu y verras les propositions de Selim et Fatou, à accepter / refuser.");
}

main().catch((e) => {
  console.error("Échec :", e.message ?? e);
  process.exit(1);
});
