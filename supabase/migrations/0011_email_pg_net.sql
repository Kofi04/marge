-- Marge — envoi des e-mails de notification directement depuis Postgres.
--
-- Alternative à l'Edge Function `notify-email` : un trigger sur l'insertion de
-- `notifications` appelle Resend via pg_net (HTTP asynchrone, ne bloque pas la
-- transaction). La clé API et l'expéditeur sont lus dans Supabase Vault (chiffrés)
-- — jamais en clair dans le code ni dans git. Aucun déploiement Next requis.
--
-- Secrets attendus dans Vault (posés hors migration, cf. scripts/set-email-secrets.mjs) :
--   resend_api_key   clé Resend (re_...)
--   resend_from      expéditeur vérifié (défaut : Marge <onboarding@resend.dev>)
--   marge_site_url   base des liens e-mail (défaut : http://localhost:4321)

create extension if not exists pg_net;

create or replace function send_notification_email()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  api_key   text;
  from_addr text;
  site_url  text;
  rec_email text;
  pref      boolean;
  who       text := 'Quelqu''un';
  title     text := 'un article';
  url       text;
  art       record;
  subj      text;
  body_html text;
  link      text;
begin
  select decrypted_secret into api_key from vault.decrypted_secrets where name = 'resend_api_key' limit 1;
  if api_key is null then return new; end if;

  select decrypted_secret into from_addr from vault.decrypted_secrets where name = 'resend_from' limit 1;
  from_addr := coalesce(from_addr, 'Marge <onboarding@resend.dev>');
  select decrypted_secret into site_url from vault.decrypted_secrets where name = 'marge_site_url' limit 1;
  site_url := coalesce(site_url, 'http://localhost:4321');

  -- Préférence du destinataire + adresse e-mail.
  select email_notifications into pref from profiles where id = new.recipient_id;
  if pref is false then return new; end if;
  select email into rec_email from auth.users where id = new.recipient_id;
  if rec_email is null then return new; end if;

  -- Contexte : titre de l'article, lien, acteur (échappés pour le HTML).
  url := site_url;
  if (new.payload->>'article_id') is not null then
    select a.slug as slug, a.title as title, p.handle as handle into art
    from articles a join profiles p on p.id = a.author_id
    where a.id = (new.payload->>'article_id')::uuid;
    if found then
      title := art.title;
      url := site_url || '/@' || art.handle || '/' || art.slug;
    end if;
  end if;
  if (new.payload->>'author_id') is not null then
    select display_name into who from profiles where id = (new.payload->>'author_id')::uuid;
    who := coalesce(who, 'Quelqu''un');
  end if;

  -- Échappement HTML minimal.
  title := replace(replace(replace(title, '&', '&amp;'), '<', '&lt;'), '>', '&gt;');
  who   := replace(replace(replace(who,   '&', '&amp;'), '<', '&lt;'), '>', '&gt;');
  link  := '<a href="' || url || '" style="color:#3B4CC0">« ' || title || ' »</a>';

  if new.kind = 'suggestion_received' then
    subj := 'Nouvelle proposition sur « ' || title || ' »';
    body_html := '<p>' || who || ' a proposé une réécriture sur ' || link || '.</p>';
  elsif new.kind = 'suggestion_accepted' then
    subj := 'Votre proposition a été acceptée';
    body_html := '<p>Votre proposition sur ' || link || ' a été intégrée. Merci pour votre contribution.</p>';
  elsif new.kind = 'suggestion_rejected' then
    subj := 'Votre proposition n''a pas été retenue';
    body_html := '<p>Votre proposition sur ' || link || ' n''a pas été retenue cette fois.</p>';
  elsif new.kind = 'comment' then
    subj := 'Nouveau message sur votre proposition';
    body_html := '<p>' || who || ' a commenté votre proposition sur ' || link || '.</p>';
  else
    return new;
  end if;

  body_html := body_html ||
    '<p style="color:#9B9EA3;font-size:12px;margin-top:24px">Vous recevez cet e-mail car les notifications sont activées. Gérez-les dans vos réglages Marge.</p>';

  perform net.http_post(
    url     := 'https://api.resend.com/emails',
    headers := jsonb_build_object('Authorization', 'Bearer ' || api_key, 'Content-Type', 'application/json'),
    body    := jsonb_build_object('from', from_addr, 'to', rec_email, 'subject', subj, 'html', body_html)
  );

  return new;
end;
$$;

drop trigger if exists on_notification_email on notifications;
create trigger on_notification_email
  after insert on notifications
  for each row execute function send_notification_email();
