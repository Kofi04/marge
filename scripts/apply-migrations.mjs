/**
 * Applique les migrations SQL de supabase/migrations/ au projet cloud via la
 * Management API (endpoint database/query). Évite le téléchargement du CLI et
 * le mot de passe de la base : nécessite seulement un Personal Access Token.
 *
 * Usage : `node scripts/apply-migrations.mjs` (charge .env.local).
 * Requiert SUPABASE_ACCESS_TOKEN et SUPABASE_PROJECT_REF.
 */
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Chargement minimal de .env.local.
try {
  const env = readFileSync(join(__dirname, "..", ".env.local"), "utf8");
  for (const line of env.split("\n")) {
    const m = line.match(/^\s*([\w.]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch {
  /* .env.local absent */
}

const token = process.env.SUPABASE_ACCESS_TOKEN;
const ref = process.env.SUPABASE_PROJECT_REF;
if (!token || !ref) {
  console.error("Manque SUPABASE_ACCESS_TOKEN ou SUPABASE_PROJECT_REF dans .env.local.");
  process.exit(1);
}

const migrationsDir = join(__dirname, "..", "supabase", "migrations");
const files = readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

async function runSql(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status} — ${text}`);
  }
  return res.json();
}

async function main() {
  // Table de suivi : ne réapplique jamais une migration déjà passée.
  await runSql(
    "create table if not exists _migrations (name text primary key, applied_at timestamptz default now());",
  );
  const applied = await runSql("select name from _migrations;");
  const done = new Set((applied ?? []).map((r) => r.name));

  let count = 0;
  for (const file of files) {
    if (done.has(file)) {
      console.log(`Ignorée ${file} (déjà appliquée)`);
      continue;
    }
    const sql = readFileSync(join(migrationsDir, file), "utf8");
    process.stdout.write(`Application ${file} … `);
    await runSql(sql);
    await runSql(`insert into _migrations (name) values ('${file}');`);
    console.log("OK");
    count++;
  }
  console.log(`\n${count} nouvelle(s) migration(s) appliquée(s).`);
}

main().catch((e) => {
  console.error("\nÉchec :", e.message ?? e);
  process.exit(1);
});
