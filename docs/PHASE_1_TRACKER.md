# GuardAI Implementation Tracker — Living Status

> Source-of-truth implementation status against `GUARDAI_MASTER_BUILD_GUIDE.md`.

## Global status

**Repository implementation has advanced through major parts of Phases 0–21. Formal quality gates remain open because clean install/lint/typecheck/build/tests and real staging migrations have not executed.**

Never interpret an implemented file or test source as a passing production gate.

### External blocker

GitHub Actions previously created a real run but allocated no runner (`runner_id = 0`, no steps) because of account billing/spending state. That is not treated as a GuardAI code failure.

### Current baseline

| Area | GuardAI state |
|---|---|
| Node | `24.18.1` LTS |
| Frontend | React 19 + TypeScript + Vite 8 |
| Backend | Node/Express CommonJS, modular |
| API | `/api/v1` |
| Scan contract | `0.2.0` |
| DB/Auth target | dedicated GuardAI Supabase Auth + PostgreSQL |
| Backend DB access | native PostgreSQL repositories/transactions |
| Worker | separate Security process |
| Security detector | `security.headers@1.1.0` |
| Rule catalog | versioned Security baseline |
| Scoring | `security-mvp@1` |
| Report schema | immutable Technical Report v2 |
| Public Trust | report-backed projection v1 |
| Billing provider | Stripe, ADR 0003; disabled until configured |
| Existing shared Supabase project | **never reuse for GuardAI** |

---

# Phase progress

## Phase 0 — Scope / repository hygiene — IMPLEMENTED

- [x] master guide + repo inventory established
- [x] truthful README
- [x] hardened `.gitignore`
- [x] committed npm caches removed
- [x] targeted historical secret review
- [x] prototype/mock risk inventory

## Phase 1 — Development standards — IMPLEMENTED, NOT VALIDATED

- [x] Node/package-manager baseline
- [x] `.nvmrc`, EditorConfig, contribution rules
- [x] root/backend quality scripts
- [x] GitHub Actions workflow + Gitleaks
- [x] immutable external Action SHAs
- [x] recursive backend syntax-check source script
- [ ] root clean install executed
- [ ] backend clean install + regenerated lockfile executed
- [ ] lint/typecheck/build/tests actually executed

## Phase 2 — Frontend core repair — PARTIAL

- [x] duplicate active rendering removed
- [x] global Error Boundary
- [x] typed active navigation
- [x] mock product surfaces isolated behind Preview boundaries
- [x] public `/trust/:slug` and neutral `/billing/return` boot before product App
- [x] authenticated Workspace shell/components prepared
- [ ] replace ad-hoc path/tab routing with final router structure
- [ ] mount real Supabase session adapter after dedicated project exists
- [ ] remove remaining legacy UI references after real replacements are active

## Phase 3 — Shared contracts / API client — ADVANCED

- [x] shared scan contract `0.2.0`
- [x] structured API error envelope
- [x] persistent Scan response validator strips internal fields
- [x] authenticated API client boundary
- [x] Workspace/Report/Trust/Billing frontend clients
- [x] no fake API success fallback
- [ ] broader Organization/Target public contract if external SDK is shipped

## Phase 4 — Backend foundation — ADVANCED

- [x] minimal process bootstrap
- [x] modular routes/services/repositories/domain/scanners/workers
- [x] central config
- [x] request IDs + bounded logs
- [x] liveness/readiness separation
- [x] graceful API/DB shutdown
- [x] fail-fast production safety checks
- [x] legacy prototype endpoints disabled by default
- [ ] clean runtime validation

## Phase 5 — Auth / Workspaces / RBAC — SOURCE IMPLEMENTED

- [x] fail-closed Supabase bearer validation path
- [x] `/api/v1/auth/me`
- [x] owner/admin/member/viewer roles
- [x] Organization authorization service
- [x] Organization creation/listing
- [x] Organization + Owner Membership + initial subscription atomic creation
- [x] Website Target create/list/get
- [x] authenticated Workspace onboarding UI
- [ ] dedicated GuardAI Supabase Auth project provisioned
- [ ] real login/email verification/password-reset integration
- [ ] staging RBAC integration tests

## Phase 6 — Database / persistence — SOURCE IMPLEMENTED, MIGRATIONS NOT APPLIED

- [x] PostgreSQL repository layer
- [x] RLS/tenant schema designs
- [x] composite tenant FK design
- [x] Scan/Job/Evidence/Finding/Audit persistence
- [x] Report/Trust/Billing persistence designs
- [x] SQL design drafts through `017_*`
- [ ] consolidate drafts into generated real migrations
- [ ] staging apply
- [ ] DB advisors
- [ ] cross-tenant/RLS/invariant integration tests

## Phase 7 — Queue / Worker runtime — SOURCE IMPLEMENTED

