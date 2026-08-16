# GuardAI Repository Inventory

> Living file-by-file disposition for the current repository. Keep synchronized with `GUARDAI_MASTER_BUILD_GUIDE.md` and `PHASE_1_TRACKER.md`.

Status values:

- `KEEP` — intended architecture/value remains
- `REFACTOR` — keep value but continue changing data flow/structure
- `REPLACE` — current implementation must not become production truth
- `LEGACY` — reference/fixture only until removal
- `LATER` — valid future feature, not current MVP capability
- `REMOVE` — obsolete/generated artifact

---

# Root / engineering

| Path | Decision | Current GuardAI state |
|---|---|---|
| `.gitignore` | KEEP | Secrets/uploads/caches/test artifacts excluded |
| `.nvmrc` | KEEP | Node `24.18.1` baseline |
| `.editorconfig` | KEEP | UTF-8/LF/2-space baseline |
| `.env.example` | KEEP | Frontend API base only; no browser secrets |
| `.github/workflows/ci.yml` | KEEP | Quality + Gitleaks workflow registered; runner allocation externally blocked |
| `CONTRIBUTING.md` | KEEP | GuardAI engineering/security rules |
| `README.md` | KEEP / UPDATE AS PHASES CHANGE | Truthful rebuild status |
| `package.json`, `package-lock.json` | KEEP | Frontend package baseline and lock |
| `shared/scan-contract.json` | KEEP / ACTIVE | Shared prototype + persistent scan metadata; current version `0.2.0` |
| `database/` | KEEP / ACTIVE | GuardAI-only DB design sources; no draft is an applied migration |
| `docs/` | KEEP | Canonical guide, trackers and ADRs |

Removed generated repository bloat remains removed:

- `.npm-cache/`
- `npm_cache/`

---

# Frontend core

| Path | Decision | Current GuardAI state |
|---|---|---|
| `src/App.tsx` | REFACTOR / ACTIVE | Truthful prototype UI shell; persistent authenticated flow not wired yet |
| `src/main.tsx` | KEEP | Root validation + global error boundary |
| `src/components/AppErrorBoundary.tsx` | KEEP | Global unexpected-error fallback |
| `src/api/scanApi.ts` | LEGACY-TRANSITION / ACTIVE UI | Old synchronous prototype adapter; backend endpoint now disabled by default outside explicit dev opt-in |
| `src/api/apiClient.ts` | KEEP / PREPARED | Authenticated `/api/v1` core with structured errors and access-token provider abstraction |
| `src/api/workspaceApi.ts` | KEEP / PREPARED | Organizations, Targets, DNS verification, persistent Scan submission/status client |
| `src/types/workspace.ts` | KEEP / PREPARED | Persistent workspace/target/job/evidence/finding DTO types |
| `src/types/scanner.ts` | REFACTOR | Legacy UI compatibility model still contains fields to remove |
| `src/types/navigation.ts` | KEEP | Active navigation typing |
| `src/types/scanOptions.ts` | LEGACY-TRANSITION | Current synchronous prototype selector types |
| `src/config/previewFeatures.ts` | KEEP | Product previews isolated from functional runtime |
| `src/data/mockScanEngine.ts` | LEGACY / REMOVE LATER | Not used by active scan request lifecycle |

## Active UI surfaces

| Component | Decision | State |
|---|---|---|
| `LandingPage.tsx` | KEEP / ACTIVE | Truthful technical-screening positioning |
| `UrlInputHero.tsx` | REFACTOR | Current prototype entry; persistent Workspace/Target flow replaces it |
| `ScanProgressModal.tsx` | REFACTOR | Indeterminate prototype state; later driven by persistent Jobs |
| `ScanResultsDashboard.tsx` | KEEP / REFACTOR | Evidence-first design; later bind persistent Evidence/Findings |
| `TechnicalScanReport.tsx` | KEEP / REFACTOR | Technical report; later persistent immutable scan source |
| `Navbar.tsx`, `CommandPalette.tsx` | KEEP / REFACTOR | Typed shell; real Auth/workspace navigation later |
| `FeaturePreview.tsx` | KEEP | Prevents nonfunctional product mocks posing as live features |
| theme/UI primitives | KEEP | UI infrastructure; accessibility review later |

