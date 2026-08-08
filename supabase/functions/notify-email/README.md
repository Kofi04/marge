# Edge Function `notify-email`

Envoie un e-mail à chaque ligne insérée dans `notifications`, via **Resend**.
Découplée du déploiement Next : elle tourne dans Supabase, au plus près de la base.

```
INSERT notifications  ──►  Database Webhook  ──►  notify-email  ──►  Resend  ──►  📧
```

## Prérequis

1. **Compte Resend** (gratuit pour commencer) → une clé API `re_...`.
   - Au début, on peut envoyer depuis le domaine de test `onboarding@resend.dev`
     (mais Resend ne l'autorise que vers l'adresse du propriétaire du compte).
   - Pour envoyer à n'importe qui : vérifier un domaine dans Resend, puis utiliser
     par ex. `Marge <notifications@ton-domaine.com>`.
2. **Supabase CLI** installé et connecté (`supabase login`), projet lié
   (`supabase link --project-ref <ref>`).

## Déploiement

```bash
# 1. Secrets de la fonction
supabase secrets set RESEND_API_KEY=re_xxx
supabase secrets set MARGE_FROM_EMAIL="Marge <onboarding@resend.dev>"
supabase secrets set MARGE_SITE_URL="http://localhost:4321"   # ou l'URL de prod

# 2. Déploiement de la fonction
supabase functions deploy notify-email --no-verify-jwt
```

> `--no-verify-jwt` : le webhook appelle la fonction sans JWT utilisateur. La
> fonction n'expose rien de sensible (elle ne fait qu'envoyer des e-mails) et
> valide la forme du payload.

## Brancher le webhook

Dashboard Supabase → **Database → Webhooks → Create a new hook** :

- **Table** : `notifications`
- **Events** : `INSERT`
- **Type** : *Supabase Edge Functions* → `notify-email`
- **Method** : `POST`

(ou via SQL avec l'extension `pg_net` / `supabase_functions.http_request`).

## Tester

```bash
supabase functions serve notify-email   # local
# puis simuler un webhook :
curl -X POST http://localhost:54321/functions/v1/notify-email \
  -H "Content-Type: application/json" \
  -d '{"type":"INSERT","table":"notifications","record":{"id":"...","recipient_id":"<uid>","kind":"suggestion_received","payload":{"article_id":"<id>","author_id":"<id>"},"created_at":"now"}}'
```

La fonction renvoie `{"sent":true}` ou un `{"skipped":"..."}` explicite
(`opted_out`, `no_email`, `no_resend_key`…), ce qui rend le diagnostic simple.

## Préférence utilisateur

Chaque profil a `email_notifications boolean` (migration `0006_email_prefs.sql`),
piloté par l'interrupteur dans `/settings`. Si `false`, la fonction s'arrête avant
l'envoi (`skipped: opted_out`).
