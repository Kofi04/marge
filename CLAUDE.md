# CLAUDE.md — Marge

Instructions pour Claude Code sur ce dépôt. Lis-les avant de modifier le code.

## Le produit

**Marge** est une plateforme de blog où les lecteurs proposent des modifications
aux articles, que l'auteur accepte ou refuse. Modèle mental : les épreuves
d'imprimerie annotées dans la marge, **pas** Git.

Principe non négociable : **l'unité de contribution est le bloc, pas la ligne.**
Un article est une liste ordonnée de blocs, chacun avec un `id` stable qui survit
aux révisions. Une suggestion est ancrée sur un `block_id` + le texte exact du
bloc au moment de la proposition.

## Stack

- **Next.js 15** (App Router, TypeScript, React 19)
- **Supabase** cloud : Postgres, Auth, Row Level Security, Realtime
- **Tailwind v4** (tokens du design en variables CSS dans `app/globals.css`)
- **framer-motion** (animations), **lucide-react** (icônes)
- **@tiptap/react** (éditeur) + extensions Link/Image
- **@tanstack/react-query** (cache serveur ; pas de state manager global)
- **Zod** (validation client + serveur), **Vitest** (tests unitaires)
- Polices : **Manrope** (UI) + **Newsreader** (contenu) via `next/font`

## Commandes

```bash
npm run dev            # dev sur http://localhost:4321
npm run build          # build de production
npm start              # prod locale (rapide) sur :4321
npm run test           # tests unitaires Vitest
node scripts/apply-migrations.mjs   # applique supabase/migrations/*.sql (Management API)
node scripts/seed.mjs               # données de démo
node scripts/test-accept.mjs        # tests d'intégration de accept_suggestion
node scripts/reassign-demo.mjs <email>  # rend un compte auteur de l'article de démo
```

> Le port 3000 est réservé par Windows sur la machine de dev → on utilise **4321**.

## Architecture — conventions et pièges

- **Routing `@handle`** : un dossier `@[handle]` serait un *parallel route slot*.
  L'URL contient un `@` littéral (`/@yao/slug`), donc on utilise `app/[handle]/`
  où `params.handle` inclut le `@` (retiré via `parseHandle`, 404 si absent). Les
  routes statiques (`/login`, `/home`, `/write`…) gardent la priorité.
- **Migrations** : appliquées via la **Management API** (`scripts/apply-migrations.mjs`,
  auth par `SUPABASE_ACCESS_TOKEN`), pas par le CLI Supabase. Table de suivi
  `_migrations`, idempotent. Ajoute un fichier `supabase/migrations/000N_*.sql`
  puis relance le script.
- **RLS** : active sur toutes les tables. Voir `supabase/migrations/0002_rls_functions.sql`.
  Les révisions ne s'insèrent **que** via la fonction `security definer`
  `create_revision`. L'acceptation passe par la RPC atomique `accept_suggestion`.
- **`stale` (périmé) n'est jamais stocké** : calculé à la lecture par la vue
  `suggestions_resolved` (SQL) et par `lib/stale.ts` (TS). Ne pas dupliquer l'état.
- **Bloc enrichi** : `Block = { id, type, text, html? }`. `text` = texte brut,
  **ancre des suggestions et des diffs** ; `html` = projection riche optionnelle
  (liens, gras…) pour l'affichage. La logique de suggestion n'utilise que `text`.
- **Page article** = `force-dynamic` (temps réel + session). Le **profil** est en
  **ISR** (`revalidate=60`, client anon sans cookies).
- **Perf** : la base est en `eu-central-1` ; chaque aller-retour ≈ 0,7 s. On lit
  l'uid via `getSession()` (local) dans `getSessionProfile`, pas `getUser()`
  (réseau). Paralléliser les requêtes de page (`Promise.all`).
- **Auth** : magic link + OAuth GitHub/Google. Après login → `/me` → `/home`
  (jamais la landing). Onboarding du handle sur `/welcome`. Le brouillon de
  suggestion d'un lecteur non connecté est conservé en `sessionStorage` et
  **rejoué** après login (`ArticleView`).

## Style de code

- Lisibilité d'abord. Identifiants en anglais, commentaires en français
  seulement quand le « pourquoi » n'est pas évident.
- Réutiliser le code du design existant (tokens `lib/tokens.ts`, composants
  `components/ui/`). Ne pas redessiner.
- Secrets uniquement via `.env.local` (jamais commité). Voir `.env.example`.

## Tests attendus (avant de considérer une tâche finie)

`npm run test` (diff, périmé) + `node scripts/test-accept.mjs` (accept RPC) doivent
passer, et `npm run build` doit être vert.

## Documentation

Vue d'ensemble détaillée : [`docs/PROJET.md`](docs/PROJET.md).
