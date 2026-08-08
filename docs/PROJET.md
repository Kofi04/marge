# Marge — documentation du projet

> Plateforme de blog où les lecteurs proposent des modifications aux articles,
> que l'auteur accepte ou refuse. Le modèle mental est celui des épreuves
> d'imprimerie annotées dans la marge — pas celui de Git.

---

## 1. Philosophie produit

- **L'unité de contribution est le bloc, pas la ligne.** Un article est une liste
  ordonnée de blocs (`h1`, `lede`, `p`, `quote`, `code`, `image`), chacun avec un
  identifiant stable qui survit aux révisions.
- **Une suggestion est ancrée sur un `block_id`** et sur le texte exact du bloc au
  moment de la proposition. Si le bloc change ensuite, la suggestion devient
  « périmée » automatiquement, plutôt que de s'appliquer à un texte disparu.
- **L'attribution est le produit.** Chaque contribution acceptée apparaît dans les
  crédits de l'article, sur le profil du contributeur, et déclenche une
  notification. C'est la raison pour laquelle quelqu'un contribue une 2ᵉ fois.
- **Onboarding contributeur quasi nul.** Un lecteur écrit sa proposition d'abord,
  et ne crée son compte qu'à l'envoi ; le brouillon est conservé pendant l'auth et
  rejoué au retour.
- **Deux voies de traitement.** Une correction (`typo`, < 25 caractères de
  changement) s'accepte en un clic, sans notification bruyante. Une réécriture
  (`edit`) exige un motif et ouvre un fil de discussion.

---

## 2. Stack technique et spécifications

| Domaine | Choix | Version / détail |
|---|---|---|
| Framework | Next.js (App Router, RSC) | 15.5, TypeScript, React 19 |
| Base de données | Supabase Postgres | cloud, région `eu-central-1` |
| Auth | Supabase Auth | magic link + OAuth GitHub & Google |
| Sécurité données | Row Level Security | policies sur toutes les tables |
| Temps réel | Supabase Realtime | marge + file de relecture |
| Styles | Tailwind CSS | v4 (tokens en variables CSS) |
| Animations | framer-motion | remplace les `@keyframes` du prototype |
| Icônes | lucide-react | + SVG de marque inline (GitHub/Google/X/LinkedIn) |
| Éditeur | @tiptap/react | + extensions Link & Image |
| Cache serveur | @tanstack/react-query | pas de state manager global |
| Validation | Zod | schémas partagés client/serveur |
| Tests | Vitest | + scripts d'intégration SQL |
| Polices | next/font/google | Manrope (UI), Newsreader (contenu) |

Tokens de couleur repris du prototype (`lib/tokens.ts` + `app/globals.css`) :
`paper`, `panel`, `ink`, `pencil` (bleu de correction), `accepted`, `stale`, etc.

---

## 3. Structure du dépôt

```
app/
  page.tsx                 "/"  landing marketing (consciente de la session)
  home/                    "/home" accueil connecté : onboarding + fil d'actualité
  login/  welcome/         auth + choix du handle au 1er login
  auth/{callback,confirm,signout}/   routes d'auth
  me/                      "/me" redirige vers l'espace connecté
  [handle]/                "/@handle" profil public (ISR)
  [handle]/[slug]/         "/@handle/slug" article + marge (dynamique)
  write/  review/  settings/          éditeur, file de relecture, réglages
  legal/  privacy/  changelog/        pages informatives
  api/{suggestions,articles}/         écritures validées (Zod, rate limit)
components/
  article/  margin/  review/  editor/  settings/  ui/
lib/
  diff.ts     stale.ts    suggestion.ts   types.ts    tokens.ts
  queries.ts  feed.ts     profile.ts      notifications.ts
  markdown.ts slug.ts     time.ts         auth.ts     schemas.ts
  supabase/{client,server,middleware,anon}.ts
supabase/migrations/       0001…0008 (schéma, RLS, fonctions, realtime, e-mail, recherche/follows, focus/mentions/reports)
supabase/functions/        notify-email (Edge Function : notification → Resend)
scripts/                   apply-migrations, seed, test-accept, reassign-demo
tests/                     diff.test.ts, stale.test.ts
```

---

## 4. Modèle de données

Tables : `profiles`, `articles`, `revisions`, `suggestions`,
`suggestion_comments`, `notifications`, `author_blocks`, `follows`, `reports`.

