# GuardAI Database

This directory contains GuardAI database design sources before the dedicated GuardAI Supabase project is provisioned.

## Critical isolation rule

Do **not** apply GuardAI SQL to the existing connected multi-application Supabase project. GuardAI requires its own project, migration history, staging environment, backups and recovery boundary. See `docs/adr/0001-dedicated-supabase-postgres-auth.md`.

## Current files

- `001_guardai_core_schema_draft.sql` — reviewed schema/RLS design source; **not an applied migration**.

## Promotion to a real migration

When the dedicated GuardAI Supabase project and Supabase CLI are available:

1. create/link the dedicated GuardAI staging project,
2. verify the Supabase CLI version and current migration commands with `--help`,
3. create a migration using `supabase migration new <descriptive-name>`,
4. copy/review the approved SQL design into that generated migration,
5. apply it to local/staging only,
6. run database/security advisors,
7. test RLS with multiple users and organizations,
8. test owner/admin/member/viewer access separately,
9. verify that cross-tenant reads and writes fail,
10. verify worker-only tables are unavailable to browser roles,
11. generate TypeScript database types,
12. commit the generated migration and types,
13. only then promote through the normal staging → production release process.

## RLS rules

- Every exposed customer-data table has RLS enabled.
- `anon` receives no GuardAI customer-data access by default.
- `authenticated` is authentication, not authorization.
- Organization access is membership-scoped.
- Authorization roles are stored in `memberships`, not user-editable metadata.
- UPDATE policies require appropriate SELECT access plus `USING` and `WITH CHECK` conditions.
- Privileged helper functions live in the non-exposed `private` schema and have explicit EXECUTE grants.
- Server-side authorization is still required for privileged operations even when RLS provides defense in depth.

## Current browser/server split

The initial draft intentionally makes the browser read-mostly:

- users may manage their own profile,
- members may read tenant data allowed by membership,
- owner/admin may read billing/audit state,
- queue state is server/worker-only,
- creation and mutation of organizations, memberships, targets, scans, evidence, findings, subscriptions and audit events is intended to pass through GuardAI backend authorization first.

This split can be relaxed later only when a concrete client-side use case has its own tested RLS policy.
