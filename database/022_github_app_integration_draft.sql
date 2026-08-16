-- GuardAI GitHub App integration draft
-- NOT an applied migration. Installation access tokens are intentionally never stored.

begin;

create type public.guardai_integration_status as enum ('active', 'suspended', 'deleted');

create table public.github_installation_states (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  token_hash text not null unique,
  created_by uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  constraint github_install_state_hash check (token_hash ~ '^[a-f0-9]{64}$'),
  constraint github_install_state_expiry check (expires_at > created_at)
);

create index github_install_states_org_expiry_idx
on public.github_installation_states(organization_id, expires_at desc);

create table public.github_installations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  installation_id bigint not null unique,
  account_id bigint not null,
  account_login text not null,
  account_type text not null,
  repository_selection text,
  status public.guardai_integration_status not null default 'active',
  installed_by uuid not null references auth.users(id),
  installed_at timestamptz not null default now(),
  suspended_at timestamptz,
  deleted_at timestamptz,
  last_synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint github_installation_account_login_length check (char_length(account_login) between 1 and 255),
  constraint github_installation_account_type_allowed check (account_type in ('User','Organization','Enterprise')),
  constraint github_installation_repo_selection_allowed check (
    repository_selection is null or repository_selection in ('all','selected')
  ),
  constraint github_installation_status_consistency check (
    (status = 'active' and deleted_at is null)
    or (status = 'suspended' and suspended_at is not null and deleted_at is null)
    or (status = 'deleted' and deleted_at is not null)
  )
);

create unique index github_installations_one_active_per_org
on public.github_installations(organization_id)
where status <> 'deleted';

create index github_installations_org_idx
on public.github_installations(organization_id, created_at desc);

create table public.integration_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  delivery_id text not null,
  event_type text not null,
  payload_hash text not null,
  status text not null default 'received',
  organization_id uuid references public.organizations(id) on delete set null,
  error_code text,
  error_message text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint integration_webhook_provider_length check (char_length(provider) between 1 and 40),
  constraint integration_webhook_delivery_length check (char_length(delivery_id) between 1 and 255),
  constraint integration_webhook_event_length check (char_length(event_type) between 1 and 160),
  constraint integration_webhook_hash check (payload_hash ~ '^[a-f0-9]{64}$'),
  constraint integration_webhook_status_allowed check (status in ('received','processing','processed','ignored','failed')),
  unique (provider, delivery_id)
);

create index integration_webhook_events_status_idx
on public.integration_webhook_events(provider, status, received_at asc);

create trigger github_installations_set_updated_at
before update on public.github_installations
for each row execute function private.set_updated_at();

create trigger integration_webhook_events_set_updated_at
before update on public.integration_webhook_events
for each row execute function private.set_updated_at();

alter table public.github_installation_states enable row level security;
alter table public.github_installations enable row level security;
alter table public.integration_webhook_events enable row level security;

revoke all on public.github_installation_states from anon;
revoke all on public.github_installation_states from authenticated;
revoke all on public.github_installations from anon;
revoke all on public.github_installations from authenticated;
revoke all on public.integration_webhook_events from anon;
revoke all on public.integration_webhook_events from authenticated;

grant select on public.github_installations to authenticated;
create policy github_installations_select_member
on public.github_installations for select
to authenticated
using (private.has_org_role(
  organization_id,
  array['owner','admin','member','viewer']::public.guardai_org_role[]
));

-- State tokens and webhook inbox remain backend-only. Installation tokens do not exist in schema.

commit;
