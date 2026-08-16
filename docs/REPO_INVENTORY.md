# GuardAI Repository Inventory

> Living file-by-file disposition for the current repository. Keep this synchronized with `GUARDAI_MASTER_BUILD_GUIDE.md` while the prototype is converted into the real SaaS.

Status values:

- `KEEP` — concept/implementation remains
- `REFACTOR` — keep value, change architecture/data flow
- `REPLACE` — current implementation must not remain the production source of truth
- `LEGACY` — retained only as reference/fixture until safe removal
- `LATER` — valuable but not MVP
- `REMOVE` — repository/runtime artifact that should not remain tracked

---

## Root

| Path | Decision | Current GuardAI state |
|---|---|---|
| `.gitignore` | KEEP | Hardened; protects env files, uploads, generated caches, coverage and test artifacts |
| `.npm-cache/` | REMOVE / DONE | Removed from current Git tree |
| `npm_cache/` | REMOVE / DONE | Removed from current Git tree |
| `.nvmrc` | KEEP | Node `24.18.1` project baseline |
| `.editorconfig` | KEEP | UTF-8/LF/2-space editor baseline |
| `.env.example` | KEEP / EXPAND | Frontend `VITE_API_BASE_URL` documented; never store secrets in `VITE_*` |
| `.oxlintrc.json` | KEEP / REVIEW | Existing hook rules; deeper rule review still pending |
| `.github/workflows/ci.yml` | KEEP | PR/manual quality + history secret scan; execution currently blocked by GitHub runner billing/spending state |
| `CONTRIBUTING.md` | KEEP | GuardAI-specific engineering/security rules |
| `README.md` | KEEP | Reflects prototype/rebuild reality and runtime baseline |
| `components.json` | KEEP | UI tooling configuration |
| `index.html` | KEEP / REVIEW | Vite entry; metadata/fonts/CSP/SEO review later |
| `package.json` | KEEP / REFACTOR | Runtime/package manager and quality scripts defined |
| `package-lock.json` | KEEP | Reproducible frontend dependency lock |
| `tsconfig*.json` | KEEP / HARDEN | Full strictness review waits for executable clean build |
| `vite.config.*` | KEEP / REFACTOR | Deployment/proxy details evolve later |
| `public/` | KEEP | Review before production launch |
| `docs/` | KEEP | Canonical engineering documentation |

---

## Frontend application core

| Path | Decision | Current GuardAI state |
|---|---|---|
| `src/App.tsx` | REFACTOR / ACTIVE | Duplicate rendering removed; typed navigation; real scan request/error/notices lifecycle |
| `src/main.tsx` | KEEP / ACTIVE | Root check, global AppErrorBoundary, GuardAI-specific theme storage key |
| `src/api/scanApi.ts` | KEEP / ACTIVE | Active API adapter; category normalization, runtime shape guards, coverage notices, no fake fallback |
| `src/config/previewFeatures.ts` | KEEP | Central definitions for product surfaces intentionally isolated as previews |
| `src/components/AppErrorBoundary.tsx` | KEEP | Global fallback for unexpected render/runtime errors |
| `src/vite-env.d.ts` | KEEP | Types `VITE_API_BASE_URL` |
| `src/data/mockScanEngine.ts` | LEGACY | No longer used by active App scan lifecycle; temporary fixture/reference only |
| `src/types/scanner.ts` | REFACTOR | Legacy contract still has benchmark/risk-status concepts; canonical versioned contract is next |
| `src/types/navigation.ts` | KEEP | Canonical active-tab type and guard |
| `src/types/scanOptions.ts` | KEEP / ACTIVE | Security/Privacy/AI options typed; Accessibility deliberately unavailable until real scanner exists |
| `src/lib/` | KEEP / EXPAND | Shared frontend utilities later |

---

## Product components

| Component | Decision | Current GuardAI state / future |
|---|---|---|
| `AiCounsel.tsx` | LATER / REBUILD | Real workspace/evidence context; no canned legal findings |
| `AuditHub.tsx` | LATER / REBUILD | Database-backed controls/evidence after MVP core |
| `BadgeGenerator.tsx` | REFACTOR LATER | Only real public Trust Center state may become a public badge |
| `CheckoutSimulation.tsx` | REPLACE | Real billing + server entitlements |
| `CommandPalette.tsx` | KEEP / REFACTOR | Centrally typed navigation; future routes later |
| `ComplianceDashboard.tsx` | LEGACY | Removed from active scan-result path because of hardcoded benchmark/strong claims |
| `ScanResultsDashboard.tsx` | KEEP / ACTIVE | Evidence-first productive result view; absent coverage is `Nicht bewertet` |
| `DocumentGenerator.tsx` | LATER / REBUILD | Evidence-backed documents; no blanket legal-validity claims |
| `FeaturePreview.tsx` | KEEP / ACTIVE | Safe boundary for design prototypes that are not real functionality yet |
| `IntegrationsHub.tsx` | LATER / REBUILD | Real OAuth/API connection state |
| `LandingPage.tsx` | KEEP / ACTIVE | Truthful prototype/rebuild status and technical-screening limitations |
| `LeadGenModal.tsx` | REFACTOR | Real backend, consent, real failure state, deduplication |
| `Navbar.tsx` | KEEP / REFACTOR | Typed navigation; visible Prototype state; real auth/workspaces later |
| `PolicyManager.tsx` | LATER / REBUILD | Real versioned policy/control data after core |
| `PricingModal.tsx` | REFACTOR | Real plans/entitlements and correct billing language |
| `PrintableReport.tsx` | LEGACY | Old verification-style report no longer active |
| `TechnicalScanReport.tsx` | KEEP / ACTIVE | Technical report from current real ScanResult with explicit limitations |
| `PublicTrustCenter.tsx` | REBUILD | Customer-approved real evidence/status only |
| `RemediationModal.tsx` | REFACTOR | Real finding/remediation workflow |
| `ScanProgressModal.tsx` | KEEP / ACTIVE | Indeterminate truthful progress until job events exist |
| `TemplatesHub.tsx` | REVIEW / LATER | Version templates and legal sources before public claims |
| `ThemeProvider.tsx` | KEEP | UI infrastructure |
| `ThemeToggle.tsx` | KEEP | UI infrastructure |
| `TrueSight.tsx` | LATER / LABS | No production release until real model + calibrated evaluation exists |
| `UrlInputHero.tsx` | KEEP / ACTIVE | Typed web-module selector; Accessibility disabled; PDF/TXT client boundary |
| `UserDashboard.tsx` | REBUILD | Real user/workspace/target/scan statistics |
| `WorkspaceSwitcher.tsx` | REFACTOR | Connect to real organizations/memberships |
| `ui/` | KEEP | Presentation primitives; accessibility review later |

