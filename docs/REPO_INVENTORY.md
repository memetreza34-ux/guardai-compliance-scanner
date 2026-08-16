# GuardAI Repository Inventory

> Living file-by-file disposition for the current repository. Keep this synchronized with `GUARDAI_MASTER_BUILD_GUIDE.md` while the prototype becomes the real SaaS.

Status values:

- `KEEP` — concept/implementation remains
- `REFACTOR` — keep value, change architecture/data flow
- `REPLACE` — current implementation must not remain production truth
- `LEGACY` — reference/fixture only until safe removal
- `LATER` — valuable but not MVP
- `REMOVE` — generated/obsolete artifact

---

## Root / engineering

| Path | Decision | Current GuardAI state |
|---|---|---|
| `.gitignore` | KEEP | Secrets, uploads, caches, coverage/test artifacts protected |
| `.npm-cache/`, `npm_cache/` | REMOVE / DONE | Removed from current Git tree |
| `.nvmrc` | KEEP | Node `24.18.1` baseline |
| `.editorconfig` | KEEP | UTF-8/LF/2-space baseline |
| `.env.example` | KEEP | Frontend `VITE_API_BASE_URL`; no secret `VITE_*` variables |
| `.github/workflows/ci.yml` | KEEP | PR/manual frontend quality + Gitleaks; runner execution externally blocked |
| `CONTRIBUTING.md` | KEEP | GuardAI engineering/security rules |
| `README.md` | KEEP | Truthful rebuild status |
| `package.json`, `package-lock.json` | KEEP | Frontend runtime/quality baseline and lock |
| `shared/scan-contract.json` | KEEP / EVOLVE | Shared contract metadata, current version `0.1.0` |
| `database/` | KEEP / ACTIVE | GuardAI-only DB/RLS design; no SQL applied to existing shared Supabase project |
| `docs/` | KEEP | Canonical engineering documentation |

---

## Frontend application core

| Path | Decision | Current GuardAI state |
|---|---|---|
| `src/App.tsx` | REFACTOR / ACTIVE | Typed navigation, real scan lifecycle, truthful errors/notices |
| `src/main.tsx` | KEEP / ACTIVE | Root validation + global error boundary |
| `src/api/scanApi.ts` | KEEP / ACTIVE | Active adapter, contract-version check, `/api/v1` scan routes |
| `src/config/previewFeatures.ts` | KEEP | Preview definitions isolated from App |
| `src/components/AppErrorBoundary.tsx` | KEEP | Global unexpected-error fallback |
| `src/data/mockScanEngine.ts` | LEGACY | Not used by active scan lifecycle |
| `src/types/scanner.ts` | REFACTOR | Legacy compatibility fields still need canonical detector/coverage model |
| `src/types/navigation.ts` | KEEP | Canonical tab typing |
| `src/types/scanOptions.ts` | KEEP / ACTIVE | Typed Security/Privacy/AI options; Accessibility disabled until real engine |

---

## Active product components

| Component | Decision | Current GuardAI state / future |
|---|---|---|
| `LandingPage.tsx` | KEEP / ACTIVE | Truthful technical-screening positioning |
| `UrlInputHero.tsx` | KEEP / ACTIVE | Typed module selection + bounded PDF/TXT upload UI |
| `ScanProgressModal.tsx` | KEEP / ACTIVE | Indeterminate until real job progress exists |
| `ScanResultsDashboard.tsx` | KEEP / ACTIVE | Evidence-first; missing coverage = `Nicht bewertet` |
| `TechnicalScanReport.tsx` | KEEP / ACTIVE | Technical report, not certification |
| `Navbar.tsx` / `CommandPalette.tsx` | KEEP / REFACTOR | Typed shell; real URL router/auth shell later |
| `FeaturePreview.tsx` | KEEP / ACTIVE | Prevents mock modules from posing as production features |
| `ThemeProvider.tsx`, `ThemeToggle.tsx`, `ui/` | KEEP | UI infrastructure; own accessibility review later |

### Legacy / preview product surfaces

The following remain as design references but are not production-backed yet:

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

These are rebuilt only when real backend/data/authorization foundations exist.

---

# Backend — modular active structure

## Bootstrap / application

| Path | Decision | Current GuardAI state |
|---|---|---|
| `server/index.js` | KEEP / ACTIVE | Minimal process bootstrap only |
| `server/app.js` | KEEP / ACTIVE | Express app, Helmet/CORS/body parsing, route mounting, 404/error boundary |
| `server/config.js` | KEEP / ACTIVE | Central runtime env/config |
| `server/runtime.js` | KEEP / EVOLVE | Shared AI/access runtime construction |
| `server/package.json` | KEEP / ACTIVE | Selected runtime dependencies; `pdf-parse 2.4.5`; recursive syntax check + tests |
| `server/package-lock.json` | REGENERATE / PENDING | Stale lock removed; real clean install must regenerate it |
| `server/.env.example` | KEEP / ACTIVE | GuardAI Supabase/Auth, Gemini, CORS and fail-safe AI config documented |

## Routes

| Path | Decision | Current GuardAI state |
|---|---|---|
| `server/routes/healthRoutes.js` | KEEP | Operational `/api/health` |
| `server/routes/authRoutes.js` | KEEP / PREPARED | `/api/v1/auth/me`, fail-closed until dedicated GuardAI Supabase config exists |
| `server/routes/scanRoutes.js` | KEEP / REFACTOR | `/api/v1/scan` and `/api/v1/scan-file`; still synchronous until job phase |

## Auth / domain

