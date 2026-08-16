# GuardAI A-to-Z Build Progress Matrix

> This matrix maps actual repository implementation against the numbered phases in `GUARDAI_MASTER_BUILD_GUIDE.md`.

## Status legend

- `COMPLETE` — phase implementation + required validation completed.
- `IMPLEMENTED / UNVERIFIED` — substantial repository implementation exists, but clean execution/staging validation is still missing.
- `PARTIAL` — meaningful implementation exists; required phase scope remains open.
- `DESIGNED` — architecture/schema/interface exists but runtime integration is not complete.
- `BLOCKED` — next implementation requires an unavailable clean dependency/cloud/runtime boundary.
- `NOT STARTED` — no material implementation yet.

**Important:** code presence is never treated as a passing build/test/migration/deployment result.

---

| Phase | Master-guide scope | Current state | Current GuardAI reality |
|---:|---|---|---|
| 0 | Repository truth + hygiene | COMPLETE | Repo inventory, secret/history review, cache cleanup, truthful docs completed. |
| 1 | Development standards | IMPLEMENTED / UNVERIFIED | Runtime, scripts, CI/Gitleaks and recursive checks exist; GitHub runner billing/spending prevents real clean validation. |
| 2 | Frontend foundation | PARTIAL | React shell, error boundary, truthful loading/error states and persistent API/client/UI foundations exist; real Auth router/workspace activation remains. |
| 3 | Backend foundation | IMPLEMENTED / UNVERIFIED | Modular Express API, config, structured errors, request IDs, health/readiness, graceful shutdown and security middleware exist. |
| 4 | Database foundation | DESIGNED / PARTIAL | Eight GuardAI-only schema drafts + native Postgres repositories exist; dedicated staging project/migration/RLS validation not yet applied. |
| 5 | Auth | PARTIAL / BLOCKED | Supabase token verification boundary + provider-independent frontend Auth adapter/UI exist; real Supabase frontend client/project is not installed/configured. |
| 6 | Multi-tenancy | DESIGNED / PARTIAL | Organization RBAC, composite tenant FKs and tenant-scoped repositories exist; real cross-tenant staging tests remain. |
| 7 | Onboarding | PARTIAL | Organization/Target backend + DNS verification + real-data UI component exist; active product flow awaits real Auth session connection. |
| 8 | Job infrastructure | IMPLEMENTED / UNVERIFIED | DB queue, idempotency, leases, SKIP LOCKED, retries, failure policy, result persistence and worker process exist; concurrency tests not executed. |
| 9 | Web Security Scanner | PARTIAL | Real Security worker + detector v1.1.0: HTTPS, CSP, HSTS, frame protection, nosniff, cookie Secure, mixed content; TLS/cookie/public-config depth remains. |
| 10 | Privacy/Consent browser scanner | BLOCKED | Module known but intentionally unavailable until browser runtime can be installed, locked and tested. |
| 11 | Accessibility scanner | BLOCKED | Module known but intentionally unavailable until browser + axe runtime can be installed, locked and tested. |
| 12 | Repository scanner | NOT STARTED | Fake repository scoring disabled; real clone/dependency/secret/SAST pipeline still required. |
| 13 | File/Asset scanner | BLOCKED | Dev PDF/TXT boundary exists; public worker blocked on malware quarantine + parser isolation. |
| 14 | AI governance scanner | DESIGNED / DISABLED | AI-assisted prototype logic exists behind fail-safe gates; no persistent paid worker until entitlements/evals exist. |
| 15 | Rule engine | PARTIAL | Immutable Security rule registry/version seed + Finding rule provenance implemented; framework/rule admin workflow remains. |
| 16 | Scoring v1 | PARTIAL | Deterministic module score exists; canonical weighted/configurable product scoring remains. |
| 17 | Findings lifecycle | PARTIAL | Persistent fingerprint/upsert/instances exist; resolved/accepted-risk/full lifecycle APIs remain. |
| 18 | Evidence Explorer | PARTIAL | Evidence persists and appears in Scan read/UI foundation; dedicated explorer/filter/download/history UI remains. |
| 19 | Reports | PARTIAL | Truthful technical prototype report exists; persistent immutable report generation remains. |
| 20 | Legal Sources | DESIGNED | Tables designed; maintained source ingestion/version governance not implemented. |
| 21 | Privacy operations | NOT STARTED | DSAR/ROPA/DPIA/SCC/TIA/breach workflows remain. |
| 22 | Billing | DESIGNED / PARTIAL | Subscription + price-neutral entitlement/usage reservation foundation exists; real billing provider/webhooks/plans remain. |
| 23 | Dashboard | PARTIAL | Legacy fake dashboard removed from active path; real workspace scan/result foundations exist; KPI dashboard remains. |
| 24 | Trust Center | NOT STARTED | Legacy design isolated; no real evidence-backed public Trust Center yet. |
| 25 | Documents | NOT STARTED | Legacy generator isolated; versioned evidence-backed documents remain. |
| 26 | AI Counsel | NOT STARTED | Legacy surface isolated; evidence-grounded workspace assistant remains. |
| 27 | Audit Hub | PARTIAL | Authorized cursor-paginated Audit History API + transaction-bound lifecycle audit design exist; full Audit Hub UI/export remains. |
| 28 | Integrations/Webhooks | NOT STARTED | No production OAuth/webhook adapters yet. |
| 29 | Developer API | PARTIAL | `/api/v1`, structured errors, idempotency and public contracts exist; API keys/scopes/docs/SDK remain. |
| 30 | Public pages/legal | PARTIAL | Product claims cleaned; production legal/public pages/cookie management remain. |
| 31 | Observability | PARTIAL | Request IDs, structured privacy-minimal logs, health/readiness exist; metrics/tracing/alerts/on-call remain. |
| 32 | Backups/DR | DESIGNED IN GUIDE | No real staging/production backup/restore drill yet. |
| 33 | Performance/capacity | PARTIAL | Bounded DB pool/request limits/queue concurrency design exist; load tests/capacity measurements remain. |
| 34 | Security hardening | PARTIAL | SSRF, upload boundary, fail-fast production config, secret boundaries exist; CSP/CSRF/session/pentest/deeper app hardening remain. |
| 35 | AI security/evals | PARTIAL | Prompt-injection boundaries + schema validation exist; eval datasets/red-team/calibration remain. |
| 36 | Privacy/legal source ops | NOT STARTED | Operational governance workflows remain. |
| 37 | Enterprise auth/SCIM | NOT STARTED | MFA/SSO/SAML/OIDC/SCIM/service accounts remain. |
| 38 | Product quality | PARTIAL | Error/loading truthfulness exists; WCAG/cross-browser/mobile/full accessibility QA remains. |
| 39 | Email/support/analytics | NOT STARTED | Transactional email/support/privacy-safe analytics remain. |
| 40 | i18n/data residency | NOT STARTED | Locale/residency implementation remains. |
| 41 | FinOps | PARTIAL | AI cost paths fail-closed and usage reservation design exists; budgets/cost dashboards/alerts remain. |
| 42 | Staging/pre-launch | BLOCKED | Cannot begin honestly until dedicated GuardAI staging project + reproducible installs/migrations are available. |

