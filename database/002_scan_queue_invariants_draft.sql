-- GuardAI async scan / tenant invariant draft
-- NOT an applied migration. Fold into the generated GuardAI staging migration later.
-- This draft strengthens the first schema design with database-level tenant consistency,
-- idempotent scan submission and queue constraints.

begin;

alter table public.targets
  add constraint targets_id_organization_unique unique (id, organization_id);

alter table public.scans
  add column requested_modules text[] not null default array['security']::text[],
  add column idempotency_key text,
  add constraint scans_requested_modules_not_empty check (cardinality(requested_modules) > 0),
  add constraint scans_requested_modules_allowed check (
    requested_modules <@ array[
      'security',
      'privacy',
      'accessibility',
      'ai-governance',
      'repository',
      'asset'
    ]::text[]
  ),
  add constraint scans_id_organization_unique unique (id, organization_id),
  add constraint scans_target_same_organization
    foreign key (target_id, organization_id)
    references public.targets(id, organization_id)
    on delete cascade;

create unique index scans_org_idempotency_unique
on public.scans(organization_id, idempotency_key)
where idempotency_key is not null;

alter table public.scan_jobs
  add column payload jsonb not null default '{}'::jsonb,
  add constraint scan_jobs_payload_object check (jsonb_typeof(payload) = 'object'),
  add constraint scan_jobs_job_type_allowed check (
    job_type = any(array[
      'security',
      'privacy',
      'accessibility',
      'ai-governance',
      'repository',
      'asset'
    ]::text[])
  ),
  add constraint scan_jobs_scan_job_type_unique unique (scan_id, job_type),
  add constraint scan_jobs_id_organization_unique unique (id, organization_id),
  add constraint scan_jobs_scan_same_organization
    foreign key (scan_id, organization_id)
    references public.scans(id, organization_id)
    on delete cascade;

alter table public.evidence
  add constraint evidence_id_organization_unique unique (id, organization_id),
  add constraint evidence_scan_same_organization
    foreign key (scan_id, organization_id)
    references public.scans(id, organization_id)
    on delete cascade;

alter table public.findings
  add constraint findings_id_organization_unique unique (id, organization_id),
  add constraint findings_target_same_organization
    foreign key (target_id, organization_id)
    references public.targets(id, organization_id)
    on delete cascade;

alter table public.finding_instances
  add constraint finding_instances_finding_same_organization
    foreign key (finding_id, organization_id)
    references public.findings(id, organization_id)
    on delete cascade,
  add constraint finding_instances_scan_same_organization
    foreign key (scan_id, organization_id)
    references public.scans(id, organization_id)
    on delete cascade;

-- The original single-column foreign keys may remain as redundant defense in depth in the
-- final generated migration, or be removed after the composite constraints are verified.

commit;
