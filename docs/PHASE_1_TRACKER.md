# GuardAI Implementation Tracker — Living Status

> Source-of-truth implementation status against `GUARDAI_MASTER_BUILD_GUIDE.md`.

## Global status

**Repository source implementation has advanced through major parts of Phases 0–24, including a bounded GitHub Repository baseline worker. Formal quality gates remain open because clean install/lint/typecheck/build/tests and real staging migrations have not executed.**

Never interpret an implemented file, SQL draft or test source as a passing production gate.

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
| Workers | separate Security + Repository source processes |
| Security detector | `security.headers@1.1.0` |
| Repository detector | `repository.baseline@1.0.0` — source only, externally gated |
| Rule catalogs | versioned Security + Repository baselines |
| Scoring | `security-mvp@1`, `repository-mvp@1` |
| Report schema | immutable Technical Report v2 |
| Public Trust | report-backed projection v1 |
| Billing provider | Stripe, ADR 0003; disabled until configured |
| GitHub integration | GitHub App, ADR 0004; disabled until configured |
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
- [x] public `/trust/:slug`, `/billing/return`, `/contact`, GitHub callback paths boot before product App
- [x] authenticated Workspace shell mounts real-data Workspace/Report/Trust/Monitoring/GitHub/Billing surfaces
- [ ] replace ad-hoc path/tab routing with final router structure
- [ ] mount real Supabase session adapter after dedicated project exists
- [ ] remove remaining legacy UI references after real replacements are active

## Phase 3 — Shared contracts / API client — ADVANCED

- [x] shared scan contract `0.2.0`
- [x] structured API error envelope
- [x] persistent Scan response validator strips internal fields
- [x] authenticated API client boundary
- [x] Workspace/Report/Trust/Billing/Monitoring/GitHub frontend clients
- [x] no fake API success fallback
- [ ] broader Organization/Target public contract if external SDK is shipped
- [ ] promote Repository baseline response semantics into a future contract version before external SDK exposure

## Phase 4 — Backend foundation — ADVANCED

- [x] minimal process bootstrap
- [x] modular routes/services/repositories/domain/scanners/workers
- [x] central config
- [x] request IDs + bounded logs
- [x] liveness/readiness separation
- [x] graceful API/DB shutdown
- [x] fail-fast production safety checks
- [x] raw Stripe/GitHub webhook routes mounted before JSON parsing
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
- [x] GitHub Repository Target creation after live provider authorization
- [x] authenticated Workspace onboarding UI
- [ ] dedicated GuardAI Supabase Auth project provisioned
- [ ] real login/email verification/password-reset integration
- [ ] staging RBAC integration tests

## Phase 6 — Database / persistence — SOURCE IMPLEMENTED, MIGRATIONS NOT APPLIED

- [x] PostgreSQL repository layer
- [x] RLS/tenant schema designs
- [x] composite tenant FK design
- [x] Scan/Job/Evidence/Finding/Audit persistence
- [x] Report/Trust/Billing/Lead/Monitoring/GitHub persistence designs
- [x] SQL design drafts through `025_*`
- [x] Security/Repository Rule seed drafts aligned to actual core schema
- [x] Lead submission fingerprint schema drift repaired
- [x] Monitor Run composite tenant binding
- [x] GitHub Repository Target provenance invariants
- [x] terminal Scan usage consume/release trigger design
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
- [x] separate Repository worker source process
- [x] Repository worker lease heartbeat stops before terminal writes
- [x] uncertain Repository lease ownership produces no complete/fail write
- [ ] production process/container wiring

## Phase 8 — Safe fetcher / ownership — ADVANCED

- [x] HTTP/HTTPS only
- [x] credential/nonstandard-port rejection
- [x] private/loopback/link-local/reserved IP protection
- [x] redirect revalidation
- [x] socket-level safe DNS lookup
- [x] proxy environment disabled for target fetch
- [x] bounded time/body
- [x] DNS TXT Website ownership challenge
- [x] verified Target required before persistent Scan
- [x] Worker rechecks Target authorization state
- [x] GitHub Repository Target rechecks current installation/repository authorization
- [ ] staging DNS/SSRF integration suite
- [ ] periodic Website ownership re-verification policy

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