## Legacy / future product surfaces

These remain design references or future features and are not current production capabilities:

- `ComplianceDashboard.tsx`
- `PrintableReport.tsx`
- `AiCounsel.tsx`
- `AuditHub.tsx`
- `BadgeGenerator.tsx`
- `CheckoutSimulation.tsx`
- `DocumentGenerator.tsx`
- `IntegrationsHub.tsx`
- `PolicyManager.tsx`
- `PricingModal.tsx`
- `PublicTrustCenter.tsx`
- `TemplatesHub.tsx`
- `TrueSight.tsx`
- `UserDashboard.tsx`
- `WorkspaceSwitcher.tsx`
- `LeadGenModal.tsx`

---

# Backend bootstrap / config

| Path | Decision | Current GuardAI state |
|---|---|---|
| `server/index.js` | KEEP | Minimal API process bootstrap |
| `server/app.js` | KEEP | Express composition and `/api/v1` route mounting |
| `server/config.js` | KEEP | Central API/DB/Auth/worker config |
| `server/runtime.js` | KEEP / EVOLVE | AI runtime + temporary paid-AI access policy |
| `server/package.json` | KEEP | Express/scanner/Postgres deps + API/worker/check/test scripts |
| `server/package-lock.json` | REGENERATE / BLOCKED | Must come from verified backend clean install |
| `server/.env.example` | KEEP | Auth/DB/worker/Gemini + prototype safety gates documented |

---

# Backend Auth / authorization

| Path | Decision | State |
|---|---|---|
| `server/auth/supabaseAuth.js` | KEEP / PREPARED | Bearer token validated through dedicated Supabase Auth endpoint once configured |
| `server/auth/roles.js` | KEEP | owner/admin/member/viewer hierarchy |
| `server/services/organizationAuthorization.js` | KEEP | Repository-independent tenant role authorization |
| `server/repositories/membershipRepository.js` | KEEP | Postgres membership lookup |
| `server/routes/authRoutes.js` | KEEP / PREPARED | `/api/v1/auth/me` |

Never trust request-body roles or user-editable metadata for Organization authorization.

---

# Workspace onboarding

## Organization

| Path | Decision | State |
|---|---|---|
| `server/domain/organization.js` | KEEP | Name normalization + safe random-suffixed slug generation |
| `server/repositories/organizationRepository.js` | KEEP | Atomic Organization + Owner + initial free subscription + audit event |
| `server/services/organizationService.js` | KEEP | Creation/list orchestration + slug collision retry |
| `server/routes/organizationRoutes.js` | KEEP / PREPARED | GET/POST `/api/v1/organizations` |

## Website Target

| Path | Decision | State |
|---|---|---|
| `server/domain/websiteTarget.js` | KEEP | Stable URL normalization; local/IP/credential/port safety |
| `server/repositories/targetRepository.js` | KEEP | Tenant target create/list/read + audit event |
| `server/services/targetService.js` | KEEP | admin+ create; viewer+ read/list |
| `server/routes/targetRoutes.js` | KEEP / PREPARED | Target GET/list/create routes |

New Website Targets always start `unverified`; clients cannot provide their own verification state.

---

# Target ownership verification

| Path | Decision | State |
|---|---|---|
| `server/domain/targetVerification.js` | KEEP | 256-bit DNS TXT challenge, SHA-256 storage, timing-safe match |
| `server/repositories/targetVerificationRepository.js` | KEEP | Transactional challenge/attempt/expiry/verified state |
| `server/services/targetVerificationService.js` | KEEP | admin+ challenge orchestration + DNS resolver boundary |
| `server/routes/targetVerificationRoutes.js` | KEEP / PREPARED | create/check DNS challenge routes |
| `server/middleware/verificationLimiter.js` | KEEP | Separate verification attempt rate limit |

