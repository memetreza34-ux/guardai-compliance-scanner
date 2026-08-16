-- GuardAI immutable provenance draft
-- NOT an applied migration. Consolidate into the first generated GuardAI migration.

begin;

create or replace function private.reject_provenance_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception 'GuardAI provenance rows are immutable; create a new version instead.'
    using errcode = '55000';
end;
$$;

create trigger rule_versions_immutable
before update or delete on public.rule_versions
for each row execute function private.reject_provenance_mutation();

create trigger scoring_profiles_immutable
before update or delete on public.scoring_profiles
for each row execute function private.reject_provenance_mutation();

-- Mutable lifecycle state belongs on the parent rule (for example active/deprecated)
-- while the exact historical rule_versions/scoring_profiles rows remain immutable.

commit;