Qualité & confiance : `suggestions.focus_range jsonb` (portion précise visée,
dérivée du diff côté serveur) ; trigger `notify_comment` (participants + @mentions
→ notifications) ; table `reports` (signalement, lisible par le signaleur et
l'auteur concerné via `report_target_author`).

Recherche : `articles.tags text[]` (index GIN) + `articles.search_tsv tsvector`
(titre + chapô + texte des blocs de la révision courante + tags, maintenu par un
trigger BEFORE) exposé par la RPC `search_articles(q)`.

Décisions clés :

- **Snapshot complet, pas de patchs** : `revisions.blocks` (jsonb) stocke la liste
  entière des blocs de la révision. Pas de reconstruction d'état ni de merge à
  trois voies.
- **`articles.current_revision_id`** pointe vers la révision affichée.
- **`stale` non stocké** : vue `suggestions_resolved` qui joint le bloc courant et
  calcule `is_stale = (texte du bloc courant ≠ original_text)` pour les `open`.
  Miroir TypeScript dans `lib/stale.ts`.
- **Bloc enrichi** : `{ id, type, text, html? }`. `text` = texte brut (ancre des
  suggestions et diffs) ; `html` = projection riche optionnelle pour l'affichage
  (liens, gras, listes, images). La logique de suggestion ignore `html`.

### Row Level Security (résumé)

- `profiles` : lecture publique, écriture limitée à soi-même.
- `articles` : lecture publique si `published`, sinon auteur ; écriture auteur.
- `revisions` : lecture publique si l'article est publié ; **insertion uniquement
  via `create_revision` (security definer)** — aucune policy d'insert.
- `suggestions` : lecture publique si publié ; insert par tout authentifié
  (non bloqué) ; update du statut par l'auteur de l'article, sauf `withdrawn` que
  l'auteur de la suggestion peut poser.
- `notifications` : lecture/écriture limitées au destinataire.
- `author_blocks` : gérées par l'auteur qui bloque.

Fonctions/triggers : `handle_new_user` (profil au 1er login), `create_revision`,
`accept_suggestion`, notifications sur réception (edit) / acceptation / refus.

---

## 5. L'opération centrale — `accept_suggestion`

RPC Postgres `security definer`, **atomique** (`supabase/migrations/0005`). Un
verrou `select … for update` sur l'article **sérialise les acceptations
concurrentes** : sans lui, deux acceptations simultanées créeraient deux révisions
N+1 et perdraient silencieusement une modification.

Étapes : vérifier que l'appelant est l'auteur → suggestion `open` → bloc inchangé
(sinon `block_changed`) → créer la révision N+1 (blocs copiés, bloc cible remplacé,
`html` du bloc retiré) → mettre à jour `current_revision_id` → passer la suggestion
à `accepted` → notifier son auteur.

Testée par `scripts/test-accept.mjs` : cas nominal, appelant non autorisé, bloc
modifié entre-temps, double appel (une seule révision N+1).

---

## 6. Routes

| Route | Rendu | Contenu |
|---|---|---|
| `/` | statique | Landing marketing (CTA adaptés à la session) |
| `/home` | dynamique | Accueil connecté : onboarding + fil d'actualité |
| `/login` `/welcome` | client | Auth ; choix du handle au 1er login |
| `/@handle` | ISR (60 s) | Profil public : articles + contributions acceptées |
| `/@handle/slug` | dynamique | Article + marge des suggestions (Realtime) |
| `/@handle/slug/history` | dynamique | Historique des révisions + diff mot à mot |
| `/articles` | dynamique | « Mes articles » : gestion (publier/archiver/supprimer) |
| `/search` | dynamique | Recherche plein texte (titre + contenu + tags) |
| `/tags/[tag]` | dynamique | Articles publiés portant un tag |
| `/write` | dynamique | Éditeur Tiptap (création / nouvelle révision) + tags |
| `/review` | dynamique | File de relecture, tous articles de l'auteur |
| `/settings` | dynamique | Profil + préférences e-mail + contributeurs bloqués + notifications |
| `/rss.xml` · `/@handle/rss.xml` | RSS 2.0 | Flux global et par auteur |
| `/api/articles/[id]` | PATCH/DELETE | Statut d'un article ou suppression (auteur) |
| `/api/suggestions` `/api/articles` | POST | Écritures validées (Zod, rate limit) |

---

## 7. Flux clés

- **Cycle d'une suggestion** : marqueur en marge → `Composer` (diff en direct,
  `kind` calculé) → `POST /api/suggestions` (ancre + `kind` recalculés serveur,
  rate limit, blocage) → carte dans la marge → l'auteur accepte (RPC) ou refuse.
