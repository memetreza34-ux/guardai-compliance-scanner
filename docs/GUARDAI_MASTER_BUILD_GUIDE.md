# GuardAI Master Build Guide

> **Canonical build plan for GuardAI — from the current prototype to a production-ready public SaaS.**
>
> This document is the single source of truth for how we build GuardAI from the repository that exists today until public launch and beyond.

---

## 0. How to use this document

This guide is not a feature wishlist. It is the required build order.

**Rule:** We do not add another large UI-only feature until the current core scanner, backend contract, authentication, persistence, payments, security, testing and deployment path are real and stable.

Every phase contains:

- the goal,
- what already exists,
- what must be built,
- questions that must be answered,
- implementation tasks,
- acceptance criteria,
- and the conditions required before moving to the next phase.

A phase is only complete when its acceptance criteria are met.

---

# 1. Product definition

## 1.1 What GuardAI should become

GuardAI should become a **technical compliance evidence and risk scanning platform** for websites, web applications, repositories and selected digital assets.

The product should:

1. collect technical evidence,
2. run deterministic checks where possible,
3. identify potential compliance and security risks,
4. map findings to relevant requirements,
5. assign confidence and severity,
6. explain findings clearly,
7. provide remediation guidance,
8. preserve scan history,
9. monitor changes over time,
10. allow teams to review and resolve findings,
11. create reports from real evidence,
12. expose verified technical status through a Trust Center,
13. and use AI primarily as an explanation and classification layer, not as the sole source of truth.

## 1.2 What GuardAI must NOT claim

Until a qualified legal process and reliable evidence model exist, GuardAI must not present itself as:

- a government authority,
- an official certification body,
- a law firm,
- a replacement for legal advice,
- a guarantee of GDPR/DSGVO compliance,
- a guarantee of EU AI Act compliance,
- a guarantee of NIS2/ISO/SOC 2 compliance,
- or a guarantee that a website or repository is secure.

Preferred wording:

- "Automated technical compliance screening"
- "Potential issue detected"
- "Technical evidence"
- "Requires review"
- "No issue detected by this automated check"
- "Scan coverage"
- "Confidence"

Avoid wording such as:

- "officially certified"
- "100% compliant"
- "verification authority"
- "legally safe"
- "no security vulnerabilities"

## 1.3 Core product principle

Every serious finding should be traceable through this chain:

```text
Target
  ↓
Scanner
  ↓
Raw Evidence
  ↓
Deterministic Rule / Detector
  ↓
Finding
  ↓
Requirement Mapping
  ↓
Confidence + Severity
  ↓
Remediation
  ↓
Human Review State
```

If GuardAI cannot show why a result exists, it should not present the result as a verified fact.

---

# 2. Current repository: what we already have

The current repository already gives us a useful prototype foundation.

## 2.1 Existing frontend

Current stack:

- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/base-ui style components
- Framer Motion
- Lucide icons

Existing product surfaces include:

- Landing Page
- URL/File scanner input
- Scan Progress modal
- Compliance Dashboard
- Printable Report
- Lead Generation modal
- Pricing
- Checkout simulation
- User Dashboard
- AI Counsel
- Audit Hub
- Trust Center
- Badge Generator
- Document Generator
- Templates Hub
- Integrations Hub
- Policy Manager
- TrueSight

These components are valuable as product design prototypes, but many are still mock-driven.

## 2.2 Existing backend

The repository contains an Express server with early implementations for:

- `POST /api/scan`
- URL scanning
- GitHub repository scanning
- Gemini-assisted page analysis
- `POST /api/scan-file`
- PDF/text extraction
- basic HTTP security header checks
- rate limiting
- Helmet
- Zod input validation

This server is the beginning of the real scanner backend, but it is not production-ready yet.

## 2.3 Existing scanner prototype

`src/data/mockScanEngine.ts` contains a large set of useful ideas for:

- findings,
- categories,
- legal references,
- remediation language,
- demo data,
- scenario coverage.

It should be treated as a **design/reference dataset**, not as the final source of scan truth.

## 2.4 Existing type model

`src/types/scanner.ts` gives us an early structure for:

- categories,
- issues,
- scan results,
- scores,
- detected technology,
- metrics,
- trust badge configuration.

We should keep the concept, but replace the current loose frontend/backend mapping with a shared API schema.

---

# 3. Known blockers in the current repository

These are **P0 problems**. They must be resolved before public beta.

## 3.1 Frontend/backend category mismatch

The backend currently uses category names such as:

```text
privacy
aiAct
security
accessibility
```

The frontend expects values such as:

```text
gdpr
ai-act
security
accessibility
```

This must be replaced by one canonical shared schema.

## 3.2 Status mismatch

Backend and frontend currently use different values such as:

```text
compliant
passed
warning
critical
```

Define one status vocabulary and enforce it everywhere.

## 3.3 Hard-coded localhost API

The frontend currently calls:

```text
http://localhost:3001/api/...
```

Production must use a configurable API base URL or a same-origin reverse proxy.

## 3.4 Server dependencies are incomplete

`server/index.js` imports packages that are not all declared in `server/package.json`.

A clean clone must be installable with documented commands and no undeclared local dependencies.

## 3.5 SSRF risk

The backend fetches user-provided URLs. A production scanner must prevent requests to:

- localhost,
- loopback IPs,
- RFC1918/private networks,
- link-local addresses,
- cloud metadata services,
- internal DNS destinations,
- and redirect chains that end on blocked destinations.

## 3.6 Upload safety is incomplete

The UI mentions file limits, but limits must be enforced server-side.

## 3.7 Duplicate rendering in `App.tsx`

Several views are rendered in more than one place. This should be cleaned up before adding routing.

## 3.8 Score fallback bug

Do not use:

```ts
score || 100
```

because a valid score of `0` becomes `100`.

Use nullish fallbacks:

```ts
score ?? 100
```

and validate score ranges.

## 3.9 Mock product claims

The current prototype contains UI that can imply:

- live monitoring,
- completed integrations,
- successful payments,
- legal document generation,
- AI analysis,
- certification,
- deepfake detection,
- and compliance verification.

Every such feature must either become real or be clearly labeled as demo/preview before public use.

## 3.10 Repository hygiene

Remove versioned cache directories such as:

- `.npm-cache`
- `npm_cache`

Update `.gitignore` for secrets, uploads, cache and test output.

---

# 4. Definition of production-ready

GuardAI is not considered ready for public launch until all of the following are true.

## Product

- [ ] New user can create an account.
- [ ] New user can verify email.
- [ ] New user can create/select a workspace.
- [ ] User can start a real scan.
- [ ] Scan runs asynchronously and safely.
- [ ] Scan result is stored.
- [ ] Scan history is visible.
- [ ] Findings come from real detectors/evidence.
- [ ] AI-generated explanations are clearly separated from deterministic facts.
- [ ] Free/paid access is enforced server-side.
- [ ] Billing works with a real payment provider.
- [ ] User can cancel/manage subscription.
- [ ] User can delete account/workspace data.

## Security

- [ ] SSRF protection exists and has tests.
- [ ] Rate limits exist.
- [ ] Authentication is required where appropriate.
- [ ] Authorization is workspace-aware.
- [ ] Secrets exist only server-side.
- [ ] File uploads have size/type limits.
- [ ] Production CORS is restricted.
- [ ] Security headers are configured.
- [ ] Logs do not expose secrets or sensitive document contents.
- [ ] Dependency and secret scanning run in CI.
- [ ] Production environment has backup and incident procedures.

