-- GuardAI entitlement / durable usage draft
-- NOT an applied migration. Consolidate into a generated GuardAI migration after plan limits are approved.
-- No commercial limits are seeded here: pricing/product decisions must be explicit, not invented in code.

begin;

create table public.plan_entitlements (
  plan text not null,
  capability text not null,
  enabled boolean not null default false,
  monthly_limit bigint,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (plan, capability),
  constraint plan_entitlements_plan_length check (char_length(plan) between 1 and 80),
  constraint plan_entitlements_capability_format check (capability ~ '^[a-z0-9][a-z0-9._-]{1,79}$'),
  constraint plan_entitlements_monthly_limit check (monthly_limit is null or monthly_limit >= 0),
  constraint plan_entitlements_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create table public.organization_usage_monthly (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  capability text not null,
  period_start date not null,
  used_units bigint not null default 0,
  reserved_units bigint not null default 0,
  updated_at timestamptz not null default now(),
  primary key (organization_id, capability, period_start),
  constraint organization_usage_capability_format check (capability ~ '^[a-z0-9][a-z0-9._-]{1,79}$'),
  constraint organization_usage_units_nonnegative check (used_units >= 0 and reserved_units >= 0),
  constraint organization_usage_period_month_start check (period_start = date_trunc('month', period_start)::date)
);

create table public.usage_reservations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  scan_id uuid not null,
  capability text not null,
  units bigint not null default 1,
  period_start date not null,
  status text not null default 'reserved',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint usage_reservations_scan_same_organization
    foreign key (scan_id, organization_id)
    references public.scans(id, organization_id)
    on delete cascade,
  constraint usage_reservations_units_positive check (units > 0),
  constraint usage_reservations_status_allowed check (status in ('reserved','consumed','released')),
  constraint usage_reservations_period_month_start check (period_start = date_trunc('month', period_start)::date),
  unique (scan_id, capability)
);

create index usage_reservations_org_period_idx
on public.usage_reservations(organization_id, period_start, capability, status);

create trigger plan_entitlements_set_updated_at before update on public.plan_entitlements
for each row execute function private.set_updated_at();
create trigger organization_usage_monthly_set_updated_at before update on public.organization_usage_monthly
for each row execute function private.set_updated_at();
create trigger usage_reservations_set_updated_at before update on public.usage_reservations
for each row execute function private.set_updated_at();

alter table public.plan_entitlements enable row level security;
alter table public.organization_usage_monthly enable row level security;
alter table public.usage_reservations enable row level security;

revoke all on public.plan_entitlements, public.organization_usage_monthly, public.usage_reservations from anon;
revoke all on public.plan_entitlements, public.organization_usage_monthly, public.usage_reservations from authenticated;

-- Backend-only by default. Customer-facing plan/usage DTOs should be exposed through GuardAI APIs
-- after server authorization, not by opening mutation rights on these tables.

commit;
