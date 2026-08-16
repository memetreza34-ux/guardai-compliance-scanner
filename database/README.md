# GuardAI Database

This directory contains GuardAI database design sources before the dedicated GuardAI Supabase project is provisioned.

## Critical isolation rule

Do **not** apply GuardAI SQL to the existing connected multi-application Supabase project. GuardAI requires its own project, migration history, staging environment, backups and recovery boundary. See:

- `docs/adr/0001-dedicated-supabase-postgres-auth.md`
- `docs/adr/0002-native-postgres-backend-transactions.md`

## Current design files

All files below are **design sources, not applied migrations**:

1. `001_guardai_core_schema_draft.sql` — core entities + RLS.
2. `002_scan_queue_invariants_draft.sql` — tenant composite FKs, requested modules, idempotency and queue invariants.
3. `003_worker_result_invariants_draft.sql` — worker summaries/timestamps + duplicate prevention for Evidence/Finding instances.
4. `004_target_verification_challenges_draft.sql` — backend-only DNS TXT ownership challenges, expiry and attempt limits.
5. `005_workspace_onboarding_invariants_draft.sql` — canonical Target uniqueness and subscription field constraints.
6. `006_entitlements_usage_draft.sql` — price-neutral plan capabilities, monthly usage counters and Scan-scoped reservations.

Before the first real GuardAI staging migration, these drafts must be consolidated and reviewed as one coherent initial schema rather than blindly applied as a historical production sequence.

## Promotion to a real migration

When the dedicated GuardAI Supabase project and Supabase CLI are available:

1. create/link a dedicated GuardAI staging project,
2. verify the installed Supabase CLI and migration commands,
3. generate the real migration with the CLI,
4. consolidate/review approved SQL design sources into it,
5. apply only to local/staging first,
6. run Supabase security/performance advisors,
7. test owner/admin/member/viewer permissions,
8. test multiple users and Organizations,
9. prove cross-tenant reads/writes fail,
10. prove composite tenant FKs reject mismatched Organization/Target/Scan relationships,
11. prove worker/challenge/usage tables are unavailable to browser roles,
12. test concurrent idempotent Scan creation,
13. test concurrent `SKIP LOCKED` Job claiming,
14. test expired lease reclaim + stale-worker result rejection,
15. test retry exhaustion + permanent failure cancellation,
16. prove repeated Worker completion cannot duplicate Evidence/Finding instances,
17. prove only a successful unexpired DNS challenge can set a Target `verified`,
18. test DNS challenge expiry/attempt limits,
19. test duplicate Target canonical URL rejection,
20. test entitlement/usage reservation races at monthly boundaries,
21. test reservation consume/release idempotency,
22. generate TypeScript DB types,
23. commit generated migration/types,
24. only then promote staging → production.

## RLS / authorization rules

- Every exposed customer-data table has RLS enabled.
- `anon` receives no GuardAI customer-data access by default.
- `authenticated` means identity is known; it does **not** mean tenant authorization is granted.
- Organization data is membership-scoped.
- Roles live in `memberships`, not user-editable metadata.
- Privileged helpers live in non-exposed `private` schema.
- Privileged mutations still pass through backend authorization even with RLS defense in depth.
- Composite FKs additionally prevent storing cross-tenant relationships by programming mistake.
- Verification, Job and Usage-reservation state stays backend/worker-only.

## Current backend transaction boundary

Repository/service code is already prepared for:

- atomic Organization + Owner + initial subscription + audit creation,
- Website Target creation + audit event,
- DNS TXT target-verification challenges,
- verified-target requirement before persistent scanning,
- atomic Scan + Jobs creation,
- organization-scoped Scan idempotency,
- Job claim/lease/renew/reclaim with `FOR UPDATE SKIP LOCKED`,
- bounded retry + terminal failure behavior,
- atomic Evidence/Finding persistence,
- deterministic Evidence hashes and Finding fingerprints,
- tenant-scoped Scan/Job/Evidence/Finding reads,
- configurable entitlement checks,
- concurrency-safe monthly Usage reservations,
- reservation consume/release lifecycle.

The browser never receives `DATABASE_URL`, database passwords, target challenge token hashes, Worker identities/leases or direct entitlement mutation access.
