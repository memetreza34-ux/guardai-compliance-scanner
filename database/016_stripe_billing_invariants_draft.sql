-- GuardAI Stripe billing invariants draft
-- NOT an applied migration. Consolidate into the generated GuardAI staging migration.
-- No prices or paid plan limits are seeded here.

begin;

alter table public.subscriptions
  add column provider_price_id text,
  add column cancel_at_period_end boolean not null default false,
  add column provider_state_updated_at timestamptz,
  add constraint subscriptions_provider_ids_consistent check (
    (provider = 'internal')
    or
    (provider = 'stripe' and provider_customer_id is not null)
  );

create unique index subscriptions_provider_customer_unique
on public.subscriptions(provider, provider_customer_id)
where provider_customer_id is not null;

create unique index subscriptions_provider_subscription_unique
on public.subscriptions(provider, provider_subscription_id)
where provider_subscription_id is not null;

create table public.billing_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_event_id text not null,
  event_type text not null,
  provider_created_at timestamptz,
  livemode boolean not null default false,
  payload_hash text not null,
  status text not null default 'received',
  organization_id uuid references public.organizations(id) on delete set null,
  error_code text,
  error_message text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint billing_webhook_provider_length check (char_length(provider) between 1 and 40),
  constraint billing_webhook_event_id_length check (char_length(provider_event_id) between 1 and 255),
  constraint billing_webhook_event_type_length check (char_length(event_type) between 1 and 160),
  constraint billing_webhook_payload_hash check (payload_hash ~ '^[a-f0-9]{64}$'),
  constraint billing_webhook_status_allowed check (status in ('received','processing','processed','ignored','failed')),
  unique (provider, provider_event_id)
);

create index billing_webhook_events_status_received_idx
on public.billing_webhook_events(status, received_at asc);

create index billing_webhook_events_org_received_idx
on public.billing_webhook_events(organization_id, received_at desc)
where organization_id is not null;

create trigger billing_webhook_events_set_updated_at
before update on public.billing_webhook_events
for each row execute function private.set_updated_at();

alter table public.billing_webhook_events enable row level security;
revoke all on public.billing_webhook_events from anon;
revoke all on public.billing_webhook_events from authenticated;

-- Provider webhook payloads are intentionally not stored wholesale in the customer database.
-- GuardAI stores the verified provider event ID/type, a SHA-256 payload hash and bounded
-- processing metadata. This minimizes payment-related data retention while preserving
-- replay/deduplication evidence.

commit;
