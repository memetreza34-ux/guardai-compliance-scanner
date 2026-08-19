# GuardAI Database

This directory contains **GuardAI-only database design sources** before the dedicated GuardAI Supabase staging project is provisioned.

## Critical isolation rule

Do **not** apply GuardAI SQL to the existing connected multi-application Supabase project. GuardAI requires its own project, migration history, staging environment, backup/recovery boundary and environment-specific credentials.

Architecture decisions:

- `docs/adr/0001-dedicated-supabase-postgres-auth.md`
- `docs/adr/0002-native-postgres-backend-transactions.md`
- `docs/adr/0003-stripe-billing-provider.md`
- `docs/adr/0004-github-app-repository-integration.md`
- `docs/adr/0005-privacy-browser-evidence-boundary.md`
- `docs/adr/0006-browser-worker-network-isolation.md`
- `docs/adr/0007-accessibility-automated-evidence-boundary.md`
- `docs/adr/0008-asset-quarantine-malware-parser.md`

## Current design files

All files below are **design sources, not applied migrations**. Before first staging use they must be consolidated/reviewed into generated migrations in dependency-safe order.

1. `001_guardai_core_schema_draft.sql` — tenant core, RLS, Organizations, Memberships, Targets, Scans, Jobs, Evidence, Rules, Findings, Subscriptions, Audit.
2. `002_scan_queue_invariants_draft.sql` — composite tenant FKs, Scan modules/idempotency and queue constraints.
3. `003_worker_result_invariants_draft.sql` — Job result summaries/timestamps and Evidence/Finding-instance duplicate prevention.
4. `004_target_verification_challenges_draft.sql` — backend-only DNS TXT ownership challenges, expiry and attempt limits.
5. `005_workspace_onboarding_invariants_draft.sql` — canonical Target uniqueness and initial subscription constraints.
6. `006_entitlements_usage_draft.sql` — price-neutral plan capabilities, monthly usage counters and reservations.
7. `007_audit_invariants_draft.sql` — Scan/verification lifecycle audit triggers.
8. `008_rule_provenance_security_seed_draft.sql` — historical Security Rule seed design; **not canonical seed source after Phase 15**.
9. `009_finding_lifecycle_draft.sql` — remediation/finding lifecycle state.
10. `010_finding_rediscovery_trigger_draft.sql` — deterministic finding rediscovery behavior.
11. `011_scoring_profile_provenance_draft.sql` — historical scoring-profile provenance/seed design; **not canonical scoring seed source after Phase 16**.
12. `012_immutable_scan_provenance_draft.sql` — historical provenance immutability constraints.
13. `013_report_snapshots_draft.sql` — immutable technical report snapshots + snapshot hash.
14. `014_scan_target_snapshot_draft.sql` — Target identity frozen at Scan submission time.
15. `015_public_trust_publications_draft.sql` — report-backed public Trust publications, revocation actor and audit triggers.
16. `016_stripe_billing_invariants_draft.sql` — Stripe subscription provenance + durable webhook inbox/deduplication.
17. `017_billing_checkout_idempotency_draft.sql` — one unresolved Checkout per Organization + Organization-scoped idempotency.
18. `018_privacy_safe_lead_capture_draft.sql` — privacy-gated contact capture, retention and idempotency fingerprint.
19. `019_monitoring_notifications_draft.sql` — tenant-safe Security monitors and in-app notifications.
20. `020_monitor_run_provenance_draft.sql` — scheduled-run → Scan provenance with composite tenant binding.
21. `021_notification_event_triggers_draft.sql` — deduplicated finding/scan-failure notification generation.
22. `022_github_app_integration_draft.sql` — GitHub App installation provenance, one-time setup state and webhook inbox.
23. `023_github_repository_target_invariants_draft.sql` — provider-authorized GitHub Repository Target provenance and uniqueness.
24. `024_scan_usage_terminal_finalization_draft.sql` — automatic consume/release of reserved capability usage on terminal Scan status.
25. `025_repository_rule_scoring_provenance_draft.sql` — historical Repository Rule/scoring seed design; **not canonical Rule/scoring seed source after Phases 15/16**.
26. `026_ai_governance_guided_review_draft.sql` — typed AI System profiles, immutable Guided Review snapshot/source provenance, RLS and human-review workflow.
27. `027_ai_governance_review_cycle_invariant_draft.sql` — one open AI Governance review cycle per AI System.
28. `028_asset_quarantine_pipeline_draft.sql` — private Asset upload quarantine, ingestion jobs, content/malware/parser provenance.
29. `029_asset_target_provenance_draft.sql` — only clean, same-tenant Asset uploads may become verified `guardai-upload` Targets.
30. `030_rule_definition_hash_provenance_draft.sql` — immutable Rule definition SHA-256, Finding-instance triple provenance and Rule-version rewrite prevention.
31. `031_scoring_definition_hash_provenance_draft.sql` — immutable scoring-profile SHA-256, Scan triple provenance and scoring-version rewrite prevention.

