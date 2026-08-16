# GuardAI Repository Inventory

> Living file-by-file disposition for the current repository. Keep this synchronized with `GUARDAI_MASTER_BUILD_GUIDE.md` while the prototype is converted into the real SaaS.

Status values:

- `KEEP` — concept/implementation remains
- `REFACTOR` — keep value, change architecture/data flow
- `REPLACE` — current implementation must not remain the production source of truth
- `LATER` — valuable but not MVP
- `REMOVE` — repository/runtime artifact that should not remain tracked

---

## Root

| Path | Decision | Why / Future state |
|---|---|---|
| `.gitignore` | KEEP | Hardened in Phase 0; keep synchronized with runtime/test tooling |
| `.npm-cache/` | REMOVE | Generated npm cache; repo bloat; now ignored but still tracked until removed |
| `npm_cache/` | REMOVE | Generated npm cache; repo bloat; now ignored but still tracked until removed |
| `.oxlintrc.json` | KEEP / REVIEW | Existing lint baseline; validate during Phase 1 |
| `README.md` | KEEP | Rewritten in Phase 0 to reflect real prototype/rebuild state |
| `components.json` | KEEP | UI tooling configuration |
| `index.html` | KEEP / REVIEW | Vite entry; review external fonts, metadata, CSP and SEO later |
| `package.json` | KEEP / REFACTOR | Current frontend package; unify dev/test scripts during Phase 1 |
| `package-lock.json` | KEEP | Reproducible dependency lock |
| `tsconfig*.json` | KEEP / HARDEN | Review strictness in Phase 1 |
| `vite.config.*` | KEEP / REFACTOR | Add environment/API/deployment config as architecture evolves |
| `public/` | KEEP | Review assets and production-only files before launch |
| `docs/` | KEEP | Canonical engineering documentation |

---

## Frontend application core

| Path | Decision | Why / Future state |
|---|---|---|
| `src/App.tsx` | REFACTOR | Remove duplicate view rendering; introduce real routing/layout/auth boundaries |
| `src/main.tsx` | KEEP | Small provider/bootstrap refactors only |
| `src/data/mockScanEngine.ts` | REPLACE | Keep only as explicit fixture/demo/reference; never production scan truth |
| `src/types/scanner.ts` | REFACTOR | Move to canonical shared API/domain contracts |
| `src/lib/` | KEEP / EXPAND | Shared utilities; later API/error/security helpers |

---

## Product components

| Component | Decision | GuardAI-specific future |
|---|---|---|
| `AiCounsel.tsx` | LATER / REBUILD | Real workspace/evidence context; no canned legal findings |
| `AuditHub.tsx` | LATER / REBUILD | Database-backed controls/evidence after MVP core |
| `BadgeGenerator.tsx` | REFACTOR LATER | Generate only from real public Trust Center state |
| `CheckoutSimulation.tsx` | REPLACE | Real payment provider + server-side entitlements |
| `CommandPalette.tsx` | KEEP / REFACTOR | Wire to real routes/actions |
| `ComplianceDashboard.tsx` | REFACTOR | Preserve visual language; replace mocks/hardcoded assumptions with query data |
| `DocumentGenerator.tsx` | LATER / REBUILD | Evidence-backed documents; no blanket legal-validity claims |
| `IntegrationsHub.tsx` | LATER / REBUILD | Real OAuth/API connection state |
| `LandingPage.tsx` | KEEP / REFACTOR | Preserve design; claims must track real product capability |
| `LeadGenModal.tsx` | REFACTOR | Real backend, consent, failure state, deduplication |
| `Navbar.tsx` | KEEP / REFACTOR | Real routes/auth/workspace state |
| `PolicyManager.tsx` | LATER / REBUILD | Real versioned policy/control data after core |
| `PricingModal.tsx` | REFACTOR | Real plans/entitlements and correct billing language |
| `PrintableReport.tsx` | REBUILD | Generate from stored evidence + scanner/rule/report versions |
| `PublicTrustCenter.tsx` | REBUILD | Public view only of customer-approved real evidence/status |
| `RemediationModal.tsx` | REFACTOR | Real finding/remediation workflow |
| `ScanProgressModal.tsx` | REFACTOR | Real queue/worker progress events, not timed simulation |
| `TemplatesHub.tsx` | REVIEW / LATER | Version templates and legal sources before public claims |
| `ThemeProvider.tsx` | KEEP | UI infrastructure |
| `ThemeToggle.tsx` | KEEP | UI infrastructure |
| `TrueSight.tsx` | LATER / LABS | No production release until real model + calibrated evaluation exists |
| `UrlInputHero.tsx` | REFACTOR | Preserve UX; options must be sent/enforced by scanner backend |
| `UserDashboard.tsx` | REBUILD | Real user/workspace/target/scan statistics |
| `WorkspaceSwitcher.tsx` | REFACTOR | Connect to real organizations/memberships |
| `ui/` | KEEP | Reusable presentation primitives; accessibility review later |

---

## Backend

| Path | Decision | GuardAI-specific future |
|---|---|---|
| `server/index.js` | REFACTOR | Split into app/routes/middleware/services/scanners/jobs/db/ai/observability |
| `server/package.json` | FIX / REFACTOR | Complete dependencies/scripts, then evolve with backend structure |
| `server/package-lock.json` | REGENERATE WHEN PACKAGE FIXED | Must match declared backend dependencies |
| `server/.env.example` | EXPAND | Document validated server config without secrets |

### Imports currently used by `server/index.js`

Declared today:

- `axios`
- `cors`
- `express`

Used but not currently declared in `server/package.json`:

- `dotenv`
- `cheerio`
- `@google/genai`
- `helmet`
- `express-rate-limit`
- `zod`
- `multer`
- `pdf-parse`

Node built-in:

- `fs`

**Rule:** Versions are chosen and lockfile regenerated during the backend foundation work; do not add arbitrary unverified versions merely to silence the mismatch.

---

## Current prototype behaviors that must not survive as production truth

- random/heuristic scan findings presented as if measured,
- client-local premium state,
- simulated payment success,
- fake integration connection state,
- hard-coded team/user/domain metrics,
- hard-coded vendor risk data,
- fixed Trust Center compliance statuses,
- timed scan progress unrelated to worker state,
- random TrueSight classification,
- canned AI Counsel analysis,
- static generated document pretending to be scan-specific,
- success UI after failed lead-delivery attempt,
- default high scores when data is missing,
- `Not scanned` situations represented as `passed` or `100%`.

---

## Inventory maintenance rule

Whenever a component is substantially changed:

1. update its row here,
2. update the active phase tracker,
3. update the master guide only if architecture/order/requirements changed,
4. ensure public product claims match the new implementation.
