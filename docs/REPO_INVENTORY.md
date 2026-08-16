# GuardAI Repository Inventory

> Living disposition of the current `main` tree. Keep aligned with `GUARDAI_MASTER_BUILD_GUIDE.md` and `PHASE_1_TRACKER.md`.

Status vocabulary:

- `KEEP` — implementation/concept remains.
- `ACTIVE` — used by a real source path.
- `PREPARED` — real-data implementation exists but environment/provider is not connected.
- `REFACTOR` — retain value, change architecture/data flow.
- `LEGACY` — reference only; must not pose as production truth.
- `REMOVE` — obsolete/generated artifact.

---

# Root / engineering

| Path | Status | GuardAI state |
|---|---|---|
| `.nvmrc` | KEEP | Node 24.18.1 baseline |
| `.editorconfig` | KEEP | repository formatting baseline |
| `.gitignore` | KEEP | secrets/caches/uploads/build outputs protected |
| `.env.example` | KEEP | public frontend API/Supabase variables only |
| `.github/workflows/ci.yml` | KEEP / BLOCKED | PR/manual quality + Gitleaks; runner allocation externally blocked |
| `CONTRIBUTING.md` | KEEP | engineering/security contribution rules |
| `README.md` | KEEP / EVOLVE | truthful rebuild status |
| `package.json`, `package-lock.json` | KEEP | frontend package baseline |
| `shared/scan-contract.json` | KEEP / ACTIVE | persistent Scan contract v0.2.0 |
| `shared/rules/security-baseline.json` | KEEP / ACTIVE | versioned Security Rule registry |
| `shared/scoring/security-mvp-v1.json` | KEEP / ACTIVE | scoring profile `security-mvp@1` |
| `database/` | KEEP / PREPARED | GuardAI-only SQL design drafts 001–017; not applied migrations |
| `docs/adr/0001-*` | KEEP | dedicated GuardAI Supabase/Postgres/Auth |
| `docs/adr/0002-*` | KEEP | native PostgreSQL backend transactions |
| `docs/adr/0003-*` | KEEP | Stripe Checkout/Billing provider |

---

# Frontend core

| Path | Status | GuardAI state |
|---|---|---|
| `src/main.tsx` | KEEP / ACTIVE | boots Public Trust and Billing return before product App |
| `src/App.tsx` | REFACTOR / ACTIVE | truthful prototype shell; final persistent product routing still pending |
| `src/components/AppErrorBoundary.tsx` | KEEP | global failure boundary |
| `src/api/apiClient.ts` | KEEP / ACTIVE | authenticated API base/error boundary |
| `src/api/scanApi.ts` | LEGACY MIGRATION | synchronous controlled prototype adapter; production path disabled server-side |
| `src/data/mockScanEngine.ts` | LEGACY | not active scan truth |
| `src/types/navigation.ts` | KEEP | typed current tab model |
| `src/types/scanOptions.ts` | KEEP | prototype input options |
| `src/types/scanner.ts` | REFACTOR | legacy ScanResult compatibility type debt |

## Persistent authenticated product UI

| Path | Status | GuardAI state |
|---|---|---|
| `src/auth/sessionAdapter.ts` | KEEP / PREPARED | provider-independent session contract |
| `src/components/AuthWorkspaceShell.tsx` | KEEP / PREPARED | authenticated product composition; real Supabase adapter not connected |
| `src/api/workspaceApi.ts` | KEEP / PREPARED | Organizations, Targets, verification, Scans, audit |
| `src/components/WorkspaceOnboarding.tsx` | KEEP / PREPARED | real Workspace→Target→DNS verify→Scan→Evidence/Findings flow |
| `src/types/workspace.ts` | KEEP | persistent product types |

## Reports

| Path | Status | GuardAI state |
|---|---|---|
| `src/types/report.ts` | KEEP / PREPARED | immutable Technical Report v2 types |
| `src/api/reportApi.ts` | KEEP / PREPARED | authenticated report create/list/get |
| `src/components/ReportCenter.tsx` | KEEP / PREPARED | report snapshot manager |
| `src/components/ReportSnapshotView.tsx` | KEEP / PREPARED | evidence-first immutable printable view |

## Trust Center / badge

| Path | Status | GuardAI state |
|---|---|---|
| `src/types/trust.ts` | KEEP / PREPARED | internal/public Trust types |
| `src/api/trustApi.ts` | KEEP / PREPARED | publish/list/revoke/public read client |
| `src/components/TrustCenterManager.tsx` | KEEP / PREPARED | report-backed publishing UI |
| `src/components/PublicTrustPage.tsx` | KEEP / ACTIVE PATH | `/trust/:slug`, curated public projection only |

## Billing

