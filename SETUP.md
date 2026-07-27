# Marge — mise en route

Application Next.js 15 (App Router, TS) + Supabase (Postgres, Auth, RLS,
Realtime). Ce guide couvre ce qu'il faut fournir pour brancher le backend cloud
et l'OAuth, puis pousser les migrations et le seed.

## 1. Projet Supabase

1. Créer un projet sur https://supabase.com (région au choix).
2. Dashboard → **Project Settings → API**, récupérer :
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` (secret) → `SUPABASE_SERVICE_ROLE_KEY`
   - la référence du projet (`<ref>` dans l'URL) → `SUPABASE_PROJECT_REF`
3. Copier `.env.example` en `.env.local` et coller ces valeurs.

## 2. OAuth GitHub

1. GitHub → Settings → Developer settings → **OAuth Apps → New OAuth App**.
2. *Authorization callback URL* :
   `https://<ref>.supabase.co/auth/v1/callback`
3. Récupérer `Client ID` + `Client secret`.
4. Dashboard Supabase → **Authentication → Providers → GitHub** : activer, coller
   les deux valeurs.

## 3. OAuth Google

1. Google Cloud Console → créer un projet → **APIs & Services → OAuth consent
   screen** (type External, renseigner le minimum).
2. **Credentials → Create credentials → OAuth client ID → Web application**.
3. *Authorized redirect URI* :
   `https://<ref>.supabase.co/auth/v1/callback`
4. Récupérer `Client ID` + `Client secret`.
5. Dashboard Supabase → **Authentication → Providers → Google** : activer, coller
   les deux valeurs.

## 4. Pousser le schéma et le seed

```bash
# Lier le repo au projet cloud (une fois)
npx supabase link --project-ref <ref>

# Appliquer les migrations (schéma, RLS, fonctions, triggers)
npx supabase db push

# Insérer les données de démonstration (article du prototype + 2 suggestions)
node scripts/seed.mjs
```

## 5. Lancer l'app

```bash
npm install
npm run dev      # http://localhost:4321
npm run test     # tests unitaires (diff, périmé)
npm run build    # build de production
```

## Variables d'environnement

Voir `.env.example`. Ne jamais commiter `.env.local` ni la clé `service_role`.
