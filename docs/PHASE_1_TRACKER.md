# GuardAI Phase 1 Tracker — Development Standards

> Active implementation tracker for Phase 1 of `GUARDAI_MASTER_BUILD_GUIDE.md`.

## Status

**PHASE 1: IN PROGRESS — CI execution externally blocked by GitHub billing/spending settings**

The workflow itself is registered and active. The first real run was created, but GitHub did not assign a runner to either job. GitHub's check annotation reports that recent account payments failed or the account spending limit must be increased. This is not currently a GuardAI lint/type/build failure because no workflow step started.

To avoid producing a failed check on every direct `main` documentation commit while this external blocker exists, CI currently runs on pull requests and manual dispatch. Once runner access is restored, we should execute the workflow and then decide whether to restore a `push: main` gate.

---

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

`package.json` permits compatible Node 24/npm 11 updates while `.nvmrc` defines the reproducible project/CI baseline.

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
| Add automated history secret scan | DONE | Gitleaks with full history checkout |
| Pin external Actions to immutable commit SHAs | DONE | checkout/setup-node/gitleaks |
| Register workflow with GitHub Actions | DONE | GitHub reports `GuardAI CI` as active |
| Execute/observe first CI run | BLOCKED | Run created; jobs never started because GitHub runner access is blocked by billing/spending settings |
| Repair existing lint/type/build failures | WAITING | We do not yet have evidence of code failures because runner never started |
| Review TypeScript strictness | TODO | Current config lacks full `strict`; do not enable blindly before baseline build executes |
| Review oxlint rules | IN PROGRESS | Current config protects React hooks; deeper baseline waits for executable CI |
| Confirm clean install from lockfile | BLOCKED | Requires executable runner/local clean environment |
| Update README local setup with pinned runtime | DONE | README now documents Node/npm and Phase 1 |

---

## First CI attempt

Workflow run created successfully with two jobs:

```text
Frontend quality → failure before runner start
Secret scan     → failure before runner start
```

Both jobs had:

```text
runner_id = 0
steps = []
```

GitHub annotation:

```text
The job was not started because recent account payments have failed
or your spending limit needs to be increased.
```

Therefore **do not classify this as a GuardAI build failure**.

---

## CI design

Current workflow: `.github/workflows/ci.yml`

Runs on:

- pull requests,
- manual workflow dispatch.

### Frontend quality

```text
checkout
→ Node from .nvmrc
→ npm ci
→ npm run lint
→ npm run typecheck
→ npm run build
```

### Secret scan

```text
full Git history checkout
→ Gitleaks
```

External actions are pinned to immutable commit SHAs.

---

## Phase 1 exit criteria

- [x] Runtime is pinned/documented.
- [x] Package manager is defined.
- [x] Editor conventions exist.
- [x] Contribution rules exist.
- [x] CI quality workflow exists and is registered.
- [x] Automated secret scanning is configured.
- [ ] GitHub runner access is restored or an equivalent clean execution environment is available.
- [ ] A clean environment successfully executes `npm ci`.
- [ ] Lint is green.
- [ ] Typecheck is green.
- [ ] Production frontend build is green.
- [ ] Any genuine baseline failures are fixed rather than suppressed without justification.

---

## Next action when runner access is restored

Run `GuardAI CI` manually or through a PR. Then:

1. inspect `npm ci`,
2. fix lint findings,
3. fix TypeScript findings,
4. fix build findings,
5. run again until green,
6. close Phase 1,
7. begin Phase 2 frontend-core repair.

We do not claim Phase 1 complete until those checks actually execute.
