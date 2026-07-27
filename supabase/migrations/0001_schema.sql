-- Marge — schéma initial.
-- Repris fidèlement de la section 2 du brief. Principe non négociable :
-- l'unité de contribution est le bloc, pas la ligne. Les révisions stockent un
-- snapshot complet des blocs (jsonb), pas des patchs.

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  handle text unique not null,
  display_name text not null,
  avatar_url text,
  bio text,
  created_at timestamptz default now()
);

create table articles (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references profiles(id) on delete cascade,
  slug text not null,
  title text not null,
  lede text,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  current_revision_id uuid,
  published_at timestamptz,
  created_at timestamptz default now(),
  unique (author_id, slug)
);

-- blocks: jsonb [{ id: text, type: 'h1'|'lede'|'p'|'quote'|'code'|'image', text: text }]
create table revisions (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references articles(id) on delete cascade,
  number int not null,
  blocks jsonb not null,
  note text,
  created_by uuid references profiles(id),
  created_at timestamptz default now(),
  unique (article_id, number)
);

-- current_revision_id référence une révision (créée après coup pour éviter la
-- dépendance circulaire à la création des tables).
alter table articles
  add constraint articles_current_revision_fk
  foreign key (current_revision_id) references revisions(id) on delete set null;

create table suggestions (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references articles(id) on delete cascade,
  block_id text not null,
  base_revision_id uuid not null references revisions(id),
  original_text text not null,      -- texte du bloc au moment de la proposition
  proposed_text text not null,
  reason text,
  kind text not null check (kind in ('typo','edit')),
  status text not null default 'open'
    check (status in ('open','accepted','rejected','withdrawn')),
  author_id uuid not null references profiles(id) on delete cascade,
  resolved_at timestamptz,
  resolved_by uuid references profiles(id),
  created_at timestamptz default now()
);

create table suggestion_comments (
  id uuid primary key default gen_random_uuid(),
  suggestion_id uuid not null references suggestions(id) on delete cascade,
  author_id uuid not null references profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz default now()
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references profiles(id) on delete cascade,
  kind text not null,   -- 'suggestion_received' | 'suggestion_accepted' | 'suggestion_rejected' | 'comment'
  payload jsonb not null,
  read_at timestamptz,
  created_at timestamptz default now()
);

-- Blocage d'un contributeur par un auteur (anti-abus minimal, section 6).
create table author_blocks (
  author_id uuid not null references profiles(id) on delete cascade,
  blocked_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (author_id, blocked_id)
);

create index on suggestions (article_id, status);
create index on suggestions (author_id, status);
create index on revisions (article_id, number desc);
create index on notifications (recipient_id, read_at);

-- `stale` n'est pas un statut stocké : il est calculé à la lecture. Une
-- suggestion `open` est périmée si le texte actuel de son bloc (dans la révision
-- courante de l'article) diffère de `original_text`.
create view suggestions_resolved
with (security_invoker = true) as
select
  s.*,
  cur.block_text as current_block_text,
  case
    when s.status = 'open'
         and cur.block_text is not null
         and cur.block_text <> s.original_text
      then true
    else false
  end as is_stale,
  case
    when s.status = 'open'
         and cur.block_text is not null
         and cur.block_text <> s.original_text
      then 'stale'
    else s.status
  end as resolved_status
from suggestions s
left join articles a on a.id = s.article_id
left join lateral (
  select blk->>'text' as block_text
  from revisions r,
       jsonb_array_elements(r.blocks) as blk
  where r.id = a.current_revision_id
    and blk->>'id' = s.block_id
  limit 1
) cur on true;