Persistent Scans require a verified Target; Worker execution rechecks verification.

---

# API contracts / errors

| Path | Decision | State |
|---|---|---|
| `server/lib/httpError.js` | KEEP | HTTP status + stable error code/details |
| `server/lib/apiError.js` | KEEP | Canonical public error envelope |
| `server/middleware/errorHandler.js` | KEEP | Central error translation |
| `server/lib/scanContract.js` | LEGACY-TRANSITION | Validates synchronous prototype responses |
| `server/lib/persistentScanContract.js` | KEEP | Validates persistent Scan submission/status DTOs and strips internal fields |

Shared scan contract version: **`0.2.0`**.

---

# Network / scanner safety

| Path | Decision | State |
|---|---|---|
| `server/lib/targetSafety.js` | KEEP / HARDEN | URL/IP/DNS safety and socket lookup guard |
| `server/services/safeFetch.js` | KEEP | Bounded SSRF-safe HTTP fetch + validated final URL |
| `server/scanners/securityHeaders.js` | KEEP | Deterministic `security.headers` detector v1.0.0 |
| `server/scanners/webScanner.js` | LEGACY-TRANSITION | Dev synchronous scanner; shares Security detector |
| `server/scanners/fileScanner.js` | LOCKED-DOWN / HARDEN | Dev-only PDF/TXT path; no public asset worker yet |
| `server/scanners/schemas.js` | KEEP | Prototype request/AI validation |
| `server/scanners/scoring.js` | REFACTOR | Prototype deterministic category helpers |

---

# Legacy prototype access

| Path | Decision | State |
|---|---|---|
| `server/lib/prototypeAccess.js` | KEEP / TEMPORARY | Legacy synchronous endpoints disabled unless explicit dev opt-in |
| `server/lib/scanAccess.js` | KEEP / TEMPORARY | Anonymous Gemini usage disabled unless explicit dev opt-in |
| `server/routes/scanRoutes.js` | LEGACY-TRANSITION | Synchronous dev routes; fail-closed by default and slated for removal after frontend migration |
| `server/middleware/scanLimiter.js` | KEEP / TEMPORARY | Memory/IP boundary; not an entitlement system |
| `server/middleware/upload.js` | KEEP / HARDEN | Dev file boundary; file write occurs only after prototype/AI gates |

---

# Persistent Scan domain / repositories

| Path | Decision | State |
|---|---|---|
| `server/domain/scanLifecycle.js` | KEEP | Legal Scan state transitions |
| `server/domain/scanSubmission.js` | KEEP | Idempotency/module validation; only implemented persistent modules accepted |
| `server/domain/targetScanCompatibility.js` | KEEP | Target type → module matrix |
| `server/domain/targetAuthorization.js` | KEEP | Verified Target requirement |
| `server/repositories/scanRepository.js` | KEEP | Atomic verified Target Scan + Job submission |
| `server/repositories/scanReadRepository.js` | KEEP | Tenant-scoped Scan/Job/Evidence/Finding read model |
| `server/routes/workspaceScanRoutes.js` | KEEP / PREPARED | Persistent POST Scan + GET Scan status |

Current externally enabled persistent module: **`security` only**.

Known-but-disabled modules remain in the shared registry until their real workers exist:

- privacy
- accessibility
- ai-governance
- repository
- asset

---

# Worker lifecycle / Evidence

| Path | Decision | State |
|---|---|---|
| `server/domain/jobLifecycle.js` | KEEP | Lease validation, retry backoff, permanent-error classification |
| `server/domain/assessmentResult.js` | KEEP | Worker result validation |
| `server/lib/evidenceIntegrity.js` | KEEP | Canonical Evidence serialization/hash + Finding fingerprints |
| `server/repositories/jobRepository.js` | KEEP | Claim/lease/renew/complete/retry/exhaustion transactions |
| `server/services/jobFailureService.js` | KEEP | Immediate terminal handling for non-retryable worker failures |
| `server/workers/securityWorker.js` | KEEP / FIRST REAL WORKER | Persistent HTTP Security worker |
| `server/workers/securityWorkerProcess.js` | KEEP | Separate polling process + graceful shutdown |