| Path | Status | GuardAI state |
|---|---|---|
| `src/types/billing.ts` | KEEP / PREPARED | safe subscription/checkout types |
| `src/api/billingApi.ts` | KEEP / PREPARED | authenticated status + idempotent checkout client |
| `src/components/BillingCenter.tsx` | KEEP / PREPARED | server-driven plan codes only, no fake pricing |
| `src/components/BillingReturnPage.tsx` | KEEP / ACTIVE PATH | neutral return; never treats redirect as payment truth |

## Truthful active prototype surfaces

Current `App.tsx` still uses the evidence-first prototype shell until real Auth/DB staging exists:

- `LandingPage.tsx`
- `UrlInputHero.tsx`
- `ScanProgressModal.tsx`
- `ScanResultsDashboard.tsx`
- `TechnicalScanReport.tsx`
- `FeaturePreview.tsx`
- `Navbar.tsx`
- `CommandPalette.tsx`

### Legacy visual references

Remain design references only until backed by real state:

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

None of these may be reactivated as production truth without real backend/authorization/data.

---

# Backend process / application

| Path | Status | GuardAI state |
|---|---|---|
| `server/index.js` | KEEP / ACTIVE | API bootstrap + graceful shutdown |
| `server/app.js` | KEEP / ACTIVE | Helmet/CORS/request context/raw Stripe webhook/JSON/routes/errors |
| `server/config.js` | KEEP / ACTIVE | typed-ish central runtime config including Billing mode |
| `server/lib/runtimeSafety.js` | KEEP / ACTIVE | dangerous production config fail-fast |
| `server/runtime.js` | KEEP / EVOLVE | controlled AI runtime |
| `server/package.json` | KEEP / UNVALIDATED | includes Stripe 22.1.1; backend lockfile still pending clean install |
| `server/.env.example` | KEEP | Auth/DB/Worker/AI/Billing env boundaries |

## Auth / authorization

- `server/auth/supabaseAuth.js` — fail-closed Bearer validation through dedicated future Supabase Auth.
- `server/auth/roles.js` — owner/admin/member/viewer hierarchy.
- `server/services/organizationAuthorization.js` — tenant RBAC boundary.
- `server/repositories/membershipRepository.js` — DB membership lookup.

## Organizations / Targets / verification

- `server/domain/organization.js`
- `server/domain/websiteTarget.js`
- `server/domain/targetAuthorization.js`
- `server/domain/targetScanCompatibility.js`
- `server/domain/targetVerification.js`
- `server/repositories/organizationRepository.js`
- `server/repositories/targetRepository.js`
- `server/repositories/targetVerificationRepository.js`
- `server/services/organizationService.js`
- `server/services/targetService.js`
- `server/services/targetVerificationService.js`
- corresponding routes under `server/routes/`.

All persistent Scans require a Target verified through backend-controlled DNS TXT challenge state.

---

# Scanner / networking

| Path | Status | GuardAI state |
|---|---|---|
| `server/lib/targetSafety.js` | KEEP / ACTIVE | URL/IP/DNS SSRF policy |
| `server/services/safeFetch.js` | KEEP / ACTIVE | bounded redirects + safe socket DNS + proxy disabled |
| `server/scanners/securityHeaders.js` | KEEP / ACTIVE | deterministic `security.headers@1.1.0` |
| `server/scanners/securityRuleRegistry.js` | KEEP / ACTIVE | Rule/Finding registry resolver |
| `server/scanners/webScanner.js` | REFACTOR / DEV ONLY | controlled prototype scanner; persistent Security Worker is production direction |
| `server/scanners/fileScanner.js` | PREPARED / GATED | bounded PDF/TXT parse; malware/sandbox still missing |
| `server/workers/securityWorker.js` | KEEP / ACTIVE SOURCE | first persistent real Worker |
| `server/workers/securityWorkerProcess.js` | KEEP / ACTIVE SOURCE | separate Worker process loop |

Security detector v1.1.0 covers/observes HTTPS, CSP, HSTS, frame protection, `nosniff`, HTTPS cookie Secure, mixed content, Referrer-Policy, Permissions-Policy and HttpOnly/SameSite observations.

---

# Persistent Scan / Evidence / Findings

- `server/domain/scanSubmission.js` — module/idempotency request boundary.
- `server/domain/scanLifecycle.js` — state machine.
- `server/domain/jobLifecycle.js` — Worker ID/lease/retry/permanent errors.
- `server/domain/assessmentResult.js` — validated Worker result + Rule provenance.
- `server/domain/scoringPolicy.js` — versioned scoring-profile resolution.
- `server/repositories/scanRepository.js` — atomic Scan+Jobs, Target/scoring snapshot capture.
- `server/repositories/jobRepository.js` — claim/complete/fail + Evidence/Finding persistence.
- `server/repositories/scanReadRepository.js` — tenant read model with internal provenance.
- `server/services/jobFailureService.js` — retry vs terminal failure.
- `server/routes/workspaceScanRoutes.js` — authenticated persistent submission/status.
- `server/routes/secureProductRoutes.js` + rule/finding/evidence routes — real product read/mutation surfaces.

Important invariants:

- only implemented persistent module currently externally available: `security`,
- unavailable modules fail `SCAN_MODULE_NOT_AVAILABLE`,
- Rule ID/version persists into Finding Instance,
- conflicting Rule provenance fails closed,
- Scan stores Target snapshot and scoring profile,
- final score resolves stored profile rather than using ad-hoc averages.

---

# Reports

- `server/domain/reportSnapshot.js` — Technical Report schema v2, canonical hash, integrity verification.
- `server/repositories/reportRepository.js` — immutable snapshot storage/list/read.
- `server/services/reportService.js` — member create, viewer read/list + integrity validation.
- `server/routes/reportRoutes.js` — authenticated report API.

Reports freeze Target, score profile, scanner/contract, module results, Evidence provenance/hashes and Finding Rule versions. Tampered snapshot fails `REPORT_INTEGRITY_FAILED`.

---

# Public Trust

- `server/domain/publicTrust.js` — privacy-safe public schema v1.
- `server/repositories/trustPublicationRepository.js` — publish/list/revoke/public lookup.
- `server/services/trustPublicationService.js` — admin publishing/revocation, report integrity gate.
- `server/middleware/trustLimiter.js` — public read limiting.
- `server/routes/trustPublicationRoutes.js` — internal management + public JSON + SVG badge.

Public projection intentionally excludes score, Findings and Evidence. Badge is not a compliance badge.

---

# Entitlements / usage

- `server/domain/entitlements.js` — module→capability map and entitlement checks.
- `server/repositories/entitlementRepository.js` — plan capabilities + transactional usage reservations.

Security remains available without paid capability. Future AI/browser/repository/document modules are capability-gated before they are enabled.

---

# Billing / Stripe

| Path | Status | GuardAI state |
|---|---|---|
| `server/domain/billingConfig.js` | KEEP / PREPARED | provider + plan↔Price mapping, fail-closed |
| `server/domain/billingState.js` | KEEP / PREPARED | Stripe Subscription normalization |
| `server/domain/billingCheckout.js` | KEEP / PREPARED | GuardAI/Stripe idempotency helpers |
| `server/billing/stripeProvider.js` | KEEP / PREPARED | narrow Stripe SDK adapter |
| `server/repositories/billingRepository.js` | KEEP / PREPARED | subscriptions, webhook inbox, Checkout requests |
| `server/services/billingService.js` | KEEP / PREPARED | admin Checkout + signed webhook reconciliation |
| `server/routes/billingRoutes.js` | KEEP / PREPARED | Billing status/Checkout + raw-body Stripe webhook |

Current billing safety:

- Billing defaults disabled.
- Browser sends internal plan code only.
- Price IDs are server config only.
- no real prices are hardcoded.
- Checkout requires Organization admin+ and Idempotency-Key.
- only one unresolved Checkout per Organization is designed.
- Stripe Customer/Checkout requests use deterministic provider idempotency keys.
- Checkout return grants no entitlement.
- Webhook signature requires exact raw body.
- event ID is durably deduplicated.
- full provider payload is not retained.
- Stripe test/live mode mismatch is rejected before DB mutation.
- current Subscription is fetched from Stripe and normalized before DB reconciliation.
- unknown Price/plan fails closed.

Not yet complete: real Stripe test configuration, Customer Portal/subscription management, staging integration tests, commercial plan/pricing decisions.

---

# Observability / operations foundations

- `server/middleware/requestContext.js` — generated request IDs + bounded metadata logging.
- `server/routes/healthRoutes.js` — liveness/readiness.
- API and Security Worker support graceful shutdown.
- `docs/DEPLOYMENT_TOPOLOGY.md` — API/Worker separation direction.

No Docker/reproducible deployment artifact is claimed yet because backend clean install/lockfile verification is still open.

---

# Test sources

`server/test/` now includes regression sources for target safety, Auth/RBAC, scan state/idempotency, Worker lifecycle, Evidence integrity, Security detector, Rules, scoring, reports, Trust, Billing, runtime safety and related domain services.

**Existence is not a passing result.** Clean execution remains mandatory.

---

# Remaining highest-priority rebuild items

1. restore executable CI / clean local validation,
2. regenerate verified backend lockfile,
3. dedicated GuardAI Supabase staging project + real migrations,
4. real Supabase frontend session adapter,
5. Stripe Customer Portal and staging Checkout/Webhook proof,
6. Privacy browser Worker,
7. Accessibility Worker,
8. Repository scanner pipeline,
9. upload quarantine/malware/parser isolation,
10. AI Governance evidence/review workflow,
11. Monitoring/Notifications,
12. real integrations,
13. remaining product modules only from real backend state,
14. full security/test/release/deployment phases.

## Maintenance rule

After substantial changes:

1. update this inventory,
2. update the active implementation tracker,
3. update the master guide/ADR when architecture or requirements change,
4. keep UI claims aligned with actual capability,
5. never mark build/test/migration/deployment green unless it executed.