## Engineering

- [ ] Clean install works from README.
- [ ] TypeScript build passes.
- [ ] Lint passes.
- [ ] Unit tests pass.
- [ ] Integration tests pass.
- [ ] Critical E2E flows pass.
- [ ] CI blocks broken merges.
- [ ] Staging exists.
- [ ] Production deployment is reproducible.
- [ ] Database migrations are versioned.
- [ ] Rollback strategy exists.

## Legal/product communication

- [ ] Privacy policy exists.
- [ ] Terms/AGB exist if needed for launch market.
- [ ] Impressum exists where required.
- [ ] Cookie/analytics setup matches the actual implementation.
- [ ] Data processors/subprocessors are documented.
- [ ] DPA/AVV availability has been reviewed.
- [ ] Claims in marketing have been legally reviewed.
- [ ] Scanner results contain appropriate limitations/disclaimers.

---

# 5. Target architecture

We should evolve toward the following architecture.

```text
Browser / React App
        │
        ▼
API / Backend
        │
        ├── Authentication
        ├── Authorization / Workspaces
        ├── Billing / Entitlements
        ├── Scan API
        ├── Findings API
        ├── Reports API
        └── Integration API
        │
        ▼
Database
        │
        ├── users
        ├── organizations
        ├── memberships
        ├── targets
        ├── scans
        ├── scan_jobs
        ├── evidence
        ├── findings
        ├── finding_instances
        ├── subscriptions
        ├── audit_events
        └── integrations
        │
        ▼
Job Queue
        │
        ├── Web Crawler Worker
        ├── Security Scanner Worker
        ├── Privacy Browser Worker
        ├── Accessibility Worker
        ├── Repository Scanner Worker
        ├── Asset Scanner Worker
        └── AI Explanation Worker
        │
        ▼
Object Storage
        │
        ├── screenshots
        ├── uploaded files
        ├── generated reports
        └── optional raw evidence artifacts
```

## Important architecture rule

**The public web server should not perform long scans inside the request/response lifecycle.**

Instead:

1. API validates request.
2. API creates a scan record.
3. API creates a job.
4. Worker performs the scan.
5. Worker writes evidence/findings.
6. Frontend polls or subscribes to scan progress.
7. Completed report is loaded from the database.

---

# 6. Technology decisions to make

We should answer these questions before Phase 2 is considered complete.

## 6.1 Frontend

Current recommendation for this repo:

- keep React + TypeScript,
- keep Tailwind,
- keep existing component system,
- add a real router,
- add a query/data fetching layer,
- add an API client,
- add form validation,
- add error boundaries.

### Questions

- Do we keep Vite SPA or migrate to a full-stack framework later?
- Do we need server-side rendered marketing pages for SEO?
- Which pages must be public without login?
- Which pages require a workspace?

For MVP, keeping Vite is acceptable if marketing/SEO requirements remain moderate.

## 6.2 Backend

For the existing repo, continuing with Node.js is sensible.

We should decide whether to:

- keep Express,
- or move to another structured Node backend later.

Do not rewrite purely for style. First make the existing backend correct, secure and testable.

## 6.3 Database/Auth

We need:

- PostgreSQL,
- authentication,
- organizations/workspaces,
- row-level or service-level authorization,
- migrations,
- object storage.

A managed Postgres/Auth provider can accelerate MVP development, but the data model must remain portable.

## 6.4 Queue/workers

Choose one approach:

### Option A — managed queue

Best for simpler operations.

### Option B — Redis-backed queue

Good if we operate our own workers and need retries/concurrency controls.

Required queue features:

- retry policy,
- dead-letter/failure state,
- concurrency limits,
- job timeout,
- idempotency,
- progress updates,
- cancellation where possible.

## 6.5 Browser automation

For real privacy/accessibility scans we need a controlled browser worker.

Responsibilities:

- load page,
- wait for network stability,
- capture network requests,
- inspect cookies,
- inspect storage,
- capture DOM,
- run accessibility checks,
- optionally interact with consent banners,
- capture screenshots/evidence.

## 6.6 AI provider

The AI provider must be behind a server abstraction.

Never call AI provider APIs directly from the browser using secret keys.

Create an internal interface such as:

```ts
interface AiAnalysisProvider {
  explainFinding(input: FindingContext): Promise<AiExplanation>;
  classifyPolicyText(input: PolicyTextInput): Promise<PolicyClassification>;
}
```

This allows providers/models to change without rewriting the product.

---

# 7. Repository target structure

A clean medium-term structure could look like this:

```text
/
├── docs/
│   ├── GUARDAI_MASTER_BUILD_GUIDE.md
│   ├── ARCHITECTURE.md
│   ├── SECURITY.md
│   ├── DATA_MODEL.md
│   ├── API.md
│   └── RELEASE_CHECKLIST.md
│
├── src/                         # React frontend
│   ├── app/
│   ├── components/
│   ├── features/
│   │   ├── auth/
│   │   ├── billing/
│   │   ├── scans/
│   │   ├── findings/
│   │   ├── reports/
│   │   ├── trust-center/
│   │   └── settings/
│   ├── api/
│   ├── lib/
│   ├── schemas/
│   └── types/
│
├── server/
│   ├── src/
│   │   ├── app/
│   │   ├── routes/
│   │   ├── middleware/
│   │   ├── services/
│   │   ├── scanners/
│   │   │   ├── web/
│   │   │   ├── security/
│   │   │   ├── privacy/
│   │   │   ├── accessibility/
│   │   │   ├── repository/
│   │   │   └── assets/
│   │   ├── rules/
│   │   ├── ai/
│   │   ├── jobs/
│   │   ├── db/
│   │   ├── schemas/
│   │   └── observability/
│   └── tests/
│
├── packages/                    # later, when sharing code is justified
│   └── contracts/
│
└── .github/
    └── workflows/
```

Do not create every directory immediately. Create structure when the corresponding real code is added.

---

# 8. Canonical domain model

## 8.1 User

Represents the authenticated person.

Fields:

- id
- email
- name
- created_at
- last_login_at

## 8.2 Organization / Workspace

A customer account should be represented as a workspace/organization.

Fields:

- id
- name
- slug
- owner_id
- plan
- created_at

## 8.3 Membership

Fields:

- organization_id
- user_id
- role

Roles for MVP:

```text
owner
admin
member
viewer
```

## 8.4 Target

A target is something GuardAI scans.

Types:

```text
website
repository
asset
```

Fields:

- id
- organization_id
- type
- display_name
- url
- provider
- external_id
- created_at

## 8.5 Scan

Fields:

- id
- target_id
- organization_id
- requested_by
- status
- scanner_version
- started_at
- completed_at
- failed_at
- failure_code
- overall_score
- coverage

Scan states:

```text
queued
running
completed
failed
cancelled
```

## 8.6 Evidence

Evidence is critical.

Examples:

- HTTP header value
- cookie observed before consent
- third-party request
- DOM element
- script URL
- repository dependency
- source file path
- accessibility violation node
- screenshot
- policy text excerpt

Fields:

- id
- scan_id
- evidence_type
- source
- structured_payload
- artifact_url
- collected_at

## 8.7 Finding definition

A reusable rule definition.

Fields:

- rule_id
- title
- category
- description
- severity_default
- scanner
- requirement_mappings
- remediation_template
- version

