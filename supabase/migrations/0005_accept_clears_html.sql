-- Marge — le bloc enrichi (html) implique un ajustement de accept_suggestion :
-- une suggestion porte du texte brut, donc en l'intégrant on retire l'ancien
-- `html` du bloc cible (sinon le formatage riche resterait avec un texte périmé).
-- Le lecteur retombe alors sur `text`. Seule la ligne du remplacement de bloc
-- change par rapport à 0003.

create or replace function accept_suggestion(suggestion_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  sug suggestions;
  art articles;
  cur_rev revisions;
  cur_text text;
  new_blocks jsonb;
  next_num int;
  new_rev revisions;
begin
  select * into sug from suggestions where id = suggestion_id;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;

  select * into art from articles where id = sug.article_id for update;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;

  if art.author_id <> auth.uid() then raise exception 'not_authorized' using errcode = '42501'; end if;
  if sug.status <> 'open' then raise exception 'not_open' using errcode = 'P0001'; end if;

  select * into cur_rev from revisions where id = art.current_revision_id;

  select blk->>'text' into cur_text
  from jsonb_array_elements(cur_rev.blocks) blk
  where blk->>'id' = sug.block_id
  limit 1;

  if cur_text is null then raise exception 'block_missing' using errcode = 'P0001'; end if;
  if cur_text <> sug.original_text then raise exception 'block_changed' using errcode = 'P0001'; end if;

  -- Bloc cible : on retire `html` (le formatage riche) et on pose le nouveau texte.
  select jsonb_agg(
    case when blk->>'id' = sug.block_id
      then jsonb_set(blk - 'html', '{text}', to_jsonb(sug.proposed_text))
      else blk
    end
  ) into new_blocks
  from jsonb_array_elements(cur_rev.blocks) blk;

  select coalesce(max(number), 0) + 1 into next_num from revisions where article_id = art.id;

  insert into revisions (article_id, number, blocks, note, created_by)
  values (
    art.id, next_num, new_blocks,
    'Proposition de ' || coalesce((select display_name from profiles where id = sug.author_id), 'un contributeur') || ' intégrée',
    sug.author_id
  )
  returning * into new_rev;

  update articles set current_revision_id = new_rev.id where id = art.id;

  update suggestions set status = 'accepted', resolved_at = now(), resolved_by = auth.uid()
  where id = sug.id;

  insert into notifications (recipient_id, kind, payload)
  values (
    sug.author_id, 'suggestion_accepted',
    jsonb_build_object('suggestion_id', sug.id, 'article_id', art.id, 'revision', next_num, 'block_id', sug.block_id)
  );

  return jsonb_build_object('revision_id', new_rev.id, 'revision_number', next_num);
end;
$$;
