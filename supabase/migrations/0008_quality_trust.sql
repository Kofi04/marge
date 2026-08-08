-- Marge — qualité de contribution & confiance (Phase C).

-- ------------------------------------------------------------------ --
--  C1. Surlignage précis : portion du bloc visée par la suggestion    --
--  focus_range = {start:int, end:int} (offsets dans original_text).   --
--  Optionnel et purement indicatif : l'ancre reste le bloc entier.    --
-- ------------------------------------------------------------------ --
alter table suggestions
  add column if not exists focus_range jsonb;

-- ------------------------------------------------------------------ --
--  C2. Fil enrichi : notification à l'insertion d'un commentaire      --
--  aux participants (auteur de l'article + de la suggestion) et aux    --
--  @handles mentionnés dans le corps. Trigger → indépendant du client. --
-- ------------------------------------------------------------------ --
create or replace function notify_comment()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  sug suggestions;
  art_author uuid;
  commenter uuid := new.author_id;
  m text;
  mentioned uuid;
  notified uuid[] := array[]::uuid[];
  payload jsonb;
begin
  select * into sug from suggestions where id = new.suggestion_id;
  if not found then return new; end if;

  art_author := article_author(sug.article_id);
  payload := jsonb_build_object(
    'suggestion_id', sug.id,
    'article_id', sug.article_id,
    'author_id', commenter
  );

  -- Auteur de l'article puis auteur de la suggestion (jamais le commentateur,
  -- jamais deux fois la même personne).
  if art_author is not null and art_author <> commenter then
    insert into notifications (recipient_id, kind, payload) values (art_author, 'comment', payload);
    notified := notified || art_author;
  end if;
  if sug.author_id <> commenter and not (sug.author_id = any(notified)) then
    insert into notifications (recipient_id, kind, payload) values (sug.author_id, 'comment', payload);
    notified := notified || sug.author_id;
  end if;

  -- @mentions → profils (handles stockés en minuscules).
  for m in
    select distinct lower(match[1])
    from regexp_matches(new.body, '@([a-z0-9_-]+)', 'gi') as match
  loop
    select id into mentioned from profiles where lower(handle) = m;
    if mentioned is not null and mentioned <> commenter and not (mentioned = any(notified)) then
      insert into notifications (recipient_id, kind, payload) values (mentioned, 'comment', payload);
      notified := notified || mentioned;
    end if;
  end loop;

  return new;
end;
$$;

drop trigger if exists on_comment_created on suggestion_comments;
create trigger on_comment_created
  after insert on suggestion_comments
  for each row execute function notify_comment();

-- ------------------------------------------------------------------ --
--  C3. Signalement (reports)                                          --
-- ------------------------------------------------------------------ --
create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references profiles(id) on delete cascade,
  target_type text not null check (target_type in ('suggestion','article')),
  target_id uuid not null,
  reason text,
  status text not null default 'open' check (status in ('open','reviewed','dismissed')),
  created_at timestamptz default now()
);
create index if not exists reports_target_idx on reports (target_type, target_id);

-- Auteur concerné par une cible signalée (pour la RLS de lecture).
create or replace function report_target_author(t_type text, t_id uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select case
    when t_type = 'article' then (select author_id from articles where id = t_id)
    when t_type = 'suggestion' then (select article_author(s.article_id) from suggestions s where s.id = t_id)
    else null
  end;
$$;

alter table reports enable row level security;

-- Insertion : par soi-même. Lecture : le signaleur, ou l'auteur concerné.
create policy reports_insert_self on reports
  for insert with check (reporter_id = auth.uid());
create policy reports_select on reports
  for select using (
    reporter_id = auth.uid()
    or report_target_author(target_type, target_id) = auth.uid()
  );
