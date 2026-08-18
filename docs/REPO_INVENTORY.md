# GuardAI Repository Inventory

> Living disposition of the current `main` tree. Keep aligned with `GUARDAI_MASTER_BUILD_GUIDE.md` and `PHASE_1_TRACKER.md`.

Status vocabulary:

- `KEEP` — implementation/concept remains.
- `ACTIVE` — used by a real source path.
- `PREPARED` — real-data implementation exists but environment/provider is not connected or validated.
- `GATED` — real source exists but external request/production activation is deliberately blocked.
- `REFACTOR` — retain value, change architecture/data flow.
- `LEGACY` — reference only; must not pose as production truth.

---

# Root / engineering

| Path | Status | GuardAI state |
|---|---|---|
| `.nvmrc` | KEEP | Node 24.18.1 baseline |
| `.editorconfig` | KEEP | repository formatting baseline |
| `.gitignore` | KEEP | secrets/caches/uploads/build outputs protected |
| `.env.example` | KEEP | public frontend API/Supabase variables only |
| `.github/workflows/ci.yml` | KEEP / BLOCKED | quality + Gitleaks; runner allocation externally blocked |
| `CONTRIBUTING.md` | KEEP | engineering/security contribution rules |
| `README.md` | KEEP / EVOLVE | truthful rebuild status |
| `package.json`, `package-lock.json` | KEEP | frontend package baseline |
| `shared/scan-contract.json` | KEEP / ACTIVE | persistent Scan contract v0.2.0 |
| `shared/rules/security-baseline.json` | KEEP / ACTIVE | `security.headers@1.1.0` Rule registry |
| `shared/rules/repository-baseline.json` | KEEP / GATED | `repository.baseline@1.0.0` Rule registry |
| `shared/scoring/security-mvp-v1.json` | KEEP / ACTIVE | `security-mvp@1` |
| `shared/scoring/repository-mvp-v1.json` | KEEP / GATED | bounded Repository baseline profile |
| `database/` | KEEP / PREPARED | GuardAI-only SQL design drafts `001–025`; none applied |
| `docs/adr/0001-*` | KEEP | dedicated GuardAI Supabase/Postgres/Auth |
| `docs/adr/0002-*` | KEEP | native PostgreSQL transactions |
| `docs/adr/0003-*` | KEEP | Stripe Checkout/Billing |
| `docs/adr/0004-*` | KEEP | GitHub App integration |

---

# Frontend core / public paths

| Path | Status | GuardAI state |
|---|---|---|
| `src/main.tsx` | KEEP / ACTIVE | routes public Trust, Billing return, Contact and GitHub callback before product App |
| `src/App.tsx` | REFACTOR / ACTIVE | truthful prototype shell; final persistent routing pending |
| `src/components/AppErrorBoundary.tsx` | KEEP | global failure boundary |
| `src/api/apiClient.ts` | KEEP / ACTIVE | authenticated API/error boundary |
| `src/api/scanApi.ts` | LEGACY MIGRATION | synchronous controlled prototype adapter |
| `src/data/mockScanEngine.ts` | LEGACY | not active scan truth |
| `src/types/scanner.ts` | REFACTOR | legacy compatibility type debt |

Public real-data pages:

- `PublicTrustPage.tsx` — `/trust/:slug`.
- `BillingReturnPage.tsx` — neutral Checkout/Portal return.
- `PublicContactPage.tsx` — policy-gated contact capture.
- `GitHubIntegrationCallbackPage.tsx` — one-time installation completion.

## Authenticated product shell

`src/components/AuthWorkspaceShell.tsx` composes real-data source surfaces through one access-token adapter:

- `WorkspaceOnboarding`
- `ReportCenter`
- `TrustCenterManager`
- `MonitoringCenter`
- `GitHubIntegrationManager`
- `BillingCenter`

Provider-independent Auth/session infrastructure exists, but real dedicated Supabase frontend integration remains environment-gated.

### API/type groups

