# GuardAI Phase 1 Tracker — Development Standards

> Active implementation tracker for Phase 1 of `GUARDAI_MASTER_BUILD_GUIDE.md`.

## Goal

Make GuardAI reproducible to install, consistent to edit and automatically checked before architectural refactors begin.

---

## Runtime baseline

| Item | Decision |
|---|---|
| Node.js | `24.18.1` LTS baseline via `.nvmrc` |
| Package manager | npm |
| npm baseline | `11.16.0` |
| Frontend framework | React 19 + TypeScript + Vite 8 |
| Lockfile | `package-lock.json` is required |

The `package.json` engine range permits compatible Node 24/npm 11 updates while `.nvmrc` and CI provide a known reproducible baseline.

---

## Work items

| Task | Status | Notes |
|---|---|---|
| Pin Node runtime | DONE | `.nvmrc` |
| Declare Node/npm compatibility | DONE | `package.json` engines + packageManager |
| Add dedicated typecheck command | DONE | `npm run typecheck` |
| Add aggregate check command | DONE | `npm run check` |
| Add EditorConfig | DONE | UTF-8/LF/2-space baseline |
| Add contribution/development rules | DONE | `CONTRIBUTING.md` |
| Add PR CI quality gate | DONE | install/lint/typecheck/build |
| Add automated history secret scan | DONE | Gitleaks action with full checkout history |
| Pin external Actions to immutable commit SHAs | DONE | checkout/setup-node/gitleaks |
| Execute/observe first CI run | TODO | Must verify current prototype against the new gate |
| Repair existing lint/type/build failures found by CI | TODO | Do not suppress legitimate errors just to turn CI green |
| Review TypeScript strictness | TODO | Current config lacks full `strict`; adopt incrementally if current code permits |
| Review oxlint rules | TODO | Keep useful baseline; add security/correctness rules deliberately |
| Confirm clean install from lockfile | TODO | CI `npm ci` is the authoritative clean-environment check |
| Update README local setup with pinned runtime | TODO | After CI confirms baseline |

---

## CI design

Current workflow: `.github/workflows/ci.yml`

Runs on:

- pull requests,
- manual workflow dispatch.

### Frontend quality job

```text
checkout
→ Node from .nvmrc
→ npm ci
→ npm run lint
→ npm run typecheck
→ npm run build
```

### Secret job

```text
full Git history checkout
→ Gitleaks
```

The workflow deliberately does not silently ignore quality failures. Existing prototype debt discovered by CI becomes tracked Phase 1 work.

---

## Phase 1 exit criteria

- [x] Runtime is pinned/documented.
- [x] Package manager is defined.
- [x] Editor conventions exist.
- [x] Contribution rules exist.
- [x] CI quality workflow exists.
- [x] Automated secret scanning exists.
- [ ] A clean CI environment successfully installs the root app.
- [ ] Lint is green.
- [ ] Typecheck is green.
- [ ] Production frontend build is green.
- [ ] Any baseline failures are fixed rather than suppressed without justification.
- [ ] README reflects the verified setup.

---

## Next phase

Only after this gate is green do we start **Phase 2 — Frontend Core Repair**:

- real routing structure,
- duplicate render cleanup,
- error boundary,
- public/app layouts,
- preparation for future auth guards.
