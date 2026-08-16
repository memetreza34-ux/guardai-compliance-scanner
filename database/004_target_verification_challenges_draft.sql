-- GuardAI target verification challenge draft
-- NOT an applied migration. Consolidate into the first generated GuardAI migration later.
-- Verification challenges are backend-only security records.

begin;

create table public.target_verification_challenges (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  target_id uuid not null,
  method text not null default 'dns_txt',
  status text not null default 'pending',
  token_hash text not null,
  dns_record_name text not null,
  attempt_count integer not null default 0,
  expires_at timestamptz not null,
  last_checked_at timestamptz,
  verified_at timestamptz,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint target_verification_same_organization
    foreign key (target_id, organization_id)
    references public.targets(id, organization_id)
    on delete cascade,
  constraint target_verification_method_allowed check (method in ('dns_txt')),
  constraint target_verification_status_allowed check (status in ('pending','verified','expired','failed')),
  constraint target_verification_token_hash check (token_hash ~ '^[a-f0-9]{64}$'),
  constraint target_verification_attempt_count check (attempt_count >= 0 and attempt_count <= 20),
  constraint target_verification_record_name_length check (char_length(dns_record_name) between 1 and 253)
);

create index target_verification_pending_idx
on public.target_verification_challenges(target_id, status, expires_at desc);

create unique index target_verification_one_pending_per_target
on public.target_verification_challenges(target_id)
where status = 'pending';

create trigger target_verification_challenges_set_updated_at
before update on public.target_verification_challenges
for each row execute function private.set_updated_at();

alter table public.target_verification_challenges enable row level security;
revoke all on public.target_verification_challenges from anon;
revoke all on public.target_verification_challenges from authenticated;

-- No browser policy is intentionally created. Creation/check/finalization runs through
-- GuardAI backend authorization and native PostgreSQL transactions.

commit;
