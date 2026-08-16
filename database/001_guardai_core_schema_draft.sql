-- GuardAI core database schema draft
-- Status: design source, NOT an applied Supabase migration.
-- Convert with `supabase migration new ...` once the dedicated GuardAI project/CLI exists.
-- All customer tables are tenant-scoped and RLS-protected. Browser roles are read-mostly;
-- privileged writes are intended to go through the GuardAI backend after server-side authorization.

begin;

create extension if not exists pgcrypto;

create schema if not exists private;
revoke all on schema private from public;
revoke all on schema private from anon;
revoke all on schema private from authenticated;

create type public.guardai_org_role as enum ('owner', 'admin', 'member', 'viewer');
create type public.guardai_target_type as enum ('website', 'repository', 'asset');
create type public.guardai_verification_state as enum ('unverified', 'pending', 'verified', 'failed');
create type public.guardai_scan_status as enum ('queued', 'running', 'completed', 'failed', 'cancelled');
create type public.guardai_job_status as enum ('queued', 'running', 'completed', 'failed', 'cancelled');
create type public.guardai_finding_status as enum ('open', 'acknowledged', 'in_progress', 'resolved', 'accepted_risk', 'false_positive');
create type public.guardai_severity as enum ('critical', 'warning', 'info');

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_display_name_length check (display_name is null or char_length(display_name) between 1 and 120)
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organizations_name_length check (char_length(btrim(name)) between 1 and 160),
  constraint organizations_slug_format check (slug ~ '^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$')
);

create table public.memberships (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.guardai_org_role not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table public.targets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  type public.guardai_target_type not null,
  display_name text not null,
  canonical_url text,
  provider text,
  verification_state public.guardai_verification_state not null default 'unverified',
  verification_metadata jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint targets_display_name_length check (char_length(btrim(display_name)) between 1 and 200),
  constraint targets_metadata_object check (jsonb_typeof(verification_metadata) = 'object')
);

create table public.scans (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  target_id uuid not null references public.targets(id) on delete cascade,
  requested_by uuid not null references auth.users(id),
  status public.guardai_scan_status not null default 'queued',
  scanner_version text not null,
  contract_version text not null,
  overall_score smallint,
  coverage jsonb not null default '{}'::jsonb,
  notices jsonb not null default '[]'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  failed_at timestamptz,
  error_code text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint scans_overall_score_range check (overall_score is null or overall_score between 0 and 100),
  constraint scans_coverage_object check (jsonb_typeof(coverage) = 'object'),
  constraint scans_notices_array check (jsonb_typeof(notices) = 'array')
);

create table public.scan_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  scan_id uuid not null references public.scans(id) on delete cascade,
  job_type text not null,
  status public.guardai_job_status not null default 'queued',
  attempt_count integer not null default 0,
  max_attempts integer not null default 3,
  available_at timestamptz not null default now(),
  leased_at timestamptz,
  lease_expires_at timestamptz,
  worker_id text,
  error_code text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint scan_jobs_attempts_nonnegative check (attempt_count >= 0),
  constraint scan_jobs_max_attempts_positive check (max_attempts > 0)
);

create table public.evidence (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  scan_id uuid not null references public.scans(id) on delete cascade,
  detector_id text not null,
  detector_version text not null,
  type text not null,
  source text not null,
  normalized_data jsonb not null default '{}'::jsonb,
  artifact_url text,
  content_hash text,
  captured_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint evidence_normalized_object check (jsonb_typeof(normalized_data) = 'object'),
  constraint evidence_hash_format check (content_hash is null or content_hash ~ '^[a-f0-9]{64}$')
);

create table public.legal_sources (
  id uuid primary key default gen_random_uuid(),
  jurisdiction text not null,
  source_name text not null,
  reference text not null,
  source_url text,
  effective_from date,
  effective_to date,
  reviewed_at timestamptz,
  reviewer text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint legal_sources_effective_range check (effective_to is null or effective_from is null or effective_to >= effective_from)
);

