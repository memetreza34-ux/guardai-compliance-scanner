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
| Root lockfile | `package-lock.json` required |
| Backend lockfile | must be regenerated after a real clean backend install |

`package.json` permits compatible Node 24/npm 11 updates while `.nvmrc` defines the reproducible project/CI baseline.

---

## Development-standard work

| Task | Status | Notes |
|---|---|---|
| Pin Node runtime | DONE | `.nvmrc` |
| Declare Node/npm compatibility | DONE | root `package.json` engines + packageManager |
| Add dedicated typecheck command | DONE | `npm run typecheck` |
| Add aggregate check command | DONE | `npm run check` |
| Add EditorConfig | DONE | UTF-8/LF/2-space baseline |
| Add contribution/development rules | DONE | `CONTRIBUTING.md` |
| Add frontend env example | DONE | `VITE_API_BASE_URL`; `VITE_*` values are public |
| Define backend env contract | DONE | `PORT`, `CORS_ORIGIN`, `GEMINI_API_KEY` documented |
| Repair backend dependency declarations | DONE | all imports used by current server declared in `server/package.json` |
| Remove stale backend lockfile | DONE | old lock described only axios/cors/express and was not truthful |
| Regenerate backend lockfile | BLOCKED | requires a real clean install with the selected backend package set |
| Add PR CI quality gate | DONE | root install/lint/typecheck/build |
| Add automated history secret scan | DONE | Gitleaks with full history checkout |
| Pin external Actions to immutable SHAs | DONE | checkout/setup-node/gitleaks |
| Register workflow with GitHub Actions | DONE | GitHub reports `GuardAI CI` active |
| Execute/observe first CI run | BLOCKED | jobs created, runner never assigned because of GitHub billing/spending state |
| Confirm clean install | BLOCKED | needs working runner or equivalent clean environment |
| Confirm lint/typecheck/build | BLOCKED | no runner step has executed yet |
| Review TypeScript strictness | WAITING | do not enable blindly before baseline build runs |
| Review oxlint rules | IN PROGRESS | existing React hook protection remains |
| README runtime setup | DONE | Node/npm/CI status documented |

---

## Safe implementation progress while CI is externally blocked

We continue only on already-confirmed GuardAI defects, keep the changes narrow, and explicitly mark runtime validation as pending.

### Frontend shell

- [x] duplicate main-view rendering removed from `App.tsx`
- [x] canonical `ActiveTab` type created
- [x] App/Navbar/CommandPalette navigation path no longer depends on central `as any`
- [x] global `AppErrorBoundary` added
- [x] root element is validated before React bootstrap
- [x] preview feature definitions moved out of the growing App component
- [x] unverified ISO/DSGVO/AI-Act-ready claims removed from global footer
- [x] visible product state identifies GuardAI as prototype/rebuild

### Scan request lifecycle

- [x] `src/api/scanApi.ts` is used by the active scan path
- [x] API base is configurable through `VITE_API_BASE_URL`
- [x] typed `ScanOptions` travel from UI to API
- [x] Security, Privacy and AI-Governance module selection is visible in the active scanner
- [x] Accessibility remains disabled until a real browser/axe scanner exists
- [x] backend `privacy` → frontend `gdpr` and `aiAct` → `ai-act` normalization added
- [x] score zero is preserved; no `score || 100` behavior in the active adapter
- [x] API/network failure throws a real scan error instead of generating a fake result
- [x] backend coverage notices are displayed to the user
- [x] actual client request duration is measured instead of hardcoded `1500ms`

### Scan UX / result integrity

- [x] fake timed Deep-Crawler/SAST/DAST/registry progress removed
- [x] progress is indeterminate until real backend job events exist
- [x] landing/hero no longer promise automatic legal review, certification or guaranteed fine avoidance
- [x] unsupported image analysis removed from active upload UI; PDF/TXT boundary is explicit
- [x] active result screen uses evidence-first `ScanResultsDashboard`
- [x] missing check coverage displays `Nicht bewertet` rather than 100%
- [x] fake industry benchmark removed from active result view
- [x] `vollständig konform / keine Sicherheitslücken` wording removed from active path

