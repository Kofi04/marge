/**
 * Stocke les secrets d'e-mail dans Supabase Vault (chiffrés), via la Management
 * API. Lit RESEND_API_KEY (obligatoire), MARGE_FROM_EMAIL et NEXT_PUBLIC_SITE_URL
 * depuis .env.local. Rien n'est écrit dans le code ni dans git.
 *
 * Usage : node scripts/set-email-secrets.mjs
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
const RESEND = process.env.RESEND_API_KEY;
const FROM = process.env.MARGE_FROM_EMAIL || "Marge <onboarding@resend.dev>";
const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:4321").replace(/\/$/, "");

if (!token || !ref) { console.error("Manque SUPABASE_ACCESS_TOKEN / SUPABASE_PROJECT_REF."); process.exit(1); }
if (!RESEND) { console.error("Ajoute RESEND_API_KEY=re_... dans .env.local, puis relance."); process.exit(1); }

async function runSql(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${await res.text()}`);
  return res.json();
}

const q = (s) => String(s).replace(/'/g, "''");

async function upsert(name, value) {
  await runSql(`delete from vault.secrets where name = '${q(name)}';`);
  await runSql(`select vault.create_secret('${q(value)}', '${q(name)}');`);
  console.log(`  ✓ ${name}`);
}

await upsert("resend_api_key", RESEND);
await upsert("resend_from", FROM);
await upsert("marge_site_url", SITE);
console.log("\nSecrets Vault mis à jour. Expéditeur:", FROM, "· liens:", SITE);
