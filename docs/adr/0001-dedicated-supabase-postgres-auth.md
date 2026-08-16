# ADR 0001 — Dedicated Supabase/Postgres/Auth stack for GuardAI MVP

- **Status:** Accepted for MVP architecture
- **Date:** 2026-08-16
- **Scope:** GuardAI backend persistence, authentication and tenant authorization foundation

## Context

The GuardAI master guide already requires PostgreSQL, authentication, organizations/workspaces, memberships, Row Level Security consideration, object storage and later asynchronous jobs.

A connected Supabase account already contains an active project, but its schema clearly belongs to unrelated applications. Reusing that database for GuardAI would create unnecessary blast radius, migration coupling, permission complexity and operational ambiguity.

## Decision

GuardAI will use a **dedicated Supabase project** for the MVP rather than sharing the existing multi-application project.

Planned responsibilities:

- Supabase Auth for user identity/session lifecycle,
- PostgreSQL as GuardAI's canonical transactional database,
- Row Level Security as defense in depth for tenant-owned rows exposed through the Data API,
- Supabase Storage only where it fits GuardAI evidence/report artifacts,
- database migrations committed to the GuardAI repository,
- server-side authorization remains mandatory even when RLS also protects rows.

## Non-negotiable security rules

1. Never put a Supabase `service_role`/secret key in Vite/browser environment variables.
2. Browser code may use only the project URL and publishable client key intended for public clients.
3. Authorization data must not trust user-editable profile/user metadata.
4. Every exposed customer-data table must have RLS enabled before browser access is granted.
5. Policies must be tenant-aware; `authenticated` alone is not authorization.
6. UPDATE policies require both ownership `USING` and `WITH CHECK` rules where applicable.
7. Backend routes must independently authorize organization/workspace access for privileged operations.
8. GuardAI gets its own project, backups, migration history and production lifecycle.
9. Production and staging must not share customer data.
10. Cloud creation is not performed implicitly; project/branch cost and organization selection are confirmed when deployment setup reaches that step.

## Initial GuardAI database scope

The first schema iteration will cover:

- profiles,
- organizations,
- memberships,
- targets,
- scans,
- scan_jobs,
- evidence,
- findings,
- finding_instances,
- rules,
- rule_versions,
- legal_sources,
- subscriptions,
- audit_events.

The schema must follow the canonical data model in `docs/GUARDAI_MASTER_BUILD_GUIDE.md`.

## Auth model

MVP roles:

```text
owner
admin
member
viewer
```

Membership is organization-scoped. Role checks must derive from server-controlled membership records, not editable user profile data.

## Why not reuse the existing connected Supabase project?

- unrelated application tables already exist,
- shared migrations would couple unrelated products,
- least-privilege boundaries become harder to reason about,
- accidental cross-product access/migration damage would have a larger blast radius,
- GuardAI needs its own staging/production and recovery story.

## Consequences

### Positive

- faster MVP path for React + Postgres + Auth,
- strong Postgres/RLS foundation,
- clear product isolation,
- one dedicated migration/audit boundary for GuardAI.

### Tradeoffs

- another cloud project to operate,
- vendor-specific Auth/Storage integration,
- must preserve an abstraction boundary so scanner/rule logic does not depend directly on Supabase APIs,
- project creation may have cost implications and therefore remains an explicit deployment action.

## Implementation order

1. keep current scanner cost gate closed by default,
2. prepare schema/auth design in repository,
3. create a dedicated GuardAI Supabase project when cloud provisioning is explicitly reached,
4. configure staging first,
5. apply schema and RLS,
6. run security/performance advisors,
7. generate database TypeScript types,
8. integrate frontend Auth,
9. validate server JWT/user identity,
10. replace the temporary unauthenticated-AI gate with real entitlements/quotas.

## Revisit when

- GuardAI requires multi-region data residency beyond the selected Supabase architecture,
- enterprise deployment requires dedicated/customer-hosted infrastructure,
- workload characteristics justify separating scanner job storage from transactional product data.
