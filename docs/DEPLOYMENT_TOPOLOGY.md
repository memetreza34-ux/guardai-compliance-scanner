# GuardAI Deployment Topology

> Provider-neutral production topology for the real GuardAI SaaS. This file defines runtime boundaries before provider-specific deployment manifests are introduced.

## Status

**DESIGN BASELINE — not yet deployed.**

Do not claim production deployment, staging deployment, container reproducibility or SLO compliance until the corresponding environment has actually been provisioned and validated.

---

## Runtime components

```text
Internet
  |
  v
HTTPS edge / CDN
  |
  +--> GuardAI frontend (static Vite build)
  |
  +--> GuardAI API service
          |
          +--> Dedicated GuardAI Supabase Auth
          +--> Dedicated GuardAI PostgreSQL
          |
          +--> scan_jobs table
                    ^
                    |
             Security worker pool
                    |
                    +--> authorized public scan target
```

The API and workers are separate processes and separately scalable deployment units.

---

## 1. Frontend

Purpose:

- static React/Vite application,
- authentication UI/session adapter,
- Workspace/Target/Verification/Scan user interface,
- no direct database passwords or server secrets.

Allowed frontend configuration:

```text
VITE_API_BASE_URL
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
```

Never expose through `VITE_*`:

- Supabase secret/service-role keys,
- `DATABASE_URL`,
- database passwords,
- Gemini/API provider secrets,
- JWT signing secrets,
- worker credentials.

Static assets should be served over HTTPS with immutable caching for fingerprinted assets and conservative caching for HTML.

---

## 2. API service

Command eventually used after a verified install/build:

```text
npm start
```

Responsibilities:

- validate Supabase bearer identity,
- authorize Organization membership/role,
- Organization and Target onboarding,
- DNS ownership verification,
- persistent Scan submission/status,
- Audit History,
- entitlement/usage enforcement,
- no long-running scanner execution in request handlers.

Operational endpoints:

```text
GET /api/health  -> process liveness only
GET /api/ready   -> Auth configuration + database readiness
```

Production startup is fail-fast when:

- prototype scan endpoints are enabled,
- anonymous paid-AI scans are enabled,
- Auth/DB configuration is absent,
- CORS contains wildcard/non-HTTPS origins,
- a secret/service-role key is put in the publishable-key field.

Shutdown sequence:

1. receive SIGTERM/SIGINT,
2. stop accepting new HTTP connections,
3. close idle connections,
4. allow active requests a bounded drain window,
5. close PostgreSQL pool,
6. force-close remaining sockets after the shutdown deadline.

---

## 3. Security worker

Commands:

```text
npm run worker:security
npm run worker:security:once
```

Responsibilities:

- claim only `security` jobs,
- use `FOR UPDATE SKIP LOCKED` lease semantics,
- re-check active lease and Target verification before executing,
- use the SSRF-safe final-URL-aware HTTP client,
- run deterministic `security.headers` detector,
- persist normalized Evidence + Findings transactionally,
- never store all raw target response headers,
- retry transient failures with bounded backoff,
- fail permanent errors without pointless retries.

Horizontal scaling:

- multiple identical workers may run concurrently,
- the database lease/row-lock design is the concurrency boundary,
- workers must never rely on process-local queue ownership.

A future long-running worker type must renew leases periodically; the current Security request timeout is intentionally shorter than the default lease.

---

## 4. Dedicated GuardAI Supabase project

The existing connected multi-application Supabase project is **not a GuardAI environment and must not be reused**.

GuardAI requires separate environments at minimum:

```text
GuardAI staging Supabase project
GuardAI production Supabase project
```

Each environment owns its own:

- Auth users/sessions,
- Postgres database,
- migrations,
- API keys,
- database credentials,
- backups/recovery configuration,
- logs/observability configuration.

No production database credential may be present in staging or developer environments.

---

## 5. PostgreSQL connection mode

