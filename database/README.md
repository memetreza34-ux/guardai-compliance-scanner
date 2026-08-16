# GuardAI Database

This directory contains GuardAI database design sources before the dedicated GuardAI Supabase project is provisioned.

## Critical isolation rule

Do **not** apply GuardAI SQL to the existing connected multi-application Supabase project. GuardAI requires its own project, migration history, staging environment, backups and recovery boundary. See:

- `docs/adr/0001-dedicated-supabase-postgres-auth.md`
- `docs/adr/0002-native-postgres-backend-transactions.md`

## Current design files

- `001_guardai_core_schema_draft.sql` — core entities + RLS design; **not an applied migration**.
- `002_scan_queue_invariants_draft.sql` — tenant composite FKs, requested modules, idempotency and queue invariants; **not an applied migration**.
- `003_worker_result_invariants_draft.sql` — worker result timestamps/summary plus duplicate-prevention constraints for Evidence/Finding instances; **not an applied migration**.

These files are design sources. Before the first real GuardAI staging migration they should be consolidated/reviewed rather than blindly applied as a production sequence.

## Promotion to a real migration

When the dedicated GuardAI Supabase project and Supabase CLI are available:

1. create/link the dedicated GuardAI staging project,
2. verify the Supabase CLI version and current migration commands with `--help`,
3. create a migration using `supabase migration new <descriptive-name>`,
4. consolidate/review all approved SQL design sources into that generated migration,
5. apply it to local/staging only,
6. run database/security advisors,
7. test RLS with multiple users and organizations,
8. test owner/admin/member/viewer access separately,
9. verify that cross-tenant reads and writes fail,
10. verify composite tenant foreign keys reject mismatched organization/target/scan IDs,
11. verify worker-only tables are unavailable to browser roles,
12. test idempotent Scan + Job creation under concurrent requests,
13. test concurrent job claiming with row locks,
14. test expired lease reclaim and stale-worker completion rejection,
15. test retry exhaustion and permanent-error cancellation,
16. verify duplicate worker completion cannot duplicate Evidence/Finding instances,
17. generate TypeScript database types,
18. commit the generated migration and types,
19. only then promote through the normal staging → production release process.

## RLS rules

- Every exposed customer-data table has RLS enabled.
- `anon` receives no GuardAI customer-data access by default.
- `authenticated` is authentication, not authorization.
- Organization access is membership-scoped.
- Authorization roles are stored in `memberships`, not user-editable metadata.
- UPDATE policies require appropriate SELECT access plus `USING` and `WITH CHECK` conditions.
- Privileged helper functions live in the non-exposed `private` schema and have explicit EXECUTE grants.
- Server-side authorization is still required for privileged operations even when RLS provides defense in depth.
- Composite foreign keys additionally prevent cross-tenant relationships from being stored by mistake.

## Current browser/server split

The initial design intentionally makes the browser read-mostly:

- users may manage their own profile,
- members may read tenant data allowed by membership,
- owner/admin may read billing/audit state,
- queue state is server/worker-only,
- creation and mutation of organizations, memberships, targets, scans, evidence, findings, subscriptions and audit events is intended to pass through GuardAI backend authorization first.

## Backend transaction boundary

The GuardAI API/worker path uses repository contracts backed by native PostgreSQL transactions. Current repository/worker work includes:

- membership lookup,
- tenant authorization service,
- verified-target requirement before persistent scans,
- atomic Scan + Job submission,
- idempotency handling,
- worker job claiming with `FOR UPDATE SKIP LOCKED`,
- active lease ownership and renewal,
- bounded retry backoff and permanent-failure policy,
- atomic worker completion with Evidence + Finding persistence,
- deterministic Evidence hashing and Finding fingerprints,
- duplicate prevention for repeated completion attempts,
- tenant-scoped Scan + Job + Evidence + Finding status reads.

The browser never receives `DATABASE_URL` or database passwords.
