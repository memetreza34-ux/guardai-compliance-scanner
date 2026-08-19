-- GuardAI AI Governance guided-review persistence draft
-- NOT an applied migration. Consolidate into generated GuardAI staging migrations.
-- Purpose: tenant-safe structured AI-system declarations + immutable review provenance.
-- Explicit non-goal: no automatic EU AI Act risk classification or compliance verdict.

begin;

-- Official source records used only as provenance anchors for guided review.
-- Applicability is intentionally not inferred from these rows.
insert into public.legal_sources (
  id, jurisdiction, source_name, reference, source_url, reviewed_at, reviewer
)
values
  (
    'a1000000-0000-4000-8000-000000000004'::uuid,
    'EU',
    'Regulation (EU) 2024/1689',
    'Article 4 — AI literacy',
    'https://eur-lex.europa.eu/eli/reg/2024/1689/oj',
    now(),
    'GuardAI eu-ai-act-guided-review@1'
  ),
  (
    'a1000000-0000-4000-8000-000000000014'::uuid,
    'EU',
    'Regulation (EU) 2024/1689',
    'Article 14 — Human oversight',
    'https://eur-lex.europa.eu/eli/reg/2024/1689/oj',
    now(),
    'GuardAI eu-ai-act-guided-review@1'
  ),
  (
    'a1000000-0000-4000-8000-000000000050'::uuid,
    'EU',
    'Regulation (EU) 2024/1689',
    'Article 50 — Transparency obligations for providers and deployers of certain AI systems',
    'https://eur-lex.europa.eu/eli/reg/2024/1689/oj',
    now(),
    'GuardAI eu-ai-act-guided-review@1'
  )
on conflict (id) do nothing;

create table public.ai_system_profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  organization_role text not null default 'unknown',
  provider_name text,
  model_name text,
  deployment_context text not null default 'unknown',
  use_cases text[] not null default '{}'::text[],
  interacts_directly_with_people text not null default 'unknown',
  generates_synthetic_content text not null default 'unknown',
  ai_literacy_measures_documented text not null default 'unknown',
  human_oversight_controls_documented text not null default 'unknown',
  interaction_disclosure_documented text not null default 'unknown',
  synthetic_content_disclosure_documented text not null default 'unknown',
  archived_at timestamptz,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  constraint ai_system_profiles_name_length check (char_length(btrim(name)) between 1 and 160),
  constraint ai_system_profiles_provider_length check (provider_name is null or char_length(btrim(provider_name)) between 1 and 160),
  constraint ai_system_profiles_model_length check (model_name is null or char_length(btrim(model_name)) between 1 and 160),
  constraint ai_system_profiles_role_allowed check (organization_role in ('provider', 'deployer', 'both', 'unknown')),
  constraint ai_system_profiles_deployment_allowed check (deployment_context in ('internal', 'customer-facing', 'embedded', 'other', 'unknown')),
  constraint ai_system_profiles_use_cases_allowed check (
    use_cases <@ array[
      'content-generation',
      'human-interaction',
      'decision-support',
      'automated-action',
      'biometric-or-emotion',
      'other'
    ]::text[]
    and cardinality(use_cases) <= 10
  ),
  constraint ai_system_profiles_interaction_tri_state check (interacts_directly_with_people in ('yes', 'no', 'unknown')),
  constraint ai_system_profiles_synthetic_tri_state check (generates_synthetic_content in ('yes', 'no', 'unknown')),
  constraint ai_system_profiles_literacy_tri_state check (ai_literacy_measures_documented in ('yes', 'no', 'unknown')),
  constraint ai_system_profiles_oversight_tri_state check (human_oversight_controls_documented in ('yes', 'no', 'unknown')),
  constraint ai_system_profiles_interaction_disclosure_tri_state check (interaction_disclosure_documented in ('yes', 'no', 'unknown')),
  constraint ai_system_profiles_synthetic_disclosure_tri_state check (synthetic_content_disclosure_documented in ('yes', 'no', 'unknown'))
);

