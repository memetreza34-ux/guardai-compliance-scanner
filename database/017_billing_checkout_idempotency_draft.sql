-- GuardAI billing checkout idempotency draft
-- NOT an applied migration. Consolidate into the generated GuardAI staging migration.

begin;

create table public.billing_checkout_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  idempotency_key text not null,
  plan text not null,
  status text not null default 'creating',
  provider_session_id text,
  expires_at timestamptz,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint billing_checkout_idempotency_key_length check (char_length(idempotency_key) between 8 and 200),
  constraint billing_checkout_plan_format check (plan ~ '^[a-z0-9][a-z0-9._-]{1,79}$'),
  constraint billing_checkout_status_allowed check (status in ('creating','ready','completed','expired','failed')),
  constraint billing_checkout_session_state check (
    (status = 'creating' and provider_session_id is null and expires_at is null)
    or
    (status in ('ready','completed','expired') and provider_session_id is not null and expires_at is not null)
    or
    (status = 'failed')
  ),
  unique (organization_id, idempotency_key)
);

-- GuardAI permits only one unresolved provider Checkout per Organization. Stale ready
-- rows are explicitly transitioned to expired before a new request is claimed.
create unique index billing_checkout_one_active_per_org
on public.billing_checkout_requests(organization_id)
where status in ('creating','ready');

create unique index billing_checkout_provider_session_unique
on public.billing_checkout_requests(provider_session_id)
where provider_session_id is not null;

create index billing_checkout_org_created_idx
on public.billing_checkout_requests(organization_id, created_at desc);

create trigger billing_checkout_requests_set_updated_at
before update on public.billing_checkout_requests
for each row execute function private.set_updated_at();

alter table public.billing_checkout_requests enable row level security;
revoke all on public.billing_checkout_requests from anon;
revoke all on public.billing_checkout_requests from authenticated;

commit;
