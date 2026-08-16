# GuardAI Phase 1 Tracker — Development Standards & Safe Foundation

> Active implementation tracker for Phase 1 of `GUARDAI_MASTER_BUILD_GUIDE.md`.

## Status

**PHASE 1: IN PROGRESS — implementation advanced; clean execution still externally blocked by GitHub runner billing/spending settings.**

GitHub registered the workflow but assigned no runner to the first jobs. Therefore no claim is made that install/lint/typecheck/build/tests pass.

---

## Runtime baseline

| Item | Decision |
|---|---|
| Node.js | `24.18.1` LTS via `.nvmrc` |
| Package manager | npm 11 baseline |
| Frontend | React 19 + TypeScript + Vite 8 |
| Backend | Node/Express CommonJS, now modular |
| Active application API | `/api/v1/...` |
| Operational health endpoint | `/api/health` |
| Scan contract | `0.1.0` via `shared/scan-contract.json` |
| MVP persistence/auth | dedicated GuardAI Supabase/Postgres/Auth project; ADR 0001 |
| Existing connected Supabase project | **must not be reused for GuardAI** |

---

# Completed foundation work

## Repository / quality

- [x] Node/package-manager baseline documented
- [x] EditorConfig and contribution rules
- [x] hardened `.gitignore`
- [x] generated npm cache trees removed
- [x] root typecheck/check scripts
- [x] GitHub Actions quality workflow registered
- [x] full-history Gitleaks configured
- [x] external Actions pinned to immutable SHAs
- [x] recursive backend JavaScript syntax-check script added
- [x] stale/incomplete backend lockfile removed instead of pretending it was reproducible
- [ ] backend lockfile regenerated from verified clean install
- [ ] actual CI/local clean execution completed

## Frontend integrity

- [x] duplicate App rendering removed
- [x] central typed navigation
- [x] global AppErrorBoundary
- [x] truthful product/landing claims
- [x] legacy mock product surfaces isolated behind FeaturePreview
- [x] active scanner uses real API errors, never fake-success fallback
- [x] typed scan options
- [x] Security/Privacy/AI selection visible
- [x] Accessibility remains explicitly unavailable until real engine
- [x] evidence-first result dashboard
- [x] absent coverage = `Nicht bewertet`
- [x] fake industry benchmark removed from active result UI
- [x] technical report replaces verification/certification-style report
- [x] backend notices shown to user
- [x] frontend calls versioned `/api/v1/scan` and `/api/v1/scan-file`

## API contract

- [x] shared contract metadata source
- [x] contract version `0.1.0`
- [x] successful backend responses validated before send
- [x] backend injects contractVersion centrally
- [x] frontend rejects incompatible contract versions
- [x] contract regression tests exist
- [x] public application API now mounted below `/api/v1`
- [ ] canonical versioned error envelope
- [ ] replace legacy frontend `ScanResult` compatibility fields
- [ ] native detector states including `not_assessed` and `error`

---

# Backend modularization — completed structural step

`server/index.js` is now only the process bootstrap. Responsibilities are split into:

```text
server/
├── index.js
├── app.js
├── config.js
├── runtime.js
├── auth/
│   ├── supabaseAuth.js
│   └── roles.js
├── domain/
│   └── scanLifecycle.js
├── lib/
├── middleware/
│   ├── errorHandler.js
│   ├── scanLimiter.js
│   └── upload.js
├── routes/
│   ├── authRoutes.js
│   ├── healthRoutes.js
│   └── scanRoutes.js
├── scanners/
│   ├── fileScanner.js
│   ├── schemas.js
│   ├── scoring.js
│   ├── securityHeaders.js
│   └── webScanner.js
├── services/
│   └── safeFetch.js
├── scripts/
│   └── checkSource.js
└── test/
```

This decomposition is intentionally a stepping stone toward DB repositories + workers; it does not claim the current synchronous scanner is the final architecture.

---

# Scanner/security work completed

## Truthfulness

- [x] requested modules enforced server-side
- [x] no fake Accessibility score
- [x] old fabricated GitHub scan disabled with HTTP 501
- [x] AI output schema validated
- [x] model-provided arbitrary scores ignored
- [x] webpage/document contents marked as untrusted prompt data
- [x] anonymous paid-AI access disabled by default
- [x] missing AI access/key produces notice/error rather than fake passed result

## Target/network safety

- [x] HTTP/HTTPS only
- [x] credentials in target URLs rejected
- [x] nonstandard ports rejected
- [x] private/loopback/link-local/reserved IPv4 blocked
- [x] risky IPv6 ranges/mapped addresses blocked conservatively
- [x] every redirect target revalidated
- [x] axios auto-redirect disabled
- [x] environment proxy routing disabled for target fetches
- [x] target response size/time bounded
- [x] socket-level DNS lookup validates the actual connection address
- [x] regression tests exist for URL/IP/DNS/socket rules

