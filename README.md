# GuardAI — Technical Compliance Evidence & Risk Platform

GuardAI is being rebuilt from an advanced SaaS/UI prototype into a real technical compliance evidence and risk scanning platform for websites, repositories and selected digital assets.

> **Current status:** prototype / active rebuild. Several visible product surfaces already exist, but a number of them are still mock-driven or simulated and must not be treated as production capabilities yet.

## Product direction

GuardAI is intended to collect technical evidence, run deterministic checks where possible, surface potential compliance/security risks, explain findings, preserve scan history and support remediation workflows.

The platform is **not** intended to act as a government authority, official certification body, law firm or guarantee of legal compliance.

## Current frontend

- React 19
- TypeScript
- Vite 8
- Tailwind CSS
- shadcn/base-ui style components
- Framer Motion
- Lucide icons

Existing product surfaces include:

- Landing Page
- URL/File scanner input
- Scan Progress
- Compliance Dashboard
- Printable Report
- Lead Generation
- Pricing
- Checkout Simulation
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

Many of these surfaces are currently prototypes. The rebuild replaces simulated data and claims with real scanner evidence and backend state.

## Current backend prototype

`server/index.js` currently contains early implementations for:

- `POST /api/scan`
- website fetching
- GitHub repository checks
- Gemini-assisted analysis
- `POST /api/scan-file`
- PDF/text extraction
- basic HTTP security-header checks
- rate limiting
- Helmet
- Zod input validation

The backend is **not production-ready yet**. Known work includes shared API contracts, dependency cleanup, SSRF protection, upload hardening, authentication, persistence, asynchronous jobs, tests and deployment architecture.

## Important repository files

- `docs/GUARDAI_MASTER_BUILD_GUIDE.md` — canonical A-to-Z build plan and current source of truth
- `docs/REPO_INVENTORY.md` — file/component-specific KEEP/REFACTOR/REPLACE/LATER decisions
- `docs/PHASE_0_TRACKER.md` — completed repository-hygiene phase
- `docs/PHASE_1_TRACKER.md` — current development-baseline phase
- `CONTRIBUTING.md` — development and review rules
- `src/data/mockScanEngine.ts` — legacy/mock scanner reference; not the future production source of truth
- `src/types/scanner.ts` — early scanner type model to be replaced/refactored into shared contracts
- `server/index.js` — current backend prototype

## Development baseline

GuardAI currently pins:

```text
Node.js 24.18.1
npm 11.16.0 baseline
```

If you use nvm:

```bash
nvm install
nvm use
npm ci
npm run dev
```

The exact Node baseline is stored in `.nvmrc`. `package.json` also declares the supported Node 24/npm 11 range.

### Quality commands

```bash
npm run lint
npm run typecheck
npm run build
npm run check
```

`npm run check` is the minimum aggregate frontend check. GitHub CI additionally performs a clean `npm ci` and history secret scan.

### Backend

The backend currently lives in `server/` and is being repaired in the documented build phases. Its current `package.json` does not yet declare every package imported by `server/index.js`; this is a frozen P0 item for the Backend Foundation phase and must not be mistaken for a finished clean-install contract.

## Build process

We follow the living master guide:

```text
docs/GUARDAI_MASTER_BUILD_GUIDE.md
```

Current active phase:

```text
Phase 1 — Development Standards
```

Phase 0 — Scope Freeze & Repository Hygiene is complete.

Core principle:

```text
First make the scanner true.
Then make it stable.
Then make it secure.
Then scale it.
Then add enterprise depth.
```

## CI

`.github/workflows/ci.yml` defines the current baseline quality gate:

```text
clean checkout
→ Node from .nvmrc
→ npm ci
→ lint
→ typecheck
→ production build
```

A separate job checks full Git history for likely secrets. A workflow file existing is not the same as a successful build; current CI status must be checked before calling the baseline green.

## Production rule

A feature is not considered implemented merely because a UI exists. A production feature requires, where applicable:

- real backend behavior,
- persistent data,
- authorization,
- error/loading/empty states,
- tests,
- security review,
- observability,
- and accurate product claims.

Mock/preview functionality must be clearly identified until replaced by real implementation.
