# GuardAI Phase 0 Tracker — Scope Freeze & Repository Hygiene

> Operational tracker for the first implementation phase of `docs/GUARDAI_MASTER_BUILD_GUIDE.md`.

Status legend:

- `DONE` — implemented and checked
- `IN PROGRESS` — actively being worked on
- `BLOCKED` — needs another prerequisite/tooling decision
- `TODO` — not started

---

## Phase 0 goal

Create a clean, truthful and documented repository baseline before changing GuardAI's architecture.

Phase 0 does **not** attempt to build the real scanner yet. It makes sure we know exactly what exists, what is mock-driven, what is unsafe and what each major file will become.

---

## Current status

| Task | Status | Notes |
|---|---|---|
| Upgrade master build guide | DONE | Expanded into GuardAI-specific living engineering bible |
| Correct project README | DONE | Current prototype/rebuild state is now explicit; React version corrected |
| Harden `.gitignore` | DONE | Secrets, runtime uploads, caches, coverage and test artifacts covered |
| Create Phase 0 tracker | DONE | This document |
| Freeze major component disposition | DONE | Included in master guide; dedicated inventory will stay synchronized |
| Remove `.npm-cache/` from version control | TODO | Directory is still present in repository tree |
| Remove `npm_cache/` from version control | TODO | Directory is still present in repository tree |
| Inspect repository for committed secrets | TODO | Must review tracked files/history before calling complete |
| Review environment/config files | IN PROGRESS | `server/.env.example` exists; production env contract still needs later expansion |
| Review backend declared dependencies | TODO | Known mismatch between `server/index.js` imports and `server/package.json` |
| Review duplicate/obsolete files | TODO | App/component cleanup is executed in Phase 2, but candidates are frozen here |
| Freeze P0/P1 engineering list | IN PROGRESS | Master guide contains current list; update when new blockers are found |
| Establish repo size cleanup plan | TODO | Cache directories are a known source of repository bloat |
| Confirm no misleading production claims remain in repository docs | IN PROGRESS | README fixed; UI claim cleanup happens during relevant feature phases |

---

## Known P0 engineering blockers frozen for the rebuild

### P0-01 — Scanner data contract mismatch

Frontend and backend currently use incompatible category/status shapes.

**Target:** one shared validated contract used by both sides.

### P0-02 — Production API configuration

Frontend currently contains a hard-coded localhost API path.

**Target:** validated environment/API client configuration.

### P0-03 — Backend clean-install failure risk

Backend imports are not fully represented by `server/package.json`.

**Target:** a clean clone installs and starts without undeclared dependencies.

### P0-04 — SSRF exposure

User-controlled URLs can reach backend HTTP fetching.

**Target:** safe fetcher with DNS/IP/redirect validation and automated tests before public scanning.

### P0-05 — Unsafe/incomplete upload boundary

UI limits are not sufficient when server-side enforcement is incomplete.

**Target:** strict upload size/type handling, quarantine/storage policy and later malware scanning.

### P0-06 — Mock results in production path

Mock/fallback data can look like a real scan result.

**Target:** mocks become explicit fixtures/demo mode only; production failure is shown as failure.

### P0-07 — Misleading product state

Several components visually imply real monitoring, integrations, compliance verification, deepfake analysis, billing or document analysis while implementation is still simulated.

**Target:** either implement a capability or mark/remove it from public production flows until real.

### P0-08 — Tenant/auth foundation missing

Current UI state is not a real multi-user SaaS security model.

**Target:** authentication, organizations, roles and server-side authorization before customer data is trusted.

---

## Phase 0 repository decisions

### Keep and evolve

- React/TypeScript frontend
- Vite for the current MVP rebuild
- Tailwind/component system
- visual dashboard language
- scan-progress visual concept
- report visual concept
- target input UX

### Replace as source of truth

- `src/data/mockScanEngine.ts`
- local premium boolean/state
- simulated checkout state
- simulated integration state
- random TrueSight classification
- canned AI Counsel findings
- hard-coded audit metrics
- fixed Trust Center compliance state

### Refactor

- `src/App.tsx`
- `src/types/scanner.ts`
- `server/index.js`
- API adapters
- dashboard data access
- report generation
- lead generation

### Post-MVP / Labs

- full Audit Hub
- Policy Manager enterprise depth
- TrueSight production detector
- on-prem appliance
- SAML/SCIM
- advanced document generation

---

## Phase 0 exit criteria

Phase 0 is complete only when:

- [x] Master Guide reflects GuardAI rather than a generic SaaS.
- [x] README describes the real current state.
- [x] `.gitignore` protects obvious local/secret/runtime artifacts.
- [x] Major existing features have a KEEP/REFACTOR/REPLACE/LATER decision.
- [ ] Both committed npm cache directories are removed from version control.
- [ ] Repository is reviewed for accidentally committed secrets.
- [ ] Backend dependency mismatch is documented with an exact fix list.
- [ ] Repository bloat cleanup is complete or intentionally deferred with reason.
- [ ] No unknown P0 blocker remains from the initial static repository audit.

---

## Next after Phase 0

Phase 1 establishes the development baseline:

1. Node/package-manager version,
2. reproducible install,
3. unified scripts,
4. formatting/lint/typecheck rules,
5. EditorConfig,
6. contribution/PR rules,
7. first CI quality gate.

We do **not** jump directly into adding new scanner features before this baseline exists.
