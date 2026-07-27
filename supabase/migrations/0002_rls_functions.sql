-- Marge — Row Level Security, fonctions et triggers.
-- Section 3 du brief : RLS active sur toutes les tables, policies explicites.

alter table profiles            enable row level security;
alter table articles            enable row level security;
alter table revisions           enable row level security;
alter table suggestions         enable row level security;
alter table suggestion_comments enable row level security;
alter table notifications       enable row level security;
alter table author_blocks       enable row level security;

-- ------------------------------------------------------------------ --
--  Helpers                                                            --
-- ------------------------------------------------------------------ --

-- Auteur de l'article donné.
create or replace function article_author(a_id uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select author_id from articles where id = a_id;
$$;

-- L'article donné est-il publié ?
create or replace function article_is_published(a_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from articles where id = a_id and status = 'published');
$$;

-- ------------------------------------------------------------------ --
--  profiles : lecture publique, écriture limitée à soi-même           --
-- ------------------------------------------------------------------ --
create policy profiles_select_public on profiles
  for select using (true);
create policy profiles_insert_self on profiles
  for insert with check (id = auth.uid());
create policy profiles_update_self on profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- ------------------------------------------------------------------ --
--  articles : lecture publique si publié sinon auteur ; écriture auteur --
-- ------------------------------------------------------------------ --
create policy articles_select on articles
  for select using (status = 'published' or author_id = auth.uid());
create policy articles_insert_author on articles
  for insert with check (author_id = auth.uid());
create policy articles_update_author on articles
  for update using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy articles_delete_author on articles
  for delete using (author_id = auth.uid());

-- ------------------------------------------------------------------ --
--  revisions : lecture publique si article publié.                    --
--  INSERTION UNIQUEMENT via fonction security definer — aucune policy  --
--  d'insert n'est créée, donc toute écriture directe du client est     --
--  refusée. Les fonctions security definer contournent la RLS.         --
-- ------------------------------------------------------------------ --
create policy revisions_select on revisions
  for select using (
    article_is_published(article_id) or article_author(article_id) = auth.uid()
  );

-- ------------------------------------------------------------------ --
--  suggestions                                                        --
-- ------------------------------------------------------------------ --
-- Lecture : article publié, ou auteur de l'article, ou auteur de la suggestion.
create policy suggestions_select on suggestions
  for select using (
    article_is_published(article_id)
    or article_author(article_id) = auth.uid()
    or author_id = auth.uid()
  );

-- Insertion : tout utilisateur authentifié, pour lui-même, s'il n'est pas
-- bloqué par l'auteur de l'article. (Rate limit et âge du compte : couche
-- applicative, étape 8.)
create policy suggestions_insert_auth on suggestions
  for insert with check (
    auth.uid() = author_id
    and not exists (
      select 1 from author_blocks b
      where b.author_id = article_author(article_id)
        and b.blocked_id = auth.uid()
    )
  );

-- Mise à jour du statut : l'auteur de l'article (accepter/refuser), ou l'auteur
-- de la suggestion mais uniquement pour la retirer (withdrawn).
create policy suggestions_update on suggestions
  for update using (
    article_author(article_id) = auth.uid() or author_id = auth.uid()
  ) with check (
    article_author(article_id) = auth.uid()
    or (author_id = auth.uid() and status = 'withdrawn')
  );

-- ------------------------------------------------------------------ --
--  suggestion_comments : fil de discussion des réécritures            --
-- ------------------------------------------------------------------ --
create policy comments_select on suggestion_comments
  for select using (
    exists (
      select 1 from suggestions s
      where s.id = suggestion_id
        and (
          article_is_published(s.article_id)
          or article_author(s.article_id) = auth.uid()
          or s.author_id = auth.uid()
        )
    )
  );
create policy comments_insert_auth on suggestion_comments
  for insert with check (auth.uid() = author_id);

-- ------------------------------------------------------------------ --
--  notifications : destinataire uniquement                            --
--  (insertion via triggers/fonctions security definer)                --
-- ------------------------------------------------------------------ --
create policy notifications_select_own on notifications
  for select using (recipient_id = auth.uid());
create policy notifications_update_own on notifications
  for update using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());

-- ------------------------------------------------------------------ --
--  author_blocks : géré par l'auteur qui bloque                       --
-- ------------------------------------------------------------------ --
create policy blocks_select_own on author_blocks
  for select using (author_id = auth.uid());
create policy blocks_insert_own on author_blocks
  for insert with check (author_id = auth.uid());
create policy blocks_delete_own on author_blocks
  for delete using (author_id = auth.uid());

-- ------------------------------------------------------------------ --
--  Création de profil au premier login                                --
-- ------------------------------------------------------------------ --
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, handle, display_name, avatar_url)
  values (
    new.id,
    -- handle provisoire garanti unique ; l'utilisateur le complète ensuite.
    'user_' || substr(replace(new.id::text, '-', ''), 1, 10),
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      new.raw_user_meta_data->>'user_name',
      split_part(new.email, '@', 1)
    ),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ------------------------------------------------------------------ --
--  create_revision : SEUL chemin d'insertion des révisions            --
--  Copie les blocs fournis en une nouvelle révision N+1 et met à jour  --
--  articles.current_revision_id. Utilisé par l'éditeur et par          --
--  accept_suggestion.                                                  --
-- ------------------------------------------------------------------ --
create or replace function create_revision(
  a_id uuid,
  new_blocks jsonb,
  a_note text default null
)
returns revisions language plpgsql security definer set search_path = public as $$
declare
  next_num int;
  rev revisions;
begin
  if article_author(a_id) <> auth.uid() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  select coalesce(max(number), 0) + 1 into next_num
  from revisions where article_id = a_id;

  insert into revisions (article_id, number, blocks, note, created_by)
  values (a_id, next_num, new_blocks, a_note, auth.uid())
  returning * into rev;

  update articles set current_revision_id = rev.id where id = a_id;
  return rev;
end;
$$;

-- ------------------------------------------------------------------ --
--  Notification à l'auteur quand une RÉÉCRITURE (edit) est proposée.   --
--  Les coquilles (typo) ne génèrent pas de notification bruyante       --
--  (règle produit, section 6).                                        --
-- ------------------------------------------------------------------ --
create or replace function notify_suggestion_received()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  recipient uuid;
begin
  if new.kind <> 'edit' then
    return new;
  end if;
  recipient := article_author(new.article_id);
  if recipient is null or recipient = new.author_id then
    return new;
  end if;
  insert into notifications (recipient_id, kind, payload)
  values (
    recipient,
    'suggestion_received',
    jsonb_build_object(
      'suggestion_id', new.id,
      'article_id', new.article_id,
      'author_id', new.author_id,
      'block_id', new.block_id
    )
  );
  return new;
end;
$$;

create trigger on_suggestion_created
  after insert on suggestions
  for each row execute function notify_suggestion_received();
