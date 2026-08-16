# ADR 0002 — Native PostgreSQL transactions for GuardAI backend and workers

- **Status:** Accepted for MVP architecture
- **Date:** 2026-08-16
- **Scope:** GuardAI API persistence, queue claiming, evidence/finding transactions

## Context

GuardAI needs operations that must be atomic and concurrency-safe:

- create one Scan and its requested jobs together,
- enforce idempotency,
- verify target/organization relationships,
- claim jobs without two workers processing the same row,
- update scan/job lifecycle consistently,
- persist evidence/findings in bounded transactions,
- write audit events with privileged state changes.

The Supabase Data API is useful for browser/RLS reads, but GuardAI's backend/worker path benefits from native PostgreSQL transaction semantics.

## Decision

GuardAI will use:

- **Supabase Auth** for identity/session management,
- **PostgreSQL over the native Postgres protocol** for trusted GuardAI API/worker persistence,
- **RLS** as defense in depth for browser-exposed/read paths,
- backend application authorization before privileged database writes.

The server database password/connection URL is a backend secret and never enters Vite/browser variables.

## Connection mode

The deployment determines the connection method:

### Persistent Node API / workers

Prefer:

1. direct Postgres connection when the runtime/network supports it, or
2. Supavisor session mode when a persistent backend is IPv4-only.

### Serverless / short-lived compute

Use Supavisor transaction mode and configure the database library for transaction-pooler limitations such as prepared-statement behavior.

### Migrations / administrative work

Use the direct/native migration connection recommended by the Supabase tooling for the target project.

## Repository boundary

Scanner/domain code must not import a database driver directly.

```text
route/service
→ repository contract
→ postgres repository implementation
→ database
```

This allows tests to use fake repositories and keeps business rules independent of hosting/provider details.

## Queue model

The initial queue is PostgreSQL-backed because `scan_jobs` already belongs to the canonical GuardAI transaction model.

Worker claiming must be atomic and use a pattern equivalent to:

```text
BEGIN
→ find an available queued/retryable job
→ lock it without waiting on rows another worker owns
→ validate attempt/lease state
→ mark running + worker + lease expiry + attempt
→ COMMIT
```

The final implementation should use PostgreSQL row locking such as `FOR UPDATE SKIP LOCKED` rather than a read-then-write race.

A dedicated external queue may be introduced later if throughput/latency data proves it necessary. The domain service must not depend on the queue vendor.

## Security rules

1. `DATABASE_URL` is server/worker secret only.
2. Never put database password, Supabase secret key or service-role credentials in `VITE_*` variables.
3. Every repository method receiving tenant data receives/derives `organization_id` explicitly.
4. Application authorization happens before privileged write queries.
5. Database composite foreign keys additionally enforce tenant consistency.
6. Parameterized queries only; no string-concatenated customer SQL.
7. Database errors returned to clients are mapped to stable GuardAI API errors, not raw SQL messages.
8. Connection pool size is bounded and observable.
9. Staging and production use different projects/databases/secrets.

## Consequences

### Positive

- real transactions for Scan + Job creation,
- robust idempotency,
- safe concurrent worker leasing,
- clear database abstraction,
- no need to expose privileged Data API credentials to the browser.

### Tradeoffs

- backend requires a PostgreSQL driver and connection management,
- deployment must choose appropriate direct/pooler mode,
- connection secrets and pool sizing become operational responsibilities,
- RLS does not replace backend authorization when using a privileged database role.

## Next implementation

1. add repository contracts without a live DB,
2. add DB config boundary,
3. create the dedicated GuardAI Supabase staging project,
4. generate/apply the real schema migration,
5. choose the correct project connection string for the deployment,
6. add the PostgreSQL driver and generate a lockfile in a clean environment,
7. implement organization/target/scan repositories,
8. implement atomic Scan + Job submission,
9. implement job leasing with concurrency tests,
10. run RLS and cross-tenant integration tests.