- [x] async Scan + Jobs
- [x] Organization-scoped Scan idempotency
- [x] `FOR UPDATE SKIP LOCKED`
- [x] lease ownership/renewal/reclaim
- [x] bounded exponential retry
- [x] terminal failure/cancellation
- [x] duplicate completion protection
- [x] separate Security worker process
- [ ] production process/container wiring
- [ ] heartbeat strategy for future long-running Workers

## Phase 8 — Safe fetcher / ownership — ADVANCED

- [x] HTTP/HTTPS only
- [x] credential/nonstandard-port rejection
- [x] private/loopback/link-local/reserved IP protection
- [x] redirect revalidation
- [x] socket-level safe DNS lookup
- [x] proxy environment disabled for target fetch
- [x] bounded time/body
- [x] DNS-rebinding-oriented lookup validation
- [x] DNS TXT Target ownership challenge
- [x] verified Target required before persistent Scan
- [x] Worker rechecks verification state
- [ ] staging DNS/SSRF integration suite
- [ ] periodic ownership re-verification policy

## Phase 9 — Web Security Scanner — MVP SOURCE IMPLEMENTED

`security.headers@1.1.0` observes/checks:

- [x] HTTPS final transport
- [x] CSP
- [x] HSTS when HTTPS applies
- [x] X-Frame-Options / CSP `frame-ancestors`
- [x] `X-Content-Type-Options: nosniff`
- [x] HTTPS cookies missing `Secure`
- [x] mixed HTTP content in HTTPS document
- [x] Referrer-Policy observation
- [x] Permissions-Policy observation
- [x] HttpOnly/SameSite observations without overclaiming
- [x] normalized Evidence rather than raw header persistence

Still expand after clean validation: TLS detail, additional deterministic public config checks, crawl-budget/multi-page policy.

## Phases 10–14 — Privacy / Accessibility / AI Governance / Repository / Assets — GATED

- [x] module IDs/contracts/capability design exist
- [x] unimplemented persistent modules rejected with `SCAN_MODULE_NOT_AVAILABLE`
- [x] document prototype boundary is fail-closed for public use
- [ ] Privacy browser Worker
- [ ] consent state machine
- [ ] Accessibility/axe Worker
- [ ] AI-Governance Evidence workflow
- [ ] Repository dependency/secret/SAST/SBOM pipeline
- [ ] upload quarantine + malware scan + parser isolation

## Phase 15 — Rule Engine — SECURITY BASELINE SOURCE IMPLEMENTED

- [x] central `shared/rules/security-baseline.json`
- [x] stable Rule IDs/versions
- [x] detector Finding-ID → Rule mapping
- [x] Worker result carries Rule provenance
- [x] Finding Instance persists `rule_id + rule_version`
- [x] conflicting Finding/Rule identity fails closed
- [ ] legal-source linkage for future legal/governance rules
- [ ] rule review/release workflow

## Phase 16 — Scoring / Coverage — SECURITY MVP SOURCE IMPLEMENTED

- [x] versioned `security-mvp@1`
- [x] Scan stores scoring profile ID/version
- [x] Worker completion resolves the stored profile
- [x] score is computed through versioned policy, not ad-hoc SQL average
- [x] insufficient assessed coverage can produce no numeric score
- [x] coverage remains separate from score
- [ ] multi-module scoring profile only after real modules exist

## Phase 17 — AI explanation layer — PARTIAL FOUNDATION

- [x] Gemini output schema validation in legacy controlled paths
- [x] untrusted-content prompt boundary
- [x] anonymous paid-AI disabled by default
- [ ] provider abstraction for production Workers
- [ ] eval dataset
- [ ] prompt-injection regression suite

## Phase 18 — Real Dashboard — PARTIAL

- [x] persistent Workspace/Target/Scan/Evidence/Finding UI exists as real-data components
- [x] no fake values in those components
- [x] active legacy dashboard mocks isolated
- [ ] make authenticated persistent shell the final primary product route after Auth staging exists
- [ ] consolidated real dashboard/history/remediation UX

## Phase 19 — Reports — SOURCE IMPLEMENTED

- [x] immutable `report_snapshots` design
- [x] Technical Report schema v2
- [x] Target snapshot frozen into Scan/Report
- [x] scoring profile frozen into Scan/Report
- [x] Rule ID/version in report Findings
- [x] Evidence detector/version/hash provenance
- [x] canonical report SHA-256
- [x] integrity revalidation on create/get/list
- [x] authenticated report create/list/get API
- [x] Report Center + printable evidence-first snapshot view
- [x] explicit legal/security limitations
- [ ] staging DB/integrity integration tests
- [ ] optional signed downloadable PDF only after reproducible report rendering is designed

## Phase 20 — Trust Center / Badge — SOURCE IMPLEMENTED

