-- Marge — l'opération centrale (section 4 du brief).
-- Acceptation atomique d'une suggestion. Vit dans une fonction Postgres appelée
-- via RPC. Sans transaction, deux acceptations simultanées créeraient deux
-- révisions N+1 et l'une des modifications serait perdue silencieusement : le
-- verrou `for update` sur l'article sérialise les acceptations concurrentes.

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
  if not found then
    raise exception 'not_found' using errcode = 'P0002';
  end if;

  -- 1 & verrou : charge l'article ET sérialise les acceptations concurrentes.
  select * into art from articles where id = sug.article_id for update;
  if not found then
    raise exception 'not_found' using errcode = 'P0002';
  end if;

  -- 1. l'appelant doit être l'auteur de l'article
  if art.author_id <> auth.uid() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  -- 2. la suggestion doit être ouverte
  if sug.status <> 'open' then
    raise exception 'not_open' using errcode = 'P0001';
  end if;

  select * into cur_rev from revisions where id = art.current_revision_id;

  -- 3. anti-périmé : le bloc ne doit pas avoir changé depuis la proposition
  select blk->>'text' into cur_text
  from jsonb_array_elements(cur_rev.blocks) blk
  where blk->>'id' = sug.block_id
  limit 1;

  if cur_text is null then
    raise exception 'block_missing' using errcode = 'P0001';
  end if;
  if cur_text <> sug.original_text then
    raise exception 'block_changed' using errcode = 'P0001';
  end if;

  -- 4. révision N+1 : copie des blocs courants, bloc cible remplacé
  select jsonb_agg(
    case when blk->>'id' = sug.block_id
      then jsonb_set(blk, '{text}', to_jsonb(sug.proposed_text))
      else blk
    end
  ) into new_blocks
  from jsonb_array_elements(cur_rev.blocks) blk;

  select coalesce(max(number), 0) + 1 into next_num
  from revisions where article_id = art.id;

  insert into revisions (article_id, number, blocks, note, created_by)
  values (
    art.id, next_num, new_blocks,
    'Proposition de ' || coalesce((select display_name from profiles where id = sug.author_id), 'un contributeur') || ' intégrée',
    sug.author_id
  )
  returning * into new_rev;

  -- 5. l'article pointe sur la nouvelle révision
  update articles set current_revision_id = new_rev.id where id = art.id;

  -- 6. la suggestion passe à accepted
  update suggestions
  set status = 'accepted', resolved_at = now(), resolved_by = auth.uid()
  where id = sug.id;

  -- 7. notification pour l'auteur de la suggestion (l'attribution est le produit)
  insert into notifications (recipient_id, kind, payload)
  values (
    sug.author_id, 'suggestion_accepted',
    jsonb_build_object('suggestion_id', sug.id, 'article_id', art.id, 'revision', next_num, 'block_id', sug.block_id)
  );

  return jsonb_build_object('revision_id', new_rev.id, 'revision_number', next_num);
end;
$$;

grant execute on function accept_suggestion(uuid) to authenticated;

-- Notification de refus : le refus est un simple UPDATE côté auteur (pas une
-- RPC). Un trigger notifie l'auteur de la suggestion quand elle passe à
-- 'rejected'. (L'acceptation est notifiée directement dans accept_suggestion.)
create or replace function notify_suggestion_rejected()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'rejected' and old.status is distinct from 'rejected' then
    insert into notifications (recipient_id, kind, payload)
    values (
      new.author_id, 'suggestion_rejected',
      jsonb_build_object('suggestion_id', new.id, 'article_id', new.article_id, 'block_id', new.block_id)
    );
  end if;
  return new;
end;
$$;

create trigger on_suggestion_rejected
  after update on suggestions
  for each row execute function notify_suggestion_rejected();
