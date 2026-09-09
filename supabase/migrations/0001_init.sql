-- Vocal Training — Tenor
-- Migration initiale : profils, compétences, séances, objectifs.
-- Chaque utilisateur ne voit que ses propres lignes (Row Level Security).
--
-- À exécuter dans Supabase → SQL Editor, ou via `supabase db push`.

-- ---------------------------------------------------------------- profils

create table if not exists public.profiles (
  user_id            uuid primary key references auth.users (id) on delete cascade,
  display_name       text,
  voice_type         text        not null default 'tenor',
  low_note           smallint    not null default 48,
  high_note          smallint    not null default 67,
  preferred_duration integer     not null default 1200,
  level              smallint    not null default 1,
  manual_level       smallint,
  onboarded          boolean     not null default false,
  volume             real        not null default 0.8,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint profiles_notes_ordered check (low_note < high_note),
  constraint profiles_level_range check (level between 1 and 4),
  constraint profiles_manual_level_range check (manual_level is null or manual_level between 1 and 4)
);

-- ---------------------------------------------------------- compétences

create table if not exists public.skills (
  user_id          uuid        not null references auth.users (id) on delete cascade,
  skill_id         text        not null,
  score            real        not null default 0,
  feedback_history smallint[]  not null default '{}',
  exercises_done   integer     not null default 0,
  updated_at       timestamptz not null default now(),
  primary key (user_id, skill_id),
  constraint skills_score_range check (score >= 0 and score <= 100)
);

-- --------------------------------------------------------------- séances
-- L'identifiant est généré côté client afin qu'une séance créée hors ligne
-- garde la même identité une fois synchronisée.
-- Une séance dont completed_at est nul est la séance en cours.

create table if not exists public.sessions (
  id               text        not null,
  user_id          uuid        not null references auth.users (id) on delete cascade,
  date             date        not null,
  planned_duration integer     not null,
  level            smallint    not null,
  seed             bigint      not null default 0,
  exercises        jsonb       not null default '[]'::jsonb,
  started_at       timestamptz,
  completed_at     timestamptz,
  total_duration   integer     not null default 0,
  updated_at       timestamptz not null default now(),
  primary key (user_id, id)
);

create index if not exists sessions_user_date_idx on public.sessions (user_id, date desc);

-- -------------------------------------------------------------- objectifs

create table if not exists public.achievements (
  user_id        uuid        not null references auth.users (id) on delete cascade,
  achievement_id text        not null,
  unlocked_at    timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

-- ---------------------------------------------------------------- sécurité

alter table public.profiles     enable row level security;
alter table public.skills       enable row level security;
alter table public.sessions     enable row level security;
alter table public.achievements enable row level security;

-- Postgres n'a pas de "create policy if not exists" : on supprime puis on recrée.
do $$
declare
  t text;
begin
  foreach t in array array['profiles', 'skills', 'sessions', 'achievements'] loop
    execute format('drop policy if exists %I on public.%I', t || '_select_own', t);
    execute format('drop policy if exists %I on public.%I', t || '_insert_own', t);
    execute format('drop policy if exists %I on public.%I', t || '_update_own', t);
    execute format('drop policy if exists %I on public.%I', t || '_delete_own', t);

    execute format(
      'create policy %I on public.%I for select to authenticated using (auth.uid() = user_id)',
      t || '_select_own', t);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (auth.uid() = user_id)',
      t || '_insert_own', t);
    execute format(
      'create policy %I on public.%I for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id)',
      t || '_update_own', t);
    execute format(
      'create policy %I on public.%I for delete to authenticated using (auth.uid() = user_id)',
      t || '_delete_own', t);
  end loop;
end
$$;

-- ------------------------------------------- création du profil à l'inscription

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, display_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'display_name',
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(new.email, '@', 1)
    )
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------- suppression de son compte
-- Évite d'exposer une clé de service au client : l'utilisateur connecté
-- supprime uniquement sa propre ligne dans auth.users, la cascade fait le reste.

create or replace function public.delete_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Non authentifié';
  end if;
  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_account() from public, anon;
grant execute on function public.delete_account() to authenticated;