| Path | Decision | Current GuardAI state |
|---|---|---|
| `server/auth/supabaseAuth.js` | KEEP / PREPARED | Bearer token validation via Supabase Auth `/auth/v1/user`; no blind token trust |
| `server/auth/roles.js` | KEEP | owner/admin/member/viewer hierarchy |
| `server/domain/scanLifecycle.js` | KEEP | explicit queued/running/completed/failed/cancelled transitions |
| `server/lib/scanAccess.js` | KEEP / TEMPORARY | Anonymous paid-AI fail-safe until real entitlements/quotas |

## Scanner / network services

| Path | Decision | Current GuardAI state |
|---|---|---|
| `server/services/safeFetch.js` | KEEP / HARDEN | SSRF-safe bounded HTTP client with manual redirects and safe socket DNS lookup |
| `server/lib/targetSafety.js` | KEEP / HARDEN | HTTP target normalization + IP/DNS safety policy |
| `server/lib/scanContract.js` | KEEP / EVOLVE | Successful response validation + contract version injection |
| `server/lib/httpError.js` | KEEP | Shared HTTP error type |
| `server/scanners/schemas.js` | KEEP | Request/AI Zod schemas |
| `server/scanners/scoring.js` | KEEP / EVOLVE | Current deterministic prototype scoring helpers |
| `server/scanners/securityHeaders.js` | KEEP / EXPAND | First deterministic HTTP security detector |
| `server/scanners/webScanner.js` | KEEP / REFACTOR | Web fetch + header evidence + bounded AI text screening; later split into workers/evidence |
| `server/scanners/fileScanner.js` | KEEP / HARDEN | PDF/TXT parsing + AI screening; pdf-parse v2 lifecycle; malware/parser sandbox still required |

## Middleware

| Path | Decision | Current GuardAI state |
|---|---|---|
| `server/middleware/scanLimiter.js` | KEEP / REPLACE LATER | Memory/IP limiter only; durable account quotas still required |
| `server/middleware/upload.js` | KEEP / HARDEN | One PDF/TXT ≤10 MB; access gate before disk write |
| `server/middleware/errorHandler.js` | KEEP / EVOLVE | Central current API errors; canonical error envelope still pending |

## Backend tests / scripts

- `server/scripts/checkSource.js` — recursively syntax-checks all server JS files.
- `server/test/targetSafety.test.js` — URL/IP/DNS/socket safety.
- `server/test/scanAccess.test.js` — fail-safe AI access gate.
- `server/test/scanContract.test.js` — response contract.
- `server/test/authHeader.test.js` — Bearer parsing.
- `server/test/roles.test.js` — organization role hierarchy.
- `server/test/scanLifecycle.test.js` — scan state transitions.

**Important:** these tests exist but are not yet claimed green because the clean execution environment remains blocked.

---

# Database / Supabase design

| Path | Decision | Current GuardAI state |
|---|---|---|
| `database/001_guardai_core_schema_draft.sql` | KEEP / REVIEW | GuardAI-only schema/RLS design source; not applied migration |
| `database/README.md` | KEEP | Draft → generated Supabase migration procedure |
| `docs/adr/0001-dedicated-supabase-postgres-auth.md` | KEEP | Dedicated GuardAI Supabase/Postgres/Auth decision |

Core draft includes:

- profiles
- organizations
- memberships
- targets
- scans
- scan_jobs
- evidence
- rules / rule_versions
- legal_sources
- findings / finding_instances
- subscriptions
- audit_events
- indexes
- tenant-aware RLS
- private membership-role helper
- browser read-mostly access
- worker-only job state

The existing connected multi-application Supabase project remains **off-limits** for GuardAI.

---

## Active safety/integrity changes already implemented

- [x] no fake scan fallback
- [x] no fake Accessibility score
- [x] fake GitHub repository scoring disabled
- [x] contract-version boundary
- [x] `/api/v1` application API boundary
- [x] validated AI output and untrusted-content prompt boundary
- [x] anonymous paid-AI path disabled by default
- [x] HTTP/HTTPS-only target policy
- [x] credentials/nonstandard-port rejection
- [x] private/loopback/link-local/reserved IP rejection
- [x] redirect revalidation
- [x] socket-level safe DNS lookup
- [x] environment proxy routing disabled for target fetches
- [x] bounded target response size/time
- [x] PDF/TXT only, one file, ≤10 MB
- [x] PDF magic signature / TXT binary-null check
- [x] temporary file cleanup
- [x] pdf-parse v2 parser lifecycle with `destroy()`
- [x] initial fail-closed Supabase token verification boundary
- [x] explicit GuardAI organization-role hierarchy
- [x] explicit scan lifecycle state machine

---

## Remaining major rebuild items

1. clean backend install + regenerated lockfile + real test execution,
2. dedicated GuardAI Supabase project and generated real migration,
3. server database client/repositories + organization membership authorization,
4. durable entitlements/quotas/distributed rate limiting,
5. asynchronous persisted scan/job/worker lifecycle,
6. canonical detector state including `not_assessed` / `error`,
7. stored evidence + rule engine + finding persistence,
8. browser-based Privacy/Consent worker,
9. real Accessibility/axe worker,
10. real repository dependency/secret/SAST pipeline,
11. malware quarantine + parser sandbox,
12. billing, product dashboard/history, Trust Center, monitoring and integrations,
13. removal of legacy mocks once visual value is migrated.

---

## Inventory maintenance rule

Whenever a substantial change lands:

1. update this inventory,
2. update the active phase tracker,
3. update the master guide only when architecture/order/requirements change,
4. keep visible claims aligned with reality,
5. never mark a test/build/deployment condition as passed unless it actually executed.