Security worker commands:

```text
npm run worker:security
npm run worker:security:once
```

Raw response headers are not persisted; only normalized observations/evidence are stored.

---

# Entitlements / usage

| Path | Decision | State |
|---|---|---|
| `server/domain/entitlements.js` | KEEP | Module→capability mapping + fail-closed plan/limit rules |
| `server/repositories/entitlementRepository.js` | KEEP / PREPARED | Durable monthly counters + transactional reservation/consume/release |

No plan limit numbers are invented in repository code. `security` currently needs no paid capability. Future modules cannot be enabled until their entitlement + usage reservation path is wired.

---

# Database design sources

**None of these files are applied migrations.**

| Path | Decision | Scope |
|---|---|---|
| `database/001_guardai_core_schema_draft.sql` | KEEP / CONSOLIDATE LATER | Core tenant/entities/RLS |
| `database/002_scan_queue_invariants_draft.sql` | KEEP / CONSOLIDATE LATER | Tenant FKs, modules, Scan idempotency, Job uniqueness |
| `database/003_worker_result_invariants_draft.sql` | KEEP / CONSOLIDATE LATER | Worker summaries/timestamps + Evidence/Finding dedupe |
| `database/004_target_verification_challenges_draft.sql` | KEEP / CONSOLIDATE LATER | Backend-only DNS challenges |
| `database/005_workspace_onboarding_invariants_draft.sql` | KEEP / CONSOLIDATE LATER | Target uniqueness + subscription field constraints |
| `database/006_entitlements_usage_draft.sql` | KEEP / CONSOLIDATE LATER | Plan capabilities + durable usage/reservations |
| `database/README.md` | KEEP | Draft → generated staging migration procedure |
| `docs/adr/0001-dedicated-supabase-postgres-auth.md` | KEEP | Dedicated project decision |
| `docs/adr/0002-native-postgres-backend-transactions.md` | KEEP | Native transaction/repository decision |

The unrelated connected multi-application Supabase project remains **off-limits** for GuardAI.

---

# Test source inventory

Backend Node test sources now cover or prepare coverage for:

- target URL/IP/DNS/socket safety
- prototype endpoint access gate
- anonymous AI access gate
- prototype + persistent scan contract boundaries
- API error envelope
- Bearer header parsing
- Organization role hierarchy/authorization
- Organization normalization/service
- Website Target normalization/service
- Target verification requirement
- DNS challenge generation/matching/service
- Target/module compatibility
- Scan lifecycle/submission/idempotency
- worker lifecycle/retry classification
- Job lease guards
- worker assessment result validation
- Evidence hashing/Finding fingerprinting
- Security header detector semantics
- entitlement/capability rules
- usage reservation input normalization

**Inventory presence is not a passing-test claim. No clean backend test run has executed yet.**

---

# Current production gaps

1. GitHub Actions billing/spending must permit runner allocation.
2. Clean frontend/backend installs and backend lockfile regeneration must execute.
3. Dedicated GuardAI Supabase staging project must be provisioned.
4. SQL drafts must be consolidated into a generated migration and tested.
5. RLS/cross-tenant/queue/usage concurrency integration tests must execute.
6. Frontend Supabase Auth dependency/provider must be installed and locked in a clean environment.
7. Visual frontend must migrate from legacy prototype to Workspace → Target → Verify → Persistent Scan.
8. Accessibility worker needs real browser/axe runtime.
9. Repository worker needs dependency/SAST/secret toolchain.
10. Asset worker needs malware quarantine + parser isolation before public enablement.
11. Billing provider, production deployment, observability, backups/DR and remaining product features still follow later guide phases.

---

# Inventory maintenance rule

Whenever a substantial change lands:

1. update this inventory,
2. update the active phase tracker,
3. update the master guide when architecture/order/requirements materially change,
4. keep visible product claims aligned with implementation,
5. never mark install/test/build/migration/deployment as passed unless it actually executed.
