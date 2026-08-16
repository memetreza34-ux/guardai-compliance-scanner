# GuardAI Database

This directory contains **GuardAI-only database design sources** before the dedicated GuardAI Supabase staging project is provisioned.

## Critical isolation rule

Do **not** apply GuardAI SQL to the existing connected multi-application Supabase project. GuardAI requires its own project, migration history, staging environment, backup/recovery boundary and environment-specific credentials.

Architecture decisions:

- `docs/adr/0001-dedicated-supabase-postgres-auth.md`
- `docs/adr/0002-native-postgres-backend-transactions.md`
- `docs/adr/0003-stripe-billing-provider.md`

## Current design files

All files below are **design sources, not applied migrations**. Before first staging use they must be consolidated/reviewed into generated migrations in dependency-safe order.

1. `001_guardai_core_schema_draft.sql` — tenant core, RLS, Organizations, Memberships, Targets, Scans, Jobs, Evidence, Rules, Findings, Subscriptions, Audit.
2. `002_scan_queue_invariants_draft.sql` — composite tenant FKs, Scan modules/idempotency and queue constraints.
3. `003_worker_result_invariants_draft.sql` — Job result summaries/timestamps and Evidence/Finding-instance duplicate prevention.
4. `004_target_verification_challenges_draft.sql` — backend-only DNS TXT ownership challenges, expiry and attempt limits.
5. `005_workspace_onboarding_invariants_draft.sql` — canonical Target uniqueness and initial subscription constraints.
6. `006_entitlements_usage_draft.sql` — price-neutral plan capabilities, monthly usage counters and reservations.
7. `007_audit_lifecycle_draft.sql` — additional server lifecycle audit invariants.
8. `008_rule_provenance_security_seed_draft.sql` — versioned Security Rule provenance/seed direction.
9. `009_finding_lifecycle_draft.sql` — remediation/finding lifecycle state.
10. `010_finding_rediscovery_trigger_draft.sql` — deterministic finding rediscovery behavior.
11. `011_scoring_profile_provenance_draft.sql` — stored/versioned scoring-profile provenance.
12. `012_immutable_scan_provenance_draft.sql` — historical provenance immutability constraints.
13. `013_report_snapshots_draft.sql` — immutable technical report snapshots + snapshot hash.
14. `014_scan_target_snapshot_draft.sql` — Target identity frozen at Scan submission time.
15. `015_public_trust_publications_draft.sql` — report-backed public Trust publications, revocation actor and audit triggers.
16. `016_stripe_billing_invariants_draft.sql` — Stripe subscription provenance + durable webhook inbox/deduplication.
17. `017_billing_checkout_idempotency_draft.sql` — one unresolved Checkout per Organization + Organization-scoped idempotency.

## Promotion to real migrations

When the dedicated GuardAI staging project and Supabase CLI are available:

1. create/link the dedicated staging project,
2. verify the installed Supabase CLI and commands,
3. generate real migrations through the CLI,
4. consolidate/review the draft SQL in dependency-safe order,
5. apply to local/staging only,
6. run database/security/performance advisors,
7. generate DB types,
8. run the full multi-tenant/invariant test matrix below,
9. review migration rollback/forward compatibility,
10. commit generated migration + generated types,
11. only then promote staging → production.

## Mandatory database/integration proof matrix

### Tenant/Auth

- owner/admin/member/viewer permissions are correct,
- cross-tenant reads/writes fail,
- composite tenant FKs reject mixed Organization/Target/Scan relationships,
- browser roles cannot access Worker, challenge, entitlement-mutation, webhook or Checkout-request tables.

### Target/Scan runtime

- only successful unexpired DNS challenge sets Target `verified`,
- challenge expiry/attempt limits work,
- canonical duplicate Targets are rejected,
- concurrent Scan idempotency produces one logical Scan,
- `FOR UPDATE SKIP LOCKED` prevents two Workers claiming the same Job,
- expired leases can be reclaimed,
- stale Worker result writes fail,
- retry exhaustion/permanent errors fail/cancel correctly,
- duplicate completion cannot duplicate Evidence/Finding instances.

### Provenance/Reports

- Finding Instance keeps exact `rule_id` + `rule_version`,
- Scan keeps exact scoring profile ID/version,
- Scan keeps immutable Target snapshot,
- report snapshot hash is reproducible,
- historical report snapshots cannot be rewritten,
- Trust publication references the exact report/target in the same Organization,
- revoked Trust publication cannot resolve publicly,
- `revoked_by` records the actual acting admin.

### Entitlements/usage

- monthly capability reservation races cannot exceed a configured limit,
- reservation consume/release is idempotent,
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

## RLS / authorization rules

- Every exposed customer-data table has RLS enabled.
- `anon` gets no GuardAI customer-data access by default.
- `authenticated` proves identity, not tenant authorization.
- Organization access is membership-scoped.
- Roles live in `memberships`, never user-editable metadata.
- Privileged helpers live in non-exposed `private` schema.
- Privileged mutations also pass through backend authorization.
- Composite FKs provide database-level tenant defense in depth.
- Worker/verification/usage/webhook/Checkout state remains backend-only.

## Current backend transaction boundaries already implemented in source

- Organization + Owner Membership + initial subscription + audit creation,
- Website Target creation + audit,
- DNS TXT verification lifecycle,
- verified-Target requirement before persistent scanning,
- atomic Scan + Jobs creation,
- organization-scoped Scan idempotency,
- Job claim/lease/renew/reclaim,
- bounded retries/terminal failures,
- atomic Evidence/Finding persistence,
- Rule/Score/Target provenance capture,
- tenant-scoped Scan/Job/Evidence/Finding reads,
- immutable report snapshot creation/verification,
- public Trust publish/revoke/read projection,
- concurrency-safe capability usage reservations,
- Stripe Customer/Subscription reconciliation,
- Stripe webhook dedupe/status lifecycle,
- Stripe Checkout idempotency/single-active-request model.

The browser never receives `DATABASE_URL`, DB passwords, target challenge hashes, Worker leases, Stripe secret/webhook keys, direct entitlement mutation access or full provider webhook payloads.
