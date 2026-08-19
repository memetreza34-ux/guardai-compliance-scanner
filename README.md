# GuardAI — Technical Compliance Evidence & Risk Platform

GuardAI is being rebuilt from a broad SaaS/UI prototype into a real, evidence-first technical screening platform for websites, repositories and selected digital assets.

> **Status:** active engineering rebuild. Major backend/product foundations now exist in source, but clean installs, full test execution, real staging migrations and provider integrations have not all executed yet. GuardAI is therefore **not production-ready**.

## Product truth

GuardAI is designed to:

- collect bounded technical Evidence,
- run deterministic or explicitly scoped automated checks,
- preserve detector/rule/scoring provenance,
- surface technical Findings and remediation information,
- keep immutable report snapshots,
- support tenant-scoped workflows, monitoring and integrations.

GuardAI does **not** claim to be:

- a government authority,
- a certification body,
- a law firm,
- a penetration-test replacement,
- proof of full legal compliance,
- proof that no vulnerabilities or accessibility/privacy issues exist.

## Current engineering baseline

```text
Node.js: 24.18.1
npm: 11.16.x baseline
Frontend: React 19 + TypeScript + Vite 8
Backend: Node/Express CommonJS, modular
Persistent API: /api/v1
Persistent scan contract: 0.3.0
Supported historical persistent reads: 0.2.0, 0.3.0
Database/Auth target: dedicated GuardAI Supabase Auth + PostgreSQL
Backend DB access: native PostgreSQL repositories/transactions
```

The existing shared/multi-application Supabase project must **not** be reused for GuardAI.

## Current real source foundations

### Persistent core

Source now contains real-data paths for:

- Supabase bearer-auth boundary,
- Organizations / Memberships / RBAC,
- Website and GitHub Repository Targets,
- DNS TXT Website ownership verification,
- asynchronous Scans + Jobs,
- Worker leasing/retry/reclaim,
- Evidence persistence + hashes,
- Finding lifecycle + Rule provenance,
- versioned scoring profiles,
- immutable Technical Report snapshots,
- public Trust publications,
- Stripe Billing/Checkout/Portal source flows,
- entitlement/usage reservations,
- Lead/contact capture with privacy/retention gates,
- Monitoring schedules + in-app notifications,
- GitHub App installation/repository authorization,
- structured AI Governance Guided Review.

These source paths still require clean runtime and staging proof before being called production-complete.

### Security scanner

`security.headers@1.1.0` is the first persistent deterministic Website module source. It currently observes/checks a bounded baseline including:

- HTTPS final transport,
- CSP,
- HSTS where applicable,
- frame embedding protection,
- `X-Content-Type-Options: nosniff`,
- HTTPS cookies missing `Secure`,
- mixed HTTP content,
- Referrer-Policy observation,
- Permissions-Policy observation,
- HttpOnly/SameSite observations without overclaiming.

Scoring provenance: `security-mvp@1`.

### Repository scanner

`repository.baseline@1.0.0` exists as a bounded GitHub App based source implementation but remains intentionally **externally gated**.

Current baseline includes:

- live GitHub installation/repository authorization recheck,
- immutable commit-SHA snapshot,
- bounded recursive Git Tree,
- bounded Blob reads,
- package/ecosystem manifest inventory,
- limited direct/development dependency counts,
- high-confidence credential indicator screening,
- no matched secret value persisted,
- explicit coverage limits,
- fail-closed behavior when eligible coverage is incomplete.

It is explicitly **not** full SAST, comprehensive secret scanning, dependency vulnerability analysis or SBOM.

Scoring provenance: `repository-mvp@1`.

`repository` remains absent from `ENABLED_PERSISTENT_SCAN_MODULES` until clean tests and staging GitHub-App proof execute.

### Privacy + Accessibility Browser foundation

Privacy and Accessibility now share an explicit Browser Worker safety architecture, but both modules remain disabled.

The Browser runtime contract requires before any customer Job claim:

- isolated Worker runtime,
- connection-time egress enforcement,
- private-network deny,
- cloud-metadata deny,
- ephemeral browser profile,
- downloads disabled,
- no inbound listener,
- enforced resource budgets.

The persistent contract now supports:

```text
state: observed
score: null
```

This allows technical Evidence to exist without inventing a numeric score.

Privacy source foundation:

- cross-origin network observations without automatically calling them trackers,
- Cookie metadata/counts without Cookie values,
- Web Storage counts without keys/values,
- Consent UI state/interaction coverage,
- pre/post-reject technical deltas,
- query/fragment minimization.

Accessibility source foundation:

- engine/rule/version provenance,
- separate violation / incomplete / pass buckets,
- aggregate node counts,
- no persisted raw HTML, customer element text, screenshots or full selectors in the MVP Evidence model.

