/**
 * Tests d'intégration de accept_suggestion (section 9 du brief), exécutés via la
 * Management API. Crée un article de test isolé, impersonne les utilisateurs
 * (request.jwt.claims), vérifie les 4 scénarios, puis nettoie.
 *
 * Scénarios : nominal · appelant non autorisé (RLS) · bloc modifié entre-temps ·
 * double appel (la 2e acceptation échoue → une seule révision N+1).
 *
 * Usage : `node scripts/test-accept.mjs`
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
try {
  const env = readFileSync(join(__dirname, "..", ".env.local"), "utf8");
  for (const line of env.split("\n")) {
    const m = line.match(/^\s*([\w.]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch {}

const token = process.env.SUPABASE_ACCESS_TOKEN;
const ref = process.env.SUPABASE_PROJECT_REF;
if (!token || !ref) {
  console.error("Manque SUPABASE_ACCESS_TOKEN / SUPABASE_PROJECT_REF.");
  process.exit(1);
}

async function sql(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  const text = await res.text();
  if (!res.ok) return { ok: false, error: text };
  return { ok: true, data: JSON.parse(text) };
}

/** Appelle accept_suggestion en impersonnant `uid` (rôle authenticated). */
function acceptAs(uid, suggestionId) {
  const claims = JSON.stringify({ sub: uid, role: "authenticated" }).replace(/'/g, "''");
  return sql(
    `with c as (select set_config('request.jwt.claims', '${claims}', true)) select accept_suggestion('${suggestionId}') as r from c;`,
  );
}

let passed = 0;
let failed = 0;
function check(name, cond, detail = "") {
  if (cond) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.error(`  ✗ ${name} ${detail}`);
  }
}

async function main() {
  const ids = (await sql("select handle, id from profiles where handle in ('yao','selim');")).data;
  const yao = ids.find((r) => r.handle === "yao").id;
  const selim = ids.find((r) => r.handle === "selim").id;

  // Article de test isolé.
  const art = (
    await sql(
      `insert into articles (author_id, slug, title, status) values ('${yao}', 'test-accept-${Date.now()}', 'Test accept', 'published') returning id;`,
    )
  ).data[0].id;
  const blocks = JSON.stringify([
    { id: "t1", type: "p", text: "Phrase initiale à corriger." },
    { id: "t2", type: "p", text: "Second paragraphe stable." },
  ]).replace(/'/g, "''");
  const rev1 = (
    await sql(
      `insert into revisions (article_id, number, blocks, created_by) values ('${art}', 1, '${blocks}'::jsonb, '${yao}') returning id;`,
    )
  ).data[0].id;
  await sql(`update articles set current_revision_id = '${rev1}' where id = '${art}';`);

  const mkSug = async (blockId, original, proposed, kind = "edit") =>
    (
      await sql(
        `insert into suggestions (article_id, block_id, base_revision_id, original_text, proposed_text, kind, author_id)
         values ('${art}','${blockId}','${rev1}','${original.replace(/'/g, "''")}','${proposed.replace(/'/g, "''")}','${kind}','${selim}') returning id;`,
      )
    ).data[0].id;

  console.log("Test accept_suggestion :");

  // --- 1. Cas nominal ---
  const s1 = await mkSug("t1", "Phrase initiale à corriger.", "Phrase initiale, désormais corrigée.");
  const r1 = await acceptAs(yao, s1);
  check("nominal : acceptation réussie", r1.ok, r1.error ?? "");
  check("nominal : révision 2 créée", r1.ok && r1.data[0].r.revision_number === 2);
  const state1 = (
    await sql(
      `select (select status from suggestions where id='${s1}') as st,
              (select number from revisions where id=(select current_revision_id from articles where id='${art}')) as cur,
              (select count(*) from notifications where (payload->>'suggestion_id')='${s1}' and kind='suggestion_accepted') as notif;`,
    )
  ).data[0];
  check("nominal : suggestion passée à 'accepted'", state1.st === "accepted");
  check("nominal : article pointe sur la révision 2", state1.cur === 2);
  check("nominal : notification d'acceptation créée", Number(state1.notif) === 1);

  // --- 2. Appelant non autorisé (selim n'est pas l'auteur de l'article) ---
  const s2 = await mkSug("t2", "Second paragraphe stable.", "Second paragraphe reformulé plus clairement.");
  const r2 = await acceptAs(selim, s2);
  check("non autorisé : rejet avec 'not_authorized'", !r2.ok && /not_authorized/.test(r2.error), r2.error);

  // --- 3. Bloc modifié entre-temps (original_text ne correspond plus) ---
  const s3 = await mkSug("t2", "Texte QUI NE CORRESPOND PLUS au bloc courant.", "Peu importe la proposition.");
  const r3 = await acceptAs(yao, s3);
  check("bloc modifié : rejet avec 'block_changed'", !r3.ok && /block_changed/.test(r3.error), r3.error);

  // --- 4. Double appel : réaccepter s1 (déjà accepté) échoue ---
  const r4 = await acceptAs(yao, s1);
  check("double appel : 2e acceptation rejetée ('not_open')", !r4.ok && /not_open/.test(r4.error), r4.error);
  const revCount = (await sql(`select count(*) as n from revisions where article_id='${art}';`)).data[0].n;
  check("double appel : une seule révision N+1 (total = 2)", Number(revCount) === 2, `total=${revCount}`);

  // Nettoyage.
  await sql(`delete from notifications where (payload->>'article_id')='${art}';`);
  await sql(`delete from articles where id='${art}';`);

  console.log(`\n${passed} assertion(s) OK, ${failed} échec(s).`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error("Erreur test :", e.message ?? e);
  process.exit(1);
});