---

## Current critical path

The shortest path to a first honest GuardAI MVP is currently:

```text
GitHub runner / clean execution restored
        ↓
clean frontend + backend installs
        ↓
backend lockfile regenerated and committed
        ↓
dedicated GuardAI Supabase staging project
        ↓
consolidated generated migration
        ↓
RLS / cross-tenant / queue / Rule-provenance integration tests
        ↓
real frontend Supabase session adapter
        ↓
activate Workspace → Target → DNS Verify → Security Scan flow
        ↓
run Security worker in staging
        ↓
real end-to-end Evidence/Finding validation
        ↓
first deployable GuardAI Security MVP
```

While those external/runtime gates remain unresolved, repository work may continue on dependency-free phases, but disabled modules must never be exposed as if they work.

---

## Current externally enabled scanner capability

Persistent pipeline:

```text
security = ENABLED IN CODE / UNVERIFIED IN STAGING
privacy = DISABLED
accessibility = DISABLED
ai-governance = DISABLED
repository = DISABLED
asset = DISABLED
```

The legacy synchronous prototype endpoints are disabled by default and require explicit controlled-development opt-in.

---

## Update rule

Whenever implementation materially changes:

1. update this matrix,
2. update `PHASE_1_TRACKER.md` while clean-validation remains the formal blocker,
3. update `REPO_INVENTORY.md`,
4. update the master guide if architecture/ordering/requirements change,
5. never promote a state to `COMPLETE` without the phase's required execution evidence.
