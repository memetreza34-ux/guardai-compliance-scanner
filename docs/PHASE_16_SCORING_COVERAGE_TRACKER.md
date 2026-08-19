# GuardAI Phase 16 — Scoring & Coverage Tracker

> Status: **SOURCE IN PROGRESS — scoring provenance hardened, multi-module coverage UX/validation still open**
>
> A GuardAI score is a technical prioritization value for an explicitly defined automated profile. It is never a legal-compliance percentage or certification.

## Current canonical scoring sources

- `shared/scoring/security-mvp-v1.json`
- `shared/scoring/repository-mvp-v1.json`

Current profile selection:

```text
verified Website + [security]     → security-mvp@1
verified Repository + [repository] → repository-mvp@1
```

`repository` is still externally disabled despite its profile source existing.

## Profile definition provenance

Implemented source:

- [x] shared canonical JSON/SHA utility: `server/lib/canonicalJson.js`.
- [x] Scoring profile validation is centralized in `server/domain/scoringPolicy.js`.
- [x] profile definition includes ID/version/description/module weights/minimum assessed modules.
- [x] each profile receives deterministic SHA-256 `definitionHash`.
- [x] same semantic definition gives same hash independent of object-key ordering.
- [x] weight/description/minimum-coverage changes change the hash.
- [x] `getScoringProfile(id, version, expectedHash)` fails closed on hash mismatch.
- [x] `computeWeightedScanScore()` returns the profile hash used for calculation.

## Persistent Scan provenance

- [x] new Scan source freezes `scoringProfileId`.
- [x] new Scan source freezes `scoringProfileVersion`.
- [x] new Scan source freezes `scoringProfileDefinitionHash`.
- [x] idempotency replay compares the exact profile tuple.
- [x] Worker completion resolves the profile using the stored expected definition hash.
- [x] final Scan update also requires the same definition hash.
- [x] scoring-definition mismatch is terminal/non-retryable.
- [x] internal Scan read keeps the definition hash.
- [ ] real DB migration applied and integration-tested.

## Database design

New draft:

- `database/031_scoring_definition_hash_provenance_draft.sql`

Design intent:

- [x] `scoring_profiles.definition_hash`.
- [x] `scans.scoring_profile_definition_hash`.
- [x] complete profile provenance tuple constraint.
- [x] composite FK from Scan to exact profile ID/version/hash.
- [x] existing scoring profile versions become immutable.
- [x] old manual scoring seeds in drafts `011_*` and `025_*` are no longer canonical migration seed sources.
- [ ] generated migration applied in dedicated GuardAI staging.
- [ ] staging proof that old profile versions cannot be rewritten.

## Canonical scoring DB seed generation

Created:

- `server/scripts/generateScoringProfileSeedSql.js`
- `server/test/generateScoringProfileSeedSql.test.js`

Rules:

- [x] DB scoring rows derive from `shared/scoring/*.json`.
- [x] generated rows contain the canonical definition hash.
- [x] same ID/version with conflicting hash fails closed.
- [x] generated output is deterministic.
- [ ] generated seed promoted to a real staging migration.

## Coverage semantics

Current Worker-result states include:

```text
assessed  → may carry numeric score
observed  → must carry score = null
```

Current scoring behavior:

- [x] only `state = assessed` contributes to a score.
- [x] `observed` Evidence never silently becomes 100.
- [x] missing minimum assessed coverage returns `score = null` / `insufficient_coverage`.
- [x] current one-module Security profile requires that module to be assessed.
- [x] current one-module Repository profile requires that module to be assessed.
- [ ] define explicit weighted coverage percentage for future multi-module profiles.
- [ ] expose assessed/observed/not-assessed module coverage beside every numeric aggregate score.
- [ ] decide and test whether future partial multi-module profiles may produce numeric scores at all.
- [ ] prevent dashboards/reports from presenting a partial multi-module score without coverage disclosure.

## Report provenance

Report schema v3 now freezes both:

```text
Rule ID + Rule version + Rule definition hash
Scoring profile ID + profile version + profile definition hash
```

- [x] new report creation requires scoring definition hash.
- [x] scoring hash is covered by immutable Report snapshot SHA-256.
- [x] frontend v3 parser validates the scoring hash.
- [x] report UI displays the scoring definition SHA-256.
- [x] historical v2 reports remain hash-readable without inventing a missing hash.

## Source tests

Relevant source regression files include:

- `server/test/scoringPolicy.test.js`
- `server/test/generateScoringProfileSeedSql.test.js`
- `server/test/scanScoringProvenance.test.js`
- `server/test/jobLifecycle.test.js`
- `server/test/reportSnapshot.test.js`

These are **test sources, not passed tests**, until the clean backend/frontend validation environment executes them.

## Phase 16 exit gates

1. backend clean install and test suite green,
2. frontend typecheck/build green,
3. `031_*` consolidated/applied to dedicated GuardAI staging,
4. canonical scoring seed generated/applied from shared JSON,
5. registry ↔ DB scoring hash parity proven,
6. stale/mutated scoring profile cannot complete an existing Scan,
7. historical Scans/Reports retain exact scoring semantics,
8. explicit multi-module coverage model finalized before any combined profile is enabled,
9. UI always distinguishes Score from Coverage and from legal compliance.
