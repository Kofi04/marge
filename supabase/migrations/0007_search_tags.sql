-- Marge — recherche plein texte, tags, et suivi d'auteurs (Phase B).

-- ------------------------------------------------------------------ --
--  Tags + index de recherche sur articles                            --
-- ------------------------------------------------------------------ --

alter table articles
  add column if not exists tags text[] not null default '{}',
  add column if not exists search_tsv tsvector;

create index if not exists articles_tags_gin on articles using gin (tags);
create index if not exists articles_search_gin on articles using gin (search_tsv);

-- search_tsv est maintenu par trigger BEFORE (on écrit NEW directement, donc pas
-- de récursion ni d'UPDATE supplémentaire). Il agrège titre + chapô + le texte
-- de tous les blocs de la révision courante + les tags. Le texte des blocs est
-- l'ancre du produit : c'est ce que les lecteurs cherchent réellement.
create or replace function articles_search_trigger()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  body text;
begin
  select coalesce(string_agg(blk->>'text', ' '), '')
  into body
  from revisions r, jsonb_array_elements(r.blocks) blk
  where r.id = new.current_revision_id;

  new.search_tsv := to_tsvector(
    'french',
    coalesce(new.title, '') || ' ' ||
    coalesce(new.lede, '') || ' ' ||
    coalesce(body, '') || ' ' ||
    coalesce(array_to_string(new.tags, ' '), '')
  );
  return new;
end;
$$;

drop trigger if exists articles_search_biu on articles;
create trigger articles_search_biu
  before insert or update of title, lede, tags, current_revision_id on articles
  for each row execute function articles_search_trigger();

-- Backfill des articles existants (déclenche le trigger sans rien changer).
update articles set current_revision_id = current_revision_id;

-- Recherche : renvoie les articles publiés correspondant à la requête, classés
-- par pertinence. `websearch_to_tsquery` accepte une syntaxe naturelle
-- (« mot -exclu "phrase exacte" »). security invoker → la RLS s'applique.
create or replace function search_articles(q text)
returns setof articles language sql stable set search_path = public as $$
  select a.*
  from articles a
  where a.status = 'published'
    and a.search_tsv @@ websearch_to_tsquery('french', q)
  order by ts_rank(a.search_tsv, websearch_to_tsquery('french', q)) desc,
           a.published_at desc nulls last
  limit 40;
$$;

-- ------------------------------------------------------------------ --
--  follows : suivre un auteur                                         --
-- ------------------------------------------------------------------ --

create table if not exists follows (
  follower_id  uuid not null references profiles(id) on delete cascade,
  following_id uuid not null references profiles(id) on delete cascade,
  created_at   timestamptz default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create index if not exists follows_following_idx on follows (following_id);

alter table follows enable row level security;

-- Lecture publique (compteurs abonnés/abonnements), écriture limitée à soi.
create policy follows_select on follows
  for select using (true);
create policy follows_insert_self on follows
  for insert with check (follower_id = auth.uid());
create policy follows_delete_self on follows
  for delete using (follower_id = auth.uid());
