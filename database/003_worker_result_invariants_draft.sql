-- GuardAI worker result / evidence invariant draft
-- NOT an applied migration. Consolidate into the first generated GuardAI migration later.
-- Adds durable worker-result metadata and duplicate-prevention constraints.

begin;

alter table public.scan_jobs
  add column result_summary jsonb not null default '{}'::jsonb,
  add column completed_at timestamptz,
  add column failed_at timestamptz,
  add constraint scan_jobs_result_summary_object check (jsonb_typeof(result_summary) = 'object');

create unique index evidence_scan_detector_content_unique
on public.evidence(scan_id, detector_id, type, source, content_hash)
where content_hash is not null;

alter table public.finding_instances
  add constraint finding_instances_finding_scan_unique unique (finding_id, scan_id);

-- A completed job must no longer hold an active lease. The application transaction
-- clears lease timestamps on completion/failure/retry; worker_id remains as the
-- last executor for audit/debugging.

commit;
