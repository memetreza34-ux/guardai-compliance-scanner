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
| `package.json` | KEEP / REFACTOR | Runtime/package manager and quality scripts now defined |
| `package-lock.json` | KEEP | Reproducible frontend dependency lock |
| `tsconfig*.json` | KEEP / HARDEN | Full strictness review waits for executable clean build |
| `vite.config.*` | KEEP / REFACTOR | Deployment/proxy details evolve later |
| `public/` | KEEP | Review before production launch |
| `docs/` | KEEP | Canonical engineering documentation |

---

## Frontend application core

| Path | Decision | Current GuardAI state |
|---|---|---|
| `src/App.tsx` | REFACTOR / ACTIVE | Duplicate view block removed; typed navigation; real scan request/error lifecycle now used |
| `src/main.tsx` | KEEP | Small provider/bootstrap refactors later |
| `src/api/scanApi.ts` | KEEP / ACTIVE | New productive scanner API adapter; maps backend categories, validates basic runtime shapes, throws on failure instead of returning fake scan results |
| `src/vite-env.d.ts` | KEEP | Types `VITE_API_BASE_URL` |
| `src/data/mockScanEngine.ts` | LEGACY | No longer used by the active App scan lifecycle; retain temporarily for fixtures/reference until all remaining imports are removed |
| `src/types/scanner.ts` | REFACTOR | Old result model still contains legacy concepts such as mandatory benchmark/risk-status fields; replace with canonical contracts in Phase 3 |
| `src/types/navigation.ts` | KEEP | Canonical active-tab type and guard |
| `src/types/scanOptions.ts` | KEEP / EVOLVE | Central typed scan-request options; backend enforcement still needs Phase 3/4 work |
| `src/lib/` | KEEP / EXPAND | Shared utilities later |

---

## Product components

| Component | Decision | Current GuardAI state / future |
|---|---|---|
| `AiCounsel.tsx` | LATER / REBUILD | Real workspace/evidence context; no canned legal findings |
| `AuditHub.tsx` | LATER / REBUILD | Database-backed controls/evidence after MVP core |
| `BadgeGenerator.tsx` | REFACTOR LATER | Only real public Trust Center state may become a public badge |
| `CheckoutSimulation.tsx` | REPLACE | Real billing + server entitlements |
| `CommandPalette.tsx` | KEEP / REFACTOR | Navigation now centrally typed; future routes later |
| `ComplianceDashboard.tsx` | LEGACY | Removed from active scan-result path because of hardcoded benchmark/strong compliance claims; keep temporarily for visual reference |
| `ScanResultsDashboard.tsx` | KEEP / ACTIVE | New evidence-first productive result view; no industry benchmark or automatic compliance guarantee |
| `DocumentGenerator.tsx` | LATER / REBUILD | Evidence-backed documents; no blanket legal-validity claims |
| `IntegrationsHub.tsx` | LATER / REBUILD | Real OAuth/API connection state |
| `LandingPage.tsx` | KEEP / ACTIVE | Rewritten to describe actual prototype/rebuild state and technical screening limitations |
| `LeadGenModal.tsx` | REFACTOR | Real backend, consent, real failure state, deduplication |
| `Navbar.tsx` | KEEP / REFACTOR | Central navigation typing; visible Prototype state; real auth/workspaces later |
| `PolicyManager.tsx` | LATER / REBUILD | Real versioned policy/control data after core |
| `PricingModal.tsx` | REFACTOR | Real plans/entitlements and correct billing language |
| `PrintableReport.tsx` | REBUILD | Generate from stored evidence + scanner/rule/report versions |
| `PublicTrustCenter.tsx` | REBUILD | Customer-approved real evidence/status only |
| `RemediationModal.tsx` | REFACTOR | Real finding/remediation workflow |
| `ScanProgressModal.tsx` | KEEP / ACTIVE | Fake timed SAST/DAST/legal steps removed; now indeterminate and truthful until real job events exist |
| `TemplatesHub.tsx` | REVIEW / LATER | Version templates and legal sources before public claims |
| `ThemeProvider.tsx` | KEEP | UI infrastructure |
| `ThemeToggle.tsx` | KEEP | UI infrastructure |
| `TrueSight.tsx` | LATER / LABS | No production release until real model + calibrated evaluation exists |
| `UrlInputHero.tsx` | KEEP / ACTIVE | Typed target/file input; no fake sample domains; PDF/TXT prototype limitation explicit |
| `UserDashboard.tsx` | REBUILD | Real user/workspace/target/scan statistics |
| `WorkspaceSwitcher.tsx` | REFACTOR | Connect to real organizations/memberships |
| `ui/` | KEEP | Presentation primitives; accessibility review later |

---

## Backend

| Path | Decision | GuardAI-specific future |
|---|---|---|
| `server/index.js` | REFACTOR | Split into app/routes/middleware/services/scanners/jobs/db/ai/observability |
| `server/package.json` | FIX / REFACTOR | Complete dependencies/scripts, then evolve with backend structure |
| `server/package-lock.json` | REGENERATE WHEN PACKAGE FIXED | Must match declared backend dependencies |
| `server/.env.example` | EXPAND | Validated server config without secrets |

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

**Rule:** Dependency versions are deliberately selected and the server lockfile regenerated during Backend Foundation. Do not insert arbitrary versions just to hide the mismatch.

---

## Prototype behaviors already removed from the active scan path

- [x] duplicate main-view rendering in `App.tsx`
- [x] untyped `as any` navigation in App/Navbar/Command Palette path
- [x] hardcoded production-certification claims in the global footer
- [x] fake timer-based scanner stages before the API call
- [x] API-error fallback that looked like a real compliance result
- [x] active use of legacy `ComplianceDashboard` with fake industry benchmark
- [x] landing-page promise of fully automated legal review/certification
- [x] image-upload UI pretending unsupported image analysis is already real

---

## Prototype behaviors still requiring removal/rebuild

- client-local premium state,
- simulated checkout/payment success,
- fake integration connection state,
- hard-coded user/team/domain metrics,
- fixed Trust Center compliance statuses,
- random TrueSight classification,
- canned AI Counsel analysis,
- static/generated document pretending to be evidence-specific,
- LeadGen success despite delivery failure,
- legacy mock engine and legacy dashboard files,
- scanner contract fields that cannot represent `not_assessed` cleanly,
- backend scores/check coverage that are not yet based on robust detector evidence,
- scan option UI/request semantics not yet enforced by backend.

---

## Inventory maintenance rule

Whenever a component is substantially changed:

1. update its row here,
2. update the active phase tracker,
3. update the master guide if architecture/order/requirements changed,
4. ensure visible product claims match the implementation,
5. never mark a build/test condition as passed unless it actually executed.
