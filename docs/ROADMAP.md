# Marge — feuille de route (nouvelles fonctionnalités)

Plan d'implémentation des 4 tiers validés. Exécution **par phases**, avec
`npm run build` + tests verts et une pause de validation à chaque fin de phase.
Chaque migration suit la numérotation `supabase/migrations/000N_*.sql` et passe
par `scripts/apply-migrations.mjs`.

Légende effort : `S` (≤ ½ j), `M` (~1 j), `L` (2 j+).

---

## Phase A — Tier 1 : compléter l'app ✅ livrée (2026-08-08)

> A1 « Mes articles » (page + API PATCH/DELETE), A2 historique + diff mot à mot
> (`lib/revision-diff.ts`, page `/@handle/slug/history`, 8 tests), A3 e-mails
> (migration `0006`, toggle réglages, Edge Function `notify-email` + doc webhook).
> Reste à activer : fournir `RESEND_API_KEY` et brancher le webhook (cf. README de
> la fonction).

### A1. « Mes articles » (gestion éditoriale) · `M`
- **But** : lister et gérer ses propres articles (le chaînon manquant de l'auteur).
- **Données** : aucune nouvelle table (`articles.status` = draft/published/archived
  existe déjà).
- **Routes/UI** : `app/articles/page.tsx` (« Mes articles »), ajouté à `AppHeader`.
  Liste avec badge de statut, liens *éditer* (`/write?edit=id`), et actions
  *publier / dépublier / archiver / supprimer*.
- **Écritures** : `app/api/articles/[id]/route.ts` (`PATCH` statut, `DELETE`) — la
  RLS autorise déjà l'auteur. Confirmations pour la suppression.
- **Tests** : build ; vérif RLS (un autre auteur ne peut pas modifier).

### A2. Historique des révisions avec diff · `M` · *cœur produit*
- **But** : voir **mot à mot** ce qui a changé entre deux révisions, et par qui.
- **Données** : aucune (les révisions stockent déjà des snapshots complets).
- **Logique** : `lib/revision-diff.ts` — apparie les blocs par `id` entre deux
  révisions, calcule `diffWords` par bloc modifié, détecte blocs ajoutés/retirés.
- **Routes/UI** : `app/[handle]/[slug]/history/page.tsx` — timeline des révisions,
  sélection de deux versions → `RevisionDiff`. Lien depuis l'en-tête article.
- **Tests** : unitaires `lib/revision-diff.ts` (bloc modifié, ajouté, retiré,
  réordonné).

### A3. Notifications par e-mail · `M`
- **But** : e-mail à l'auteur quand une proposition arrive, au contributeur quand
  elle est acceptée/refusée — le moteur du « revenir contribuer ».
- **Architecture** : **Supabase Database Webhook** sur `insert` de `notifications`
  → **Edge Function** `notify-email` (tourne dans Supabase, indépendante du
  déploiement Next) → envoi via **Resend**. Découplé : toutes les notifications
  existantes déclenchent l'e-mail automatiquement.
- **Données** : `profiles.email_notifications boolean default true` (préférence) ;
  l'e-mail vient de `auth.users` (lu par la fonction avec la service key).
- **Réglages** : interrupteur « notifications par e-mail » dans `/settings`.
- **Dépendances** : clé `RESEND_API_KEY` (à fournir) + domaine d'envoi vérifié
  (ou domaine de test Resend au début).
- **Tests** : envoi de test via la fonction ; respect de la préférence.

> Migration Phase A : `0006_email_prefs.sql` (colonne préférence). Edge Function +
> webhook configurés hors migration SQL.

---

## Phase B — Tier 2 : découverte & croissance ✅ livrée (2026-08-08)

> B1 recherche plein texte + tags (migration `0007`, RPC `search_articles`,
> `/search`, `/tags/[tag]`, tags dans l'éditeur, puces sur les cartes), B2 suivi
> d'auteurs (table `follows` + RLS, `FollowButton`, compteurs profil, bascule
> Découvrir/Suivis sur `/home`), B3 flux RSS global + par auteur. 12 tests ajoutés.

### B1. Recherche plein texte + tags · `L`
- **Données** (`0007_search_tags.sql`) :
  - `articles.tags text[]` + index GIN.
  - Colonne `articles.search_tsv tsvector` (générée depuis titre + chapô + texte
    de la révision courante, maintenue par trigger) + index GIN. RPC
    `search_articles(q text)`.
- **Routes/UI** : barre de recherche (header/`/home`), `app/search/page.tsx`
  (`?q=`), `app/tags/[tag]/page.tsx`. Saisie de tags dans l'éditeur ; puces de
  tags sur les cartes d'article.
- **Tests** : unitaires (normalisation requête, slug de tag) ; intégration RPC
  `search_articles`.

### B2. Suivre un auteur + fil personnalisé · `M`
- **Données** (`0007`) : table `follows (follower_id, following_id, created_at,
  pk(follower,following))` + RLS (le follower gère ses propres suivis ; lecture
  publique des compteurs).
- **Routes/UI** : bouton *Suivre* sur le profil et l'en-tête article ; compteurs
  abonnés/abonnements sur le profil ; `/home` avec bascule **Suivis / Découvrir**
  (les articles des auteurs suivis d'abord).
- **Tests** : intégration RLS (follow/unfollow) ; feed filtré.

### B3. Flux RSS · `S`
- **Routes** : `app/[handle]/rss.xml/route.ts` (articles publiés d'un auteur) et
  `app/rss.xml/route.ts` (global récent). Génère du XML RSS 2.0.
- **Données** : aucune. **Tests** : validité XML (snapshot).

---

## Phase C — Tier 3 : qualité de contribution & confiance ✅ livrée (2026-08-08)

> C1 surlignage précis (`suggestions.focus_range` dérivé du diff côté serveur,
> extrait « porte sur… » dans la carte, `lib/focus.ts`), C2 fil enrichi @mentions
> (trigger `notify_comment`, rendu en liens + auto-complétion, `lib/mentions.ts`),
> C3 signalement (`reports` + RLS, `ReportButton` sur suggestion/article) et
> gestion des contributeurs bloqués dans `/settings`. 14 tests ajoutés.
>
> Note C1 : la portion visée est **dérivée automatiquement du diff** (déterministe,
> sans friction) plutôt que par sélection manuelle — même valeur (intention claire),
> plus robuste.

### C1. Surlignage précis dans un bloc · `M` · *on-brand*
- **But** : le contributeur sélectionne la **phrase exacte** ; la proposition
  reste ancrée au bloc mais l'intention est plus nette.
- **Données** (`0008_quality_trust.sql`) : `suggestions.focus_range jsonb`
  (offsets `{start,end}` dans le texte du bloc, optionnel, pour la mise en
  évidence à l'affichage).
- **Logique/UI** : à la sélection de texte dans un bloc rendu, un bouton
  « Suggérer sur la sélection » ouvre le `Composer` centré sur la phrase ; le
  `Diff` met la portion en évidence. `original_text` reste le bloc entier (ancre).
- **Tests** : unitaires (calcul des offsets, robustesse si le bloc a changé).

### C2. Fil de discussion enrichi (@mentions) · `S`
- **Données** (`0008`) : trigger `notify_comment` → notification `comment` aux
  participants (auteur de l'article + de la suggestion) et aux `@handles`
  mentionnés (résolus dans le corps).
- **UI** : rendu des `@mentions` en liens ; auto-complétion basique.
- **Tests** : intégration (insertion de commentaire → notifications correctes).

### C3. Signalement + gestion des blocages · `S`–`M`
- **Données** (`0008`) : table `reports (id, reporter_id, target_type
  ('suggestion'|'article'), target_id, reason, status, created_at)` + RLS
  (reporter insère ; l'auteur concerné lit).
- **UI** : action « Signaler » sur suggestion/article ; section « Contributeurs
  bloqués » dans `/settings` (lister/débloquer — le blocage existe déjà,
  l'écran manque).
- **Tests** : intégration RLS (signalement, déblocage).

---

## Phase D — Tier 4 : confort & polish ✅ livrée (2026-08-09)

> D1 tableau de bord (`0009` view_count + `increment_view`, `/dashboard` :
> vues, taux d'acceptation, top contributeurs), D2 **mode sombre** (`C`→`var()`,
> palette sombre + `ThemeToggle` + script anti-flash), D3 raccourcis clavier
> (J/K/A/R/? dans la file), D4 autosave brouillon en place (`0010` `save_draft`)
> + import Markdown (`lib/markdown-import.ts`). 11 tests ajoutés.

### D1. Tableau de bord auteur (stats) · `M`
- **Données** (`0009_stats.sql`) : `articles.view_count int default 0` + RPC
  `increment_view(article_id)` (appelée à l'affichage, anti-rebond côté client) ;
  option table `article_views(article_id, day, count)` pour une tendance.
- **UI** : `app/dashboard/page.tsx` — vues, **taux d'acceptation**
  (accepted/total), top contributeurs, propositions en attente par article.
- **Tests** : intégration RPC ; calcul du taux.

### D2. Mode sombre · `M`
- **But** : thème sombre. **Prérequis** : plusieurs composants utilisent les
  couleurs en dur (`lib/tokens.ts` `C.*`) inline → il faut migrer ces usages vers
  `var(--token)` pour qu'ils suivent le thème (sinon seul le fond change). C'est
  l'essentiel du travail.
- **Impl.** : palette sombre sous `:root[data-theme="dark"]` + `prefers-color-scheme` ;
  bascule dans l'en-tête/réglages, persistée (localStorage + cookie pour le SSR).
- **Tests** : visuel (build) ; les deux thèmes lisibles.

### D3. Raccourcis clavier dans la file · `S`
- **UI** : `ReviewQueue` — `A` accepter, `R` refuser, `J/K` naviguer, `?` aide.
- **Tests** : build (interaction manuelle).

### D4. Autosave éditeur + import Markdown · `M`
- **Autosave** : sauvegarde de brouillon débattue (`/api/articles`, `status=draft`)
  ; indicateur « Enregistré ». Récupère l'`id` après la première sauvegarde.
- **Import Markdown** : `lib/markdown-import.ts` (Markdown → blocs Marge, avec
  `block_id` neufs) ; collage détecté dans l'éditeur.
- **Tests** : unitaires (Markdown → blocs : titres, listes, citations, liens).

---

## Récap migrations

| Fichier | Contenu |
|---|---|
| `0006_email_prefs.sql` | `profiles.email_notifications` |
| `0007_search_tags.sql` | `articles.tags`, `search_tsv` + trigger, `search_articles()`, `follows` |
| `0008_quality_trust.sql` | `suggestions.focus_range`, `reports`, trigger `notify_comment` |
| `0009_stats.sql` | `articles.view_count`, `increment_view()`, `article_views` |

## Ce dont j'ai besoin de toi

- **Resend** : une clé API `RESEND_API_KEY` (et, idéalement, un domaine d'envoi —
  le domaine de test Resend suffit pour commencer). Bloquant pour A3 uniquement.
- **Décision e-mail** : les webhooks DB visent une URL publique ; on part sur une
  **Edge Function Supabase** (pas besoin de déployer Next) — je confirme au moment
  de A3.

## Séquencement proposé

Phase A → validation → Phase B → validation → Phase C → validation → Phase D.
On peut réordonner (ex. Mode sombre plus tôt si tu le veux visible vite).
