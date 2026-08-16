# GuardAI Phase 1 Tracker — Safe Foundation

> Active tracker for the foundation work in `GUARDAI_MASTER_BUILD_GUIDE.md`.

## Status

**PHASE 1: IN PROGRESS — foundation implementation is advanced; clean execution remains externally blocked by GitHub runner billing/spending settings.**

No install/lint/typecheck/build/test result is marked green until it actually executes.

---

## Baseline

| Item | Current decision |
|---|---|
| Node | `24.18.1` LTS |
| Frontend | React 19 + TypeScript + Vite 8 |
| Backend | Node/Express CommonJS, modular |
| API | application routes under `/api/v1`; health at `/api/health` |
| Scan contract | `0.1.0` |
| Database/Auth | dedicated GuardAI Supabase/Postgres/Auth project |
| Backend DB access | native PostgreSQL repository/transaction layer, ADR 0002 |
| Existing connected Supabase DB | **never reuse for GuardAI** |

---

# Completed engineering foundation

## Repository / quality

- [x] runtime/package-manager baseline
- [x] `.nvmrc`, `.editorconfig`, contribution rules
- [x] hardened `.gitignore`
- [x] generated npm cache trees removed
- [x] root quality commands
- [x] PR/manual GitHub Actions workflow registered
- [x] full-history Gitleaks configured
- [x] immutable GitHub Action SHAs
- [x] recursive server JavaScript syntax-check script
- [x] stale/incomplete backend lockfile removed instead of trusted
- [ ] regenerate backend lockfile from real clean install
- [ ] actual root/backend quality execution

## Frontend truthfulness / integrity

- [x] duplicate App rendering removed
- [x] typed central navigation
- [x] global Error Boundary
- [x] truthful landing/footer/result/report wording
- [x] legacy mock surfaces isolated behind FeaturePreview
- [x] no fake API fallback result
- [x] typed scan options
- [x] Accessibility explicitly unavailable until real engine exists
- [x] evidence-first active result screen
- [x] missing coverage shown as `Nicht bewertet`
- [x] fake industry benchmark removed from active UI
- [x] backend notices rendered
- [x] active prototype client now calls `/api/v1/scan` and `/api/v1/scan-file`

---

# API contract / errors

- [x] shared `shared/scan-contract.json`
- [x] contract version `0.1.0`
- [x] backend validates successful scan responses
- [x] frontend rejects incompatible contract versions
- [x] application API mounted below `/api/v1`
- [x] canonical API error envelope: `error.code`, `error.message`, optional `error.details`
- [x] rate-limit, 404, validation, upload and HttpError paths use structured errors
- [x] frontend parses structured error code/message
- [x] API error regression tests exist
- [ ] replace legacy frontend ScanResult benchmark/risk compatibility fields
- [ ] native detector states including `not_assessed` and `error`

---

# Backend modularization

`server/index.js` is now process bootstrap only. Active structure includes:

```text
server/
├── index.js
├── app.js
├── config.js
├── runtime.js
├── auth/
├── database/
├── domain/
├── lib/
├── middleware/
├── repositories/
├── routes/
├── scanners/
├── services/
├── scripts/
└── test/
```

Responsibilities are separated across Auth/RBAC, target safety, safe HTTP, scanners, upload/rate-limit/error middleware, repositories and routes.

---

# Scanner / security foundation

## Truthfulness

- [x] requested modules enforced
- [x] no fake Accessibility score
- [x] fabricated GitHub scoring disabled
- [x] AI response schemas validated
- [x] AI-provided arbitrary scores ignored
- [x] untrusted webpage/document prompt boundary
- [x] anonymous paid-AI paths disabled by default

## SSRF / target safety

- [x] HTTP/HTTPS only
- [x] URL credentials rejected
- [x] nonstandard ports rejected
- [x] private/loopback/link-local/reserved IPv4 blocked
- [x] risky/mapped IPv6 ranges blocked conservatively
- [x] redirects revalidated
- [x] proxy environment routing disabled for scan targets
- [x] bounded target time/size
- [x] socket-level DNS address validation
- [x] URL/IP/DNS regression tests exist

## Upload

- [x] one PDF/TXT only, max 10 MB
- [x] extension + MIME boundary
- [x] PDF signature check
- [x] binary/null-byte TXT rejection
- [x] temp cleanup
- [x] fake image/presentation extraction removed
- [x] `pdf-parse 2.4.5` v2 lifecycle + `destroy()`
- [ ] malware quarantine
- [ ] parser sandbox/resource isolation

---

# Dedicated GuardAI database design

ADRs:

- `docs/adr/0001-dedicated-supabase-postgres-auth.md`
- `docs/adr/0002-native-postgres-backend-transactions.md`

Design sources:

- `database/001_guardai_core_schema_draft.sql`
- `database/002_scan_queue_invariants_draft.sql`
- `database/README.md`

Completed design:

