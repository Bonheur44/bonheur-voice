-- Vocal Training — passage au coach vocal choral
--
-- Deux changements :
--   1. le pupitre devient une information déclarée par l'utilisateur, tous
--      pupitres confondus, et non plus un ténor implicite ;
--   2. les tentatives vocales observées sont conservées, parce que ce sont elles
--      — et non une conclusion figée — qui constituent le profil vocal.
--
-- Migration idempotente : rejouable sans dommage.

-- ------------------------------------------------------- pupitre et ligne

alter table public.profiles
  add column if not exists declared_part        text    not null default 'unknown',
  add column if not exists choir_line           text    not null default 'T',
  add column if not exists range_from_assessment boolean not null default false;

-- Reprise des comptes créés avant cette migration : ils étaient tous ténors par
-- construction, et c'est bien une déclaration, pas une conclusion de l'application.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'voice_type'
  ) then
    update public.profiles
       set declared_part = 'tenor',
           choir_line    = 'T'
     where declared_part = 'unknown'
       and voice_type = 'tenor';

    alter table public.profiles drop column voice_type;
  end if;
end
$$;

alter table public.profiles drop constraint if exists profiles_declared_part_valid;
alter table public.profiles add constraint profiles_declared_part_valid
  check (declared_part in ('soprano', 'mezzo-soprano', 'alto', 'countertenor', 'tenor', 'baritone', 'bass', 'unknown'));

alter table public.profiles drop constraint if exists profiles_choir_line_valid;
alter table public.profiles add constraint profiles_choir_line_valid
  check (choir_line in ('S', 'A', 'T', 'B'));

-- La zone de travail par défaut ne peut plus être celle d'un ténor : on prend une
-- zone médiane, que l'onboarding et le test d'étendue remplacent aussitôt.
alter table public.profiles alter column low_note  set default 55;
alter table public.profiles alter column high_note set default 72;

-- ------------------------------------------------------------ observations
-- Une ligne par tentative sur une note. Table en ajout seul : une observation
-- appartient à un instant précis et n'est jamais corrigée après coup, ce qui rend
-- la fusion entre appareils triviale — une simple union par identifiant.
--
-- L'identifiant est généré côté client pour qu'une tentative faite hors ligne
-- garde son identité une fois synchronisée, comme pour les séances.

create table if not exists public.observations (
  id            text        not null,
  user_id       uuid        not null references auth.users (id) on delete cascade,
  target_midi   smallint    not null,
  detected_midi real,
  spread_cents  real        not null default 0,
  held_seconds  real        not null default 0,
  clarity       real        not null default 0,
  comfort       text,
  source        text        not null default 'exercise',
  observed_at   timestamptz not null default now(),
  primary key (user_id, id),
  constraint observations_target_range check (target_midi between 12 and 108),
  constraint observations_comfort_valid check (comfort is null or comfort in ('easy', 'ok', 'strained', 'impossible')),
  constraint observations_source_valid check (source in ('range-test', 'pitch-test', 'sustain', 'exercise'))
);

create index if not exists observations_user_time_idx on public.observations (user_id, observed_at desc);

alter table public.observations enable row level security;

do $$
begin
  execute 'drop policy if exists observations_select_own on public.observations';
  execute 'drop policy if exists observations_insert_own on public.observations';
  execute 'drop policy if exists observations_update_own on public.observations';
  execute 'drop policy if exists observations_delete_own on public.observations';

  execute 'create policy observations_select_own on public.observations for select to authenticated using (auth.uid() = user_id)';
  execute 'create policy observations_insert_own on public.observations for insert to authenticated with check (auth.uid() = user_id)';
  execute 'create policy observations_update_own on public.observations for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id)';
  execute 'create policy observations_delete_own on public.observations for delete to authenticated using (auth.uid() = user_id)';
end
$$;
