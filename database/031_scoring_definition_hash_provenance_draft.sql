-- GuardAI scoring-profile definition-hash provenance draft
-- NOT an applied migration. Consolidate into generated GuardAI staging migrations.
-- IMPORTANT: manual scoring seed bodies in older design drafts 011/025 are superseded
-- as canonical migration seed sources. Generate them from shared/scoring/*.json.

begin;

alter table public.scoring_profiles
  add column definition_hash text;

alter table public.scoring_profiles
  add constraint scoring_profiles_definition_hash_format
    check (definition_hash is null or definition_hash ~ '^[a-f0-9]{64}$');

alter table public.scoring_profiles
  add constraint scoring_profiles_definition_hash_unique
    unique (id, version, definition_hash);

alter table public.scans
  add column scoring_profile_definition_hash text;

alter table public.scans
  drop constraint if exists scans_scoring_profile_pair;

alter table public.scans
  drop constraint if exists scans_scoring_profile_fk;

alter table public.scans
  add constraint scans_scoring_profile_provenance_complete
    check (
      (
        scoring_profile_id is null
        and scoring_profile_version is null
        and scoring_profile_definition_hash is null
      )
      or
      (
        scoring_profile_id is not null
        and scoring_profile_version is not null
        and scoring_profile_definition_hash ~ '^[a-f0-9]{64}$'
      )
    );

alter table public.scans
  add constraint scans_scoring_profile_definition_fk
    foreign key (scoring_profile_id, scoring_profile_version, scoring_profile_definition_hash)
    references public.scoring_profiles(id, version, definition_hash);

create or replace function private.prevent_scoring_profile_rewrite()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.id is distinct from old.id
     or new.version is distinct from old.version
     or new.description is distinct from old.description
     or new.config is distinct from old.config
     or new.definition_hash is distinct from old.definition_hash then
    raise exception 'GuardAI scoring profile versions are immutable; create a new version instead';
  end if;
  return new;
end;
$$;

revoke all on function private.prevent_scoring_profile_rewrite() from public;

create trigger scoring_profiles_prevent_rewrite
before update on public.scoring_profiles
for each row execute function private.prevent_scoring_profile_rewrite();

-- Release/migration invariant:
--   SELECT count(*) FROM public.scoring_profiles WHERE definition_hash IS NULL;
-- must be zero before any persistent scored module is enabled.
-- The generated profile seed must be applied with this provenance model. A definition
-- mismatch is a deployment failure, never a silent rewrite of an old profile version.

commit;
