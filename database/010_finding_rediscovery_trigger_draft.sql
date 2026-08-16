-- GuardAI Finding rediscovery invariant draft
-- NOT an applied migration. Consolidate into the first generated GuardAI migration.
-- A new scanner observation reopens only resolved Findings; accepted-risk is preserved.

begin;

create or replace function private.reopen_resolved_finding_on_observation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  previous_status text;
begin
  select status
    into previous_status
    from public.findings
   where id = new.finding_id
     and organization_id = new.organization_id
   for update;

  if previous_status = 'resolved' then
    update public.findings
       set status = 'open',
           status_reason = 'Rediscovered by scanner',
           status_updated_at = now(),
           status_updated_by = null,
           last_seen_at = now(),
           updated_at = now()
     where id = new.finding_id
       and organization_id = new.organization_id;

    insert into public.finding_status_events (
      organization_id,
      finding_id,
      scan_id,
      from_status,
      to_status,
      reason,
      actor_id
    ) values (
      new.organization_id,
      new.finding_id,
      new.scan_id,
      'resolved',
      'open',
      'Rediscovered by scanner',
      null
    );
  elsif previous_status in ('open', 'accepted_risk') then
    update public.findings
       set last_seen_at = now(),
           updated_at = now()
     where id = new.finding_id
       and organization_id = new.organization_id;
  end if;

  return new;
end;
$$;

create trigger finding_instances_reopen_resolved
after insert on public.finding_instances
for each row execute function private.reopen_resolved_finding_on_observation();

-- accepted_risk is intentionally preserved on rediscovery. Scanner evidence may update
-- last_seen_at, but only an authorized human can withdraw an explicit risk acceptance.

commit;
