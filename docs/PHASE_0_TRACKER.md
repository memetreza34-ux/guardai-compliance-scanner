# GuardAI Phase 0 Tracker — Scope Freeze & Repository Hygiene

> Operational tracker for the first implementation phase of `docs/GUARDAI_MASTER_BUILD_GUIDE.md`.

## Status

**PHASE 0: COMPLETE**

Phase 0 establishes a clean, truthful and documented repository baseline before architectural changes.

---

## Completed work

| Task | Status | Notes |
|---|---|---|
| Upgrade master build guide | DONE | GuardAI-specific living engineering bible |
| Correct project README | DONE | Prototype/rebuild state explicit; React version corrected |
| Harden `.gitignore` | DONE | Secrets, uploads, caches, coverage and test artifacts covered |
| Create Phase 0 tracker | DONE | This document |
| Create dedicated repo inventory | DONE | `docs/REPO_INVENTORY.md` |
| Freeze component disposition | DONE | KEEP/REFACTOR/REPLACE/LATER/REMOVE recorded |
| Remove `.npm-cache/` | DONE | Removed from current Git tree after isolated verification |
| Remove `npm_cache/` | DONE | Removed from current Git tree after isolated verification |
| Review current tree for secret/config risk | DONE | No real `.env` found in current root/server tree |
| Review relevant pre-rebuild history for obvious secrets | DONE | Backend-introduction commit contains only the documented placeholder `GEMINI_API_KEY=dein_api_key_hier`; targeted Google/private-key checks found no real key |
| Review environment/config files | DONE FOR PHASE 0 | Current `.env.example` identified; validated production config belongs to backend phase |
| Review backend declared dependencies | DONE | Exact missing dependency list recorded |
| Review duplicate/obsolete files | DONE FOR INVENTORY | Actual refactor occurs in Phase 2 |
| Freeze initial P0/P1 list | DONE | Master guide + tracker |
| Repository bloat cleanup | DONE FOR KNOWN CACHE BLOAT | Generated npm cache trees removed and ignored |
| Correct repository documentation claims | DONE | README now reflects actual implementation state |

---

## Important secret-review limitation

The Phase 0 review is a **targeted manual repository/history review**, not a substitute for continuous automated detection. Phase 1 therefore adds secret scanning to CI. If a future automated scan finds a previously committed real credential, that credential must be revoked/rotated and the incident handled even if the file was later deleted.

---

## Frozen P0 engineering blockers

### P0-01 — Scanner data contract mismatch
Frontend and backend use incompatible category/status shapes.

### P0-02 — Production API configuration
Frontend contains a hard-coded localhost API endpoint.

### P0-03 — Backend clean-install failure risk
`server/index.js` uses packages not declared in `server/package.json`:

- `dotenv`
- `cheerio`
- `@google/genai`
- `helmet`
- `express-rate-limit`
- `zod`
- `multer`
- `pdf-parse`

### P0-04 — SSRF exposure
User-controlled URLs reach backend HTTP fetching without the required production-safe network boundary.

### P0-05 — Upload boundary incomplete
Server-side size/type/quarantine/malware controls are not production-ready.

### P0-06 — Mock results in production path
Fallback/demo results can be mistaken for measured scan truth.

### P0-07 — Misleading product state
Several UI surfaces visually imply real monitoring, integrations, compliance verification, deepfake analysis, billing or document analysis while still simulated.

### P0-08 — Tenant/auth foundation missing
The current app does not yet have a real multi-user SaaS authorization model.

---

## Phase 0 exit criteria

- [x] Master Guide is GuardAI-specific.
- [x] README describes reality.
- [x] `.gitignore` protects obvious local/secret/runtime artifacts.
- [x] Major existing features have a disposition decision.
- [x] Committed npm cache directories are removed from the current tree.
- [x] Current tree and relevant early history received a targeted secret review.
- [x] Backend dependency mismatch has an exact fix list.
- [x] Known npm-cache repository bloat is cleaned up.
- [x] Initial static audit has no unclassified P0 blocker.

---

## Handoff to Phase 1

Phase 1 now establishes the reproducible development baseline:

1. Node/npm versions,
2. clean-install contract,
3. unified scripts,
4. formatting/lint/typecheck standards,
5. EditorConfig,
6. contribution rules,
7. CI quality gate,
8. automated secret scanning.
