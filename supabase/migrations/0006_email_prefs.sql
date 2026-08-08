-- Marge — préférence de notifications par e-mail.
--
-- Une seule colonne : chaque profil peut couper les e-mails. L'envoi lui-même
-- est déclenché hors SQL par un Database Webhook (insert sur `notifications`)
-- vers l'Edge Function `notify-email`, qui lit cette préférence et l'adresse
-- e-mail dans `auth.users` (via la service key). On ne stocke pas l'e-mail ici :
-- il reste la propriété de la table d'auth.

alter table profiles
  add column if not exists email_notifications boolean not null default true;

comment on column profiles.email_notifications is
  'Si false, l''Edge Function notify-email n''envoie pas d''e-mail à ce profil.';