## Canonical generated seed sources

### Rules

```text
shared/rules/*.json
→ server/rules/versionedRuleRegistry.js
→ deterministic Rule definition SHA-256
→ server/scripts/generateRuleSeedSql.js
→ generated staging migration seed
```

The hand-maintained Rule bodies inside older drafts `008_*` and `025_*` must **not** be copied into real migrations as canonical definitions.

### Scoring profiles

```text
shared/scoring/*.json
→ server/domain/scoringPolicy.js
→ deterministic Scoring definition SHA-256
→ server/scripts/generateScoringProfileSeedSql.js
→ generated staging migration seed
```

The hand-maintained scoring seed bodies in older drafts `011_*` and `025_*` must **not** be copied into real migrations as canonical profile definitions.

## Promotion to real migrations

When the dedicated GuardAI staging project and Supabase CLI are available:

1. create/link the dedicated staging project,
2. verify the installed Supabase CLI and commands,
3. generate real migrations through the CLI,
4. consolidate/review the draft SQL in dependency-safe order,
5. generate canonical Rule + Scoring seeds from shared JSON,
6. apply to local/staging only,
7. run database/security/performance advisors,
8. generate DB types,
9. run the full multi-tenant/invariant test matrix below,
10. review migration rollback/forward compatibility,
11. commit generated migration + generated types,
12. only then promote staging → production.

## Mandatory database/integration proof matrix

### Tenant/Auth

- owner/admin/member/viewer permissions are correct,
- cross-tenant reads/writes fail,
- composite tenant FKs reject mixed Organization/Target/Scan/Monitor/AI-Governance/Asset relationships,
- browser roles cannot access Worker, challenge, entitlement-mutation, webhook, Checkout-request, Lead or integration-state tables,
- AI Governance browser access is read-only and tenant-scoped; mutations remain backend-authorized.

### Target/Scan runtime

- only successful unexpired DNS challenge sets Website Target `verified`,
- challenge expiry/attempt limits work,
- canonical duplicate Targets are rejected,
- GitHub Repository Targets can be verified only with provider installation/repository provenance,
- removal/suspension of GitHub repository authorization invalidates corresponding Targets,
- concurrent Scan idempotency produces one logical Scan,
- paid capability reservation commits in the same transaction as Scan + Job creation,
- a failed entitlement check leaves no queued paid Job,
- `FOR UPDATE SKIP LOCKED` prevents two Workers claiming the same Job,
- expired leases can be reclaimed,
- stale Worker result writes fail,
- retry exhaustion/permanent errors fail/cancel correctly,
- duplicate completion cannot duplicate Evidence/Finding instances,
- `observed` Worker results persist with `score = null` and are not converted to assessed/pass state.

### Rule Engine / provenance

- every Rule-backed Finding carries `rule_id + rule_version + rule_definition_hash`,
- all three fields are either present together or absent together,
- `rule_versions.definition_hash` contains canonical lower-case SHA-256 values,
- zero enabled Rule-backed scanner versions reference a `rule_versions` row with a null definition hash,
- Worker Rule hash must exactly match the persisted `(rule_id, version, definition_hash)` tuple before Finding persistence,
- a hash mismatch fails terminally and creates no Finding instance,
- existing Rule-version definition/hash/implementation/legal-source fields cannot be rewritten,
- changing detector logic, severity logic, confidence logic, remediation, requirement mapping or changelog requires a new Rule version,
- generated Rule seed SQL is deterministic from `shared/rules/*.json`,
- generated ruleset manifest hashes are captured as release evidence,
- Rule Catalog reads only actual schema fields (`category`, `current_version`, `active`, `definition`, `definition_hash`, `changed_at`),
- Rule API/UI never depend on removed prototype fields such as `framework`, `control_key`, `rationale`, `effective_from` or `config`.

### Scoring / coverage provenance

