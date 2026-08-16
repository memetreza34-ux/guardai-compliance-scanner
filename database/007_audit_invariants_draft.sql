-- GuardAI lifecycle audit invariant draft
-- NOT an applied migration. Consolidate into the first generated GuardAI migration.
-- Purpose: critical Scan/verification state changes produce Audit Events inside the same DB transaction.

begin;

create or replace function private.audit_scan_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.audit_events (
    organization_id, actor_id, action, target_type, target_id, metadata
  ) values (
    new.organization_id,
    new.requested_by,
    'scan.requested',
    'scan',
    new.id::text,
    jsonb_build_object(
      'targetId', new.target_id,
      'modules', new.requested_modules,
      'scannerVersion', new.scanner_version,
      'contractVersion', new.contract_version
    )
  );
  return new;
end;
$$;

create trigger scans_audit_insert
after insert on public.scans
for each row execute function private.audit_scan_insert();

create or replace function private.audit_scan_status_change()
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
      null,
      'scan.status_changed',
      'scan',
      new.id::text,
      jsonb_build_object(
        'from', old.status,
        'to', new.status,
        'errorCode', new.error_code
      )
    );
  end if;
  return new;
end;
$$;

create trigger scans_audit_status_change
after update of status on public.scans
for each row execute function private.audit_scan_status_change();

create or replace function private.audit_verification_challenge_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.audit_events (
    organization_id, actor_id, action, target_type, target_id, metadata
  ) values (
    new.organization_id,
    new.created_by,
    'target.verification_started',
    'target',
    new.target_id::text,
    jsonb_build_object(
      'challengeId', new.id,
      'method', new.method,
      'recordName', new.dns_record_name,
      'expiresAt', new.expires_at
    )
  );
  return new;
end;
$$;

create trigger target_verification_audit_insert
after insert on public.target_verification_challenges
for each row execute function private.audit_verification_challenge_insert();

create or replace function private.audit_verification_challenge_status()
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
      new.created_by,
      'target.verification_status_changed',
      'target',
      new.target_id::text,
      jsonb_build_object(
        'challengeId', new.id,
        'from', old.status,
        'to', new.status,
        'attemptCount', new.attempt_count
      )
    );
  end if;
  return new;
end;
$$;

create trigger target_verification_audit_status
after update of status on public.target_verification_challenges
for each row execute function private.audit_verification_challenge_status();

-- The challenge token/token_hash is deliberately absent from every Audit Event payload.

commit;
