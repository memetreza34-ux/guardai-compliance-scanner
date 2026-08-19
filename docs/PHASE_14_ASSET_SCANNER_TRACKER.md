# GuardAI Phase 14 — Asset Scanner Tracker

> Status: **SOURCE IN PROGRESS — explicitly disabled in production/persistent scan submission**
>
> Nothing in this tracker is proof of an executed clean install, applied migration or production-safe provider deployment.

## Product truth

Phase 14 handles **untrusted PDF/TXT ingestion**. It is not document legal review and it does not make uploaded files trustworthy merely because upload succeeded.

Production path:

```text
authenticated member
→ server creates upload record + deterministic private quarantine key
→ browser receives short-lived upload transfer descriptor only
→ bytes land in private quarantine
→ finalize verifies object presence/declared size
→ ingestion Worker claims lease
→ Worker independently streams bytes + SHA-256 + magic/UTF-8 check
→ ClamAV INSTREAM
→ if clean: isolated no-network parser
→ extracted text is hashed/measured then discarded before repository boundary
→ idempotent copy to private clean namespace
→ Worker stops/verifies lease
→ one DB transaction stores clean provenance + verified Asset Target
→ quarantine source deleted after commit
```

## Source implemented

### Domain / provider contracts

- [x] PDF/TXT-only current media allowlist.
- [x] bounded upload/session/parser limits.
- [x] dedicated Asset runtime limits separated from legacy prototype limits.
- [x] explicit `ASSET_PIPELINE_ENABLED` feature gate shared by API/Worker composition.
- [x] server-generated upload UUID and object keys.
- [x] filenames are display-only; no user path controls storage key.
- [x] streaming SHA-256 + byte budget.
- [x] PDF magic / UTF-8 text sniffing.
- [x] exact declared-vs-observed size/type comparison.
- [x] malware result schema allows only `clean|infected`.
- [x] parser output limit + text SHA/length provenance.
- [x] storage/malware/parser safety attestations.
- [x] provider safety is checked before claiming customer ingestion work.
- [x] malware/parser providers receive streams, not storage credentials.

### Storage architecture

- [x] ADR 0008 chooses private AWS S3 for Asset object storage.
- [x] separate `quarantine/...` and `assets/...` namespaces.
- [x] clean promotion contract requires idempotent copy.
- [x] quarantine deletion occurs only after committed terminal DB state.
- [x] expired finalize paths mark DB state first and then best-effort clean quarantine.
- [x] race where expiry occurs between API precheck and row-lock finalize is modeled/tested in source.
- [x] signed upload URL/object keys are never returned by status/list responses.
- [ ] AWS SDK dependencies added with a verified backend lockfile.
- [ ] S3 provider adapter implemented and exercised.
- [ ] staging bucket/IAM/lifecycle/encryption policy proven.

### Malware

- [x] ClamAV/clamd selected in ADR.
- [x] Unix-socket-only GuardAI `INSTREAM` adapter source.
- [x] VERSION probe + Engine/signature provenance.
- [x] byte-exact chunk framing/backpressure/timeout/response limits.
- [x] `ERROR`/timeout/protocol failure never maps to clean.
- [x] source tests emulate clamd over a local Unix socket.
- [ ] real staging clamd deployed privately.
- [ ] signature update/readiness monitoring proven.
- [ ] `StreamMaxLength` aligned and verified against GuardAI upload policy.

### Parser sandbox

- [x] `pdf-parse@2.4.5` v2 API source integration (`PDFParse({data}) → getText() → destroy()`).
- [x] TXT UTF-8 parser.
- [x] separate Unix-socket parser service/process.
- [x] `npm run parser:asset:sandbox` source command.
- [x] bounded binary protocol with exact byte length + expected SHA-256.
- [x] parser-side SHA/type revalidation.
- [x] provider-side stream SHA/length revalidation.
- [x] parser ID/version response binding.
- [x] parser output discarded before repository persistence; only hash/length/page count persist.
- [x] runtime attestation requires no network, ephemeral FS, resource limits and no storage credentials.
- [ ] parser process deployed in a runtime where those controls are independently true/proven.
- [ ] malicious/corrupt/complex PDF corpus executed in staging.

### Persistence / tenancy

- [x] `028_asset_quarantine_pipeline_draft.sql`.
- [x] `029_asset_target_provenance_draft.sql`.
- [x] upload and ingestion-job tables separated from normal Scan Jobs.
- [x] ingestion jobs backend-only.
- [x] customer browser gets tenant-scoped read of upload status only.
- [x] immutable observed content/malware/parser provenance.
- [x] infected/rejected/failed/expired uploads cannot reference Targets.
- [x] verified Asset Target must match a clean same-Organization upload/SHA/type/pipeline.
- [x] Asset Target uses provider `guardai-upload` and no canonical URL.
- [x] target/upload composite tenant checks.
- [ ] drafts consolidated into generated migrations.
- [ ] migration/RLS/concurrency proof executed on dedicated staging PostgreSQL.

### API / Worker

- [x] create upload-session route.
- [x] finalize/queue route.
- [x] list/read status routes.
- [x] public Asset DTO hides storage object keys.
- [x] persistent ingestion Worker with lease heartbeat.
- [x] standalone `assetIngestionWorkerProcess.js` with `worker:asset` / `worker:asset:once` commands.
- [x] Worker refuses startup when `ASSET_PIPELINE_ENABLED` is false or provider attestations fail.
- [x] no terminal DB write with uncertain Worker lease.
- [x] deterministic input/parser/Rule-independent Asset errors do not retry pointlessly.
- [x] temporary provider/storage errors remain retryable.
- [x] clean completion creates verified Asset Target only after all gates.
- [x] malware detection creates no Target.
- [ ] real Asset Worker composed with the selected S3 adapter and proven staging providers.

### Production safety

- [x] Production safety rejects `ASSET_PIPELINE_ENABLED=true` today.
- [x] This rejection remains until the reviewed S3 adapter, reproducible backend lockfile and staging isolation proof exist.
- [x] `.env.example` and `docs/ENVIRONMENT_REFERENCE.md` document the disabled-by-default Asset configuration.
- [x] legacy Multer `/scan-file` remains explicitly a prototype path and is not used as a fallback.

## Source test files

Current source tests include:

- `server/test/assetUpload.test.js`
- `server/test/assetPipelineContract.test.js`
- `server/test/assetRuntimeProviders.test.js`
- `server/test/assetUploadService.test.js`
- `server/test/assetIngestionWorker.test.js`
- `server/test/clamdStreamScanner.test.js`
- `server/test/parserSandbox.test.js`
- `server/test/runtimeSafety.test.js`
- asset terminal cases in `server/test/jobLifecycle.test.js`

**These are not marked passed until the backend clean-install/test gate executes.**

## Activation gate

Keep:

```js
ENABLED_PERSISTENT_SCAN_MODULES = ['security']
```

`asset` must remain unavailable until all of these are proven:

1. backend lockfile + clean install,
2. source syntax/unit suite green,
3. dedicated GuardAI migrations applied in staging,
4. S3 private upload/read/copy/delete adapter and least-privilege IAM proven,
5. clamd real INSTREAM integration green,
6. parser runtime genuinely no-network/resource-limited,
7. infected/corrupt/oversize/parser-abuse fixtures fail closed,
8. concurrent/retry/lease-loss behavior proven,
9. cross-tenant object access impossible,
10. logs/telemetry contain no signed URL, raw document body or extracted text.

Until then, the old Multer `/scan-file` endpoint remains only the explicitly gated prototype path and must never be used as a production fallback.
