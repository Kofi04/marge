# Marge — brief de construction

Tu construis **Marge**, une plateforme de blog où les lecteurs proposent des modifications aux articles et où l'auteur les accepte ou les refuse. Le modèle mental est celui des épreuves d'imprimerie annotées dans la marge, pas celui de Git.

Deux fichiers de référence sont joints au projet :
- `marge-mvp.jsx` — prototype frontend fonctionnel. **C'est la source de vérité pour le design et pour la logique métier.** Reprends ses tokens de couleur, sa typographie, ses composants et ses règles telles quelles.
- `landing.jsx` — la landing page, à intégrer sur la route `/`.

Ne redessine rien. Ta mission est de transformer ce prototype en application réelle : backend, base de données, authentification, multi-utilisateurs, multi-articles.

---

## 1. Stack imposée

- Next.js 15, App Router, TypeScript
- Supabase : Postgres, Auth, Row Level Security, Realtime
- Tailwind CSS pour la mise en page + les tokens du prototype convertis en variables CSS
- `framer-motion` pour toutes les animations (remplace les `@keyframes` du prototype)
- `lucide-react` pour les icônes
- Polices : Manrope (interface) et Newsreader (contenu des articles), chargées via `next/font/google`
- `@tiptap/react` pour l'éditeur d'article côté auteur
- Zod pour la validation, côté client et côté serveur

Pas de state manager global. React Query (TanStack) pour le cache serveur, `useState` local pour le reste.

---

## 2. Modèle de données

Le principe non négociable : **l'unité de contribution est le bloc, pas la ligne.** Un article est une liste ordonnée de blocs, chacun avec un identifiant stable qui survit aux révisions. Une suggestion est ancrée sur un `block_id` et sur le texte exact du bloc au moment où elle a été écrite.

Les révisions stockent un **snapshot complet** du contenu, pas des patchs. Ne cherche pas à faire de la reconstruction d'état ni du merge à trois voies.

```sql
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  handle text unique not null,
  display_name text not null,
  avatar_url text,
  bio text,
  created_at timestamptz default now()
);

create table articles (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references profiles(id) on delete cascade,
  slug text not null,
  title text not null,
  lede text,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  current_revision_id uuid,
  published_at timestamptz,
  created_at timestamptz default now(),
  unique (author_id, slug)
);

-- blocks: jsonb [{ id: text, type: 'h1'|'p'|'quote'|'code'|'image', text: text }]
create table revisions (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references articles(id) on delete cascade,
  number int not null,
  blocks jsonb not null,
  note text,
  created_by uuid references profiles(id),
  created_at timestamptz default now(),
  unique (article_id, number)
);

create table suggestions (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references articles(id) on delete cascade,
  block_id text not null,
  base_revision_id uuid not null references revisions(id),
  original_text text not null,      -- texte du bloc au moment de la proposition
  proposed_text text not null,
  reason text,
  kind text not null check (kind in ('typo','edit')),
  status text not null default 'open'
    check (status in ('open','accepted','rejected','withdrawn')),
  author_id uuid not null references profiles(id) on delete cascade,
  resolved_at timestamptz,
  resolved_by uuid references profiles(id),
  created_at timestamptz default now()
);

create table suggestion_comments (
  id uuid primary key default gen_random_uuid(),
  suggestion_id uuid not null references suggestions(id) on delete cascade,
  author_id uuid not null references profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz default now()
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references profiles(id) on delete cascade,
  kind text not null,   -- 'suggestion_received' | 'suggestion_accepted' | 'suggestion_rejected' | 'comment'
  payload jsonb not null,
  read_at timestamptz,
  created_at timestamptz default now()
);

create index on suggestions (article_id, status);
create index on suggestions (author_id, status);
create index on revisions (article_id, number desc);
create index on notifications (recipient_id, read_at);
```

`stale` n'est **pas** un statut stocké. C'est calculé à la lecture : une suggestion `open` est périmée si le texte actuel de son bloc diffère de `original_text`. Expose ce calcul dans une vue ou dans le mapper TypeScript, jamais en dupliquant l'état.

---

## 3. Row Level Security

Active RLS sur toutes les tables. Écris les policies, ne te contente pas de vérifier dans le code applicatif.

- `articles` : lecture publique si `status = 'published'`, sinon réservée à l'auteur. Écriture réservée à l'auteur.
- `revisions` : lecture publique si l'article est publié. **Insertion uniquement via une fonction Postgres `security definer`** — jamais en écriture directe depuis le client.
- `suggestions` : lecture publique si l'article est publié ; insertion par tout utilisateur authentifié ; mise à jour du statut réservée à l'auteur de l'article, sauf `withdrawn` que l'auteur de la suggestion peut poser lui-même.
- `profiles` : lecture publique, écriture limitée à soi-même.
- `notifications` : lecture et mise à jour limitées au destinataire.

