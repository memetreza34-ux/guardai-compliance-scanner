-- GuardAI AI Governance open-review invariant draft
-- NOT an applied migration. Consolidate after 026_* in generated staging migrations.

begin;

create unique index ai_governance_one_open_review_per_system_uidx
on public.ai_governance_reviews(organization_id, ai_system_id)
where status in ('draft', 'submitted', 'reopened');

-- Historical reviewed cycles remain available. A new draft may be created only after
-- the previous cycle reached reviewed. Reopening a historical review while another
-- open cycle exists is rejected by the same invariant.

commit;