See `docs/PHASE_10_11_BROWSER_SCANNERS_TRACKER.md`.

### AI Governance Guided Review

Phase 12 now has a separate authenticated, tenant-scoped real-data workflow. The persistent `ai-governance` Scan module itself remains disabled.

The Guided Review:

- stores only structured AI-system declarations,
- rejects arbitrary Prompt/Output/Customer-content fields at the API boundary,
- separates documentation state from legal applicability,
- keeps legal applicability as `requires_human_review`,
- freezes the declaration snapshot and source-registry version for every Review,
- links Review items to versioned official EU source anchors,
- gives no legal-compliance score and no automatic AI Act risk class,
- requires Member+ to submit and Admin/Owner to mark a Review reviewed/reopen it.

`reviewed` means a human completed the GuardAI review workflow. It does **not** mean legally compliant.

See `docs/PHASE_12_AI_GOVERNANCE_TRACKER.md`.

## Frontend state

The active public/prototype shell has been stripped of known mock success claims. Real persistent product components exist for authenticated Workspace, Reports, Trust, Billing, Monitoring, GitHub integration and AI Governance Guided Review, but the final Supabase session adapter and final production router are still pending staging infrastructure.

Legacy visual prototype components remain reference-only and must not be reactivated as production truth without real backend state.

## Database state

`database/` contains GuardAI-only SQL **design drafts**, currently through `027_*`.

They are **not applied migrations**.

The drafts cover, among other areas:

- tenant/RLS core,
- Scan/Job invariants,
- Evidence/Finding provenance,
- Target verification,
- entitlements/usage,
- reporting/trust,
- Stripe Billing,
- Lead capture,
- Monitoring/notifications,
- GitHub App integration,
- Repository Target provenance,
- terminal usage finalization,
- Repository Rule/scoring provenance,
- AI Governance structured profiles/reviews/source provenance,
- one-open-review-cycle AI Governance invariant.

Before staging they must be consolidated into generated migrations, reviewed in dependency order and applied only to a dedicated GuardAI project.

## Important engineering documents

- `docs/GUARDAI_MASTER_BUILD_GUIDE.md` — canonical A-to-Z engineering guide
- `docs/PHASE_1_TRACKER.md` — living global implementation tracker
- `docs/PHASE_10_11_BROWSER_SCANNERS_TRACKER.md` — Privacy/Accessibility Browser gate tracker
- `docs/PHASE_12_AI_GOVERNANCE_TRACKER.md` — AI Governance Guided Review gate tracker
- `docs/REPO_INVENTORY.md` — living file/component disposition
- `database/README.md` — database design/migration proof matrix
- `docs/adr/` — GuardAI architecture decisions
- `CONTRIBUTING.md` — engineering/security contribution rules

## Development

If you use nvm:

```bash
nvm install
nvm use
npm ci
npm run dev
```

Frontend quality commands:

```bash
npm run lint
npm run typecheck
npm run build
npm run check
```

Backend source commands currently include:

```bash
cd server
npm run check
npm test
npm run worker:security:once
npm run worker:repository:once
npm run scheduler:monitor:once
```

Do not interpret the presence of these commands as proof they have passed in a clean environment.

## CI status

`.github/workflows/ci.yml` contains the repository quality workflow and history secret scan.

A real GitHub Actions run was previously registered but GitHub allocated no runner because the account reported a billing/spending condition. The jobs therefore executed **zero steps**. This is an external GitHub account blocker, not evidence that GuardAI code passed or failed.

Until runner access is restored, all clean install/lint/typecheck/build/test gates remain open.

## Current hard gates before production

1. Restore executable GitHub Actions / clean validation environment.
2. Run frontend clean install, lint, typecheck and production build.
3. Run backend clean install and regenerate/verify backend lockfile.
4. Execute backend syntax/unit suite and fix every failure.
5. Provision a dedicated GuardAI Supabase staging project.
6. Consolidate SQL drafts into real generated migrations.
7. Execute RLS, tenant-isolation, queue, concurrency and integrity tests in staging.
8. Configure Stripe test mode and prove Checkout/Webhook/Portal reconciliation.
9. Configure a least-privilege staging GitHub App and prove Repository lifecycle behavior.
10. Select and pin a concrete isolated Browser provider/runtime before Privacy or Accessibility activation.
11. Prove AI Governance snapshot/source/RBAC/open-review invariants in staging and review all legal wording.
12. Mount the real Supabase frontend session adapter.
13. Complete deployment, observability, security, performance and release gates from the master guide.

## Core engineering principle

```text
First make it true.
Then make it stable.
Then make it secure.
Then scale it.
Then add enterprise depth.
```

A feature is not considered production-complete because a UI, route, test file or SQL draft exists. It must have real behavior, authorization, persistence where needed, security controls, executed tests, operational proof and accurate user-facing claims.