## 8.8 Finding instance

The result of applying a rule to a scan.

Fields:

- id
- scan_id
- rule_id
- severity
- confidence
- status
- evidence_ids
- explanation
- remediation
- created_at

Finding workflow status:

```text
open
accepted_risk
resolved
false_positive
needs_review
```

## 8.9 Requirement mapping

Do not hard-code law text into every component.

Create a versioned mapping layer for:

- framework
- requirement identifier
- title
- official source/reference
- applicability notes
- effective dates
- mapping version

This makes legal/compliance updates maintainable.

---

# 9. Shared API contract

This is one of the first major refactors.

## 9.1 One canonical category enum

Example:

```ts
export const ComplianceCategory = z.enum([
  'ai-act',
  'gdpr',
  'accessibility',
  'security',
  'legal-data',
  'consumer-protection',
  'supply-chain',
  'ip-rights',
  'dsa'
]);
```

Only add a category when a real scanner or review workflow exists for it.

## 9.2 One canonical severity enum

```text
info
low
medium
high
critical
```

Compliance workflow state and severity should not be mixed.

For example, do not use `compliant` as an issue severity.

## 9.3 One scan response contract

Example shape:

```json
{
  "scanId": "...",
  "target": {
    "id": "...",
    "type": "website",
    "url": "https://example.com"
  },
  "status": "completed",
  "score": 72,
  "coverage": {
    "checksRun": 48,
    "checksPassed": 37,
    "checksFailed": 11
  },
  "categories": [],
  "findings": [],
  "metrics": {}
}
```

## 9.4 Validate both directions

- validate API request bodies,
- validate environment variables,
- validate scanner output,
- validate AI structured output,
- validate database writes where appropriate.

Do not use `any` as the normal integration strategy.

---

# 10. Phase 0 — freeze scope and clean the repository

## Goal

Create a stable foundation before adding functionality.

## Tasks

- [ ] Mark the current product as prototype internally.
- [ ] Stop adding new mock modules temporarily.
- [ ] Remove `.npm-cache` and `npm_cache` from Git.
- [ ] Update `.gitignore`.
- [ ] Add `.env` patterns.
- [ ] Add `uploads/` ignore.
- [ ] Add test/coverage ignores.
- [ ] Make server dependencies complete.
- [ ] Add root scripts for frontend + server development.
- [ ] Document exact local setup.
- [ ] Remove duplicate rendering in `App.tsx`.
- [ ] Remove dead code where obvious.
- [ ] Decide how legacy mock scan data is retained.

Recommended `.gitignore` additions:

```gitignore
.env
.env.*
!.env.example
uploads/
coverage/
.npm-cache/
npm_cache/
playwright-report/
test-results/
```

## Questions

- Is `mockScanEngine.ts` still needed for demo fixtures/tests?
- Which existing components are part of MVP?
- Which components move to "Labs" or "Coming soon"?

## Acceptance criteria

- clean clone installs correctly,
- frontend starts,
- backend starts,
- no cache directories are versioned,
- no secret file is committed,
- only one copy of each main screen renders.

---

# 11. Phase 1 — establish development standards

## Goal

Make every future change safer and reviewable.

## Required scripts

At minimum we need commands equivalent to:

```text
npm run dev
npm run build
npm run lint
npm run test
npm run test:e2e
npm run typecheck
```

Server should have equivalent commands.

## Add formatting/lint rules

Define conventions for:

- imports,
- unused code,
- unsafe `any`,
- promise handling,
- React hooks,
- server errors,
- test naming.

## Pull request rule

No feature is "done" until:

- build passes,
- lint passes,
- tests pass,
- API contract is documented if changed,
- migration is included if DB changes,
- screenshots are included for major UI changes.

## Acceptance criteria

- one documented development workflow,
- CI-ready scripts,
- consistent code quality baseline.

---

# 12. Phase 2 — repair frontend architecture

## Goal

Turn the prototype navigation into maintainable application structure.

## Tasks

- [ ] Add real routing.
- [ ] Create public routes.
- [ ] Create authenticated routes.
- [ ] Create workspace-aware routes.
- [ ] Add not-found page.
- [ ] Add error boundary.
- [ ] Add loading states.
- [ ] Add API error states.
- [ ] Remove duplicated screen render blocks.
- [ ] Separate demo data from production data.

Suggested route groups:

```text
/
/pricing
/login
/signup
/privacy
/terms
/imprint

/app
/app/scans
/app/scans/:scanId
/app/targets
/app/reports
/app/integrations
/app/settings
/app/billing

/trust/:publicId
```

Existing experimental modules can later live under:

```text
/app/labs/ai-counsel
/app/labs/truesight
```

until they are real.

## Questions

- Which navigation items are MVP?
- Do we show unavailable features or hide them?
- Which pages are publicly indexable?

## Acceptance criteria

- direct URL navigation works,
- refresh works on all routes,
- authenticated routes are protected,
- no duplicate components render.

---

# 13. Phase 3 — create a real API client and contracts

## Goal

Remove hard-coded fetch logic from `mockScanEngine.ts`.

## Tasks

Create a frontend API layer such as:

```text
src/api/client.ts
src/api/scans.ts
src/api/auth.ts
src/api/billing.ts
src/api/integrations.ts
```

Use environment configuration:

```text
VITE_API_BASE_URL=
```

For same-origin production deployments, prefer relative `/api` requests when possible.

## Required behavior

- timeout handling,
- typed responses,
- typed errors,
- auth token/session handling,
- request IDs where useful,
- no silent fallback from real API failure to fake successful scan results.

**Important:** API failure must look like API failure. Never convert a failed real scan into a realistic fake compliance report.

## Acceptance criteria

- no production API call points to localhost,
- no scanner API response is mapped with `any`,
- failed scans are shown as failures.

---

# 14. Phase 4 — backend foundation

## Goal

Refactor `server/index.js` into a testable server application.

## Suggested modules

```text
server/src/index.ts
server/src/app.ts
server/src/config.ts
server/src/routes/
server/src/middleware/
server/src/services/
server/src/scanners/
server/src/jobs/
server/src/db/
server/src/schemas/
```

## Required middleware

- request ID,
- structured logging,
- Helmet/security headers,
- JSON size limit,
- CORS allowlist,
- rate limiting,
- authentication,
- centralized error handling,
- request validation.

## Error contract

Errors should return a consistent structure:

```json
{
  "error": {
    "code": "INVALID_TARGET_URL",
    "message": "The target URL is not allowed.",
    "requestId": "..."
  }
}
```

Do not expose raw stack traces in production.

## Acceptance criteria

- backend can start from clean install,
- backend is split into modules,
- API errors use one format,
- environment config is validated at startup.

---

# 15. Phase 5 — authentication, organizations and authorization

## Goal

Turn GuardAI from a single-browser demo into a multi-user SaaS.

## Required flows

- signup,
- login,
- logout,
- password reset or passwordless equivalent,
- email verification,
- workspace creation,
- workspace switch,
- invite team member,
- remove team member,
- role management.

## Authorization rule

Every backend access to customer data must verify:

```text
authenticated user
        +
organization membership
        +
role/permission
```

Never rely on the frontend hiding a button as authorization.

## Acceptance criteria

- user A cannot fetch user B's organization scans,
- viewer cannot execute admin-only actions,
- workspace ID is validated server-side.

---

# 16. Phase 6 — database and persistence

