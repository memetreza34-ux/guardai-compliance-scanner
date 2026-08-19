# GuardAI Phase 10–11 Tracker — Privacy + Accessibility Browser Scanners

> Source status only. Nothing in this document is evidence that a Browser Worker has executed in a real isolated environment.

## Current state

**SOURCE FOUNDATION IMPLEMENTED — MODULES REMAIN DISABLED**

GuardAI currently keeps both `privacy` and `accessibility` absent from `ENABLED_PERSISTENT_SCAN_MODULES`. No public API caller can request these modules yet.

The shared persistent contract is now `0.3.0` and adds the coverage state `observed`. Historical persistent reads explicitly retain support for `0.2.0`.

## Architecture decisions

- `docs/adr/0005-privacy-browser-evidence-boundary.md`
- `docs/adr/0006-browser-worker-network-isolation.md`
- `docs/adr/0007-accessibility-automated-evidence-boundary.md`

### Core rule

Browser modules may produce technical Evidence without being forced to invent a numeric score.

- `state: assessed` requires a real numeric score.
- `state: observed` requires `score: null`.
- `observed` modules are not silently interpreted as passed or compliant.
- scoring policy ignores non-assessed module results.

## Shared Browser Runtime gate

`server/browser/browserRuntimeContract.js` requires a Browser provider to attest all of the following before GuardAI will claim a customer Job:

- isolated Worker runtime,
- connection-time egress enforcement,
- private-network deny,
- cloud-metadata-network deny,
- ephemeral browser profile,
- downloads disabled,
- no inbound listener,
- enforced resource limits,
- bounded navigation/task/request/transfer/redirect budgets.

The runtime attestation is checked **before** `claimNextJob()` in the Browser observation Worker. A bad deployment must not consume customer Jobs.

A Browser Job lease must exceed the configured Browser task timeout with explicit safety headroom.

## Phase 10 — Privacy

### Source implemented

- `privacy` capability corrected to `browser_scan`, not `ai_screening`.
- `server/scanners/privacyBrowserEvidence.js`
  - stores origins instead of request query strings,
  - stores Cookie metadata/counts but never Cookie values,
  - stores Web Storage counts but never keys/values,
  - strips URL query/fragment data from retained Privacy links,
  - stores Consent control classification only, not raw button labels,
  - does not call every cross-origin request a tracker.
- `server/domain/privacyConsentState.js`
  - derives technical observation coverage states,
  - preserves pre/post-reject deltas,
  - never decides legal consent validity.
- `server/workers/browserObservationWorker.js`
  - can adapt a future safe Browser provider into `state: observed`, `score: null` Privacy Evidence,
  - attaches runtime ID/version provenance,
  - adds derived Consent observation state.
- test sources verify raw request-query, Cookie, Storage and control-label values do not enter persistent Evidence.

### Still gated

- no concrete Browser provider selected/installed,
- no isolated Browser container/runtime deployed,
- no real consent interaction engine,
- no approved tracker-classification dataset,
- no Privacy Rule catalog/scoring profile,
- no staging SSRF/egress proof,
- no activation in persistent module list.

## Phase 11 — Accessibility

### Source implemented

- `server/scanners/accessibilityEvidence.js`
  - retains engine ID/version,
  - separates violations, incomplete/manual-review candidates and passes,
  - retains rule IDs, impacts, tags and aggregate node counts,
  - removes raw HTML, element text, screenshots, failure summaries and full selectors from MVP Evidence.
- `server/workers/browserObservationWorker.js`
  - adapts a future safe Browser engine result into `state: observed`, `score: null`,
  - attaches Browser runtime provenance.
- test sources verify DOM/selector/customer-content strings do not enter the persisted observation model.

### Still gated

- no concrete accessibility engine package selected/installed,
- no isolated Browser runtime deployed,
- no exact engine-version pin proven by clean install,
- no WCAG Rule mapping/version catalog,
- no manual-review workflow,
- no accessibility scoring profile,
- no staging regression corpus,
- no activation in persistent module list.

## Contract/provenance changes

- `shared/scan-contract.json` -> `0.3.0`
- `supportedReadVersions` -> `0.2.0`, `0.3.0`
- `coverageStateValues` now includes `observed`
- `server/domain/assessmentResult.js` accepts:
  - assessed + numeric score,
  - observed + null score only.
- `server/repositories/jobRepository.js` persists the real Worker result state instead of hardcoding `assessed`.
- `src/types/workspace.ts` exposes typed persistent coverage including `observed`.

## Mandatory activation gate

Neither Browser module may be moved into `ENABLED_PERSISTENT_SCAN_MODULES` until all of the following execute successfully:

1. clean backend install + syntax/unit test suite,
2. concrete Browser provider selected and dependency versions pinned,
3. isolated Browser runtime/container with enforced network policy,
4. connection-time DNS/IP egress tests including redirects and rebinding scenarios,
5. download/popup/file-protocol/private-network/metadata-service denial tests,
6. resource-budget and timeout tests,
7. real Website staging corpus,
8. Evidence minimization review,
9. module-specific Rule/coverage semantics approved,
10. persistent DB/report/UI integration proof.

Until then, these modules are architectural source foundations only.