---

## Backend

| Path | Decision | Current GuardAI state / future |
|---|---|---|
| `server/index.js` | REFACTOR / ACTIVE | Honest synchronous prototype; safe target fetch, module selection, validated AI output, upload limits; still needs decomposition/auth/jobs |
| `server/package.json` | KEEP / ACTIVE | Current runtime imports declared; dev/start/check/test scripts added |
| `server/package-lock.json` | REGENERATE / PENDING | Stale lock removed; regenerate only from a verified clean backend install |
| `server/.env.example` | KEEP / ACTIVE | PORT, CORS, Gemini key and fail-safe unauthenticated-AI gate documented |
| `server/lib/httpError.js` | KEEP | Shared typed-by-convention HTTP error boundary for backend modules |
| `server/lib/targetSafety.js` | KEEP / HARDEN | URL/IP/DNS safety rules plus socket-level safe lookup; production regression validation still pending |
| `server/lib/scanAccess.js` | KEEP / TEMPORARY | Fail-safe gate preventing anonymous Gemini cost before real auth/entitlements/quotas |
| `server/test/targetSafety.test.js` | KEEP | Node regression tests for URL/IP/preflight/socket DNS safety |
| `server/test/scanAccess.test.js` | KEEP | Tests fail-safe AI-access policy |

### Backend package state

Current `server/package.json` now declares the packages imported by the active server. The old lockfile was intentionally removed because it represented only a subset of those dependencies.

**Rule:** do not claim backend reproducibility until a clean install regenerates the lockfile and `npm test` / `npm run check` actually execute.

---

## Active backend safety changes already implemented

- [x] scan-option validation and enforcement
- [x] no fake Accessibility score
- [x] fake GitHub repository scoring disabled with HTTP 501
- [x] schema validation for AI output
- [x] untrusted webpage/document prompt boundaries
- [x] explicit server-side Gemini key configuration
- [x] environment-controlled CORS
- [x] response `X-Powered-By` disabled
- [x] only HTTP/HTTPS targets, no embedded credentials, no nonstandard ports
- [x] private/loopback/link-local/reserved IPv4/IPv6 rejection
- [x] every redirect checked manually
- [x] scanner request proxying disabled
- [x] socket-level DNS resolution checked before connection
- [x] PDF/TXT only, max 10 MB, file count 1
- [x] PDF magic signature and TXT binary-null validation
- [x] temporary upload cleanup in `finally`
- [x] anonymous Gemini usage disabled by default until real auth/quota exists

---

## Prototype behaviors already removed from the active scan path

- [x] duplicate main-view rendering in `App.tsx`
- [x] untyped central navigation casts
- [x] hardcoded production-certification claims in global footer
- [x] fake timer-based scanner stages
- [x] API-error fallback that looked like a real compliance result
- [x] active legacy dashboard with fake industry benchmark
- [x] landing-page promise of fully automated legal review/certification
- [x] unsupported image-analysis claim
- [x] GitHub scan success based on hardcoded Privacy/AI/Accessibility scores
- [x] file scan success based on fake standard-category 100 scores

---

## Remaining major rebuild items

- real authentication, organizations, RBAC and server-side authorization,
- durable quotas/entitlements and distributed rate limits,
- canonical shared/versioned scanner request/response contract,
- scanner status semantics that represent `not_assessed` directly,
- persistent scan jobs + database + worker queue,
- full browser-based Privacy/Consent evidence,
- real Accessibility/axe scanner,
- real Git repository pipeline for dependencies/secrets/SAST,
- deterministic rule/evidence engine,
- malware quarantine and stronger parser isolation,
- real billing, dashboards, Trust Center and integrations,
- removal of remaining legacy mock files after their visual value has been migrated.

---

## Inventory maintenance rule

Whenever a component is substantially changed:

1. update its row here,
2. update the active phase tracker,
3. update the master guide if architecture/order/requirements changed,
4. ensure visible product claims match implementation,
5. never mark a build/test condition as passed unless it actually executed.
