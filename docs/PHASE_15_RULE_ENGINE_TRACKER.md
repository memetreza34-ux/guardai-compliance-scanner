# GuardAI Phase 15 — Rule Engine Tracker

> Status: **SOURCE IN PROGRESS — canonical Rule provenance implemented, execution/staging proof open**
>
> No test, migration or production gate is marked green merely because source/test files exist.

## Goal

GuardAI Rule-backed Findings must be deterministic, explainable and historically attributable to the **exact Rule definition** that produced them.

Required provenance chain:

```text
Evidence
→ Detector ID/version
→ Ruleset ID/version
→ Rule ID/version/definition SHA-256
→ Finding Instance
→ immutable Report snapshot
```

A technical Rule may have no legal requirement mapping. GuardAI must not invent a law/control mapping to make a Rule look more complete.

## Canonical Rule source

Current canonical sources:

- `shared/rules/security-baseline.json`
- `shared/rules/repository-baseline.json`

Both are loaded through:

- `server/rules/versionedRuleRegistry.js`

### Required Rule fields

Every Rule version requires:

- [x] stable Rule ID,
- [x] integer Rule version,
- [x] stable detector finding ID mapping,
- [x] category/title,
- [x] default severity,
- [x] evidence requirements,
- [x] detector logic,
- [x] severity logic,
- [x] confidence logic,
- [x] message template,
- [x] remediation,
- [x] explicit requirement mappings (may be empty),
- [x] changelog.

## Deterministic definition identity

- [x] canonical recursive JSON serialization.
- [x] per-Rule SHA-256 `definitionHash`.
- [x] per-ruleset manifest SHA-256.
- [x] object key ordering does not change the hash.
- [x] material Rule content change changes the hash.
- [x] incomplete Rule definitions fail registry construction.
- [x] duplicate Rule IDs fail registry construction.
- [x] duplicate finding-ID mappings fail registry construction.

## Scanner integration

### Security

- [x] Security Registry uses the common Rule registry core.
- [x] Security Worker binds `ruleId`.
- [x] Security Worker binds `ruleVersion`.
- [x] Security Worker binds `ruleDefinitionHash`.
- [x] detector metadata comes from the versioned ruleset.

### Repository baseline

- [x] Repository Registry uses the same common Rule registry core.
- [x] Repository findings bind ID/version/hash.
- [x] Repository remediation is read from the canonical Rule definition instead of a parallel hard-coded text.
- [x] matched credential values remain excluded from Evidence/Findings.
- [ ] Repository module remains externally disabled pending its separate activation gates.

## Worker result boundary

`server/domain/assessmentResult.js` now requires Rule provenance as an all-or-none tuple:

```text
ruleId
ruleVersion
ruleDefinitionHash
```

- [x] partial provenance is rejected.
- [x] hash must be lowercase SHA-256.
- [x] observation-only/non-Rule modules may keep all three values null.
- [x] invalid provenance fails before DB finding persistence.

## Database provenance

New design source:

- `database/030_rule_definition_hash_provenance_draft.sql`

Source behavior:

- [x] `rule_versions.definition_hash` design.
- [x] `finding_instances.rule_definition_hash` design.
- [x] complete Rule provenance tuple constraint.
- [x] composite FK from Finding Instance to exact Rule ID/version/hash.
- [x] existing Rule versions become immutable instead of editable.
- [x] Worker `completeJob()` verifies the exact Rule tuple before inserting a Finding Instance.
- [x] hash mismatch uses `RULE_DEFINITION_HASH_MISMATCH`.
- [x] Rule hash mismatch is terminal/non-retryable.
- [ ] real generated migration created/applied.
- [ ] zero-null-definition-hash release invariant proven in staging.
- [ ] tamper/mismatch database integration tests executed.

## Canonical DB seed generation

Created:

- `server/scripts/generateRuleSeedSql.js`

Rules:

- [x] DB Rule seed content derives from the canonical shared JSON registries.
- [x] generated rows include complete definition JSON + definition hash.
- [x] conflicting same-ID/version hash fails closed instead of silently rewriting history.
- [x] generated output includes ruleset manifest hashes for release evidence.
- [x] deterministic generator source tests exist.
- [x] older manual Rule bodies in drafts `008_*` and `025_*` are explicitly no longer canonical migration seed sources.
- [ ] generated output promoted into a real Supabase migration in dedicated staging.

## Rule Catalog API/UI

A pre-existing schema bug was found during Phase 15: the old Rule Repository/API/UI expected prototype columns that do not exist in the GuardAI Core DB (`framework`, `control_key`, `status`, `rationale`, `effective_from`, `effective_to`, `config`).

Fixed source:

- [x] `server/repositories/ruleRepository.js` now reads actual schema columns.
- [x] Rule filters are `category + active + limit`.
- [x] Rule Version exposes `implementationVersion`, `legalSourceIds`, `definition`, `definitionHash`, `changedAt`.
- [x] Rule routes use the secure-product persistence composition directly.
- [x] frontend Rule types match the real schema.
- [x] frontend Rule API validates responses rather than blind-casting them.
- [x] Rule detail UI shows Rule definition SHA-256.
- [x] Rule detail UI shows evidence/detector/severity/confidence/remediation/changelog definition.
- [x] no legal-framework field is invented when the Rule has no requirement mapping.

## Report provenance

Report snapshots are now source-versioned as:

- schema v2 — historical format without Rule definition hash,
- schema v3 — new format with Rule definition hash.

- [x] new Report v3 requires complete Rule ID/version/hash provenance.
- [x] Report snapshot hash covers the Rule definition hash.
- [x] tampering with the Rule hash invalidates the Report snapshot hash.
- [x] historical v2 Reports remain hash-readable without inventing missing provenance.
- [x] frontend supports v2 and v3.
- [x] v3 frontend validates Rule provenance.
- [x] Report UI displays Rule Definition SHA-256.

## Source tests

Relevant source regression files include:

- `server/test/versionedRuleRegistry.test.js`
- `server/test/securityRuleRegistry.test.js`
- `server/test/repositoryRuleRegistry.test.js`
- `server/test/repositoryBaseline.test.js`
- `server/test/assessmentResult.test.js`
- `server/test/generateRuleSeedSql.test.js`
- `server/test/ruleRepository.test.js`
- `server/test/jobLifecycle.test.js`
- `server/test/reportSnapshot.test.js`

**These test files exist but are not marked passed while the clean backend test environment remains blocked/unexecuted.**

## Phase 15 activation/exit gates

Phase 15 is not complete until:

1. backend clean install exists with a verified lockfile,
2. full backend source/unit suite executes green,
3. frontend typecheck/build executes green after Rule Catalog/Report v3 changes,
4. generated Rule migration seeds are reviewed and applied to dedicated GuardAI staging,
5. DB integration test proves wrong Rule hash cannot persist,
6. DB integration test proves existing Rule version cannot be rewritten,
7. canonical Registry ↔ DB hash parity is checked during release,
8. Report v3 creation/read/tamper tests execute against staging data,
9. no active scanner uses a second unversioned Rule truth source,
10. Rule change workflow documents version bump/changelog/review/release.

Until those gates execute, this Phase is a strong source foundation — **not a completed production Rule Engine**.
