# GuardAI Phase 1 Tracker — Development Standards

> Active implementation tracker for Phase 1 of `GUARDAI_MASTER_BUILD_GUIDE.md`.

## Status

**PHASE 1: IN PROGRESS — CI execution externally blocked by GitHub billing/spending settings**

The workflow is registered and active. GitHub created a real run, but assigned no runner to either job. The GitHub check annotation states that recent account payments failed or the account spending limit must be increased. Therefore the failed checks are **not evidence of a GuardAI lint/type/build failure** because no workflow step started.

CI currently runs on pull requests and manual dispatch to avoid a guaranteed failed check on every direct `main` documentation commit while runner access is unavailable.

---

## Goal

Make GuardAI reproducible to install, consistent to edit and automatically checked before larger architecture work.

---

## Runtime baseline

| Item | Decision |
|---|---|
| Node.js | `24.18.1` LTS baseline via `.nvmrc` |
| Package manager | npm |
| npm baseline | `11.16.0` |
| Frontend framework | React 19 + TypeScript + Vite 8 |
| Lockfile | `package-lock.json` required |

`package.json` permits compatible Node 24/npm 11 updates while `.nvmrc` defines the reproducible project/CI baseline.

---

## Development-standard work

| Task | Status | Notes |
|---|---|---|
| Pin Node runtime | DONE | `.nvmrc` |
| Declare Node/npm compatibility | DONE | `package.json` engines + packageManager |
| Add dedicated typecheck command | DONE | `npm run typecheck` |
| Add aggregate check command | DONE | `npm run check` |
| Add EditorConfig | DONE | UTF-8/LF/2-space baseline |
| Add contribution/development rules | DONE | `CONTRIBUTING.md` |
| Add frontend env example | DONE | `VITE_API_BASE_URL`; warning that `VITE_*` values are public |
| Add PR CI quality gate | DONE | install/lint/typecheck/build |
| Add automated history secret scan | DONE | Gitleaks with full history checkout |
| Pin external Actions to immutable SHAs | DONE | checkout/setup-node/gitleaks |
| Register workflow with GitHub Actions | DONE | GitHub reports `GuardAI CI` active |
| Execute/observe first CI run | BLOCKED | Jobs created, runner never assigned because of GitHub billing/spending state |
| Confirm clean install | BLOCKED | Needs working runner or equivalent clean environment |
| Confirm lint/typecheck/build | BLOCKED | No runner step has executed yet |
| Review TypeScript strictness | WAITING | Do not enable blindly before baseline build runs |
| Review oxlint rules | IN PROGRESS | Existing React hook protection remains; deeper hardening follows executable baseline |
| README runtime setup | DONE | Node/npm/CI status documented |

---

## Safe code cleanup completed during external CI blocker

We continued only with changes that directly remove already-confirmed prototype risks and do not add new runtime dependencies.

### Frontend shell

- [x] duplicate main-view rendering removed from `App.tsx`
- [x] canonical `ActiveTab` type created
- [x] App/Navbar/CommandPalette navigation path no longer depends on `as any`
- [x] unverified ISO/DSGVO/AI-Act-ready claims removed from global footer
- [x] visible product state identifies GuardAI as prototype/rebuild

### Scan request lifecycle

- [x] new `src/api/scanApi.ts` is used by the active App scan path
- [x] API base is configurable through `VITE_API_BASE_URL`
- [x] backend `privacy` → frontend `gdpr` and `aiAct` → `ai-act` normalization added
- [x] score zero is preserved; no `score || 100` behavior in new adapter
- [x] API/network failure throws a real scan error instead of generating a fake compliance result
- [x] response basics are read from `unknown` values instead of normal `any` mapping
- [x] actual client request duration is measured instead of hardcoded `1500ms`

### Scan UX

- [x] fake timed Deep-Crawler/SAST/DAST/Handelsregister/etc. progress removed
- [x] progress is indeterminate until real backend job events exist
- [x] landing/hero no longer promise automatic legal review, certification or guaranteed fine avoidance
- [x] unsupported image analysis removed from active upload UI; PDF/TXT prototype boundary is explicit
- [x] active result screen replaced with evidence-first `ScanResultsDashboard`
- [x] missing check coverage displays `Nicht bewertet` rather than 100%
- [x] fake industry benchmark removed from active result view
- [x] `vollständig konform / keine Sicherheitslücken` result wording removed from active path

### Legacy feature isolation

The design prototypes remain in Git but are no longer executed from the main App runtime for normal navigation:

- User Dashboard
- Audit Hub
- Badge Generator
- simulated Pricing/Checkout
- AI Counsel
- Public Trust Center
- Smart Docs
- Templates Hub
- Integrations Hub
- Policy Manager
- TrueSight

Navigation now displays an explicit `FeaturePreview` boundary describing what must exist before each module becomes a production feature.

### Report

- [x] old verification-authority report removed from active runtime
- [x] new `TechnicalScanReport` renders from the actual current `ScanResult`
- [x] report explicitly states automated technical-screening limitations
- [x] no official certification claim

---

## Important validation status

All cleanup above is **statically reviewed but not yet build-verified** because GitHub has not provided a runner. We intentionally do not mark any of these statements:

```text
npm ci passes
lint passes
typecheck passes
build passes
```

until they really execute.

---

## First CI attempt

Both jobs were created but never started:

```text
Frontend quality → failure before runner start
Secret scan     → failure before runner start
runner_id       → 0
steps           → []
```

GitHub annotation:

```text
The job was not started because recent account payments have failed
or your spending limit needs to be increased.
```

---

## CI design

Current workflow: `.github/workflows/ci.yml`

Triggers:

- pull request,
- manual workflow dispatch.

Frontend quality:

```text
checkout
→ Node from .nvmrc
→ npm ci
→ npm run lint
→ npm run typecheck
→ npm run build
```

Secret scan:

```text
full Git history checkout
→ Gitleaks
```

---

## Phase 1 exit criteria

- [x] Runtime pinned/documented.
- [x] Package manager defined.
- [x] Editor conventions exist.
- [x] Contribution rules exist.
- [x] CI quality workflow exists and is registered.
- [x] Automated secret scanning configured.
- [ ] GitHub runner access restored or equivalent clean execution environment available.
- [ ] Clean environment executes `npm ci` successfully.
- [ ] Lint green.
- [ ] Typecheck green.
- [ ] Production frontend build green.
- [ ] Genuine baseline failures fixed rather than suppressed.

---

## Next action when runner access is restored

1. run `GuardAI CI`,
2. inspect `npm ci`,
3. repair real lint findings,
4. repair real TypeScript findings,
5. repair real build findings,
6. run until green,
7. close Phase 1,
8. formalize Phase 2 routing/layout/error-boundary work,
9. then Phase 3 canonical shared scanner contracts.

Until then, any additional code change must remain small, dependency-free and tied to an already-confirmed issue.