## Goal

Store everything needed to reproduce and audit scans.

## Required tables for MVP

- users
- organizations
- memberships
- targets
- scans
- scan_jobs
- evidence
- finding_definitions
- findings
- subscriptions
- audit_events

Optional later:

- integrations
- webhooks
- reports
- trust_center_publications
- requirement_mappings
- comments
- remediation_tasks

## Migration requirements

- migrations stored in Git,
- migrations reviewed,
- staging migration tested before production,
- rollback/backout plan for risky migrations.

## Data retention questions

We must explicitly decide:

- How long are scan results stored?
- How long are raw screenshots stored?
- How long are uploaded documents stored?
- Can customer choose deletion?
- Are AI prompts/responses persisted?
- What is included in account deletion?

## Acceptance criteria

- page refresh does not lose scans,
- scan history is real,
- audit events are written for sensitive account actions.

---

# 17. Phase 7 — asynchronous scan job system

## Goal

Stop running deep scans inside public API requests.

## API flow

```text
POST /api/scans
  ↓
202 Accepted
  ↓
scanId
  ↓
worker processes job
  ↓
GET /api/scans/:id
```

## Job requirements

Each scan job needs:

- unique ID,
- organization ID,
- target ID,
- scanner version,
- status,
- progress,
- attempts,
- timeout,
- failure reason,
- timestamps.

## Retry rules

Do not retry every failure blindly.

Examples:

Retry:

- transient network failure,
- worker restart,
- temporary provider outage.

Do not automatically retry forever:

- invalid domain,
- blocked private IP,
- unsupported target,
- authentication-required page without credentials.

## Acceptance criteria

- scan API returns quickly,
- worker can restart without corrupting scan state,
- duplicate request/idempotency strategy is defined.

---

# 18. Phase 8 — safe URL fetcher and crawler

## Goal

Build the shared foundation all website scanners depend on.

## Required URL validation

Only allow supported schemes:

```text
https://
http://   # only if product intentionally supports it
```

Block:

- localhost,
- 127.0.0.0/8,
- ::1,
- private IPv4 ranges,
- private IPv6 ranges,
- link-local ranges,
- metadata endpoints,
- unsupported ports if desired.

Validate after DNS resolution.

Validate every redirect destination.

## Fetch limits

- connection timeout,
- total timeout,
- max redirects,
- maximum response body,
- supported content types,
- decompression limits.

## Crawler MVP

Start small:

- homepage,
- privacy page if discovered,
- imprint/legal page if discovered,
- terms page if discovered,
- one or two key internal pages.

Do not crawl thousands of URLs in MVP.

## Evidence collected

- final URL,
- status code,
- response headers,
- content type,
- HTML snapshot/hash,
- discovered scripts,
- discovered links,
- detected policy links.

## Acceptance criteria

- SSRF test suite passes,
- redirect SSRF tests pass,
- large response is safely rejected/truncated,
- invalid target generates a clear failure state.

---

# 19. Phase 9 — real website security scanner

## Goal

Replace simulated security claims with deterministic technical checks.

## MVP checks

### Transport/security headers

- HTTPS availability
- HSTS
- Content-Security-Policy
- X-Frame-Options / frame-ancestors relationship
- X-Content-Type-Options
- Referrer-Policy
- Permissions-Policy

### Page observations

- mixed content
- insecure form targets
- obvious exposed debug information
- risky third-party scripts where evidence exists

### Dependency detection

Where feasible:

- detect client libraries,
- identify versions only when reliably observable,
- never invent a version.

## Important limitation

A public black-box website scan is not the same as a source-code SAST scan.

GuardAI must distinguish:

- passive web checks,
- active DAST checks,
- authenticated scans,
- repository/source scans.

Do not claim SQL injection scanning until we intentionally build a safe active scanner with explicit user authorization and strict boundaries.

## Acceptance criteria

- every security finding contains evidence,
- scanner never invents CVEs,
- scanner records coverage/limitations.

---

# 20. Phase 10 — real privacy scanner

## Goal

Observe browser behavior instead of guessing from page text.

## Browser evidence

Capture before consent interaction:

- cookies,
- localStorage keys where appropriate,
- sessionStorage metadata where appropriate,
- network requests,
- third-party domains,
- trackers/scripts,
- consent UI presence.

## Consent workflow

MVP can use two states:

1. initial page load,
2. after explicit consent action when safely detectable.

Later support:

- reject-all flow,
- granular consent categories,
- CMP-specific adapters.

## Findings should say what was observed

Good:

> A request to `analytics.example` occurred before any consent action was recorded.

Bad:

> Your website definitely violates GDPR.

## Acceptance criteria

- network log is preserved as evidence,
- findings link to requests/cookies that triggered them,
- unknown/ambiguous consent state is reported as uncertain rather than invented.

---

# 21. Phase 11 — accessibility scanner

## Goal

Use a real accessibility testing engine.

## MVP

Run a recognized automated accessibility rule engine in the browser worker.

Collect:

- rule ID,
- impact,
- HTML selector/path,
- affected node,
- help text,
- screenshot where helpful.

## Important limitation

Automated accessibility testing cannot prove complete accessibility.

Report:

- automated violations,
- passed automated checks,
- items requiring manual review.

## Acceptance criteria

- results come from actual DOM analysis,
- the dashboard can group repeated violations,
- report clearly states automated coverage limitations.

---

# 22. Phase 12 — EU AI Act evidence scanner

## Goal

Turn AI Act scanning into evidence-based detection and guided review.

This module should combine:

### Automated observations

Possible examples:

- chatbot/AI assistant UI detected,
- AI disclosure text detected/not detected,
- AI-related policy language detected,
- generated-content disclosure metadata where observable.

### User questionnaire

Some requirements cannot be inferred from a public page.

Ask the organization questions such as:

- Does this system make decisions about people?
- Is it used in employment, credit, education, healthcare or other sensitive contexts?
- Are users informed they are interacting with AI?
- Is human oversight present?
- Which model/provider is used?
- Are logs retained?
- What data enters the model?

### Evidence upload

Allow users to attach:

- risk assessments,
- model documentation,
- policy documents,
- screenshots,
- internal controls.

## Rule design

Every AI Act rule needs:

- rule ID,
- requirement mapping,
- applicability conditions,
- automated evidence inputs,
- questionnaire inputs,
- confidence,
- manual review flag.

## Acceptance criteria

- GuardAI does not infer high-risk classification solely from domain keywords,
- applicability is explicit,
- finding shows whether it is automated evidence or self-attested evidence.

---

# 23. Phase 13 — GitHub/repository scanner

## Goal

Replace the current top-level `package.json` heuristic with a real repository analysis pipeline.

## Repository connection modes

### Public repository

Scan with public APIs where allowed.

### Private repository

Use an installed GitHub App with least-privilege permissions.

Avoid asking users to paste long-lived personal access tokens unless absolutely necessary.

## Files to detect

At minimum support common manifests/lockfiles such as:

```text
package.json
package-lock.json
pnpm-lock.yaml
yarn.lock
requirements.txt
poetry.lock
Pipfile.lock
go.mod
go.sum
Cargo.toml
Cargo.lock
pom.xml
build.gradle
Dockerfile
*.tf
.github/workflows/*
```

## Scanner modules

### Dependency/SCA

- parse lockfiles,
- map exact dependency versions,
- query vulnerability intelligence,
- store advisory evidence.