## Phases 10–12 — Privacy / Accessibility / AI Governance — GATED

- [x] module IDs/contracts/capability design exist
- [x] unimplemented persistent modules rejected with `SCAN_MODULE_NOT_AVAILABLE`
- [ ] Privacy browser Worker
- [ ] consent state machine
- [ ] Accessibility/axe Worker
- [ ] AI-Governance Evidence workflow

## Phase 13 — Repository Scanner — BOUNDED MVP SOURCE IMPLEMENTED, EXTERNALLY GATED

GitHub authorization/Target:

- [x] GitHub App architecture, no PAT product model
- [x] one-time hashed installation state
- [x] live provider installation verification before linking
- [x] short-lived installation tokens kept in process memory only
- [x] provider-authorized Repository Target creation
- [x] Target stores non-secret installation/repository provenance
- [x] authorization sync invalidates removed/suspended repository access
- [x] DB provenance/uniqueness design in `023_*`

Repository reader:

- [x] default branch resolved to immutable commit SHA
- [x] recursive tree pinned to commit tree SHA
- [x] truncated provider tree fails closed
- [x] bounded provider JSON response size
- [x] bounded blob reads
- [x] no clone/archive persisted locally

`repository.baseline@1.0.0`:

- [x] max tree entries `5000`
- [x] max selected files `100`
- [x] max file size `128 KiB`
- [x] max selected bytes `2 MiB`
- [x] generated/vendor directories skipped
- [x] package/ecosystem manifest inventory
- [x] package/composer direct/development dependency counts only
- [x] high-confidence indicators for private-key marker, GitHub token prefix, AWS access-key ID and Stripe live secret key
- [x] **matched credential values are never persisted**
- [x] Evidence stores indicator type + file path + line only
- [x] explicit notices: not full SAST, not comprehensive secret scanning, not vulnerability analysis, not SBOM
- [x] versioned Rule registry + DB seed design
- [x] `repository-mvp@1` scoring profile
- [x] separate Repository worker + process scripts
- [x] Worker rechecks current GitHub repo authorization immediately before content read
- [x] detector/provider/worker test sources created
- [ ] `repository` remains intentionally absent from `ENABLED_PERSISTENT_SCAN_MODULES`
- [ ] clean source tests/build must execute before enabling
- [ ] dedicated staging GitHub App with least-privilege Contents read
- [ ] real staging repository tests including private repo/removal/suspension/truncation
- [ ] broader dependency vulnerability/SAST/SBOM stages remain future work

## Phase 14 — Asset/Documents — GATED

- [x] document prototype boundary is fail-closed for public use
- [ ] upload quarantine
- [ ] malware scan
- [ ] parser sandbox/resource isolation
- [ ] real Asset worker

## Phase 15 — Rule Engine — SECURITY + REPOSITORY BASELINES SOURCE IMPLEMENTED

- [x] `shared/rules/security-baseline.json`
- [x] `shared/rules/repository-baseline.json`
- [x] stable Rule IDs/versions
- [x] detector Finding-ID → Rule mapping
- [x] Worker result carries Rule provenance
- [x] Finding Instance persists `rule_id + rule_version`
- [x] conflicting Finding/Rule identity fails closed
- [x] SQL Rule seeds aligned with actual core schema
- [ ] legal-source linkage for future legal/governance rules
- [ ] formal rule review/release workflow

## Phase 16 — Scoring / Coverage — TWO VERSIONED MVP PROFILES SOURCE IMPLEMENTED

- [x] `security-mvp@1`
- [x] `repository-mvp@1`
- [x] target/module combination selects the explicit profile
- [x] Scan stores scoring profile ID/version
- [x] Worker completion resolves the stored profile
- [x] score is computed through versioned policy, not ad-hoc SQL average
- [x] insufficient assessed coverage can produce no numeric score
- [x] coverage remains separate from score
- [ ] multi-module combined profile only after real combinations exist

## Phase 17 — AI explanation layer — PARTIAL FOUNDATION

