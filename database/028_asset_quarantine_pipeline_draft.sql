-- GuardAI Asset quarantine + ingestion pipeline draft
-- NOT an applied migration. Consolidate into generated GuardAI staging migrations.
-- Purpose: private upload quarantine, content identity, malware gate and isolated-parser provenance.

begin;

create table public.asset_uploads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  target_id uuid,
  status text not null default 'awaiting_upload',
  pipeline_version text not null,
  quarantine_object_key text not null,
  clean_object_key text,
  file_name text not null,
  declared_media_type text not null,
  declared_byte_length bigint not null,
  detected_media_type text,
  actual_byte_length bigint,
  content_sha256 text,
  malware_verdict text,
  malware_engine_id text,
  malware_engine_version text,
  malware_signature_version text,
  parser_id text,
  parser_version text,
  extracted_text_sha256 text,
  extracted_text_length integer,
  page_count integer,
  created_by uuid not null references auth.users(id),
  upload_expires_at timestamptz not null,
  uploaded_at timestamptz,
  processing_started_at timestamptz,
  completed_at timestamptz,
  error_code text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (quarantine_object_key),
  unique (clean_object_key),
  constraint asset_uploads_target_fk
    foreign key (organization_id, target_id)
    references public.targets(organization_id, id)
    on delete set null,
  constraint asset_uploads_status_allowed check (
    status in ('awaiting_upload','uploaded','processing','clean','infected','rejected','failed','expired')
  ),
  constraint asset_uploads_pipeline_version_format check (pipeline_version ~ '^[0-9]+\.[0-9]+\.[0-9]+$'),
  constraint asset_uploads_quarantine_key_safe check (
    quarantine_object_key ~ '^quarantine/[0-9a-fA-F-]{36}/[0-9a-fA-F-]{36}$'
    and position('..' in quarantine_object_key) = 0
  ),
  constraint asset_uploads_clean_key_safe check (
    clean_object_key is null or (
      clean_object_key ~ '^assets/[0-9a-fA-F-]{36}/[0-9a-fA-F-]{36}$'
      and position('..' in clean_object_key) = 0
    )
  ),
  constraint asset_uploads_file_name_length check (char_length(file_name) between 1 and 180),
  constraint asset_uploads_declared_media_type check (declared_media_type in ('application/pdf','text/plain')),
  constraint asset_uploads_declared_size check (declared_byte_length between 1 and 52428800),
  constraint asset_uploads_detected_media_type check (
    detected_media_type is null or detected_media_type in ('application/pdf','text/plain')
  ),
  constraint asset_uploads_actual_size check (actual_byte_length is null or actual_byte_length between 1 and 52428800),
  constraint asset_uploads_sha_format check (content_sha256 is null or content_sha256 ~ '^[a-f0-9]{64}$'),
  constraint asset_uploads_malware_verdict_allowed check (malware_verdict is null or malware_verdict in ('clean','infected')),
  constraint asset_uploads_extracted_sha_format check (extracted_text_sha256 is null or extracted_text_sha256 ~ '^[a-f0-9]{64}$'),
  constraint asset_uploads_extracted_length check (extracted_text_length is null or extracted_text_length between 0 and 1000000),
  constraint asset_uploads_page_count check (page_count is null or page_count >= 0),
  constraint asset_uploads_error_code_format check (error_code is null or error_code ~ '^[A-Z0-9_:-]{1,100}$'),
  constraint asset_uploads_error_message_length check (error_message is null or char_length(error_message) <= 1000),
  constraint asset_uploads_upload_expiry_order check (upload_expires_at > created_at),
  constraint asset_uploads_observed_metadata_complete check (
    (status = 'awaiting_upload' and detected_media_type is null and actual_byte_length is null and content_sha256 is null)
    or
    (status in ('uploaded','processing','clean','infected','rejected','failed','expired'))
  ),
  constraint asset_uploads_clean_requires_complete_provenance check (
    status <> 'clean' or (
      clean_object_key is not null
      and detected_media_type = declared_media_type
      and actual_byte_length = declared_byte_length
      and content_sha256 is not null
      and malware_verdict = 'clean'
      and malware_engine_id is not null
      and malware_engine_version is not null
      and malware_signature_version is not null
      and parser_id is not null
      and parser_version is not null
      and extracted_text_sha256 is not null
      and extracted_text_length is not null
      and completed_at is not null
      and error_code is null
    )
  ),
  constraint asset_uploads_nonclean_has_no_clean_object check (
    status = 'clean' or clean_object_key is null
  ),
  constraint asset_uploads_infected_never_targets check (
    status <> 'infected' or (malware_verdict = 'infected' and target_id is null)
  ),
  constraint asset_uploads_terminal_rejected_never_targets check (
    status not in ('rejected','failed','expired') or target_id is null
  )
);

