-- GuardAI in-app notification event triggers draft
-- NOT an applied migration. Notifications are tenant-private and backend/read-model only.

begin;

create or replace function private.guardai_notify_finding_instance()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  finding_row public.findings%rowtype;
begin
  select * into finding_row
  from public.findings
  where id = new.finding_id and organization_id = new.organization_id;

  if finding_row.id is null then
    return new;
  end if;

  insert into public.notifications (
    organization_id,
    type,
    dedupe_key,
    scan_id,
    finding_id,
    severity,
    title,
    message
  ) values (
    new.organization_id,
    'new_finding',
    'finding:first:' || new.finding_id::text,
    new.scan_id,
    new.finding_id,
    new.severity,
    'New technical finding',
    left(new.message, 1000)
  )
  on conflict (organization_id, dedupe_key) do nothing;

  return new;
end;
$$;

create trigger finding_instances_create_notification
after insert on public.finding_instances
for each row execute function private.guardai_notify_finding_instance();

create or replace function private.guardai_notify_scan_failure()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status is distinct from 'failed' and new.status = 'failed' then
    insert into public.notifications (
      organization_id,
      type,
      dedupe_key,
      scan_id,
      finding_id,
      severity,
      title,
      message
    ) values (
      new.organization_id,
      'scan_failed',
      'scan:failed:' || new.id::text,
      new.id,
      null,
      null,
      'Technical scan failed',
      case
        when new.error_code is not null then 'Scan failed with code: ' || left(new.error_code, 120)
        else 'Scan failed before a technical result could be completed.'
      end
    )
    on conflict (organization_id, dedupe_key) do nothing;
  end if;
  return new;
end;
$$;

create trigger scans_failure_notification
after update of status on public.scans
for each row execute function private.guardai_notify_scan_failure();

commit;