- **Périmé** : recalculé à chaque lecture (vue SQL + `lib/stale.ts`). Après une
  révision touchant un bloc, les suggestions ouvertes qui le visaient passent
  « périmée ».
- **Onboarding contributeur** : lecteur non connecté → brouillon en
  `sessionStorage` → `/login` → au retour, `ArticleView` rejoue automatiquement le
  brouillon. La contribution n'est jamais perdue.
- **Realtime** : `ArticleView` et `ReviewQueue` s'abonnent à `postgres_changes`
  sur `suggestions` → l'auteur voit arriver les propositions sans recharger.
- **Notifications e-mail** : un Database Webhook sur l'`insert` de `notifications`
  appelle l'Edge Function `notify-email` (proche de la base, indépendante de Next),
  qui lit la préférence `profiles.email_notifications` puis envoie via Resend.
  Toute notification existante (reçue / acceptée / refusée / commentée) déclenche
  donc un e-mail sans code supplémentaire. Mise en route :
  [`supabase/functions/notify-email/README.md`](../supabase/functions/notify-email/README.md).
- **Éditeur & `block_id` stable** : un attribut Tiptap `blockId` porte l'id du
  bloc ; il survit aux révisions (l'ancre des suggestions reste valide). Formatage
  riche persistant (gras, italique, liens, images, listes, citations, code).
- **Partage / export** (`ShareMenu`) : copier le lien, **copier / télécharger en
  Markdown**, partager sur X / LinkedIn. La publication directe vers Medium /
  Substack n'existe pas (pas d'API d'écriture publique) → le Markdown est le
  chemin de cross-post.

---

## 8. Anti-abus (version minimale)

- **10 suggestions / utilisateur / heure** (vérifié dans `/api/suggestions`).
- **Compte > 24 h** requis pour proposer sur un article « à fort trafic »
  (≥ 20 suggestions sur 24 h).
- **Blocage d'un contributeur** par l'auteur (`author_blocks`, appliqué par la RLS
  d'insertion des suggestions + action dans la marge).

---

## 9. Configuration et déploiement

### Variables d'environnement (`.env.local`, jamais commité — cf. `.env.example`)

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (seed / admin serveur uniquement)
- `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF` (migrations via Management API)
- `NEXT_PUBLIC_SITE_URL` (`http://localhost:4321` en dev)

### Mise en route

Voir [`SETUP.md`](../SETUP.md). En résumé : créer le projet Supabase, configurer
GitHub/Google OAuth (callback `https://<ref>.supabase.co/auth/v1/callback`),
autoriser les Redirect URLs (`http://localhost:4321/**`), puis
`node scripts/apply-migrations.mjs` + `node scripts/seed.mjs`.

### Performance

La base est en `eu-central-1` (Francfort) : ~0,7 s par aller-retour depuis une
zone géographiquement éloignée. Leviers : tester en prod locale
(`npm run build && npm start`), lire l'uid via `getSession()` (local), paralléliser
les requêtes, et — le plus efficace — héberger la base dans une région proche.

---

## 10. Tests

- **Unitaires (Vitest)** : `lib/diff.ts` (insertion, suppression, remplacement,
  chaîne vide, texte identique) ; `lib/stale.ts` (détection du périmé).
- **Intégration (Management API)** : `scripts/test-accept.mjs` couvre
  `accept_suggestion` (nominal, non autorisé, bloc modifié, double appel) — c'est
  aussi le test RLS « un utilisateur ne peut pas accepter la suggestion d'un
  autre ».

Critère de recette : deux navigateurs, deux comptes. A propose une modif ; B
(auteur) la voit apparaître sans recharger et l'accepte ; l'article passe en
révision 2, A est crédité et notifié ; une 2ᵉ suggestion sur le même paragraphe
bascule en « périmée ».

---

## 11. Hors périmètre (écarté volontairement)

Forks / branches, votes communautaires, rôles granulaires, suggestions sur images,
traductions, commentaires classiques en bas d'article, monétisation, éditeur
collaboratif temps réel.