create table public.asset_ingestion_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  upload_id uuid not null,
  status text not null default 'queued',
  attempt_count integer not null default 0,
  max_attempts integer not null default 3,
  available_at timestamptz not null default now(),
  leased_at timestamptz,
  lease_expires_at timestamptz,
  worker_id text,
  result_summary jsonb not null default '{}'::jsonb,
  error_code text,
  error_message text,
  completed_at timestamptz,
  failed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (upload_id),
  constraint asset_ingestion_jobs_upload_fk
    foreign key (organization_id, upload_id)
    references public.asset_uploads(organization_id, id)
    on delete cascade,
  constraint asset_ingestion_jobs_status_allowed check (status in ('queued','running','completed','failed','cancelled')),
  constraint asset_ingestion_jobs_attempts check (attempt_count >= 0 and max_attempts between 1 and 10 and attempt_count <= max_attempts),
  constraint asset_ingestion_jobs_lease_pair check (
    (leased_at is null and lease_expires_at is null and worker_id is null)
    or
    (leased_at is not null and lease_expires_at is not null and worker_id is not null and lease_expires_at > leased_at)
  ),
  constraint asset_ingestion_jobs_error_code_format check (error_code is null or error_code ~ '^[A-Z0-9_:-]{1,100}$'),
  constraint asset_ingestion_jobs_error_message_length check (error_message is null or char_length(error_message) <= 1000)
);

create index asset_uploads_org_created_idx
on public.asset_uploads(organization_id, created_at desc);

create index asset_uploads_status_expiry_idx
on public.asset_uploads(status, upload_expires_at);

create index asset_ingestion_jobs_status_available_idx
on public.asset_ingestion_jobs(status, available_at);

create trigger asset_uploads_set_updated_at
before update on public.asset_uploads
for each row execute function private.set_updated_at();

create trigger asset_ingestion_jobs_set_updated_at
before update on public.asset_ingestion_jobs
for each row execute function private.set_updated_at();

create or replace function private.prevent_asset_content_identity_rewrite()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.content_sha256 is not null and new.content_sha256 is distinct from old.content_sha256 then
    raise exception 'Asset content SHA-256 is immutable once observed';
  end if;
  if old.detected_media_type is not null and new.detected_media_type is distinct from old.detected_media_type then
    raise exception 'Asset detected media type is immutable once observed';
  end if;
  if old.actual_byte_length is not null and new.actual_byte_length is distinct from old.actual_byte_length then
    raise exception 'Asset actual byte length is immutable once observed';
  end if;
  if old.malware_verdict is not null and new.malware_verdict is distinct from old.malware_verdict then
    raise exception 'Asset malware verdict is immutable once persisted';
  end if;
  if old.clean_object_key is not null and new.clean_object_key is distinct from old.clean_object_key then
    raise exception 'Asset clean object key is immutable once promoted';
  end if;
  if old.parser_id is not null and (
    new.parser_id is distinct from old.parser_id
    or new.parser_version is distinct from old.parser_version
    or new.extracted_text_sha256 is distinct from old.extracted_text_sha256
  ) then
    raise exception 'Asset parser provenance is immutable once persisted';
  end if;
  return new;
end;
$$;

revoke all on function private.prevent_asset_content_identity_rewrite() from public;

create trigger asset_uploads_prevent_identity_rewrite
before update on public.asset_uploads
for each row execute function private.prevent_asset_content_identity_rewrite();

revoke all on public.asset_uploads, public.asset_ingestion_jobs from anon;
revoke all on public.asset_uploads, public.asset_ingestion_jobs from authenticated;

grant select on public.asset_uploads to authenticated;

alter table public.asset_uploads enable row level security;
alter table public.asset_ingestion_jobs enable row level security;

create policy asset_uploads_select_member
on public.asset_uploads for select
to authenticated
using (private.has_org_role(organization_id, array['owner','admin','member','viewer']::public.guardai_org_role[]));

-- asset_ingestion_jobs intentionally has no authenticated grant/policy.
-- All mutations remain backend-only. Quarantine object bytes, parser output text and
-- malware-engine internal data are never directly browser-readable from PostgreSQL.

commit;