create table public.ai_governance_reviews (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  ai_system_id uuid not null,
  status text not null default 'draft',
  source_registry_id text not null,
  source_registry_version integer not null,
  legal_applicability_state text not null default 'requires_human_review',
  system_snapshot jsonb not null default '{}'::jsonb,
  submitted_by uuid references auth.users(id),
  reviewed_by uuid references auth.users(id),
  submitted_at timestamptz,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  constraint ai_governance_reviews_system_fk
    foreign key (organization_id, ai_system_id)
    references public.ai_system_profiles(organization_id, id)
    on delete restrict,
  constraint ai_governance_reviews_status_allowed check (status in ('draft', 'submitted', 'reviewed', 'reopened')),
  constraint ai_governance_reviews_registry_id_format check (source_registry_id ~ '^[a-z0-9][a-z0-9._-]{2,119}$'),
  constraint ai_governance_reviews_registry_version_positive check (source_registry_version > 0),
  constraint ai_governance_reviews_legal_state check (legal_applicability_state = 'requires_human_review'),
  constraint ai_governance_reviews_snapshot_object check (jsonb_typeof(system_snapshot) = 'object'),
  constraint ai_governance_reviews_timestamps check (
    (status = 'draft' and submitted_at is null and reviewed_at is null)
    or (status in ('submitted', 'reopened') and submitted_at is not null and reviewed_at is null)
    or (status = 'reviewed' and submitted_at is not null and reviewed_at is not null)
  )
);

create table public.ai_governance_review_items (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  review_id uuid not null,
  item_key text not null,
  legal_source_id uuid not null references public.legal_sources(id),
  documentation_state text not null,
  applicability_state text not null default 'requires_human_review',
  trigger_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (review_id, item_key),
  constraint ai_governance_review_items_review_fk
    foreign key (organization_id, review_id)
    references public.ai_governance_reviews(organization_id, id)
    on delete cascade,
  constraint ai_governance_review_items_key_format check (item_key ~ '^[a-z0-9][a-z0-9._-]{2,119}$'),
  constraint ai_governance_review_items_documentation_allowed check (
    documentation_state in ('documented_by_declaration', 'not_documented_by_declaration', 'unknown')
  ),
  constraint ai_governance_review_items_applicability_human check (applicability_state = 'requires_human_review'),
  constraint ai_governance_review_items_trigger_format check (trigger_key ~ '^[a-z0-9][a-z0-9._-]{2,159}$')
);

create index ai_system_profiles_org_created_idx
on public.ai_system_profiles(organization_id, created_at desc);

create index ai_governance_reviews_org_created_idx
on public.ai_governance_reviews(organization_id, created_at desc);

create index ai_governance_reviews_system_idx
on public.ai_governance_reviews(organization_id, ai_system_id, created_at desc);

create trigger ai_system_profiles_set_updated_at
before update on public.ai_system_profiles
for each row execute function private.set_updated_at();

create trigger ai_governance_reviews_set_updated_at
before update on public.ai_governance_reviews
for each row execute function private.set_updated_at();

create trigger ai_governance_review_items_set_updated_at
before update on public.ai_governance_review_items
for each row execute function private.set_updated_at();

