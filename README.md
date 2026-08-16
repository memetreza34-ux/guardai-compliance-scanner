# GuardAI — Technical Compliance Evidence & Risk Platform

GuardAI is being rebuilt from an advanced SaaS/UI prototype into a real technical compliance evidence and risk scanning platform for websites, repositories and selected digital assets.

> **Current status:** prototype / active rebuild. Several visible product surfaces already exist, but a number of them are still mock-driven or simulated and must not be treated as production capabilities yet.

## Product direction

GuardAI is intended to collect technical evidence, run deterministic checks where possible, surface potential compliance/security risks, explain findings, preserve scan history and support remediation workflows.

The platform is **not** intended to act as a government authority, official certification body, law firm or guarantee of legal compliance.

## Current frontend

- React 19
- TypeScript
- Vite
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
- `src/data/mockScanEngine.ts` — legacy/mock scanner reference; not the future production source of truth
- `src/types/scanner.ts` — early scanner type model to be replaced/refactored into shared contracts
- `src/components/ComplianceDashboard.tsx` — current dashboard UI
- `src/components/ScanProgressModal.tsx` — current scan-progress UI
- `src/components/PrintableReport.tsx` — current report prototype
- `server/index.js` — current backend prototype

## Development

### Frontend

```bash
npm install
npm run dev
```

Build:

```bash
npm run build
```

Lint:

```bash
npm run lint
```

### Backend

The backend currently lives in `server/` and is being repaired as part of the documented build phases. A clean, reproducible backend setup with complete declared dependencies and unified root scripts is a required milestone before the backend is considered ready for normal development.

## Build process

We follow the living master guide in:

```text
docs/GUARDAI_MASTER_BUILD_GUIDE.md
```

Current active phase:

```text
Phase 0 — Scope Freeze & Repository Hygiene
```

Core principle:

```text
First make the scanner true.
Then make it stable.
Then make it secure.
Then scale it.
Then add enterprise depth.
```

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
