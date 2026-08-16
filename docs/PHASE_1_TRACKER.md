# GuardAI Phase 1 Tracker — Development Standards

> Active implementation tracker for Phase 1 of `GUARDAI_MASTER_BUILD_GUIDE.md`.

## Status

**PHASE 1: IN PROGRESS — CI execution externally blocked by GitHub billing/spending settings**

The workflow is registered and active. GitHub created a real run, but assigned no runner to either job. The GitHub check annotation states that recent account payments failed or the account spending limit must be increased. Therefore the failed checks are **not evidence of a GuardAI lint/type/build failure** because no workflow step started.

CI currently runs on pull requests and manual dispatch to avoid a guaranteed failed check on every direct `main` documentation commit while runner access is unavailable.

---

## Runtime baseline

| Item | Decision |
|---|---|
| Node.js | `24.18.1` LTS via `.nvmrc` |
| Package manager | npm |
| npm baseline | `11.16.0` |
| Frontend | React 19 + TypeScript + Vite 8 |
| Root lockfile | `package-lock.json` required |
| Backend lockfile | regenerate after a verified clean backend install |
| MVP persistence/auth | dedicated GuardAI Supabase/Postgres/Auth project; see ADR 0001 |

---

## Development-standard work

| Task | Status | Notes |
|---|---|---|
| Runtime/package-manager baseline | DONE | `.nvmrc`, root package metadata |
| Typecheck/check scripts | DONE | root quality commands |
| Editor/contribution rules | DONE | `.editorconfig`, `CONTRIBUTING.md` |
| Frontend env contract | DONE | `VITE_API_BASE_URL` |
| Backend env contract | DONE | PORT/CORS/Gemini/fail-safe AI gate |
| Backend dependency declarations | DONE | active runtime imports declared |
| Stale backend lockfile removal | DONE | regeneration still BLOCKED pending clean install |
| PR CI quality gate | DONE | install/lint/typecheck/build |
| History secret scan | DONE | Gitleaks configured |
| Immutable Action SHAs | DONE | external Actions pinned |
| First CI execution | BLOCKED | no runner assigned because of GitHub billing/spending state |
| Clean install/build verification | BLOCKED | no executable clean environment yet |
| TypeScript strictness review | WAITING | after real baseline build |
| Oxlint hardening | IN PROGRESS | current hook correctness remains enabled |

---

## Frontend integrity work completed

- [x] duplicate main-view rendering removed
- [x] central `ActiveTab` typing; central navigation `as any` removed
- [x] global `AppErrorBoundary`
- [x] root bootstrap validation
- [x] preview definitions extracted from `App.tsx`
- [x] unsupported product surfaces isolated behind `FeaturePreview`
- [x] active scanner uses `src/api/scanApi.ts`
- [x] `VITE_API_BASE_URL` instead of mandatory hardcoded production URL
- [x] typed scan options from UI to API
- [x] Security/Privacy/AI-Governance selector restored truthfully
- [x] Accessibility visible but disabled until real browser/axe scanner
- [x] API/network failures remain failures; no fake result fallback
- [x] backend coverage notices shown in UI
- [x] fake timed crawler/SAST/DAST progress removed
- [x] evidence-first result dashboard
- [x] no fake industry benchmark in active result path
- [x] no automatic `fully compliant` / `no vulnerabilities` wording
- [x] technical report replaces verification-authority report in active runtime

---

## Backend integrity/security work completed

### Honest scanner behavior

- [x] requested modules enforced server-side
- [x] no fake Accessibility score
- [x] old fabricated GitHub repository scoring disabled with HTTP 501
- [x] AI output schema validation
- [x] arbitrary AI-provided scores ignored
- [x] untrusted webpage/document prompt boundaries
- [x] explicit server-side Gemini key configuration
- [x] AI-assisted anonymous cost paths disabled by default
- [x] file upload is rejected in the Multer filter before disk write when anonymous AI is disabled

### Target/network safety

- [x] HTTP/HTTPS only
- [x] embedded URL credentials rejected
- [x] nonstandard target ports rejected
- [x] private/loopback/link-local/reserved IPv4 blocked
- [x] ULA/link-local/documentation/multicast/mapped IPv6 blocked conservatively
- [x] every redirect target revalidated
- [x] Axios auto-redirects disabled
- [x] environment proxy routing disabled for scanner requests
- [x] socket-level DNS lookup validates addresses before connection
- [x] target-safety module extracted
- [x] Node regression tests added for URL/IP/DNS/socket lookup rules

### Upload boundary

- [x] one file, max 10 MB
- [x] PDF/TXT only in current path
- [x] extension + MIME boundary
- [x] PDF magic signature check
- [x] binary/null-byte TXT rejection
- [x] cleanup in `finally`
- [x] old image/presentation mock extraction removed
- [ ] malware quarantine remains required before broad public uploads
- [ ] stronger parser isolation/resource controls remain required

---

## API contract progress

- [x] shared metadata source: `shared/scan-contract.json`
- [x] current contract version: `0.1.0`
- [x] frontend rejects incompatible contract versions
- [x] backend validates successful scan responses before sending
- [x] backend injects contract version centrally
- [x] contract regression tests added
- [ ] legacy frontend `ScanResult` still needs replacement with a model that represents `not_assessed` natively
- [ ] error envelope/versioning still needs canonicalization
- [ ] final `/api/v1/...` public API shape remains to be introduced before external API release

---

## Persistence/Auth architecture decision

ADR: `docs/adr/0001-dedicated-supabase-postgres-auth.md`

Decision:

- dedicated GuardAI Supabase project,
- do not reuse the existing connected multi-application Supabase database,
- Postgres + Supabase Auth for MVP,
- RLS as defense in depth on exposed tenant data,
- server-side organization authorization remains mandatory,
- no service-role/secret key in browser code,
- real cloud provisioning deferred until the dedicated project is explicitly created.

---

## Remaining high-priority blockers

1. **Real authentication/authorization:** temporary AI cost gate is safe-by-default but is not user auth.
2. **Durable usage quotas/entitlements:** memory IP rate limiting is not a billing/security boundary.
3. **Backend install verification:** package set + new lockfile need a clean install.
4. **Executable tests:** new Node tests exist but have not run in blocked CI.
5. **Contract model migration:** replace legacy frontend status/benchmark fields with native coverage/detector states.
6. **Server decomposition:** `server/index.js` remains too broad.
7. **Persistent scans/jobs:** request/response scanning must become DB + queue + workers.

---

## Validation status

Do **not** claim any of the following until they actually execute:

```text
npm ci passes
backend install passes
lint passes
typecheck passes
frontend build passes
backend tests pass
```

The first GitHub Actions run had `runner_id = 0` and `steps = []` because GitHub blocked runner allocation for account billing/spending reasons.

---

## Phase 1 exit criteria

- [x] runtime/package baseline documented
- [x] editor/contribution rules
- [x] CI workflow registered
- [x] secret scanning configured
- [x] backend imports declared
- [x] target safety tests exist
- [x] versioned scan response boundary exists
- [x] dedicated persistence/auth architecture chosen
- [ ] GitHub runner or equivalent clean environment available
- [ ] root `npm ci` verified
- [ ] backend install + lockfile verified
- [ ] lint/typecheck/build verified
- [ ] backend syntax/tests verified

---

## Next implementation order

While CI remains externally blocked:

1. decompose backend without changing intended behavior,
2. design the dedicated GuardAI database/RLS schema in-repo,
3. replace temporary access gate with real Auth/organization/entitlement design,
4. prepare persistent scan/job lifecycle.

When an executable clean environment returns, validation takes priority immediately.