- [x] profiles / organizations / memberships
- [x] targets
- [x] scans / scan_jobs
- [x] evidence
- [x] rules / rule_versions / legal_sources
- [x] findings / finding_instances
- [x] subscriptions / audit_events
- [x] RLS design
- [x] private role helper design
- [x] browser read-mostly model
- [x] composite tenant foreign-key design
- [x] requested-module constraints
- [x] organization-scoped idempotency key
- [x] unique scan/job module constraint
- [ ] dedicated GuardAI Supabase project provisioned
- [ ] drafts consolidated into generated real migration
- [ ] staging migration applied
- [ ] Supabase advisors clean
- [ ] cross-tenant/RLS integration tests executed

---

# Auth / organization authorization

- [x] dedicated Supabase URL/publishable-key server config boundary
- [x] bearer parsing + tests
- [x] fail-closed Supabase Auth user validation path
- [x] `/api/v1/auth/me`
- [x] owner/admin/member/viewer domain roles
- [x] role hierarchy tests
- [x] repository-independent organization authorization service
- [x] non-member/insufficient-role/invalid-role tests
- [x] Postgres membership repository
- [ ] GuardAI Supabase Auth project configured
- [ ] frontend login/session shell
- [ ] real membership integration tested against staging
- [ ] entitlements/quotas linked to organization

---

# Native Postgres repository layer

Backend-only configuration:

```text
DATABASE_URL
DATABASE_POOL_MAX
```

Implemented:

- [x] bounded Postgres pool factory
- [x] membership repository
- [x] scan repository
- [x] scan read/status repository
- [x] repository-independent persistence service composition
- [x] all current SQL parameterized
- [x] database unavailable/config-invalid paths fail closed
- [x] idempotent scan request matching helpers + tests

`pg 8.22.0` is selected in `server/package.json`; lockfile/install validation remains pending.

---

# Persistent async scan lifecycle — first real path

## Domain

- [x] statuses: queued/running/completed/failed/cancelled
- [x] legal state transitions + tests
- [x] allowed target→module matrix + tests
- [x] requestable scanner modules
- [x] idempotency-key validation
- [x] repository-independent Scan Submission service + tests

## Atomic Scan + Jobs creation

`createQueuedScanWithJobs` now designs/implements:

- [x] Target must belong to requested organization
- [x] Target type must support requested modules
- [x] one DB transaction for Scan + Jobs
- [x] organization-scoped idempotency
- [x] concurrent idempotency conflict handling
- [x] same key + different logical request → `409 IDEMPOTENCY_KEY_REUSED`

## Worker job claim

`claimNextJob` implements:

- [x] queued jobs whose `available_at` is ready
- [x] reclaim expired running leases
- [x] attempt limit check
- [x] `FOR UPDATE SKIP LOCKED`
- [x] worker ID + lease timestamps
- [x] increments attempt count
- [x] queued Scan transitions to running on first claim

## Authenticated HTTP contract

Prepared routes:

```text
POST /api/v1/organizations/:organizationId/targets/:targetId/scans
GET  /api/v1/organizations/:organizationId/scans/:scanId
```

POST:

- [x] requires Supabase-authenticated user
- [x] requires organization role `member+`
- [x] accepts validated modules
- [x] accepts `Idempotency-Key`
- [x] returns 202 on creation / 200 on idempotent replay

GET:

- [x] requires authenticated `viewer+`
- [x] tenant-scoped Scan lookup
- [x] returns user-safe job status without worker secret/internal ID data

These routes are fail-closed until the dedicated GuardAI Auth/DB environment exists.

---

# Test source inventory

Current Node test sources include:

- target safety
- scan access
- scan contract
- auth header parsing
- organization roles
- organization authorization
- scan lifecycle
- scan submission
- target/module compatibility
- API error envelope
- scan repository idempotency helpers

**They are not marked passing until actually executed.**

---

## Current blockers

1. GitHub Actions runner allocation remains externally blocked.
2. Backend clean install has not run after dependency changes; backend lockfile is intentionally absent.
3. Dedicated GuardAI Supabase project is not yet provisioned.
4. DB/Auth routes therefore cannot yet be end-to-end integration tested.
5. Job completion/failure/retry and Evidence persistence are the next implementation block.
6. Current public prototype scan endpoints are still synchronous and are not yet replaced by the worker path.

---

## Phase 1 exit criteria

- [x] repository/runtime standards
- [x] modular backend foundation
- [x] versioned API + structured errors
- [x] scanner target/upload safety foundation
- [x] dedicated DB/Auth architecture
- [x] DB/RLS design sources
- [x] Auth/RBAC/tenant authorization foundation
- [x] native Postgres repository foundation
- [x] persistent Scan submission/status/worker-claim foundation
- [ ] root `npm ci` verified
- [ ] backend clean install + lockfile verified
- [ ] frontend lint/typecheck/build verified
- [ ] backend syntax/tests verified

---

## Next implementation order

1. worker job completion/failure/retry semantics,
2. Evidence + Finding persistence transaction layer,
3. worker handler registry and first real Security worker,
4. scanner progress/coverage aggregation,
5. migrate frontend from synchronous prototype request to authenticated persistent Scan flow after Auth/DB staging exists,
6. provision dedicated GuardAI staging Supabase project when cloud provisioning is explicitly reached.

If a clean runner becomes available first, validation takes priority immediately.