### Secret scanning

Use a real secret scanner.

Do not report "no secrets" unless the configured scan actually ran successfully.

### Static analysis

Introduce a dedicated SAST engine rather than LLM guessing.

### Infrastructure/config

Later:

- Dockerfile checks,
- Terraform checks,
- GitHub Actions checks,
- Kubernetes manifests.

### SBOM

Later generate/store SBOM for supported repositories.

## Acceptance criteria

- exact dependency versions come from lockfiles where possible,
- each vulnerability finding references its detected package/version,
- failure to scan a file is visible as incomplete coverage.

---

# 24. Phase 14 — asset/document scanner

## Goal

Make file scanning safe, real and clearly scoped.

## Supported MVP file types

Start with a narrow set:

- PDF
- TXT/Markdown

Add image/docx support only after the pipeline is real.

## Upload controls

Server-side enforce:

- allowed MIME types,
- allowed extensions,
- max size,
- magic-byte validation where appropriate,
- file count,
- processing timeout.

## Storage lifecycle

Decide whether uploads are:

- processed in temporary storage and deleted,
- or retained with explicit customer controls.

## Cleanup rule

Temporary files must be deleted in a `finally`-style cleanup path even when parsing fails.

## AI role

For documents, AI may:

- classify clauses,
- summarize text,
- identify potentially missing sections,
- explain risks.

But the result should be presented as automated analysis requiring review.

## Acceptance criteria

- unsupported files fail clearly,
- no fake text extraction for unsupported files,
- user sees exactly what type of analysis was performed.

---

# 25. Phase 15 — rule engine

## Goal

Move findings out of random component logic and into versioned rules.

## Rule structure

Example:

```ts
interface RuleDefinition {
  id: string;
  version: number;
  category: ComplianceCategory;
  title: string;
  description: string;
  defaultSeverity: Severity;
  evaluate(context: ScanContext): RuleResult;
  requirementMappings: RequirementMapping[];
  remediationTemplate: string;
}
```

## Rule requirements

Every rule must have:

- stable ID,
- version,
- unit tests,
- evidence requirements,
- applicability conditions,
- remediation,
- source/reference mapping.

## Versioning

When rule behavior changes materially, record the scanner/rule version so historical reports remain explainable.

## Acceptance criteria

- same evidence + same scanner version produces deterministic rule result,
- rule change is tested and versioned.

---

# 26. Phase 16 — scoring model

## Goal

Make scores explainable and not misleading.

## Avoid

Do not calculate score simply as:

```text
100 - issueCount * constant
```

without accounting for coverage and severity.

## Proposed model

Each category can have:

- possible weighted points,
- checks actually applicable,
- checks actually executed,
- weighted failures,
- confidence.

Display at least:

```text
Score: 72/100
Coverage: 38/45 applicable checks executed
Confidence: High
```

If coverage is too low, do not present a strong green certification state.

## Acceptance criteria

- score can be reproduced from stored finding/check data,
- score never silently defaults a real zero to a high value,
- category with no executed checks is shown as "Not assessed", not 100%.

---

# 27. Phase 17 — AI explanation layer

## Goal

Use AI where it adds value without letting it fabricate scan truth.

## Good AI tasks

- explain technical evidence in simple language,
- generate remediation steps from verified findings,
- summarize a completed report,
- classify long policy text,
- suggest questions for manual review,
- translate reports.

## Bad AI tasks

Do not let the model independently invent:

- whether a header existed,
- which dependency version was installed,
- whether a cookie was set,
- whether a vulnerability was exploited,
- whether an organization is legally compliant.

## Prompt architecture

Separate:

```text
System instruction
Verified structured evidence
Rule metadata
Customer context
Requested output schema
```

Do not dump arbitrary webpage text into a high-trust system prompt without treating it as untrusted content.

## Structured output

Validate all AI JSON before using it.

If validation fails:

- retry only within controlled limits,
- otherwise mark explanation unavailable,
- never fabricate fallback findings.

## Cost controls

Track:

- tokens/requests per organization,
- model cost per scan,
- daily limits,
- retry cost,
- paid-plan quotas.

## Acceptance criteria

- deterministic finding exists before AI explanation,
- AI failure does not corrupt scan result,
- AI usage is measurable.

---

# 28. Phase 18 — dashboard rebuild on real data

## Goal

Keep the strong current design, replace mocks with real queries.

## Dashboard data

Show:

- actual targets,
- actual latest scan,
- actual scan history,
- actual open findings,
- actual resolved findings,
- actual plan,
- actual usage.

## Remove hard-coded personas/data

Replace example users/domains with authenticated account state.

## Dashboard states

Design for:

- new account with zero scans,
- scan queued,
- scan running,
- scan failed,
- scan completed with no findings,
- scan completed with findings,
- incomplete scanner coverage.

## Acceptance criteria

- dashboard survives empty data,
- no customer sees another customer's data,
- no hard-coded production metrics remain.

---

# 29. Phase 19 — reports

## Goal

Create reports from stored scan evidence, not demo text.

## Report structure

1. Report identity
2. Target
3. Scan timestamp
4. Scanner version
5. Scope
6. Coverage
7. Executive summary
8. Category summary
9. Findings
10. Evidence
11. Remediation
12. Limitations
13. Methodology

## Report language

Do not call GuardAI a verification authority.

Recommended heading:

> GuardAI Automated Technical Compliance Screening Report

Include a visible limitation section.

## Stable report IDs

Generate report IDs server-side and persist them.

Do not create a random document ID on every render.

## PDF generation

Prefer server-side or controlled browser PDF generation from a stable report snapshot.

Store:

- report version,
- scan ID,
- generated time,
- checksum if appropriate.

## Acceptance criteria

- same scan can reproduce the same report data,
- report does not change merely because page re-rendered,
- report only contains actual scan findings.

---

# 30. Phase 20 — Trust Center and badge

## Goal

Turn the current attractive concept into evidence-backed public status.

## Badge principle

A badge should say that a GuardAI scan/status exists, not guarantee legal compliance.

Safer examples:

```text
GuardAI Scan Active
Last technical scan: 2026-08-16
Security checks: 34/38 passed
```

## Public Trust Center

Customer chooses what to publish.

Possible public items:

- last scan date,
- selected technical controls,
- selected resolved findings,
- scan coverage,
- public policies,
- vendor list supplied by customer,
- security contact.

## Never auto-publish sensitive details

Do not expose:

- internal URLs,
- raw vulnerability details,
- repository file paths,
- secrets,
- customer-private evidence.

## Badge verification

Badge script should load status from GuardAI using a public site ID.

Do not generate a fake CDN URL before the badge service actually exists.

## Acceptance criteria

- badge status is server-backed,
- public status can be disabled instantly,
- customer controls published fields.

---

# 31. Phase 21 — billing and entitlements

## Goal

Replace `CheckoutSimulation` with real billing.

## Required entities

- customer
- subscription
- plan
- entitlement
- usage

## Server is source of truth

Never unlock premium based only on React state.

Frontend asks backend:

```text
What plan does this workspace have?
What features are enabled?
What usage remains?
```

## Billing flow

1. User chooses plan.
2. Backend creates provider checkout session.
3. User completes checkout with provider.
4. Provider sends signed webhook.
5. Backend verifies webhook.
6. Subscription DB is updated.
7. Entitlements are recalculated.
8. Frontend refreshes account state.

## Required webhook handling

Support events for:

- checkout completed,
- subscription created/updated,
- payment failed,
- subscription cancelled,
- refund if offered.

## Customer portal

Allow customers to manage:

- payment method,
- invoices,
- cancellation,
- billing details.

## Acceptance criteria

- refreshing browser does not lose premium,
- fake client request cannot unlock plan,
- webhook signatures are verified,
- cancellation changes entitlements correctly.

---

# 32. Phase 22 — lead generation

## Goal

Make lead capture real and privacy-conscious.

## Tasks

- [ ] Replace placeholder webhook.
- [ ] Send through backend instead of trusting client-only flow.
- [ ] Return success only after actual accepted delivery/storage.
- [ ] Add consent/privacy language matching actual use.
- [ ] Add bot/spam protection if public.
- [ ] Store campaign/source attribution if needed.

## Important error rule

Never show:

> Report successfully sent

when the delivery request failed.

## Acceptance criteria

- successful submission is observable in backend,
- failure produces failure UI,
- duplicate submission behavior is defined.

---

# 33. Phase 23 — integrations

## Goal

Replace local toggle buttons with real integrations.

## Build one integration at a time

Recommended order:

1. GitHub
2. email notifications
3. Slack
4. webhook
5. cloud providers later

## GitHub integration

Use a GitHub App.

Define permissions minimally.

Store installation IDs and encrypted credentials/tokens where needed.

## Slack integration

Use OAuth and allow customer to select destination channel.

## Integration states

```text
not_connected
connecting
connected
error
revoked
```

## Acceptance criteria

- disconnect really revokes/removes access,
- sync status comes from backend,
- UI never shows "connected" by default without connection data.

---

# 34. Phase 24 — notifications and continuous monitoring

## Goal

Make "monitoring" real.

## Monitoring model

Customer configures:

- target,
- frequency,
- modules,
- notification destinations.

Scheduler creates scan jobs.

## Change detection

Do not notify on every scan.

Compare current vs previous scan:

- new finding,
- resolved finding,
- severity increase,
- material score decrease,
- new third-party domain,
- new dependency vulnerability.

## Notification example

```text
New high-severity finding
Target: example.com
Rule: privacy.third_party_before_consent
First observed: 2026-08-16 07:30 CET
```

## Acceptance criteria

- scheduled job actually runs,
- notifications are deduplicated,
- user can pause monitoring.

---

# 35. Phase 25 — AI Counsel

## Goal

Only make AI Counsel public when it uses real workspace context.

## Desired behavior

AI Counsel should retrieve:

- selected scan,
- selected findings,
- verified evidence,
- rule mappings,
- customer-uploaded document if explicitly selected.

Then answer questions grounded in that context.

## Guardrails

- show sources/evidence references inside the product,
- identify when answer is general guidance,
- never claim lawyer-client relationship,
- no fake analysis timer,
- document is only described as analyzed if backend actually processed it.

## Acceptance criteria

- counsel answer can cite finding/evidence IDs,
- uploaded file is actually processed,
- model error is visible, not replaced by canned legal findings.

---

# 36. Phase 26 — Policy Manager / Audit Hub

## Goal

Turn the enterprise mockups into a real evidence/control system later.

This is **not MVP**.

## Real model

```text
Framework
  ↓
Requirement
  ↓
Control
  ↓
Evidence
  ↓
Assessment
```

## Audit Hub requires

- evidence ownership,
- evidence freshness,
- control status,
- reviewer,
- notes,
- export.

## Policy-as-Code

Only advertise executed OPA/Rego policies once policies are actually evaluated against real data.

## Acceptance criteria

- all displayed control counts come from database,
- no static SOC 2/ISO percentages remain.

---

# 37. Phase 27 — TrueSight

## Goal

Keep this as a Labs feature unless we have real detection models and defensible evaluation.

Current randomized output must never reach public production as if it were analysis.

## Before release we need

- defined supported media types,
- actual detection pipeline,
- model provenance,
- benchmark/evaluation dataset,
- false positive/negative analysis,
- confidence calibration,
- clear limitations.

## Acceptance criteria

- identical file does not receive arbitrary random classification,
- results come from actual model output,
- confidence is calibrated and explained.

---

# 38. Phase 28 — security hardening of GuardAI itself

## Goal

A security/compliance product must hold itself to a high standard.

## Authentication security

- secure session/token handling,
- MFA roadmap for business accounts,
- email verification,
- rate-limited auth endpoints,
- safe password/reset flow if passwords are used.

## Authorization

Test object-level authorization for every customer resource.

Examples:

- scans,
- reports,
- targets,
- integrations,
- members,
- billing.

## API security

- schema validation,
- rate limits,
- request size limits,
- SSRF protection,
- output encoding,
- secure headers,
- CORS allowlist.

## Secret security

- no secrets in Vite environment variables,
- no secrets in Git,
- rotate leaked keys immediately,
- production secret manager/environment settings,
- separate staging and production credentials.

## File security

- strict upload limits,
- object storage ACLs,
- signed URLs,
- retention/deletion.

## Logging

Never log full:

- card data,
- access tokens,
- API keys,
- uploaded sensitive document content,
- authentication cookies.

## Acceptance criteria

- security review completed,
- automated secret scan in CI,
- dependency vulnerabilities reviewed,
- SSRF tests included in CI.

---

# 39. Phase 29 — testing strategy

## Unit tests

Use for:

- rule evaluation,
- scoring,
- URL validation,
- SSRF blocking,
- category mapping,
- schemas,
- entitlement logic.

## Integration tests

Use for:

- API + database,
- job creation,
- worker completion,
- payment webhook processing,
- authorization.

## E2E tests

Critical flows:

### Free user

```text
signup
→ create workspace
→ scan website
→ wait for result
→ open findings
→ view report preview
```

### Paid user

```text
login
→ checkout
→ webhook updates subscription
→ premium feature available
```

### Security isolation

```text
user A creates scan
→ user B attempts scan URL/API access
→ access denied
```

### Failure

```text
scan worker fails
→ UI shows failed scan
→ no fake report generated
```

## Scanner fixtures

Create controlled test websites/repos with known behavior.

Examples:

- missing CSP,
- tracker before consent,
- accessible page,
- known accessibility violation,
- vulnerable test dependency,
- known secret fixture designed only for tests.

## Acceptance criteria

- critical business and security logic has automated tests,
- E2E tests run in CI or staging pipeline.

---

# 40. Phase 30 — CI/CD

## Required GitHub workflows

### Pull request workflow

Run:

1. install dependencies,
2. typecheck,
3. lint,
4. unit tests,
5. server tests,
6. build,
7. security/dependency scan,
8. secret scan.

### Main branch

- repeat validation,
- deploy staging/production according to release strategy,
- run migration safely,
- run smoke test.

## Branch protection

Before public launch:

- require PR for production changes where practical,
- require CI checks,
- protect main,
- do not allow accidental force push.

## Dependency updates

Enable a controlled dependency update process.

Do not auto-merge major upgrades blindly.

## Acceptance criteria

- broken build cannot be merged unnoticed,
- production deployment has a traceable commit SHA.

---

# 41. Phase 31 — observability

## Goal

Know when GuardAI is broken before customers tell us.

## Logging

Structured logs should include:

- timestamp,
- level,
- request ID,
- organization ID where safe,
- scan ID,
- worker/job ID,
- error code.

## Metrics

Track:

