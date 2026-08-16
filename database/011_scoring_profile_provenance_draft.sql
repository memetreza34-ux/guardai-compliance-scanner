-- GuardAI scoring profile provenance draft
-- NOT an applied migration. Consolidate into the first generated GuardAI migration.

begin;

create table public.scoring_profiles (
  id text not null,
  version integer not null,
  description text not null,
  config jsonb not null,
  created_at timestamptz not null default now(),
  primary key (id, version),
  constraint scoring_profiles_id_format check (id ~ '^[a-z0-9][a-z0-9._-]{2,79}$'),
  constraint scoring_profiles_version_positive check (version > 0),
  constraint scoring_profiles_config_object check (jsonb_typeof(config) = 'object')
);

alter table public.scans
  add column scoring_profile_id text,
  add column scoring_profile_version integer,
  add constraint scans_scoring_profile_pair
    check ((scoring_profile_id is null and scoring_profile_version is null)
       or (scoring_profile_id is not null and scoring_profile_version is not null)),
  add constraint scans_scoring_profile_fk
    foreign key (scoring_profile_id, scoring_profile_version)
    references public.scoring_profiles(id, version);

revoke all on public.scoring_profiles from anon;
grant select on public.scoring_profiles to authenticated;
alter table public.scoring_profiles enable row level security;
create policy "Authenticated users may read scoring profile definitions"
on public.scoring_profiles
for select
to authenticated
using (true);

insert into public.scoring_profiles (id, version, description, config)
values (
  'security-mvp',
  1,
  'Initial GuardAI scoring profile for the only currently enabled persistent module: security.',
  '{"modules":{"security":{"weight":1}},"minimumAssessedModules":1}'::jsonb
)
on conflict (id, version) do nothing;

-- Scoring profiles are immutable provenance. A change to weights/coverage rules creates
-- a new version instead of rewriting the meaning of historical Scan scores.

commit;