- `workspaceApi.ts` / `types/workspace.ts`
- `reportApi.ts` / `types/report.ts`
- `trustApi.ts` / `types/trust.ts`
- `billingApi.ts` / `types/billing.ts`
- `monitoringApi.ts` / `types/monitoring.ts`
- `githubIntegrationApi.ts` / `types/githubIntegration.ts`
- `leadApi.ts` / `types/lead.ts`

### Legacy visual references

Remain reference-only and must not become product truth without real backend state:

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

# Backend application / configuration

| Path | Status | GuardAI state |
|---|---|---|
| `server/index.js` | KEEP / ACTIVE | API bootstrap + graceful shutdown |
| `server/app.js` | KEEP / ACTIVE | request context, Helmet/CORS, raw Stripe/GitHub webhooks, API routes, errors |
| `server/config.js` | KEEP / ACTIVE | DB/Auth/worker/Billing/Lead runtime config |
| `server/lib/runtimeSafety.js` | KEEP / ACTIVE | fail-fast Production gates for prototype/AI/Auth/DB/CORS/Stripe/Lead/GitHub |
| `server/runtime.js` | KEEP / EVOLVE | controlled AI runtime |
| `server/package.json` | KEEP / UNVALIDATED | Security/Repository workers + monitor scheduler scripts; backend lockfile still pending verified clean install |
| `server/.env.example` | KEEP | server-only boundaries documented |

Raw provider signatures are verified before normal JSON parsing:

- `POST /api/v1/billing/stripe/webhook`
- `POST /api/v1/integrations/github/webhook`

---

# Auth / Organizations / Targets

Core paths:

- `server/auth/supabaseAuth.js`
- `server/auth/roles.js`
- `server/services/organizationAuthorization.js`
- `server/repositories/membershipRepository.js`
- `server/domain/organization.js`
- `server/domain/websiteTarget.js`
- `server/domain/repositoryTarget.js`
- `server/domain/targetAuthorization.js`
- `server/domain/targetScanCompatibility.js`
- `server/domain/targetVerification.js`
- `server/repositories/organizationRepository.js`
- `server/repositories/targetRepository.js`
- `server/repositories/targetVerificationRepository.js`

Website Targets begin unverified and use backend-controlled DNS TXT ownership verification.

GitHub Repository Targets:

- can be created only by admin+,
- must appear in the **current** provider-authorized installation repository list,
- store installation/repository IDs but no access token,
- become `failed` if provider authorization disappears,
- are re-verified only after a new provider sync.

---

# Scanner / network safety

| Path | Status | GuardAI state |
|---|---|---|
| `server/lib/targetSafety.js` | KEEP / ACTIVE | URL/IP/DNS SSRF policy |
| `server/services/safeFetch.js` | KEEP / ACTIVE | bounded redirects + safe socket DNS + proxy disabled |
| `server/scanners/securityHeaders.js` | KEEP / ACTIVE | `security.headers@1.1.0` |
| `server/scanners/securityRuleRegistry.js` | KEEP / ACTIVE | Security Rule provenance |
| `server/scanners/repositoryBaseline.js` | KEEP / GATED | bounded commit-pinned Repository baseline |
| `server/scanners/repositoryRuleRegistry.js` | KEEP / GATED | Repository Rule provenance |
| `server/scanners/webScanner.js` | REFACTOR / DEV ONLY | controlled synchronous prototype |
| `server/scanners/fileScanner.js` | PREPARED / GATED | PDF/TXT boundary; quarantine/sandbox missing |

### Security worker

- `server/workers/securityWorker.js`
- `server/workers/securityWorkerProcess.js`

Externally requestable persistent module remains **`security` only**.

### Repository baseline worker — source exists, external module disabled

- `server/workers/repositoryWorker.js`
- `server/workers/repositoryWorkerProcess.js`
- `server/integrations/githubAppProvider.js`

Repository reader:

- exchanges GitHub App credentials for short-lived Installation Token in process memory,
- resolves default branch → immutable commit SHA → tree SHA,
- rejects provider-truncated recursive trees,
- reads only explicitly selected bounded blobs,
- persists no Installation Token or raw credential match.

Detector budgets:

- max tree entries: `5000`
- max selected files: `100`
- max file bytes: `128 KiB`
- max selected bytes: `2 MiB`
- max indicator locations: `100`

