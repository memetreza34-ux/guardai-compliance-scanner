-- GuardAI public Trust Center publication draft
-- NOT an applied migration. Consolidate into the first generated GuardAI migration.
-- A public publication references an immutable technical report snapshot; it never points
-- at mutable live Scan/Target data and never grants direct browser access to Evidence rows.

begin;

create type public.guardai_trust_publication_status as enum ('published', 'revoked');

alter table public.report_snapshots
  add constraint report_snapshots_id_organization_unique unique (id, organization_id);

create table public.trust_publications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  target_id uuid not null,
  report_snapshot_id uuid not null,
  public_slug text not null unique,
  organization_name_snapshot text not null,
  status public.guardai_trust_publication_status not null default 'published',
  created_by uuid not null references auth.users(id),
  published_at timestamptz not null default now(),
  revoked_by uuid references auth.users(id),
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trust_publications_target_same_org
    foreign key (target_id, organization_id)
    references public.targets(id, organization_id)
    on delete cascade,
  constraint trust_publications_report_same_org
    foreign key (report_snapshot_id, organization_id)
    references public.report_snapshots(id, organization_id)
    on delete restrict,
  constraint trust_publications_slug_format
    check (public_slug ~ '^[A-Za-z0-9_-]{24,80}$'),
  constraint trust_publications_org_name_length
    check (char_length(btrim(organization_name_snapshot)) between 1 and 160),
  constraint trust_publications_revocation_state
    check (
      (status = 'published' and revoked_at is null and revoked_by is null)
      or (status = 'revoked' and revoked_at is not null and revoked_by is not null)
    )
);

create unique index trust_publications_active_report_unique
on public.trust_publications(organization_id, report_snapshot_id)
where status = 'published';

create index trust_publications_org_created_idx
on public.trust_publications(organization_id, created_at desc, id desc);

alter table public.trust_publications enable row level security;
revoke all on public.trust_publications from anon;
revoke all on public.trust_publications from authenticated;

-- Publication mutation and public projection are backend-only. The public API receives
-- an intentionally curated response, never a raw report snapshot or customer table row.

create or replace function private.guardai_protect_trust_publication_identity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.organization_id is distinct from new.organization_id
     or old.target_id is distinct from new.target_id
     or old.report_snapshot_id is distinct from new.report_snapshot_id
     or old.public_slug is distinct from new.public_slug
     or old.organization_name_snapshot is distinct from new.organization_name_snapshot
     or old.created_by is distinct from new.created_by
     or old.published_at is distinct from new.published_at
     or old.created_at is distinct from new.created_at then
    raise exception 'GuardAI trust publication identity is immutable.' using errcode = '55000';
  end if;
  return new;
end;
$$;

create trigger trust_publications_identity_immutable
before update on public.trust_publications
for each row execute function private.guardai_protect_trust_publication_identity();

create trigger trust_publications_set_updated_at
before update on public.trust_publications
for each row execute function private.set_updated_at();

create or replace function private.guardai_audit_trust_publication()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.audit_events (
      organization_id, actor_id, action, target_type, target_id, metadata
    ) values (
      new.organization_id,
      new.created_by,
      'trust.publication_published',
      'trust_publication',
      new.id::text,
      jsonb_build_object(
        'reportSnapshotId', new.report_snapshot_id,
        'targetId', new.target_id
      )
    );
    return new;
  end if;

  if old.status = 'published' and new.status = 'revoked' then
    insert into public.audit_events (
      organization_id, actor_id, action, target_type, target_id, metadata
    ) values (
      new.organization_id,
      new.revoked_by,
      'trust.publication_revoked',
      'trust_publication',
      new.id::text,
      jsonb_build_object(
        'reportSnapshotId', new.report_snapshot_id,
        'targetId', new.target_id
      )
    );
  end if;
  return new;
end;
$$;

create trigger trust_publications_audit_insert
after insert on public.trust_publications
for each row execute function private.guardai_audit_trust_publication();

create trigger trust_publications_audit_revoke
after update of status on public.trust_publications
for each row execute function private.guardai_audit_trust_publication();

commit;
