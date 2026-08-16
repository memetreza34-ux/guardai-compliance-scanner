-- GuardAI technical report snapshot draft
-- NOT an applied migration. Consolidate into the first generated GuardAI migration.

begin;

create table public.report_snapshots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  scan_id uuid not null,
  schema_version integer not null,
  report_type text not null,
  snapshot jsonb not null,
  snapshot_hash text not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  constraint report_snapshots_scan_same_org
    foreign key (scan_id, organization_id)
    references public.scans(id, organization_id)
    on delete cascade,
  constraint report_snapshots_schema_version_positive check (schema_version > 0),
  constraint report_snapshots_type_allowed check (report_type in ('technical-screening')),
  constraint report_snapshots_snapshot_object check (jsonb_typeof(snapshot) = 'object'),
  constraint report_snapshots_hash_format check (snapshot_hash ~ '^[a-f0-9]{64}$'),
  unique (organization_id, scan_id, report_type, snapshot_hash)
);

create index report_snapshots_org_created_idx
on public.report_snapshots(organization_id, created_at desc, id desc);

alter table public.report_snapshots enable row level security;
revoke all on public.report_snapshots from anon;
grant select on public.report_snapshots to authenticated;

create policy "Members can read technical report snapshots"
on public.report_snapshots
for select
to authenticated
using ((select private.is_org_member(organization_id)));

-- Report creation is backend-first; browser clients cannot mutate immutable report snapshots directly.

create or replace function private.reject_report_snapshot_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception 'GuardAI report snapshots are immutable.' using errcode = '55000';
end;
$$;

create trigger report_snapshots_immutable
before update or delete on public.report_snapshots
for each row execute function private.reject_report_snapshot_mutation();

commit;