Current indicator families:

- private-key PEM marker
- GitHub credential prefix
- AWS access-key ID shape
- Stripe live secret-key prefix

Evidence stores only indicator type, path and line. **Matched credential values are never persisted.**

Repository score/notice semantics are explicitly limited to the bounded baseline and do not claim full SAST, comprehensive secret scanning, dependency-vulnerability analysis or SBOM.

---

# Persistent Scan / Queue / Usage

Core:

- `server/domain/scanSubmission.js`
- `server/domain/scanLifecycle.js`
- `server/domain/jobLifecycle.js`
- `server/domain/assessmentResult.js`
- `server/domain/scoringPolicy.js`
- `server/domain/entitlements.js`
- `server/repositories/scanRepository.js`
- `server/repositories/jobRepository.js`
- `server/repositories/entitlementRepository.js`
- `server/repositories/scanReadRepository.js`
- `server/services/jobFailureService.js`

Current invariants:

- unavailable modules return `SCAN_MODULE_NOT_AVAILABLE`,
- target/module compatibility is enforced,
- Scan freezes Target + scoring profile provenance,
- Rule ID/version persists with Finding Instance,
- paid module requirements derive from requested modules,
- Scan + Jobs + paid usage reservation commit together,
- no paid Job becomes visible before reservation succeeds,
- DB draft `024_*` consumes reservations on `completed` and releases on `failed/cancelled`,
- score is computed from the stored versioned profile.

Current profile selection:

- Website + Security → `security-mvp@1`
- Repository + Repository → `repository-mvp@1`

`repository` is still intentionally absent from `ENABLED_PERSISTENT_SCAN_MODULES` until executable validation/staging gates run.

---

# Reports / Trust

Reports:

- `server/domain/reportSnapshot.js`
- `server/repositories/reportRepository.js`
- `server/services/reportService.js`
- `server/routes/reportRoutes.js`

Technical Report v2 freezes target/scanner/contract/scoring/Rule/Evidence provenance and is SHA-256 integrity-verified on create/read/list.

Trust:

- `server/domain/publicTrust.js`
- `server/repositories/trustPublicationRepository.js`
- `server/services/trustPublicationService.js`
- `server/routes/trustPublicationRoutes.js`

Public projection intentionally excludes score, Findings and Evidence. SVG is a technical-screening badge, not a compliance certification.

---

# Billing / Entitlements

Stripe source boundary:

- `server/domain/billingConfig.js`
- `server/domain/billingState.js`
- `server/domain/billingCheckout.js`
- `server/billing/stripeProvider.js`
- `server/repositories/billingRepository.js`
- `server/services/billingService.js`
- `server/routes/billingRoutes.js`

Implemented source safety:

- Billing defaults disabled.
- browser sends GuardAI plan code only.
- server maps plan to configured Stripe Price ID.
- no real price is hardcoded.
- Checkout uses Organization + provider idempotency.
- one unresolved Checkout per Organization design.
- webhook signature uses exact raw body.
- event IDs are durably deduplicated.
- test/live mismatch fails before mutation.
- current Stripe Subscription is fetched before reconciliation.
- Customer Portal uses stored server-side Customer ID only.
- Checkout/Portal return pages do not grant entitlement.
- paid Scan usage is reserved in Scan transaction.

Real Stripe test configuration and commercial plan limits remain staging/product decisions.

---

# Lead Capture

- `server/domain/leadCapture.js`
- `server/repositories/leadRepository.js`
- `server/services/leadCaptureService.js`
- `server/services/leadPersistence.js`
- `server/routes/leadRoutes.js`
- `server/middleware/leadLimiter.js`
- `src/components/PublicContactPage.tsx`

Safety:

- Lead Capture defaults disabled.
- public policy read works without opening DB.
- Production activation requires HTTPS app URL, Privacy Notice version and bounded retention.
- minimal contact data only.
- SHA-256 submission fingerprint + Idempotency-Key.
- honeypot does not persist.
- no IP/User-Agent advertising profile.
- Marketing remains fail-closed until real Double-Opt-In delivery exists.

