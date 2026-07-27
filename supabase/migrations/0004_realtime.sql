-- Marge — active Supabase Realtime sur les tables suivies côté client.
-- La marge des suggestions et la file de relecture s'abonnent aux changements
-- pour que l'auteur voie arriver les propositions sans recharger la page.
-- (RLS s'applique aussi aux flux Realtime : chacun ne reçoit que ce qu'il peut lire.)

do $$
declare
  t text;
begin
  foreach t in array array['suggestions', 'revisions', 'notifications'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end;
$$;
