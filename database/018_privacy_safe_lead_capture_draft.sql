-- GuardAI privacy-safe lead capture draft
-- NOT an applied migration. Consolidate into the generated GuardAI staging migration.
-- Public lead capture remains disabled until an explicit privacy-notice version and
-- retention policy are configured for the environment.

begin;

create type public.guardai_lead_status as enum ('received', 'contacted', 'closed', 'spam', 'deleted');
create type public.guardai_marketing_consent_status as enum (
  'not_requested',
  'pending_confirmation',
  'confirmed',
  'withdrawn'
);

create table public.lead_submissions (
  id uuid primary key default gen_random_uuid(),
  idempotency_key text not null unique,
  email text not null,
  name text,
  company text,
  message text,
  source text not null default 'website_contact',
  status public.guardai_lead_status not null default 'received',
  privacy_notice_version text not null,
  contact_requested_at timestamptz not null default now(),
  marketing_consent_status public.guardai_marketing_consent_status not null default 'not_requested',
  marketing_consent_version text,
  marketing_consent_requested_at timestamptz,
  marketing_consent_confirmed_at timestamptz,
  marketing_consent_withdrawn_at timestamptz,
  marketing_confirmation_token_hash text,
  marketing_confirmation_expires_at timestamptz,
  marketing_unsubscribe_token_hash text,
  retention_expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lead_idempotency_key_length check (char_length(idempotency_key) between 8 and 200),
  constraint lead_email_length check (char_length(email) between 3 and 320),
  constraint lead_email_normalized check (email = lower(btrim(email))),
  constraint lead_name_length check (name is null or char_length(name) between 1 and 120),
  constraint lead_company_length check (company is null or char_length(company) between 1 and 160),
  constraint lead_message_length check (message is null or char_length(message) between 1 and 2000),
  constraint lead_source_allowed check (source in ('website_contact')),
  constraint lead_privacy_notice_version_length check (char_length(privacy_notice_version) between 1 and 120),
  constraint lead_marketing_consent_consistency check (
    (
      marketing_consent_status = 'not_requested'
      and marketing_consent_version is null
      and marketing_consent_requested_at is null
      and marketing_consent_confirmed_at is null
      and marketing_consent_withdrawn_at is null
      and marketing_confirmation_token_hash is null
      and marketing_confirmation_expires_at is null
      and marketing_unsubscribe_token_hash is null
    )
    or
    (
      marketing_consent_status = 'pending_confirmation'
      and marketing_consent_version is not null
      and marketing_consent_requested_at is not null
      and marketing_consent_confirmed_at is null
      and marketing_consent_withdrawn_at is null
      and marketing_confirmation_token_hash ~ '^[a-f0-9]{64}$'
      and marketing_confirmation_expires_at is not null
      and marketing_unsubscribe_token_hash is null
    )
    or
    (
      marketing_consent_status = 'confirmed'
      and marketing_consent_version is not null
      and marketing_consent_requested_at is not null
      and marketing_consent_confirmed_at is not null
      and marketing_consent_withdrawn_at is null
      and marketing_confirmation_token_hash is null
      and marketing_confirmation_expires_at is null
      and marketing_unsubscribe_token_hash ~ '^[a-f0-9]{64}$'
    )
    or
    (
      marketing_consent_status = 'withdrawn'
      and marketing_consent_version is not null
      and marketing_consent_requested_at is not null
      and marketing_consent_confirmed_at is not null
      and marketing_consent_withdrawn_at is not null
      and marketing_confirmation_token_hash is null
      and marketing_confirmation_expires_at is null
      and marketing_unsubscribe_token_hash is null
    )
  )
);

create index lead_submissions_status_created_idx
on public.lead_submissions(status, created_at desc);

create index lead_submissions_retention_idx
on public.lead_submissions(retention_expires_at)
where status <> 'deleted';

create unique index lead_marketing_confirmation_hash_unique
on public.lead_submissions(marketing_confirmation_token_hash)
where marketing_confirmation_token_hash is not null;

create unique index lead_marketing_unsubscribe_hash_unique
on public.lead_submissions(marketing_unsubscribe_token_hash)
where marketing_unsubscribe_token_hash is not null;

create trigger lead_submissions_set_updated_at
before update on public.lead_submissions
for each row execute function private.set_updated_at();

alter table public.lead_submissions enable row level security;
revoke all on public.lead_submissions from anon;
revoke all on public.lead_submissions from authenticated;

-- Public submission/confirmation/withdrawal happens only through tightly scoped backend APIs.
-- No raw IP address, User-Agent, advertising profile or unrelated browsing metadata is stored.
-- Retention cleanup later replaces personal fields with deletion markers or removes rows according
-- to the approved GuardAI retention/DSAR policy.

commit;