The application uses native PostgreSQL transactions for atomic Scan/Job/Worker operations.

The concrete Supabase connection endpoint is selected by deployment shape:

- persistent long-lived container/VM: direct connection where networking supports it, otherwise appropriate session pooler,
- serverless/transient runtime: transaction pooler with driver settings compatible with transaction pooling.

GuardAI must explicitly budget database connections across:

- API replicas,
- Security worker replicas,
- future worker types,
- Supabase platform services.

`DATABASE_POOL_MAX` must be set from this budget rather than increased blindly.

---

## 6. Environment separation

Recommended promotion path:

```text
local/dev -> staging -> production
```

Production must never be the first environment to receive:

- a migration,
- a new Worker type,
- entitlement rules,
- scanner detector-version changes,
- Auth configuration changes.

Staging must use non-production secrets and a separate database/Auth boundary.

---

## 7. Deployment order

For a backwards-compatible release:

1. validate clean dependency install and tests,
2. apply backwards-compatible staging DB migration,
3. deploy staging API,
4. deploy staging workers,
5. deploy staging frontend,
6. run health/readiness and end-to-end tests,
7. verify queue drains and Evidence/Findings persist correctly,
8. verify cross-tenant negative tests,
9. promote the approved migration to production,
10. deploy production API,
11. deploy production workers,
12. deploy production frontend,
13. observe error/queue/readiness metrics before declaring release healthy.

Breaking schema changes require expand/migrate/contract sequencing rather than a single destructive migration.

---

## 8. Rollback principles

Frontend/API rollback:

- previous application version may be restored only while the database remains backwards-compatible.

Worker rollback:

- stop new faulty worker replicas,
- allow/reclaim expired leases,
- deploy previous compatible worker version,
- do not manually mark jobs complete without validated Evidence.

Database rollback:

- prefer forward fixes for migrated production data,
- destructive down-migrations require explicit recovery planning and backup verification.

---

## 9. Secret distribution

API service needs only secrets required by its role, for example:

- `DATABASE_URL`,
- Supabase server-side Auth configuration,
- future billing/provider secrets where applicable.

Security worker needs:

- `DATABASE_URL`,
- target-scanner runtime configuration.

The Security worker currently does **not** need Gemini credentials.

Future AI workers must receive AI secrets only when their entitlement/usage path and worker are production-enabled.

Secrets must be supplied by the deployment platform/secrets manager, not committed `.env` files.

---

## 10. Observability baseline

API currently prepares:

- server-generated `X-Request-ID`,
- structured request duration/status logs,
- structured error logs correlated by Request ID,
- no request-body/token logging,
- liveness/readiness split.

Production still needs:

- central log collection,
- API latency/error metrics,
- database health/connection metrics,
- queue depth/oldest-job-age metrics,
- Worker success/retry/failure metrics,
- alerts tied to SLOs,
- deploy/version labels on logs/metrics.

---

## 11. Container/build gate

A production Dockerfile/container manifest is intentionally **not** introduced yet because the backend dependency lockfile has not been regenerated and validated by a real clean install.

Before declaring a reproducible image:

1. GitHub runner or equivalent clean environment is available,
2. backend `npm install`/approved lock generation succeeds,
3. lockfile is reviewed and committed,
4. `npm run check` and `npm test` execute successfully,
5. image build uses the lockfile with `npm ci`,
6. image runs as a non-root user where technically possible,
7. production image contains no development secrets or local `.env` files,
8. health/readiness and graceful shutdown are tested inside the container.

---

## 12. Current deployment blockers

- GitHub Actions runner allocation is externally blocked by account billing/spending state.
- backend lockfile has not yet been regenerated from a verified clean install.
- dedicated GuardAI staging/production Supabase projects do not yet exist.
- SQL design drafts have not yet been consolidated/applied/tested as real migrations.
- frontend Supabase session implementation is not yet installed/locked.

Until these are resolved, this topology is the binding deployment design, not a claim of deployed production infrastructure.