## File boundary

- [x] one file only
- [x] max 10 MB
- [x] PDF/TXT only
- [x] extension + MIME boundary
- [x] PDF signature validation
- [x] binary/null-byte TXT rejection
- [x] temporary cleanup in `finally`
- [x] image/presentation mock extraction removed
- [x] current parser code and dependency aligned on `pdf-parse 2.4.5` v2 API
- [x] parser lifecycle calls `destroy()`
- [ ] malware/quarantine layer
- [ ] parser sandbox / stronger resource isolation

---

# Persistence / tenant architecture preparation

ADR: `docs/adr/0001-dedicated-supabase-postgres-auth.md`

Completed:

- [x] existing connected Supabase database inspected read-only and confirmed unrelated/multi-application
- [x] dedicated GuardAI Supabase project selected architecturally
- [x] existing shared project explicitly excluded from GuardAI use
- [x] `database/001_guardai_core_schema_draft.sql` created as design source
- [x] `database/README.md` documents promotion to a real generated migration
- [x] schema includes profiles, organizations, memberships, targets, scans, jobs, evidence, rules, legal sources, findings, subscriptions and audit events
- [x] RLS enabled in design on exposed GuardAI tables
- [x] organization membership helper isolated in private schema
- [x] browser access intentionally read-mostly; privileged mutations backend-first
- [x] queue/job table intentionally unavailable to browser roles
- [ ] dedicated GuardAI cloud project created
- [ ] real migration generated by Supabase CLI
- [ ] migration applied to staging
- [ ] Supabase security/performance advisors clean
- [ ] multi-user/cross-tenant RLS tests executed

---

# Auth / authorization preparation

- [x] `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` server env boundary documented
- [x] no Supabase secret/service key planned for Vite/browser env
- [x] Bearer parser + tests
- [x] fail-closed token verification through Supabase Auth user endpoint
- [x] `/api/v1/auth/me` identity endpoint prepared
- [x] no request-body/user-metadata role trust
- [x] canonical organization roles: owner/admin/member/viewer
- [x] role hierarchy helper + tests
- [ ] dedicated GuardAI Auth project configured
- [ ] frontend Supabase client/login UI
- [ ] workspace membership repository connected to Postgres
- [ ] route-level organization authorization middleware
- [ ] entitlements/quotas linked to authenticated organization

---

# Scan lifecycle preparation

- [x] explicit statuses: queued/running/completed/failed/cancelled
- [x] legal transition state machine + tests
- [x] DB draft includes scans + scan_jobs
- [ ] repository layer
- [ ] persistent scan creation transaction
- [ ] worker leasing/claiming
- [ ] retry/dead-letter behavior
- [ ] progress/status API
- [ ] current synchronous scanner moved behind worker execution

---

# Existing test files

- `targetSafety.test.js`
- `scanAccess.test.js`
- `scanContract.test.js`
- `authHeader.test.js`
- `roles.test.js`
- `scanLifecycle.test.js`

**Tests exist but are not marked passing until actually executed.**

---

## Current blockers

1. GitHub Actions runner allocation is still blocked externally.
2. Backend dependency install has not run after package changes; no new lockfile yet.
3. Dedicated GuardAI Supabase project has not yet been provisioned.
4. Therefore DB/Auth integration cannot yet be end-to-end verified.
5. Scanner requests are still synchronous until persistent job/worker work lands.

---

## Phase 1 exit criteria

- [x] runtime/package baseline
- [x] repository hygiene/contribution standards
- [x] CI/secret-scan workflow registered
- [x] modular backend structure
- [x] target safety + regression test sources
- [x] versioned API/scan contract boundary
- [x] dedicated GuardAI persistence/auth architecture chosen
- [x] initial DB/RLS design source
- [x] initial fail-closed Auth/RBAC domain foundation
- [x] scan lifecycle domain foundation
- [ ] root `npm ci` verified
- [ ] backend clean install + lockfile verified
- [ ] lint/typecheck/frontend build verified
- [ ] backend syntax/tests verified

---

## Next implementation order

While clean execution remains externally unavailable:

1. add database repository interfaces and workspace-authorization boundary,
2. design persistent async scan creation/job claim contracts,
3. canonicalize API errors + detector assessment state,
4. prepare frontend Auth shell without connecting to the unrelated Supabase project,
5. once cloud provisioning is reached, create a **dedicated GuardAI** staging project and turn the schema draft into a real migration.

As soon as a clean runner/environment becomes available, validation takes priority over adding more features.
