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
| Worker model | separate processes; first worker supports `security` only |
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
- [x] active prototype client calls `/api/v1/scan` and `/api/v1/scan-file`
- [ ] frontend Auth/session/workspace shell
- [ ] frontend migrated from synchronous prototype scan to persistent authenticated scan flow

---

# API contract / errors

- [x] shared `shared/scan-contract.json`
- [x] contract version `0.1.0`
- [x] backend validates successful prototype scan responses
- [x] frontend rejects incompatible contract versions
- [x] application API mounted below `/api/v1`
- [x] canonical API error envelope: `error.code`, `error.message`, optional `error.details`
- [x] rate-limit, 404, validation, upload and HttpError paths use structured errors
- [x] frontend parses structured error code/message
- [x] API error regression tests exist
- [ ] persistent Scan API response schema promoted into the shared contract
- [ ] replace legacy frontend ScanResult benchmark/risk compatibility fields
- [ ] native detector states including `not_assessed` and `error`

---

# Backend modularization

`server/index.js` is process bootstrap only. Active structure now includes:

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
├── workers/
└── test/
```

API, scanner execution, persistence and worker lifecycle are separate concerns.

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
- [x] final validated URL exposed to detectors
- [x] URL/IP/DNS regression tests exist

## Security-header detector

- [x] detector ID/version (`security.headers` / `1.0.0`)
- [x] HTTPS transport check
- [x] CSP presence check
- [x] HSTS assessed only when final target is HTTPS
- [x] X-Frame-Options / CSP frame-ancestors detection
- [x] normalized evidence payload; full raw response headers are not persisted
- [x] synchronous prototype and worker use the same detector logic
- [x] detector unit tests exist

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
- `database/003_worker_result_invariants_draft.sql`
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
- [x] worker result summary/completion/failure timestamps design
- [x] duplicate Evidence/Finding-instance prevention design
- [ ] dedicated GuardAI Supabase project provisioned
- [ ] drafts consolidated into generated real migration
- [ ] staging migration applied
- [ ] Supabase advisors clean
- [ ] cross-tenant/RLS/queue integration tests executed

---

# Auth / organization / target authorization

- [x] dedicated Supabase URL/publishable-key server config boundary
- [x] bearer parsing + tests
- [x] fail-closed Supabase Auth user validation path
- [x] `/api/v1/auth/me`
- [x] owner/admin/member/viewer domain roles
- [x] role hierarchy tests
- [x] repository-independent organization authorization service
- [x] Postgres membership repository
- [x] persistent scans require target `verification_state = verified`
- [x] verified-target rule tests
- [ ] GuardAI Supabase Auth project configured
- [ ] frontend login/session shell
- [ ] target verification/challenge workflow implemented
- [ ] real membership/target verification integration tested against staging
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
- [x] scan submission repository
- [x] job repository
- [x] scan read/status repository
- [x] persistence service composition
- [x] current SQL parameterized
- [x] database unavailable/config-invalid paths fail closed
- [x] idempotent scan request matching helpers + tests

`pg 8.22.0` is selected in `server/package.json`; lockfile/install validation remains pending.

---

# Persistent async scan lifecycle

## Submission

- [x] authenticated organization-scoped POST route
- [x] requires `member+`
- [x] Target belongs to organization
- [x] Target must be verified
- [x] Target type supports requested modules
- [x] one DB transaction for Scan + Jobs
- [x] organization-scoped Idempotency-Key
- [x] concurrent idempotency conflict handling
- [x] same key + different logical request → `409 IDEMPOTENCY_KEY_REUSED`

## Worker leasing

- [x] supported job-type filter
- [x] queued jobs whose `available_at` is ready
- [x] expired running lease reclaim
- [x] attempt limit check
- [x] `FOR UPDATE SKIP LOCKED`
- [x] bounded/validated worker IDs and lease durations
- [x] active lease ownership check before execution/result write
- [x] lease renewal repository method
- [x] queued Scan → running on first claim

## Worker completion / Evidence / Findings

- [x] worker assessment result validation
- [x] SHA-256 hash of canonical normalized Evidence JSON
- [x] deterministic target+detector+finding fingerprint
- [x] Evidence inserted transactionally
- [x] persistent Finding upsert + per-scan Finding instance
- [x] duplicate completion cannot duplicate matching Evidence/Finding instances by design
- [x] job completion stores result summary and clears active lease
- [x] per-module coverage updated
- [x] all-completed jobs aggregate overall score and complete Scan

## Failure / retry

- [x] bounded exponential retry delay
- [x] attempt limit
- [x] known permanent worker/target/result failures classified as non-retryable
- [x] permanent failure immediately fails Scan and cancels remaining jobs
- [x] exhausted retryable job fails Scan and cancels remaining jobs
- [x] transient retry updates module coverage to `retrying`
- [x] error text is normalized/bounded before persistence

## First worker process

- [x] separate Security worker process
- [x] `npm run worker:security`
- [x] `npm run worker:security:once`
- [x] worker only claims `security`
- [x] safe final-URL-aware HTTP fetch
- [x] normalized header Evidence only
- [x] graceful SIGTERM/SIGINT loop exit
- [x] DB pool cleanup on worker shutdown
- [ ] worker heartbeat timer during long-running modules; current Security request timeout is shorter than default lease
- [ ] production process manager/deployment wiring

---

# Authenticated persistent HTTP contract

Prepared routes:

```text
POST /api/v1/organizations/:organizationId/targets/:targetId/scans
GET  /api/v1/organizations/:organizationId/scans/:scanId
```

POST:

- [x] requires authenticated user
- [x] requires `member+`
- [x] returns 202 on creation / 200 on idempotent replay

GET:

- [x] requires authenticated `viewer+`
- [x] tenant-scoped Scan lookup
- [x] user-safe Job status
- [x] result summaries/errors
- [x] persisted normalized Evidence
- [x] persisted Finding instances
- [x] worker IDs are not exposed by this read model

Routes remain fail-closed until the dedicated GuardAI Auth/DB environment exists.

---

# Test source inventory

Node test sources now cover or prepare coverage for:

- target/IP/DNS safety
- scan access policy
- scan contract
- auth header parsing
- organization roles/authorization
- scan lifecycle/submission
- target/module compatibility
- target verification requirement
- API error envelope
- scan repository idempotency helpers
- worker lifecycle/retry rules
- worker repository lease guards
- assessment result validation
- evidence hashing/fingerprints
- security-header detector semantics

**Tests exist but are not marked passing until they actually execute.**

---

## Current blockers

1. GitHub Actions runner allocation remains externally blocked by account billing/spending state.
2. Backend clean install has not run after dependency changes; backend lockfile is intentionally absent.
3. Dedicated GuardAI Supabase project is not yet provisioned.
4. DB/Auth/worker paths therefore cannot yet be integration-tested against a real GuardAI staging database.
5. Target verification has a schema state but not yet a real challenge workflow.
6. Frontend still uses the synchronous prototype scan flow because real Auth/DB staging is not connected.

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
- [x] persistent Scan submission/status foundation
- [x] durable worker lifecycle design/implementation
- [x] first real Security worker path
- [ ] root `npm ci` verified
- [ ] backend clean install + lockfile verified
- [ ] frontend lint/typecheck/build verified
- [ ] backend syntax/tests verified

---

## Next implementation order

1. implement real target-verification challenge lifecycle,
2. prepare frontend Supabase Auth/session/workspace shell without touching the unrelated existing project,
3. promote persistent Scan API types into the shared contract,
4. add organization-scoped entitlements/quotas before enabling paid AI workers,
5. add browser/axe Accessibility worker,
6. add malware quarantine/parser isolation before public document worker,
7. provision dedicated GuardAI staging Supabase project when cloud provisioning is explicitly reached.

As soon as a clean runner/environment becomes available, validation takes priority over adding more features.