- API latency,
- API error rate,
- scans queued,
- scan duration,
- scan failure rate,
- worker utilization,
- AI provider errors,
- AI cost,
- payment webhook failures,
- signup conversion,
- report generation failures.

## Alerts

Alert for:

- elevated 5xx rate,
- stuck queue,
- repeated worker crashes,
- payment webhook failures,
- database connection failure,
- storage failures.

## Acceptance criteria

- production errors can be traced by request/scan ID,
- critical failure generates alert.

---

# 42. Phase 32 — environments

We need at least:

```text
local
staging
production
```

## Separate credentials

Each environment should have separate:

- database,
- auth config,
- API keys,
- payment provider environment,
- storage bucket/project where appropriate,
- webhooks.

## Never

- use production customer data for casual local testing,
- use production payment keys locally,
- point staging at production DB.

---

# 43. Environment variables inventory

Exact variable names depend on chosen providers, but the architecture will need categories like:

## Frontend-safe

```text
VITE_API_BASE_URL
VITE_PUBLIC_APP_URL
VITE_PUBLIC_AUTH_*      # only provider-documented public values
```

## Backend secrets

```text
DATABASE_URL
AUTH_SECRET / provider server secret
AI_PROVIDER_API_KEY
PAYMENT_SECRET_KEY
PAYMENT_WEBHOOK_SECRET
ENCRYPTION_KEY
STORAGE_SECRET / service credentials
QUEUE_URL / REDIS_URL
EMAIL_PROVIDER_KEY
```

## Rule

Any value included in the frontend bundle must be considered public.

---

# 44. Phase 33 — deployment architecture

## Minimum public architecture

```text
Public Web App
        ↓
HTTPS
        ↓
API Service
        ↓
Postgres
        ↓
Queue
        ↓
Scanner Workers
        ↓
Object Storage
```

Browser-based scanner workers should be isolated from the main API where possible because they process untrusted external content.

## Deployment requirements

- custom domain,
- TLS,
- DNS,
- environment variables,
- database migrations,
- health endpoint,
- readiness checks,
- worker health,
- log access,
- backups,
- rollback.

## Health endpoints

At minimum distinguish:

```text
/health/live
/health/ready
```

Readiness should reflect dependencies required to serve traffic.

---

# 45. Phase 34 — domain, DNS and email

Before launch we need:

- product domain,
- application subdomain if desired,
- API subdomain if architecture uses one,
- transactional email sender domain,
- SPF,
- DKIM,
- DMARC,
- support email,
- security contact email.

Example layout:

```text
www.example.com        marketing
app.example.com        SaaS
api.example.com        API
status.example.com     status page
```

Exact domains are a business decision.

---

# 46. Phase 35 — privacy and data governance of GuardAI

Before launch document the data flows.

## Data map

For each data type record:

- what data,
- why collected,
- where stored,
- processor/provider,
- region,
- retention,
- deletion path,
- access roles.

## Important GuardAI data types

- account email/name,
- billing identity,
- target URLs,
- scan evidence,
- repository metadata,
- uploaded documents,
- AI prompts/responses,
- logs,
- support requests.

## Customer control

Implement:

- account deletion request,
- workspace deletion,
- target deletion,
- uploaded file deletion,
- export where appropriate.

## Acceptance criteria

- privacy policy matches real system,
- data can actually be deleted according to stated policy.

---

# 47. Phase 36 — product legal pages and claims review

Before public launch, review:

- Impressum requirements,
- privacy policy,
- terms/AGB,
- subscription/cancellation wording,
- pricing incl. VAT presentation,
- refund/withdrawal wording depending on customer type/market,
- AI disclaimer,
- scan limitations,
- report language,
- badge language,
- Trust Center claims.

## Important

The UI must not claim certifications or hosting standards that are not actually true and documented.

Examples to verify before showing publicly:

- "ISO 27001 hosting"
- "Made/hosted in Germany"
- "24/7 monitoring"
- "EU AI Act compliant"
- "DSGVO compliant"
- "official audit"

---

# 48. Phase 37 — pricing and packaging

Do not design pricing only around UI locks.

Pricing should map to measurable backend entitlements.

Possible entitlement dimensions:

- scans/month,
- monitored targets,
- repository scans,
- scan frequency,
- report export,
- team seats,
- history retention,
- AI explanation quota,
- integrations,
- public Trust Center.

Example internal entitlement object:

```json
{
  "maxTargets": 3,
  "monthlyScans": 20,
  "scheduledMonitoring": false,
  "reportExport": true,
  "teamSeats": 1
}
```

The backend enforces this object.

---

# 49. Phase 38 — pre-launch security review

Before production release:

- [ ] SSRF test complete
- [ ] auth bypass review
- [ ] IDOR/object authorization review
- [ ] file upload abuse review
- [ ] rate-limit review
- [ ] payment webhook review
- [ ] secret scanning review
- [ ] dependency vulnerability review
- [ ] CORS review
- [ ] security header review
- [ ] production logs review
- [ ] backup/restore test
- [ ] delete-account path test

For a scanner product, an independent security review becomes increasingly important as real customers arrive.

---

# 50. Phase 39 — staging release

Before production, deploy the full system to staging.

## Staging test matrix

### Account

- signup
- verification
- login
- logout
- reset
- invite

### Scanner

- valid URL
- invalid URL
- HTTP redirect
- blocked private IP
- large page
- page timeout
- known security fixture
- known privacy fixture
- known accessibility fixture

### Repository

- public repo
- private authorized repo
- missing manifest
- known vulnerable dependency fixture

### Billing

- successful checkout
- failed payment
- subscription cancellation
- webhook replay/idempotency

### Reports

- free report
- paid report
- empty finding set
- many findings

### Authorization

- cross-workspace access blocked

## Acceptance criteria

- no P0/P1 launch blockers,
- production configuration is documented.

---

# 51. Phase 40 — production launch checklist

## Infrastructure

- [ ] Production database created
- [ ] Backups configured
- [ ] API deployed
- [ ] workers deployed
- [ ] queue deployed/configured
- [ ] storage configured
- [ ] domain connected
- [ ] TLS working
- [ ] DNS verified
- [ ] email domain verified
- [ ] health checks passing

## Security

- [ ] Secrets added through deployment platform
- [ ] No production secret committed
- [ ] CORS allowlist production-only
- [ ] SSRF protection enabled
- [ ] Upload limits enabled
- [ ] Rate limits enabled
- [ ] Auth enabled
- [ ] Authorization tests pass

## Product

- [ ] signup works
- [ ] first scan works
- [ ] failed scan works
- [ ] report works
- [ ] billing works
- [ ] cancellation works
- [ ] plan enforcement works
- [ ] emails work
- [ ] account deletion works

## Communication/legal

- [ ] Privacy policy published
- [ ] Terms published
- [ ] Impressum published if applicable
- [ ] Support email works
- [ ] Product claims reviewed
- [ ] Scanner limitation disclaimer visible

## Operations

- [ ] Error monitoring enabled
- [ ] Uptime monitoring enabled
- [ ] Alerts configured
- [ ] Incident contact defined
- [ ] Rollback procedure documented

---

# 52. Phase 41 — launch sequence

Recommended launch order:

## Stage 1 — internal alpha

Only our own test sites/repos.

Purpose:

- stabilize scanner,
- fix false positives,
- measure scan cost,
- improve evidence quality.

## Stage 2 — private beta

Small number of invited users.

