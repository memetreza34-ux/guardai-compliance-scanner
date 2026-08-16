-- GuardAI immutable Scan target snapshot draft
-- NOT an applied migration. Consolidate into the first generated GuardAI migration.
-- The Scan must preserve the target identity that was authorized at submission time so
-- historical Evidence/Reports do not change meaning after later Target edits.

begin;

alter table public.scans
  add column target_snapshot jsonb not null,
  add constraint scans_target_snapshot_object
    check (jsonb_typeof(target_snapshot) = 'object'),
  add constraint scans_target_snapshot_required_fields
    check (
      target_snapshot ? 'id'
      and target_snapshot ? 'type'
      and target_snapshot ? 'displayName'
      and target_snapshot ? 'verificationState'
    );

-- target_snapshot is written once by the backend when a Scan is created. Existing
-- immutable-provenance rules for completed Scans must prevent historical rewrites.

commit;
