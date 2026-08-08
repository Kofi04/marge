-- Marge — autosave des brouillons (Phase D).
--
-- Le modèle « une révision = un snapshot complet » interdit de créer une
-- révision à chaque frappe. Pour un article en brouillon, l'autosave met donc à
-- jour EN PLACE le titre/chapô/tags et les blocs de la révision courante, sans
-- créer de N+1. Réservé aux brouillons de l'auteur (une fois publié, on repasse
-- par create_revision pour tracer l'historique).

create or replace function save_draft(
  a_id uuid,
  a_title text,
  a_lede text,
  a_tags text[],
  new_blocks jsonb
)
returns void language plpgsql security definer set search_path = public as $$
declare
  art articles;
begin
  select * into art from articles where id = a_id;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  if art.author_id <> auth.uid() then raise exception 'not_authorized' using errcode = '42501'; end if;
  if art.status <> 'draft' then raise exception 'not_a_draft' using errcode = 'P0001'; end if;

  update articles
    set title = a_title,
        lede = nullif(a_lede, ''),
        tags = coalesce(a_tags, '{}')
  where id = a_id;

  if art.current_revision_id is not null then
    update revisions set blocks = new_blocks where id = art.current_revision_id;
  end if;
end;
$$;
