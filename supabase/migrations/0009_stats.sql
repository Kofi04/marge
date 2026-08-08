-- Marge — statistiques auteur (Phase D).

-- Compteur de vues par article. Incrémenté par une RPC security definer (un
-- lecteur anonyme n'a pas le droit d'UPDATE via la RLS ; la fonction contourne).
alter table articles
  add column if not exists view_count int not null default 0;

create or replace function increment_view(a_id uuid)
returns void language sql security definer set search_path = public as $$
  update articles set view_count = view_count + 1
  where id = a_id and status = 'published';
$$;