create table public.rules (
  id text primary key,
  category text not null,
  title text not null,
  current_version integer not null default 1,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rules_id_format check (id ~ '^[a-z0-9][a-z0-9._-]{2,119}$'),
  constraint rules_current_version_positive check (current_version > 0)
);

create table public.rule_versions (
  rule_id text not null references public.rules(id) on delete cascade,
  version integer not null,
  implementation_version text not null,
  legal_source_ids uuid[] not null default '{}'::uuid[],
  definition jsonb not null default '{}'::jsonb,
  changed_at timestamptz not null default now(),
  primary key (rule_id, version),
  constraint rule_versions_version_positive check (version > 0),
  constraint rule_versions_definition_object check (jsonb_typeof(definition) = 'object')
);

create table public.findings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  target_id uuid not null references public.targets(id) on delete cascade,
  rule_id text references public.rules(id),
  fingerprint text not null,
  status public.guardai_finding_status not null default 'open',
  first_seen_at timestamptz not null,
  last_seen_at timestamptz not null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, target_id, fingerprint)
);

create table public.finding_instances (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  finding_id uuid not null references public.findings(id) on delete cascade,
  scan_id uuid not null references public.scans(id) on delete cascade,
  severity public.guardai_severity not null,
  confidence numeric(4,3),
  evidence_ids uuid[] not null default '{}'::uuid[],
  message text not null,
  remediation text,
  created_at timestamptz not null default now(),
  constraint finding_instances_confidence_range check (confidence is null or (confidence >= 0 and confidence <= 1))
);

