/**
 * Envoie un e-mail de test : insère une notification pour un utilisateur (par
 * handle), ce qui déclenche le trigger send_notification_email → Resend, puis
 * affiche la réponse HTTP de Resend (via net._http_response).
 *
 * Usage : node scripts/test-email.mjs <handle>   (ex. node scripts/test-email.mjs kofi)
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
} catch { /* .env.local absent */ }

const token = process.env.SUPABASE_ACCESS_TOKEN;
const ref = process.env.SUPABASE_PROJECT_REF;
const handle = process.argv[2];
if (!token || !ref) { console.error("Manque SUPABASE_ACCESS_TOKEN / SUPABASE_PROJECT_REF."); process.exit(1); }
if (!handle) { console.error("Usage : node scripts/test-email.mjs <handle>"); process.exit(1); }

async function runSql(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${await res.text()}`);
  return res.json();
}

const h = handle.replace(/^@/, "").replace(/'/g, "''");
const rows = await runSql(`
  select p.id, u.email, p.email_notifications,
         (select id from articles where author_id = p.id limit 1) as article_id
  from profiles p join auth.users u on u.id = p.id
  where p.handle = '${h}' limit 1;
`);
const user = rows?.[0];
if (!user) { console.error(`Aucun profil @${handle}.`); process.exit(1); }
console.log(`Cible : @${handle} · e-mail ${user.email} · notifications ${user.email_notifications}`);
if (user.email_notifications === false) console.log("⚠ notifications désactivées dans les réglages → aucun envoi.");

const payload = user.article_id ? `jsonb_build_object('article_id', '${user.article_id}')` : `'{}'::jsonb`;
await runSql(`insert into notifications (recipient_id, kind, payload) values ('${user.id}', 'suggestion_accepted', ${payload});`);
console.log("Notification insérée (kind=suggestion_accepted). Envoi Resend en cours…");

// pg_net est asynchrone : on laisse le worker traiter puis on lit la réponse.
await new Promise((r) => setTimeout(r, 4000));
const resp = await runSql(`select status_code, content, error_msg from net._http_response order by created desc limit 1;`);
console.log("Réponse Resend :", JSON.stringify(resp?.[0] ?? "(aucune réponse encore — réessaie dans quelques secondes)", null, 2));
