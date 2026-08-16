-- GuardAI workspace onboarding invariant draft
-- NOT an applied migration. Consolidate into the first generated GuardAI migration later.

begin;

-- Avoid duplicate logical website targets inside one organization while still allowing
-- different paths on the same verified hostname to become distinct targets when desired.
create unique index targets_org_type_canonical_url_unique
on public.targets(organization_id, type, canonical_url)
where canonical_url is not null;

-- Free-plan bootstrap rows created alongside organizations use an internal provider marker
-- until the real billing provider owns the subscription lifecycle.
alter table public.subscriptions
  add constraint subscriptions_provider_length check (char_length(provider) between 1 and 80),
  add constraint subscriptions_plan_length check (char_length(plan) between 1 and 80),
  add constraint subscriptions_status_length check (char_length(status) between 1 and 80);

commit;
