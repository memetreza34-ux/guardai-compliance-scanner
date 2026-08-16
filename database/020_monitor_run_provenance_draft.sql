-- GuardAI monitor-run provenance draft
-- NOT an applied migration. Keeps scheduled Scan provenance separate from mutable Monitor state.

begin;

create table public.monitor_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  monitor_id uuid not null references public.monitors(id) on delete cascade,
  scheduled_for timestamptz not null,
  scan_id uuid not null,
  created_at timestamptz not null default now(),
  constraint monitor_runs_scan_same_org
    foreign key (scan_id, organization_id)
    references public.scans(id, organization_id)
    on delete cascade,
  unique (monitor_id, scheduled_for),
  unique (monitor_id, scan_id)
);

create index monitor_runs_monitor_created_idx
on public.monitor_runs(monitor_id, created_at desc);

create index monitor_runs_org_created_idx
on public.monitor_runs(organization_id, created_at desc);

alter table public.monitor_runs enable row level security;
revoke all on public.monitor_runs from anon;
revoke all on public.monitor_runs from authenticated;
grant select on public.monitor_runs to authenticated;

create policy monitor_runs_select_member
on public.monitor_runs for select
to authenticated
using (private.has_org_role(
  organization_id,
  array['owner','admin','member','viewer']::public.guardai_org_role[]
));

commit;