create table public.subscriptions (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  provider text not null,
  provider_customer_id text,
  provider_subscription_id text,
  plan text not null default 'free',
  status text not null default 'inactive',
  period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_id uuid references auth.users(id),
  action text not null,
  target_type text,
  target_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint audit_events_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create index memberships_user_id_idx on public.memberships(user_id);
create index targets_organization_id_idx on public.targets(organization_id);
create index scans_organization_created_idx on public.scans(organization_id, created_at desc);
create index scans_target_created_idx on public.scans(target_id, created_at desc);
create index scan_jobs_status_available_idx on public.scan_jobs(status, available_at);
create index evidence_scan_id_idx on public.evidence(scan_id);
create index evidence_organization_id_idx on public.evidence(organization_id);
create index findings_org_status_idx on public.findings(organization_id, status);
create index findings_target_idx on public.findings(target_id);
create index finding_instances_scan_idx on public.finding_instances(scan_id);
create index audit_events_org_created_idx on public.audit_events(organization_id, created_at desc);

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function private.set_updated_at() from public;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function private.set_updated_at();
create trigger organizations_set_updated_at before update on public.organizations
for each row execute function private.set_updated_at();
create trigger memberships_set_updated_at before update on public.memberships
for each row execute function private.set_updated_at();
create trigger targets_set_updated_at before update on public.targets
for each row execute function private.set_updated_at();
create trigger scans_set_updated_at before update on public.scans
for each row execute function private.set_updated_at();
create trigger scan_jobs_set_updated_at before update on public.scan_jobs
for each row execute function private.set_updated_at();
create trigger legal_sources_set_updated_at before update on public.legal_sources
for each row execute function private.set_updated_at();
create trigger rules_set_updated_at before update on public.rules
for each row execute function private.set_updated_at();
create trigger findings_set_updated_at before update on public.findings
for each row execute function private.set_updated_at();
create trigger subscriptions_set_updated_at before update on public.subscriptions
for each row execute function private.set_updated_at();

create or replace function private.has_org_role(target_organization_id uuid, allowed_roles public.guardai_org_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select auth.uid()) is not null
    and exists (
      select 1
      from public.memberships m
      where m.organization_id = target_organization_id
        and m.user_id = (select auth.uid())
        and m.role = any(allowed_roles)
    );
$$;

revoke all on function private.has_org_role(uuid, public.guardai_org_role[]) from public;
grant execute on function private.has_org_role(uuid, public.guardai_org_role[]) to authenticated;

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.memberships enable row level security;
alter table public.targets enable row level security;
alter table public.scans enable row level security;
alter table public.scan_jobs enable row level security;
alter table public.evidence enable row level security;
alter table public.legal_sources enable row level security;
alter table public.rules enable row level security;
alter table public.rule_versions enable row level security;
alter table public.findings enable row level security;
alter table public.finding_instances enable row level security;
alter table public.subscriptions enable row level security;
alter table public.audit_events enable row level security;

revoke all on all tables in schema public from anon;
revoke all on public.profiles, public.organizations, public.memberships, public.targets,
  public.scans, public.scan_jobs, public.evidence, public.legal_sources, public.rules,
  public.rule_versions, public.findings, public.finding_instances, public.subscriptions,
  public.audit_events from authenticated;

grant select, insert, update on public.profiles to authenticated;
grant select on public.organizations, public.memberships, public.targets, public.scans,
  public.evidence, public.legal_sources, public.rules, public.rule_versions,
  public.findings, public.finding_instances, public.subscriptions, public.audit_events
  to authenticated;

create policy profiles_select_self
on public.profiles for select
to authenticated
using ((select auth.uid()) is not null and user_id = (select auth.uid()));

create policy profiles_insert_self
on public.profiles for insert
to authenticated
with check ((select auth.uid()) is not null and user_id = (select auth.uid()));

create policy profiles_update_self
on public.profiles for update
to authenticated
using ((select auth.uid()) is not null and user_id = (select auth.uid()))
with check ((select auth.uid()) is not null and user_id = (select auth.uid()));

create policy organizations_select_member
on public.organizations for select
to authenticated
using (private.has_org_role(id, array['owner','admin','member','viewer']::public.guardai_org_role[]));

create policy memberships_select_same_org
on public.memberships for select
to authenticated
using (private.has_org_role(organization_id, array['owner','admin','member','viewer']::public.guardai_org_role[]));

create policy targets_select_member
on public.targets for select
to authenticated
using (private.has_org_role(organization_id, array['owner','admin','member','viewer']::public.guardai_org_role[]));

create policy scans_select_member
on public.scans for select
to authenticated
using (private.has_org_role(organization_id, array['owner','admin','member','viewer']::public.guardai_org_role[]));

create policy evidence_select_member
on public.evidence for select
to authenticated
using (private.has_org_role(organization_id, array['owner','admin','member','viewer']::public.guardai_org_role[]));

create policy findings_select_member
on public.findings for select
to authenticated
using (private.has_org_role(organization_id, array['owner','admin','member','viewer']::public.guardai_org_role[]));

create policy finding_instances_select_member
on public.finding_instances for select
to authenticated
using (private.has_org_role(organization_id, array['owner','admin','member','viewer']::public.guardai_org_role[]));

create policy subscriptions_select_admin
on public.subscriptions for select
to authenticated
using (private.has_org_role(organization_id, array['owner','admin']::public.guardai_org_role[]));

create policy audit_events_select_admin
on public.audit_events for select
to authenticated
using (private.has_org_role(organization_id, array['owner','admin']::public.guardai_org_role[]));

create policy rules_select_authenticated
on public.rules for select
to authenticated
using (true);

create policy rule_versions_select_authenticated
on public.rule_versions for select
to authenticated
using (true);

create policy legal_sources_select_authenticated
on public.legal_sources for select
to authenticated
using (true);

-- scan_jobs intentionally has no authenticated grant/policy: worker-internal queue state.
-- Customer-data mutations for organizations/memberships/targets/scans/evidence/findings/subscriptions/audit
-- are intentionally backend-only in this draft. The backend must still authorize organization membership;
-- a privileged server connection is not a substitute for application authorization.

commit;