- [x] Gemini output schema validation in legacy controlled paths
- [x] untrusted-content prompt boundary
- [x] anonymous paid-AI disabled by default
- [ ] provider abstraction for production Workers
- [ ] eval dataset
- [ ] prompt-injection regression suite

## Phase 18 — Real Dashboard — PARTIAL

- [x] persistent Workspace/Target/Scan/Evidence/Finding UI exists as real-data components
- [x] Monitoring/GitHub/Billing real-data managers mounted in authenticated shell
- [x] no fake values in those components
- [x] active legacy dashboard mocks isolated
- [ ] make authenticated persistent shell the final primary product route after Auth staging exists
- [ ] consolidated real dashboard/history/remediation UX

## Phase 19 — Reports — SOURCE IMPLEMENTED

- [x] immutable `report_snapshots` design
- [x] Technical Report schema v2
- [x] Target/scoring/Rule/Evidence provenance
- [x] canonical report SHA-256
- [x] integrity revalidation on create/get/list
- [x] authenticated report create/list/get API
- [x] Report Center + printable evidence-first snapshot view
- [x] explicit legal/security limitations
- [ ] staging DB/integrity integration tests
- [ ] optional signed downloadable PDF only after reproducible rendering is designed

## Phase 20 — Trust Center / Badge — SOURCE IMPLEMENTED

- [x] publication references immutable Report, never mutable live Scan
- [x] high-entropy public slug
- [x] admin+ publish/revoke; viewer+ internal list
- [x] `revoked_by` actor + DB audit design
- [x] public projection hides Findings, Evidence and score
- [x] revoked publication returns `410`
- [x] public rate limit
- [x] truthful SVG technical-screening badge
- [x] `/trust/:slug` public frontend path
- [x] authenticated Trust Center manager
- [ ] staging/rewrite/deployment verification

## Phase 21 — Billing / Entitlements — ADVANCED SOURCE IMPLEMENTATION

Architecture / Stripe:

- [x] ADR 0003 selects Stripe Checkout + Billing
- [x] no prices/trials/discounts invented in code
- [x] browser sends GuardAI plan code only
- [x] server maps plan → configured Stripe Price ID
- [x] server-only Stripe secret/webhook/Price config
- [x] raw signed webhook before JSON parsing
- [x] test/live mismatch rejected
- [x] durable webhook dedupe/reclaim
- [x] current provider Subscription fetched before reconciliation
- [x] one unresolved Checkout per Organization
- [x] GuardAI + Stripe idempotency keys
- [x] 30-minute Checkout session
- [x] Customer Portal source flow; browser never supplies Customer ID
- [x] Checkout/Portal return pages grant no entitlement

Entitlements/usage:

- [x] price-neutral plan capability model
- [x] `repository → repository_scan`
- [x] paid module usage requirements derived during Scan submission
- [x] Scan + Jobs + paid usage reservation share one DB transaction
- [x] shared-client Entitlement helpers
- [x] terminal Scan status DB trigger design consumes on `completed`, releases on `failed/cancelled`
- [x] durable monthly counters and concurrent reservations
- [x] no commercial plan limits invented
- [ ] real Stripe test account/Price/Webhook configuration
- [ ] staging billing/usage concurrency tests
- [ ] real plan entitlements/limits after pricing decisions

## Phase 22 — Lead Generation — CONTACT SOURCE IMPLEMENTED, MARKETING GATED

- [x] legacy fake Make/Zapier modal remains unused/Legacy
- [x] public `/contact` path
- [x] policy endpoint does not require DB when disabled
- [x] Production requires Privacy Notice version + HTTPS app URL + retention
- [x] minimal PII fields
- [x] SHA-256 submission fingerprint + Idempotency-Key
- [x] honeypot submissions create no DB row
- [x] no IP/User-Agent advertising profile stored
- [x] DB schema aligned with repository fingerprint field
- [x] Marketing opt-in remains fail-closed
- [ ] real Privacy Notice/version approval
- [ ] approved retention policy
- [ ] Double-Opt-In delivery before any marketing activation

## Phase 23 — Monitoring / Notifications — SECURITY SOURCE IMPLEMENTED

