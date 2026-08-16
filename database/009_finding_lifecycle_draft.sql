-- GuardAI Finding lifecycle draft
-- NOT an applied migration. Consolidate into the first generated GuardAI migration.

begin;

alter table public.findings
  add column status_reason text,
  add column status_updated_at timestamptz not null default now(),
  add column status_updated_by uuid references auth.users(id),
  add constraint findings_status_allowed check (status in ('open','resolved','accepted_risk')),
  add constraint findings_status_reason_length check (status_reason is null or char_length(status_reason) <= 2000);

create table public.finding_status_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  finding_id uuid not null,
  scan_id uuid,
  from_status text,
  to_status text not null,
  reason text,
  actor_id uuid references auth.users(id),
  created_at timestamptz not null default now(),
  constraint finding_status_event_finding_same_org
    foreign key (finding_id, organization_id)
    references public.findings(id, organization_id)
    on delete cascade,
  constraint finding_status_event_scan_same_org
    foreign key (scan_id, organization_id)
    references public.scans(id, organization_id)
    on delete set null,
  constraint finding_status_event_from_allowed
    check (from_status is null or from_status in ('open','resolved','accepted_risk')),
  constraint finding_status_event_to_allowed
    check (to_status in ('open','resolved','accepted_risk')),
  constraint finding_status_event_reason_length
    check (reason is null or char_length(reason) <= 2000)
);

create index finding_status_events_finding_created_idx
on public.finding_status_events(finding_id, created_at desc, id desc);

create index findings_org_status_updated_idx
on public.findings(organization_id, status, status_updated_at desc, id desc);

alter table public.finding_status_events enable row level security;
revoke all on public.finding_status_events from anon;
grant select on public.finding_status_events to authenticated;

create policy "Members can read finding status history"
on public.finding_status_events
for select
to authenticated
using ((select private.is_org_member(organization_id)));

-- All lifecycle mutations remain backend-first so role rules, reason requirements
-- and Audit Events execute in one server-authorized PostgreSQL transaction.

commit;