- [x] publication references immutable Report, never mutable live Scan
- [x] high-entropy public slug
- [x] admin+ publish/revoke; viewer+ internal list
- [x] `revoked_by` actor + DB audit design
- [x] public projection hides Findings, Evidence and score
- [x] public report hash/scope/date provenance
- [x] revoked publication returns `410`
- [x] public rate limit
- [x] SVG badge says only `GuardAI technical screening`, date and report-hash prefix
- [x] `/trust/:slug` public frontend path
- [x] authenticated Trust Center manager
- [ ] staging/rewrite/deployment verification

## Phase 21 — Billing / Entitlements — ACTIVE, ADVANCED SOURCE IMPLEMENTATION

Architecture:

- [x] ADR 0003 selects Stripe Checkout + Billing
- [x] no prices/trials/discounts invented in code
- [x] browser sends GuardAI plan code only
- [x] server maps plan → configured Stripe Price ID
- [x] current commercial plans remain empty until explicitly configured

Entitlements/usage:

- [x] price-neutral plan capability table design
- [x] Security currently has no paid capability requirement
- [x] paid modules map to capabilities
- [x] only active/trialing paid subscription states can expose paid capabilities
- [x] durable usage counters/reservations
- [x] concurrency-safe monthly limit checks

Stripe boundary:

- [x] `stripe@22.1.1` selected in backend package manifest; install not yet validated
- [x] Stripe SDK lazy-loaded only when billing enabled
- [x] Production billing config fail-fast
- [x] server-only secret/webhook/Price config
- [x] Subscription Checkout only
- [x] 30-minute Checkout expiry
- [x] Customer/Checkout POSTs use deterministic Stripe Idempotency-Key
- [x] one unresolved Checkout request per Organization design
- [x] GuardAI Checkout Idempotency-Key required
- [x] same request can replay/resume same logical provider operation
- [x] raw Stripe webhook mounted before `express.json()`
- [x] webhook signature verification via raw bytes
- [x] test/live `livemode` mismatch rejected before DB mutation
- [x] webhook inbox dedup by Stripe event ID
- [x] stale processing-event reclaim
- [x] current Subscription fetched from Stripe before reconciliation
- [x] Price → GuardAI plan mapping fail-closed
- [x] Customer → Organization association checked
- [x] Checkout return page explicitly grants no entitlement
- [x] Billing status + Checkout UI only shows server-configured plan codes
- [ ] real Stripe test account/Price/Webhook configuration
- [ ] Customer Portal / subscription-management flow
- [ ] billing audit/event integration tests against Stripe test mode
- [ ] real plan entitlements and limits only after Phase 37 pricing decisions

---

# Cross-cutting safety already active in source

- [x] Request ID propagated in response/error envelope
- [x] logs omit request bodies/tokens/User-Agent
- [x] `/api/health` is liveness
- [x] `/api/ready` checks Auth + DB readiness
- [x] API graceful SIGTERM/SIGINT shutdown
- [x] Security Worker graceful shutdown
- [x] dangerous production config rejected at startup
- [x] frontend `VITE_*` boundary contains no server secrets
- [x] DB/Auth/Billing secrets remain server-only

---

# Current test-source inventory

Unit/regression source now covers, among others:

- target URL/IP/DNS/SSRF guards
- prototype access gates
- API errors / scan contracts
- Auth bearer parsing + RBAC
- Organization/Target normalization
- DNS verification
- Scan lifecycle/submission/idempotency
- Worker leasing/retry/result validation
- Evidence hashing/Finding fingerprinting
- Security detector semantics
- Rule registry/provenance
- scoring profile resolution
- report hash/provenance/tamper detection
- public Trust privacy projection/revocation
- billing config/subscription normalization
- billing Checkout idempotency helpers
- billing service Checkout/Webhook flow
- production runtime safety

**These tests are not marked passing until they execute.**

---

# Hard blockers / next gates

1. GitHub Actions runner billing/spending condition must be fixed.
2. Run frontend `npm ci`, lint, typecheck, build.
3. Run backend clean install; regenerate/commit verified backend lockfile.
4. Run backend syntax + unit tests and fix all failures.
5. Provision dedicated GuardAI Supabase staging project.
6. Consolidate SQL drafts into generated migrations and apply only to staging.
7. Run RLS/cross-tenant/concurrency/queue/report/trust/billing integration tests.
8. Configure Stripe **test mode only** for staging and prove Checkout/Webhook reconciliation.
9. Mount real Supabase frontend session adapter and migrate final product route to persistent Workspace shell.

Until these gates execute, GuardAI is **not production-ready**, regardless of implementation breadth.

---

# Next implementation order while validation infrastructure remains blocked

1. finish Phase 21 Customer Portal/subscription-management boundary,
2. synchronize repo inventory/master implementation notes,
3. Phase 22 Lead Generation only after inspecting/removing legacy fake lead-gen behavior,
4. Phase 23 Monitoring/Notifications with real schedules/deduplication,
5. Phase 24 integrations beginning with real GitHub authorization,
6. continue scanner Phases 10–14 behind capability/worker gates,
7. immediately prioritize clean validation if the runner/environment becomes available.