- each scoring profile has an immutable lower-case SHA-256 definition hash,
- Scan stores `scoring_profile_id + scoring_profile_version + scoring_profile_definition_hash`,
- all three fields are present together for scored persistent Scans,
- generated scoring seed SQL is deterministic from `shared/scoring/*.json`,
- same profile ID/version with a different definition hash fails migration/release validation,
- existing profile description/config/hash cannot be rewritten; semantic changes require a new version,
- idempotent Scan replay must match the exact profile tuple,
- Worker completion resolves scoring profile using the stored expected hash,
- stale/mutated scoring registry cannot silently complete an old Scan,
- `observed` modules never become numeric 100s,
- insufficient configured assessed coverage produces no numeric aggregate score,
- future partial multi-module scores must expose explicit coverage before they can be product-enabled.

### Provenance/Reports

- Finding Instance keeps exact Rule ID/version/definition hash,
- Scan keeps exact scoring profile ID/version/definition hash,
- Website Security uses `security-mvp@1`,
- Repository baseline uses `repository-mvp@1`,
- Scan keeps immutable Target snapshot,
- report snapshot hash is reproducible,
- new Report schema v3 freezes both Rule and scoring definition hashes,
- historical Report schema v2 remains hash-readable without retroactively inventing missing hashes,
- historical report snapshots cannot be rewritten,
- Trust publication references the exact report/target in the same Organization,
- revoked Trust publication cannot resolve publicly,
- `revoked_by` records the actual acting admin.

### Asset quarantine / ingestion

- `ASSET_PIPELINE_ENABLED=false` creates/finalizes no persistent Asset upload session,
- upload object keys are generated server-side and are not controlled by filenames,
- quarantine and clean object namespaces are tenant/upload scoped,
- browser-visible Asset DTOs never expose object keys,
- expired upload finalization creates no ingestion job and cleanup is attempted after committed `expired` state,
- expiry race between API precheck and DB row lock still produces no job,
- ingestion lease prevents stale Workers writing terminal results,
- stream SHA-256/actual bytes/type must match declared upload metadata,
- malware scanner errors never map to `clean`,
- `infected` upload never reaches parser/promotion and never creates a Target,
- parser output text is not stored in the Asset repository; only parser provenance/hash/length/page count are stored,
- clean promotion is idempotent copy and quarantine is deleted only after committed clean state,
- verified Asset Target must match clean same-Organization upload ID/content SHA/media type/pipeline version,
- infected/rejected/failed/expired uploads cannot reference Targets,
- Asset ingestion-job tables remain backend-only.

### Entitlements/usage

- monthly capability reservation races cannot exceed a configured limit,
- reservation consume/release is idempotent,
- `completed` Scan consumes remaining reservations exactly once,
- `failed` / `cancelled` Scan releases remaining reservations exactly once,
- paid capabilities are unavailable outside allowed subscription states,
- no paid capability exists merely because a Checkout return page was reached.

### Stripe billing

- Stripe Customer can belong to only one GuardAI Organization row,
- Stripe Subscription ID is unique,
- webhook `(provider,event_id)` deduplication is durable,
- stale `processing` webhook events can be reclaimed safely,
- wrong Stripe test/live mode cannot mutate subscription state,
- unmapped Price IDs fail closed,
- out-of-order events reconcile from current provider Subscription state,
- only one unresolved Checkout request exists per Organization,
- same Checkout Idempotency-Key replays the same logical provider operation,
- different concurrent Checkout attempts are rejected,
- Checkout completion marks its stored request completed,
- no full Stripe webhook payload is retained by GuardAI.

### Lead Capture

- disabled policy performs no PII write,
- Lead idempotency replay requires an identical SHA-256 submission fingerprint,
- same key with different content fails closed,
- retention expiry is always present and bounded by approved configuration,
- Marketing stays `not_requested` until a real Double-Opt-In flow exists,
- honeypot submissions create no database row,
- browser roles cannot query Lead rows directly.

### Monitoring / notifications

- only verified Website Targets can have an active `security` Monitor,
- one non-disabled Security Monitor exists per Target,
- scheduler leases prevent duplicate slot ownership,
- deterministic scheduled Scan idempotency produces one Scan per Monitor slot,
- missed intervals advance to the next future slot instead of creating a catch-up storm,
- Monitor Run organization matches both Monitor and Scan through composite FKs,
- deverified Targets are paused instead of scanned,
- notification dedupe produces one event per logical finding/failure,
- notification mutation remains backend-authorized.

### GitHub App / Repository baseline