Legacy `LeadGenModal.tsx` remains unused.

---

# Monitoring / Notifications

- `server/domain/monitoring.js`
- `server/repositories/monitorRepository.js`
- `server/repositories/notificationRepository.js`
- `server/services/monitoringService.js`
- `server/services/monitoringPersistence.js`
- `server/workers/monitorSchedulerProcess.js`
- `server/routes/monitorRoutes.js`
- `server/routes/notificationRoutes.js`
- `src/components/MonitoringCenter.tsx`

Current MVP:

- verified Website + Security only,
- schedule 60–10080 minutes,
- scheduler leases + `SKIP LOCKED`,
- deterministic scheduled Scan idempotency,
- no catch-up storm,
- Monitor Run → Scan provenance,
- deverified target pauses monitoring,
- in-app deduplicated new-Finding / Scan-failure events,
- no email/push claim.

---

# GitHub App Integration

- `server/domain/githubIntegration.js`
- `server/integrations/githubRuntime.js`
- `server/integrations/githubAppProvider.js`
- `server/repositories/githubIntegrationRepository.js`
- `server/services/githubIntegrationService.js`
- `server/services/githubIntegrationPersistence.js`
- `server/routes/githubIntegrationRoutes.js`
- `src/api/githubIntegrationApi.ts`
- `src/components/GitHubIntegrationManager.tsx`
- `src/components/GitHubIntegrationCallbackPage.tsx`

Safety:

- Production config is all-or-nothing.
- one-time installation state is stored only as hash.
- installation is provider-rechecked before linking.
- installation is tenant-bound.
- short-lived access tokens stay in memory.
- webhook HMAC uses raw body and delivery IDs deduplicate retries.
- suspend/delete/repository-selection changes can invalidate Repository Targets.
- Target creation requires live provider authorization.

---

# Database design

`database/README.md` is the detailed source/migration proof matrix.

Current drafts: `001_*` through `025_*`.

Recent critical fixes/additions:

- `018_*` now includes `submission_fingerprint` expected by Lead repository.
- `019_*`/`020_*` enforce Monitor/Run Organization consistency.
- `023_*` adds GitHub Repository Target provenance/uniqueness.
- `024_*` models terminal Scan usage consume/release.
- `025_*` seeds Repository Rules + scoring profile.
- `008_*` and `025_*` were corrected to the **actual** core `rules` / `rule_versions` schema.

No SQL draft is an applied migration.

---

# Test-source inventory

`server/test/` contains source regression coverage for:

- Auth/RBAC/Organizations/Targets/DNS
- SSRF/network guards
- persistent Scan/Job lifecycle/idempotency
- transactional Entitlement usage helpers
- Security detector/Rules/scoring
- Report integrity / Trust privacy projection
- Stripe Billing/Checkout/Webhook/Portal boundaries
- Lead privacy/idempotency
- Monitoring scheduler/notifications
- GitHub installation/webhook/Repository Target authorization
- bounded GitHub commit/tree/blob reader
- Repository Rule registry
- Repository detector budgets + credential-value redaction
- Repository Worker authorization and completion
- Production runtime safety

**Test-source existence is not a passing-test claim.**

---

# Highest-priority remaining gates

1. restore executable CI / clean validation,
2. regenerate verified backend lockfile,
3. run backend syntax/unit suite and frontend lint/typecheck/build,
4. provision dedicated GuardAI Supabase staging,
5. consolidate SQL `001–025` into generated migrations and test RLS/invariants,
6. configure Stripe test mode and a least-privilege dedicated GitHub App in staging,
7. run real Repository baseline fixtures including authorization removal and private repository,
8. only after clean validation consider enabling persistent `repository`,
9. continue Privacy/Accessibility/Asset workers behind hard module gates,
10. replace ad-hoc frontend routing/session placeholders after Auth staging exists.

## Maintenance rule

After substantial changes:

1. update this inventory,
2. update the active implementation tracker,
3. update master guide/ADR when architecture or requirements change,
4. keep UI claims aligned with actual capability,
5. never mark build/test/migration/deployment green unless it executed.