### Backend truthfulness / request safety

- [x] scan options are validated server-side and control which modules run
- [x] Accessibility no longer receives a fake score when no Accessibility scanner exists
- [x] old GitHub repository scan with fabricated 90/100 categories is disabled with HTTP 501
- [x] AI-provided JSON is schema-validated before inclusion
- [x] AI-provided arbitrary scores are ignored; current screening score is deterministic from validated issue severity
- [x] webpage/document content is explicitly treated as untrusted prompt data
- [x] Gemini client receives the server-side API key explicitly when configured
- [x] CORS origin is environment-controlled instead of universally permissive
- [x] `X-Powered-By` is disabled
- [x] target URL rejects credentials and nonstandard ports
- [x] loopback/private/link-local/reserved IPv4/IPv6 targets are blocked
- [x] every redirect target is validated before following
- [x] Axios auto-redirects and proxy environment routing are disabled for scanner fetches
- [x] socket-level DNS lookup validates resolved IPs before connection to reduce DNS-rebinding risk
- [x] target-safety rules moved into `server/lib/targetSafety.js`
- [x] Node regression tests added for URL/IP/DNS safety rules

### Upload boundary

- [x] server enforces one file, maximum 10 MB
- [x] only PDF/TXT accepted in current path
- [x] extension + MIME boundary enforced before processing
- [x] PDF magic signature checked
- [x] binary/null-byte TXT input rejected
- [x] temporary files cleaned in `finally`
- [x] image/presentation mock extraction removed
- [x] fake 100% web categories removed from file results
- [ ] malware/quarantine scanner remains a later production requirement
- [ ] parser isolation/resource limits need deeper hardening before arbitrary public document processing

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

Navigation displays an explicit `FeaturePreview` boundary describing what must exist before each module becomes production functionality.

### Report

- [x] old verification-authority report removed from active runtime
- [x] `TechnicalScanReport` renders from the current `ScanResult`
- [x] report states automated technical-screening limitations
- [x] no official certification claim

---

## Remaining high-priority blockers before public scanner exposure

1. **Authentication / quotas:** scan endpoints remain unauthenticated and can currently trigger paid AI usage.
2. **Backend install validation:** selected package set and new backend lockfile have not yet been installed/regenerated in a clean environment.
3. **Executable security tests:** target-safety tests exist but have not run in the blocked CI environment.
4. **Canonical shared contract:** frontend/backend still normalize across two shapes instead of importing one versioned schema.
5. **Server decomposition:** `server/index.js` is still too broad and must be split into app/routes/middleware/services/scanners.
6. **Persistent jobs:** scans are still synchronous request/response operations.

---

## Important validation status

All implementation work above is **statically reviewed but not yet clean-build/runtime-verified** because GitHub has not provided a runner. We intentionally do not claim:

```text
npm ci passes
backend npm install passes
lint passes
typecheck passes
build passes
backend tests pass
```

until they actually execute.

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

Backend install/check/test is added to CI once the backend lockfile is regenerated from a verified clean install.

---

## Phase 1 exit criteria

- [x] Runtime pinned/documented.
- [x] Package manager defined.
- [x] Editor conventions exist.
- [x] Contribution rules exist.
- [x] CI quality workflow exists and is registered.
- [x] Automated secret scanning configured.
- [x] Current backend runtime imports are declared.
- [x] Initial scanner target-safety test suite exists.
- [ ] GitHub runner access restored or equivalent clean execution environment available.
- [ ] Root clean environment executes `npm ci` successfully.
- [ ] Backend dependency install is verified and lockfile regenerated.
- [ ] Lint green.
- [ ] Typecheck green.
- [ ] Production frontend build green.
- [ ] Backend syntax/tests green.
- [ ] Genuine baseline failures fixed rather than suppressed.

---

## Next implementation order

While CI remains externally blocked, continue only with isolated fixes to confirmed P0 risks:

1. protect paid/expensive scan paths with an explicit server-side access/usage boundary,
2. introduce canonical scanner response schemas,
3. split backend responsibilities without changing behavior,
4. prepare job/persistence architecture.

When runner access returns, validation takes priority over additional feature work.
