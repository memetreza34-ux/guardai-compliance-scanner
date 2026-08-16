-- GuardAI persistent monitoring + in-app notification draft
-- NOT an applied migration. Initial runtime supports verified Website + Security only.

begin;

create type public.guardai_monitor_status as enum ('active', 'paused', 'disabled');
create type public.guardai_notification_type as enum ('new_finding', 'scan_failed');

create table public.monitors (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  target_id uuid not null,
  module_id text not null default 'security',
  status public.guardai_monitor_status not null default 'active',
  schedule_minutes integer not null,
  next_run_at timestamptz not null,
  leased_at timestamptz,
  lease_expires_at timestamptz,
  worker_id text,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint monitors_target_same_org
    foreign key (target_id, organization_id)
    references public.targets(id, organization_id)
    on delete cascade,
  constraint monitors_module_currently_supported check (module_id = 'security'),
  constraint monitors_schedule_bounds check (schedule_minutes between 60 and 10080),
  constraint monitors_lease_consistency check (
    (leased_at is null and lease_expires_at is null and worker_id is null)
    or (leased_at is not null and lease_expires_at is not null and worker_id is not null)
  )
);

create unique index monitors_one_security_per_target
on public.monitors(organization_id, target_id, module_id)
where status <> 'disabled';

create index monitors_due_idx
on public.monitors(status, next_run_at)
where status = 'active';

create trigger monitors_set_updated_at
before update on public.monitors
for each row execute function private.set_updated_at();

alter table public.monitors enable row level security;
revoke all on public.monitors from anon;
revoke all on public.monitors from authenticated;
grant select on public.monitors to authenticated;

create policy monitors_select_member
on public.monitors for select
to authenticated
using (private.has_org_role(
  organization_id,
  array['owner','admin','member','viewer']::public.guardai_org_role[]
));

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  type public.guardai_notification_type not null,
  dedupe_key text not null,
  scan_id uuid,
  finding_id uuid,
  severity public.guardai_severity,
  title text not null,
  message text not null,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint notifications_dedupe_key_length check (char_length(dedupe_key) between 8 and 255),
  constraint notifications_title_length check (char_length(title) between 1 and 200),
  constraint notifications_message_length check (char_length(message) between 1 and 1000),
  constraint notifications_scan_same_org
    foreign key (scan_id, organization_id)
    references public.scans(id, organization_id)
    on delete cascade,
  constraint notifications_finding_same_org
    foreign key (finding_id, organization_id)
    references public.findings(id, organization_id)
    on delete cascade,
  unique (organization_id, dedupe_key)
);

create index notifications_org_unread_idx
on public.notifications(organization_id, created_at desc)
where read_at is null;

alter table public.notifications enable row level security;
revoke all on public.notifications from anon;
revoke all on public.notifications from authenticated;
grant select on public.notifications to authenticated;

create policy notifications_select_member
on public.notifications for select
to authenticated
using (private.has_org_role(
  organization_id,
  array['owner','admin','member','viewer']::public.guardai_org_role[]
));

-- Notification mutation is backend-only. The public/browser RLS model can read tenant-scoped
-- notification state, while mark-read is routed through server authorization to keep auditability.

commit;