- [x] verified Website + Security-only Monitor MVP
- [x] interval 60–10080 minutes
- [x] scheduler leases + `SKIP LOCKED`
- [x] deterministic Scan idempotency per scheduled slot
- [x] no catch-up storm
- [x] Monitor Run → Scan provenance
- [x] Monitor Run composite tenant FK
- [x] deverified Target pauses monitoring
- [x] separate monitor scheduler process/scripts
- [x] deduplicated in-app new-Finding / Scan-failure events
- [x] mark-one/mark-all read APIs
- [x] real-data Monitoring UI
- [x] no email/push delivery claim
- [ ] staging scheduler concurrency test
- [ ] external notification provider only after transactional-email phase

## Phase 24 — GitHub Integration — SOURCE IMPLEMENTED

- [x] ADR 0004 GitHub App architecture
- [x] all-or-nothing Production config gate
- [x] App JWT + short-lived Installation Tokens
- [x] raw HMAC webhook verification before JSON parsing
- [x] webhook delivery dedupe
- [x] one-time hashed install state
- [x] tenant-bound installation
- [x] installation suspend/delete lifecycle
- [x] current Repository authorization synchronization
- [x] admin can create GuardAI Repository Target only from current provider list
- [x] removed repository authorization invalidates Target
- [x] GitHub callback + Integration Manager mounted
- [x] no installation token persistence
- [ ] dedicated staging GitHub App configuration
- [ ] staging webhook/install lifecycle validation

---

# Cross-cutting safety already active in source

- [x] Request ID propagated in response/error envelope
- [x] logs omit request bodies/tokens/User-Agent
- [x] `/api/health` liveness + `/api/ready` readiness split
- [x] API graceful shutdown
- [x] Security/Repository worker graceful process boundaries
- [x] dangerous production config rejected at startup
- [x] frontend `VITE_*` boundary contains no server secrets
- [x] DB/Auth/Billing/GitHub secrets remain server-only
- [x] provider webhook bodies are not persisted wholesale
- [x] detected Repository credential values are not persisted

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
- transactional Entitlement usage helpers
- Worker leasing/retry/result validation
- Evidence hashing/Finding fingerprinting
- Security detector semantics
- Security + Repository Rule registries
- Security + Repository scoring profile resolution
- Repository file/tree budget selection
- Repository credential-value redaction
- commit-pinned GitHub Repository reader source
- Repository Worker authorization recheck/completion
- Report hash/provenance/tamper detection
- public Trust privacy projection/revocation
- Billing config/subscription/Checkout/Webhook/Portal boundaries
- Lead policy/domain/service boundaries
- Monitoring scheduler/notification boundaries
- GitHub installation/webhook/Repository Target authorization boundaries
- Production runtime safety

**These tests are source only and are not marked passing until they execute.**

---

# Hard blockers / next gates

1. GitHub Actions runner billing/spending condition must be fixed.
2. Run frontend `npm ci`, lint, typecheck, build.
3. Run backend clean install; regenerate/commit verified backend lockfile.
4. Run backend syntax + unit tests and fix all failures.
5. Provision dedicated GuardAI Supabase staging project.
6. Consolidate SQL drafts `001–025` into generated migrations and apply only to staging.
7. Run RLS/cross-tenant/concurrency/queue/report/trust/billing/monitor/GitHub integration tests.
8. Configure Stripe **test mode only** and a dedicated least-privilege GitHub App in staging.
9. Run real Repository baseline against controlled public/private fixtures, including revoked repository access.
10. Mount real Supabase frontend session adapter and migrate final product route to persistent Workspace shell.

Until these gates execute, GuardAI is **not production-ready**, regardless of implementation breadth.

---

# Next implementation order while validation infrastructure remains blocked

1. keep `repository` externally disabled while reconciling remaining source/static-test drift,
2. add explicit Repository module enablement only after clean backend tests/build execute,
3. continue Phase 10 Privacy Worker design behind a hard module gate,
4. continue Phase 11 Accessibility Worker design behind browser/sandbox gates,
5. prepare generated-migration consolidation checklist rather than applying SQL blindly,
6. immediately prioritize clean validation if the runner/environment becomes available.