---

## 4. L'opération centrale

L'acceptation d'une suggestion est la seule opération non triviale. Elle doit être **atomique** et vivre dans une fonction Postgres appelée via RPC :

```
accept_suggestion(suggestion_id uuid) →
  1. vérifier que l'appelant est l'auteur de l'article
  2. vérifier que la suggestion est 'open'
  3. vérifier que le bloc n'a pas changé (anti-périmé) — sinon lever une erreur explicite
  4. créer une révision N+1 : copie des blocs courants, avec le bloc cible remplacé
  5. mettre à jour articles.current_revision_id
  6. passer la suggestion à 'accepted', renseigner resolved_at / resolved_by
  7. insérer une notification pour l'auteur de la suggestion
```

Sans transaction, deux acceptations simultanées créent deux révisions N+1 et l'une des deux modifications est perdue silencieusement. C'est le bug que cette fonction existe pour empêcher.

---

## 5. Routes

| Route | Contenu |
|---|---|
| `/` | Landing (`landing.jsx` fourni) |
| `/login` | Auth : magic link e-mail + OAuth GitHub et Google |
| `/@:handle` | Profil public : articles écrits, contributions acceptées, compteur |
| `/@:handle/:slug` | Article + marge des suggestions. C'est l'écran du prototype. |
| `/write` | Éditeur Tiptap, création et édition d'article |
| `/review` | File de relecture de l'auteur, toutes suggestions tous articles confondus |
| `/settings` | Profil, notifications |

Article et profil rendus en Server Components avec cache ISR. La marge des suggestions est un Client Component branché sur Supabase Realtime, pour que l'auteur voie arriver les propositions sans recharger.

---

## 6. Règles produit à respecter

**L'onboarding contributeur doit être quasi nul.** Un lecteur qui veut corriger une coquille doit pouvoir écrire sa proposition d'abord, et ne créer son compte qu'au moment d'envoyer. Conserve la proposition en `sessionStorage` pendant le passage par l'auth et rejoue-la automatiquement au retour. Si tu perds ce brouillon dans le flux d'authentification, tu perds la contribution.

**L'attribution est le produit.** Chaque contribution acceptée apparaît dans les crédits de l'article et sur le profil du contributeur, et déclenche une notification. Ce n'est pas une fonctionnalité secondaire à faire plus tard : c'est la seule raison pour laquelle quelqu'un contribuera une deuxième fois.

**Deux voies de traitement.** Une correction (`typo`, changement de moins de 25 caractères) s'accepte en un clic, sans discussion et sans notification bruyante pour l'auteur. Une réécriture (`edit`) ouvre un fil de discussion et exige un motif.

**Anti-abus, version minimale :** 10 suggestions par utilisateur et par heure, un compte de plus de 24 h pour proposer sur un article à fort trafic, et possibilité pour l'auteur de bloquer un contributeur. Rien de plus sophistiqué pour l'instant.

---

## 7. Hors périmètre — ne construis pas ça

Forks, branches, votes communautaires, rôles et permissions granulaires, suggestions sur les images, traductions, commentaires classiques en bas d'article, monétisation, éditeur collaboratif temps réel. Chacun de ces éléments a été écarté volontairement.

---

## 8. Ordre de travail

1. Migrations Supabase + policies RLS + seed avec l'article du prototype et deux suggestions
2. Auth et création de profil au premier login
3. Lecture d'article avec révision courante, en Server Component
4. Marge des suggestions : lecture, création, calcul du périmé
5. Fonction `accept_suggestion` + file de relecture
6. Crédits, profils, notifications
7. Éditeur Tiptap
8. Realtime, rate limiting, states vides et d'erreur

Après chaque étape, lance le build et les tests, et arrête-toi pour me montrer ce qui tourne avant de continuer.

## 9. Tests attendus

- Diff mot à mot : insertion, suppression, remplacement, chaîne vide, texte identique
- `accept_suggestion` : cas nominal, appelant non autorisé, bloc modifié entre-temps, double appel concurrent
- Détection du périmé après publication d'une révision touchant le bloc
- Policies RLS : un utilisateur ne peut pas accepter une suggestion sur l'article d'un autre

## 10. Critère de recette

Deux navigateurs, deux comptes. Le compte A propose une modification sur un paragraphe. Le compte B, auteur, la voit apparaître dans sa marge sans recharger la page, l'accepte. L'article passe en révision 2, le nom de A apparaît dans les crédits, A reçoit une notification. Une seconde suggestion en attente sur ce même paragraphe bascule automatiquement en « périmée ».
