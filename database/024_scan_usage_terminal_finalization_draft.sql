-- GuardAI Scan usage-reservation terminal finalization draft
-- NOT an applied migration. Must be consolidated after 006_entitlements_usage_draft.sql.
-- A paid Scan reserves usage before its queue transaction commits. This trigger ensures
-- every terminal Scan transition finalizes the reservation exactly once regardless of
-- which application/worker path produced the terminal status.

begin;

create or replace function private.guardai_finalize_scan_usage_reservations()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  reservation record;
  outcome text;
begin
  if new.status = old.status then
    return new;
  end if;

  if new.status = 'completed' then
    outcome := 'consume';
  elsif new.status in ('failed', 'cancelled') then
    outcome := 'release';
  else
    return new;
  end if;

  for reservation in
    select id, capability, units, period_start
      from public.usage_reservations
     where organization_id = new.organization_id
       and scan_id = new.id
       and status = 'reserved'
     order by capability asc
     for update
  loop
    update public.organization_usage_monthly
       set reserved_units = greatest(0, reserved_units - reservation.units),
           used_units = used_units + case when outcome = 'consume' then reservation.units else 0 end,
           updated_at = now()
     where organization_id = new.organization_id
       and capability = reservation.capability
       and period_start = reservation.period_start;

    if not found then
      raise exception 'GuardAI usage counter row missing for reservation %', reservation.id
        using errcode = '23514';
    end if;

    update public.usage_reservations
       set status = case when outcome = 'consume' then 'consumed' else 'released' end,
           updated_at = now()
     where id = reservation.id
       and organization_id = new.organization_id
       and scan_id = new.id
       and status = 'reserved';
  end loop;

  return new;
end;
$$;

revoke all on function private.guardai_finalize_scan_usage_reservations() from public;
revoke all on function private.guardai_finalize_scan_usage_reservations() from anon;
revoke all on function private.guardai_finalize_scan_usage_reservations() from authenticated;

create trigger scans_finalize_usage_on_terminal_status
after update of status on public.scans
for each row
when (
  old.status is distinct from new.status
  and new.status in ('completed', 'failed', 'cancelled')
)
execute function private.guardai_finalize_scan_usage_reservations();

commit;
