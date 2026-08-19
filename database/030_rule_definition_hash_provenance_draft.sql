-- GuardAI Rule definition-hash provenance draft
-- NOT an applied migration. Consolidate into generated GuardAI staging migrations.
-- IMPORTANT: the manual Rule seed bodies in older design drafts 008/025 are superseded
-- as migration seed sources. Real migrations must generate Rule rows from shared/rules/*.json
-- with server/scripts/generateRuleSeedSql.js so the DB hash equals the Worker registry hash.

begin;

alter table public.rule_versions
  add column definition_hash text;

alter table public.rule_versions
  add constraint rule_versions_definition_hash_format
    check (definition_hash is null or definition_hash ~ '^[a-f0-9]{64}$');

alter table public.rule_versions
  add constraint rule_versions_rule_version_hash_unique
    unique (rule_id, version, definition_hash);

alter table public.finding_instances
  add column rule_definition_hash text;

alter table public.finding_instances
  drop constraint if exists finding_instances_rule_version_pair;

alter table public.finding_instances
  add constraint finding_instances_rule_provenance_complete
    check (
      (rule_id is null and rule_version is null and rule_definition_hash is null)
      or
      (
        rule_id is not null
        and rule_version is not null
        and rule_definition_hash ~ '^[a-f0-9]{64}$'
      )
    );

alter table public.finding_instances
  add constraint finding_instances_rule_definition_fk
    foreign key (rule_id, rule_version, rule_definition_hash)
    references public.rule_versions(rule_id, version, definition_hash);

create index finding_instances_rule_definition_hash_idx
on public.finding_instances(rule_id, rule_version, rule_definition_hash);

create or replace function private.prevent_rule_version_rewrite()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.rule_id is distinct from old.rule_id
     or new.version is distinct from old.version
     or new.implementation_version is distinct from old.implementation_version
     or new.legal_source_ids is distinct from old.legal_source_ids
     or new.definition is distinct from old.definition
     or new.definition_hash is distinct from old.definition_hash then
    raise exception 'GuardAI Rule versions are immutable; create a new version instead';
  end if;
  return new;
end;
$$;

revoke all on function private.prevent_rule_version_rewrite() from public;

create trigger rule_versions_prevent_rewrite
before update on public.rule_versions
for each row execute function private.prevent_rule_version_rewrite();

-- Release/migration invariant:
--   SELECT count(*) FROM public.rule_versions WHERE definition_hash IS NULL;
-- must be zero before any persistent scanner that emits Rule-backed Findings is enabled.
-- A generated Rule seed must be applied in the same migration release as this provenance
-- model. A hash mismatch is a deployment failure, never a silent update of an old Rule.

commit;