create or replace function private.freeze_ai_governance_review_snapshot()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile_row public.ai_system_profiles%rowtype;
begin
  select *
    into profile_row
    from public.ai_system_profiles
   where organization_id = new.organization_id
     and id = new.ai_system_id
     and archived_at is null;

  if not found then
    raise exception 'AI Governance review requires an active AI System profile';
  end if;

  new.system_snapshot = jsonb_build_object(
    'systemName', profile_row.name,
    'organizationRole', profile_row.organization_role,
    'providerName', profile_row.provider_name,
    'modelName', profile_row.model_name,
    'deploymentContext', profile_row.deployment_context,
    'useCases', to_jsonb(profile_row.use_cases),
    'declarations', jsonb_build_object(
      'interactsDirectlyWithPeople', profile_row.interacts_directly_with_people,
      'generatesSyntheticContent', profile_row.generates_synthetic_content,
      'aiLiteracyMeasuresDocumented', profile_row.ai_literacy_measures_documented,
      'humanOversightControlsDocumented', profile_row.human_oversight_controls_documented,
      'interactionDisclosureDocumented', profile_row.interaction_disclosure_documented,
      'syntheticContentDisclosureDocumented', profile_row.synthetic_content_disclosure_documented
    )
  );
  return new;
end;
$$;

revoke all on function private.freeze_ai_governance_review_snapshot() from public;

create trigger ai_governance_reviews_freeze_snapshot
before insert on public.ai_governance_reviews
for each row execute function private.freeze_ai_governance_review_snapshot();

create or replace function private.prevent_ai_governance_snapshot_rewrite()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.system_snapshot is distinct from old.system_snapshot
     or new.ai_system_id is distinct from old.ai_system_id
     or new.source_registry_id is distinct from old.source_registry_id
     or new.source_registry_version is distinct from old.source_registry_version then
    raise exception 'AI Governance review provenance is immutable';
  end if;
  return new;
end;
$$;

revoke all on function private.prevent_ai_governance_snapshot_rewrite() from public;

create trigger ai_governance_reviews_prevent_provenance_rewrite
before update on public.ai_governance_reviews
for each row execute function private.prevent_ai_governance_snapshot_rewrite();

revoke all on public.ai_system_profiles, public.ai_governance_reviews, public.ai_governance_review_items from anon;
revoke all on public.ai_system_profiles, public.ai_governance_reviews, public.ai_governance_review_items from authenticated;

grant select on public.ai_system_profiles, public.ai_governance_reviews, public.ai_governance_review_items to authenticated;

alter table public.ai_system_profiles enable row level security;
alter table public.ai_governance_reviews enable row level security;
alter table public.ai_governance_review_items enable row level security;

create policy ai_system_profiles_select_member
on public.ai_system_profiles for select
to authenticated
using (private.has_org_role(organization_id, array['owner','admin','member','viewer']::public.guardai_org_role[]));

create policy ai_governance_reviews_select_member
on public.ai_governance_reviews for select
to authenticated
using (private.has_org_role(organization_id, array['owner','admin','member','viewer']::public.guardai_org_role[]));

create policy ai_governance_review_items_select_member
on public.ai_governance_review_items for select
to authenticated
using (private.has_org_role(organization_id, array['owner','admin','member','viewer']::public.guardai_org_role[]));

create or replace function private.audit_ai_governance_review_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status is distinct from new.status then
    insert into public.audit_events (
      organization_id, actor_id, action, target_type, target_id, metadata
    ) values (
      new.organization_id,
      case
        when new.status = 'reviewed' then new.reviewed_by
        else new.submitted_by
      end,
      'ai_governance.review_status_changed',
      'ai_governance_review',
      new.id::text,
      jsonb_build_object(
        'aiSystemId', new.ai_system_id,
        'from', old.status,
        'to', new.status,
        'sourceRegistryId', new.source_registry_id,
        'sourceRegistryVersion', new.source_registry_version
      )
    );
  end if;
  return new;
end;
$$;

revoke all on function private.audit_ai_governance_review_status() from public;

create trigger ai_governance_reviews_audit_status
after update of status on public.ai_governance_reviews
for each row execute function private.audit_ai_governance_review_status();

-- The review snapshot is generated only from the typed AI System columns by a DB trigger
-- and is immutable afterwards. No prompt text, model output, customer content or free-form
-- legal conclusion column exists in this MVP schema. Backend mutations must still enforce
-- Organization RBAC and the source registry/version contract.

commit;
