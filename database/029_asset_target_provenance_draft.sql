-- GuardAI verified Asset Target provenance draft
-- NOT an applied migration. Depends on 028_asset_quarantine_pipeline_draft.sql.

begin;

create unique index asset_uploads_target_once_idx
on public.asset_uploads(target_id)
where target_id is not null;

create or replace function private.validate_asset_target_provenance()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  upload_id uuid;
  upload_row public.asset_uploads%rowtype;
begin
  if new.type <> 'asset' then
    return new;
  end if;

  if new.provider is distinct from 'guardai-upload'
     or new.canonical_url is not null
     or new.verification_state <> 'verified'::public.guardai_verification_state then
    raise exception 'Asset Target must be a verified guardai-upload Target without canonical URL';
  end if;

  begin
    upload_id := (new.verification_metadata->>'assetUploadId')::uuid;
  exception when others then
    raise exception 'Asset Target requires valid assetUploadId provenance';
  end;

  select *
    into upload_row
    from public.asset_uploads
   where id = upload_id
     and organization_id = new.organization_id
     and status = 'clean';

  if not found then
    raise exception 'Asset Target requires a clean Asset upload in the same Organization';
  end if;

  if new.verification_metadata->>'sha256' is distinct from upload_row.content_sha256
     or new.verification_metadata->>'mediaType' is distinct from upload_row.detected_media_type
     or new.verification_metadata->>'pipelineVersion' is distinct from upload_row.pipeline_version then
    raise exception 'Asset Target provenance does not match clean upload provenance';
  end if;

  return new;
end;
$$;

revoke all on function private.validate_asset_target_provenance() from public;

create trigger targets_validate_asset_provenance
before insert or update of type, provider, canonical_url, verification_state, verification_metadata
on public.targets
for each row execute function private.validate_asset_target_provenance();

create or replace function private.validate_asset_upload_target_link()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  target_row public.targets%rowtype;
begin
  if new.target_id is null or new.target_id is not distinct from old.target_id then
    return new;
  end if;

  if new.status <> 'clean' then
    raise exception 'Only clean Asset uploads may link to Targets';
  end if;

  select *
    into target_row
    from public.targets
   where id = new.target_id
     and organization_id = new.organization_id
     and type = 'asset'
     and provider = 'guardai-upload'
     and verification_state = 'verified'::public.guardai_verification_state;

  if not found then
    raise exception 'Asset upload Target link requires a verified Asset Target in the same Organization';
  end if;

  if target_row.verification_metadata->>'assetUploadId' is distinct from new.id::text
     or target_row.verification_metadata->>'sha256' is distinct from new.content_sha256 then
    raise exception 'Asset upload Target link provenance mismatch';
  end if;

  return new;
end;
$$;

revoke all on function private.validate_asset_upload_target_link() from public;

create trigger asset_uploads_validate_target_link
before update of target_id on public.asset_uploads
for each row execute function private.validate_asset_upload_target_link();

commit;