Collect:

- scan accuracy feedback,
- confusing findings,
- missing evidence,
- false positives,
- user flow failures,
- willingness to pay.

## Stage 3 — paid beta

Enable real billing after:

- core reliability,
- support process,
- cancellation/refund process,
- clear limitations.

## Stage 4 — public launch

Only after security/operations are ready.

---

# 53. Phase 42 — post-launch operating loop

Every week review:

- scan failure rate,
- false-positive reports,
- most common findings,
- most expensive scanner operations,
- AI cost,
- conversion,
- churn,
- support cases,
- security incidents,
- new rule requests.

Every rule change should be traceable.

Every meaningful scanner change should have a version.

---

# 54. MVP scope — what we should actually launch first

The current repository contains many attractive modules. The first real product should be smaller.

## MVP MUST HAVE

### Account

- authentication
- workspace
- basic settings

### Targets

- website target
- public GitHub repository target or connected GitHub target

### Website scan

- safe fetch
- security headers
- browser network/privacy observations
- automated accessibility checks
- limited AI Act disclosure checks

### Repository scan

- dependency/lockfile analysis
- vulnerability lookup
- secret scan

### Findings

- evidence
- severity
- confidence
- remediation
- requirement mapping

### Dashboard

- target list
- scan history
- findings

### Reports

- evidence-based PDF

### Billing

- free plan
- one paid plan initially

### Operations

- CI
- staging
- monitoring
- backups

## POST-MVP

Do later:

- advanced Policy Graph
- SOC 2 Audit Hub
- broad cloud integrations
- automatic GitHub PR fixes
- advanced legal document generation
- TrueSight
- full AI Counsel
- ESG
- full DSA module
- enterprise on-premise distribution

---

# 55. P0 implementation order for the current repository

This is the exact order we should start with now.

## P0.1 Repository cleanup

- remove cache folders,
- update `.gitignore`,
- verify no secrets,
- fix README setup.

## P0.2 Server package correctness

- declare all dependencies,
- create development/start scripts,
- validate env variables.

## P0.3 Shared scan contract

- create canonical enums,
- normalize response shape,
- remove `any` mapping,
- fix `privacy`/`gdpr` and `aiAct`/`ai-act` mismatch.

## P0.4 Fix dashboard stability

- handle missing categories,
- fix empty states,
- fix score fallback bug,
- remove duplicate renders.

## P0.5 API configuration

- remove hard-coded localhost,
- add API environment config,
- add clear failure handling.

## P0.6 SSRF protection

- implement network destination validator,
- validate redirects,
- add tests.

## P0.7 Upload hardening

- max file size,
- MIME/extension validation,
- cleanup on error.

## P0.8 Honest product states

Until functionality is real:

- mark AI Counsel as Preview,
- mark TrueSight as Preview or hide,
- mark integrations as Preview or hide,
- remove fake payment success flow from public production,
- remove certification-style claims.

When these eight blocks are complete, we have a stable base for the real MVP.

---

# 56. Development milestones

## Milestone A — stable developer baseline

Deliverables:

- clean repository,
- reproducible install,
- frontend/server start together,
- shared contracts,
- tests/CI baseline.

## Milestone B — real single website scan

Deliverables:

- scan job,
- safe URL fetch,
- real evidence,
- security + privacy + accessibility result,
- persisted scan,
- dashboard.

## Milestone C — account SaaS

Deliverables:

- auth,
- workspace,
- DB,
- history,
- authorization.

## Milestone D — paid MVP

Deliverables:

- billing,
- entitlements,
- report export,
- production deployment.

## Milestone E — repository scanning

Deliverables:

- GitHub connection,
- dependency scanner,
- secrets,
- findings.

## Milestone F — monitoring

Deliverables:

- scheduled scans,
- change detection,
- notifications.

## Milestone G — trust product

Deliverables:

- public Trust Center,
- real badge,
- publish controls.

---

# 57. Questions we must continually ask ourselves

Before implementing any feature, answer these questions.

## Product truth

1. Is this feature real or only UI?
2. What evidence proves the result?
3. What happens when the scanner is uncertain?
4. What happens when the scanner fails?
5. Could this wording make a customer believe more was verified than actually was?

## Security

6. Does this feature process untrusted URLs/files/code?
7. Can it access internal network resources?
8. What authentication is required?
9. What authorization is required?
10. What is the abuse/cost risk?

## Data

11. What customer data is stored?
12. For how long?
13. Can the customer delete it?
14. Which third parties receive it?
15. Is sensitive data sent to an AI provider?

## Engineering

16. What is the API contract?
17. What are the failure states?
18. How is it tested?
19. How is it monitored?
20. How do we roll it back?

## Commercial

21. Which plan includes it?
22. What measurable entitlement controls access?
23. What does the feature cost us per use?
24. Can a free user abuse it?

## Compliance product quality

25. Is the legal/reference mapping current?
26. Is applicability actually known?
27. Is the result deterministic or AI-generated?
28. What confidence should be shown?
29. Does it need human review?
30. Can we reproduce the result later?

---

# 58. Definition of Done for every scanner check

A scanner check is not complete because text appears in the dashboard.

It is complete only when:

- [ ] stable rule ID exists,
- [ ] rule version exists,
- [ ] input evidence is defined,
- [ ] applicability is defined,
- [ ] detector implementation exists,
- [ ] unit test exists,
- [ ] positive fixture exists,
- [ ] negative fixture exists,
- [ ] severity rationale exists,
- [ ] confidence logic exists,
- [ ] remediation exists,
- [ ] requirement mapping exists if relevant,
- [ ] UI displays the evidence,
- [ ] report displays the finding correctly,
- [ ] failure/unknown state is defined.

---

# 59. Definition of Done for every product feature

A feature is complete only when:

- [ ] backend exists if needed,
- [ ] database exists if persistence is needed,
- [ ] authorization exists,
- [ ] loading state exists,
- [ ] empty state exists,
- [ ] error state exists,
- [ ] tests exist,
- [ ] analytics/monitoring are defined if needed,
- [ ] mobile/responsive state is checked,
- [ ] accessibility is checked,
- [ ] product copy reflects real behavior,
- [ ] documentation is updated.

---

# 60. Immediate next implementation task

The next engineering change after this document should be **GuardAI Core Stabilization**, not a new major feature.

Recommended first PR/change set:

1. repository hygiene,
2. `.gitignore`,
3. server dependency repair,
4. shared scan schema,
5. API base URL configuration,
6. `App.tsx` duplicate render cleanup,
7. scan fallback removal,
8. score fallback fix,
9. dashboard null/empty state,
10. basic tests for scan response mapping.

After that, build SSRF protection before exposing real URL scanning publicly.

---

# 61. Final target

The finished GuardAI product should be able to answer every customer question with evidence.

Instead of:

> "Our AI thinks your site is non-compliant."

GuardAI should be able to say:

> "During scan `S-123`, our browser observed request `R-44` to third-party domain `X` before any consent interaction. Rule `privacy.preconsent.third_party.v2` classified this as a high-priority privacy review item. Here is the captured evidence, the mapped requirement, the confidence level, and the remediation steps."

That level of traceability is the standard we should build toward.

---

# 62. Master rule for the project

**First make the scanner true. Then make it broad. Then make it enterprise.**

The current repository already contains the product vision. Our next job is to replace each simulated promise with a real, testable, evidence-backed capability in the order defined above.