- installation setup state is one-time and expires,
- state token is stored only as SHA-256,
- a GitHub installation cannot belong to two GuardAI Organizations,
- provider installation is re-read before linking,
- installation tokens are never persisted,
- raw webhook signature verification occurs before persistence,
- webhook delivery IDs deduplicate retries,
- installation suspend/delete lifecycle updates provider state safely,
- current authorized repository IDs are re-synchronized before Target creation/scan,
- a repository removed from GitHub App authorization cannot remain `verified`,
- repository snapshot Evidence is pinned to an immutable commit SHA/tree SHA,
- truncated GitHub trees fail closed,
- file/tree/blob budgets are enforced before detector processing,
- detected credential values are never persisted; only indicator type/path/line are retained,
- Repository baseline is not represented as full SAST, comprehensive secret scanning, dependency vulnerability analysis or SBOM,
- integration/webhook/state tables are not browser-mutable.

### AI Governance Guided Review

- AI System profiles accept only the typed/allowlisted declaration fields,
- raw prompts, model outputs, customer content and free-form legal conclusions have no intended persistence column,
- Review creation freezes a server/DB-generated snapshot from the typed AI System profile,
- editing the AI System after Review creation cannot rewrite the historical Review snapshot,
- Review `ai_system_id`, source Registry ID/version and frozen snapshot cannot be rewritten,
- deleting an AI System cannot cascade-delete historical Reviews; product workflow archives instead,
- archived AI Systems cannot create new Reviews,
- `legal_applicability_state` and item applicability stay `requires_human_review`,
- client input cannot choose LegalSource IDs, Review items or Registry versions,
- Article 4/14/50 source records resolve to the expected official EUR-Lex references,
- only one `draft/submitted/reopened` Review cycle exists per AI System,
- concurrent Review creation produces one open cycle and a stable conflict for the loser,
- `reviewed` does not create a compliance/certification state,
- Member can create/submit; Viewer cannot mutate; Admin/Owner controls review/reopen/archive,
- status changes produce tenant-scoped Audit Events,
- cross-tenant AI System/Review access fails.

## RLS / authorization rules

- Every exposed customer-data table has RLS enabled.
- `anon` gets no GuardAI customer-data access by default.
- `authenticated` proves identity, not tenant authorization.
- Organization access is membership-scoped.
- Roles live in `memberships`, never user-editable metadata.
- Privileged helpers live in non-exposed `private` schema.
- Privileged mutations also pass through backend authorization.
- Composite FKs provide database-level tenant defense in depth.
- Worker/verification/usage/webhook/Checkout/Lead/integration/Asset mutation state remains backend-only.

## Current backend transaction boundaries already implemented in source

- Organization + Owner Membership + initial subscription + audit creation,
- Website Target creation + audit,
- GitHub Repository Target creation after live provider authorization check,
- DNS TXT verification lifecycle,
- verified-Target requirement before persistent scanning,
- atomic Scan + Jobs + paid-capability reservation creation,
- organization-scoped Scan idempotency with scoring profile hash parity,
- Job claim/lease/renew/reclaim,
- bounded retries/terminal failures,
- atomic Evidence/Finding persistence with Rule ID/version/definition-hash validation,
- Rule/Scoring/Target provenance capture,
- tenant-scoped Scan/Job/Evidence/Finding reads,
- immutable report snapshot creation/verification (new v3 includes Rule + Scoring hashes),
- public Trust publish/revoke/read projection,
- concurrency-safe capability usage reservations,
- Stripe Customer/Subscription reconciliation,
- Stripe webhook dedupe/status lifecycle,
- Stripe Checkout idempotency/single-active-request model,
- privacy-gated Lead persistence,
- Monitor scheduling/provenance,
- in-app notification lifecycle,
- GitHub App installation state/link/webhook lifecycle,
- bounded commit-pinned GitHub Repository baseline worker source,
- AI Governance Review + Review-item creation in one PostgreSQL transaction with frozen DB-generated declaration provenance,
- Asset upload/session finalization + separate leased ingestion lifecycle with clean-Target creation only after all gates.

The browser never receives `DATABASE_URL`, DB passwords, target challenge hashes, Worker leases, Stripe secret/webhook keys, GitHub App private keys/installation tokens, Asset storage object keys, raw Lead rows, direct entitlement mutation access, full provider webhook payloads or detected credential values. AI Governance HTTP input rejects arbitrary prompt/output/customer-content fields and does not accept client-controlled LegalSource or applicability state.
