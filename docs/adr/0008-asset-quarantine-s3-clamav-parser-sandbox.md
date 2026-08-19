# ADR 0008 — Asset quarantine via private S3, ClamAV stream scanning and isolated parser sandbox

- Status: Accepted as GuardAI source architecture; provider adapters not yet activated
- Scope: Phase 14 Asset Scanner / safe document ingestion
- Date: 2026-08-19

## Context

GuardAI accepts untrusted customer PDF/TXT assets. The existing prototype path writes Multer uploads to local disk and invokes `pdf-parse` inside the API process. That path is development-only and cannot become the production Asset pipeline.

A production ingestion path must keep untrusted bytes away from the API filesystem and require, in order:

1. private quarantine,
2. independent byte-count/SHA-256/content-type verification,
3. fail-closed malware scanning,
4. parser isolation with no network access,
5. bounded/minimized parser result handling,
6. private clean-object promotion,
7. verified Asset Target creation only after all gates pass.

## Decision

### 1. Object storage: private AWS S3

GuardAI will use dedicated private S3 storage for Asset bytes, with separate object namespaces:

```text
quarantine/<organization-uuid>/<upload-uuid>
assets/<organization-uuid>/<upload-uuid>
```

The browser never chooses either object key.

Upload sessions use a server-generated presigned `PUT` URL with GuardAI's short expiration policy (15 minutes in the current MVP contract). The URL is returned once to the authenticated browser and is never persisted in PostgreSQL or application logs.

Why S3 rather than Supabase Storage for this specific binary-ingestion boundary:

- Supabase `createSignedUploadUrl` documentation currently states that signed upload URLs are valid for two hours.
- S3 presigned URLs allow the generator to specify the expiry period, fitting GuardAI's shorter upload-session policy.
- GuardAI still uses dedicated Supabase Auth/PostgreSQL for identity and relational state; this ADR changes only Asset object storage.

Official references reviewed:

- https://supabase.com/docs/reference/javascript/file-buckets-createsigneduploadurl
- https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html
- https://docs.aws.amazon.com/AmazonS3/latest/userguide/PresignedUrlUploadObject.html

### 2. S3 security boundary

Production buckets/prefixes must satisfy the attestation in `server/asset/assetPipelineContract.js`:

- no public read,
- no executable/web-hosting serving mode,
- server-side encryption,
- bounded presigned upload policy,
- organization/object-key isolation,
- quarantine lifecycle cleanup,
- clean-object lifecycle policy,
- idempotent copy promotion.

GuardAI application credentials must be least privilege. The Asset service needs only the specific object operations required for the configured GuardAI bucket/prefixes. The browser receives no AWS credentials.

Bucket region is environment-specific and must follow the later GuardAI data-residency decision. No production region is silently hard-coded by this ADR.

### 3. Malware scanning: private `clamd` via INSTREAM

GuardAI will use ClamAV `clamd` as the first malware engine. The worker streams the quarantined bytes through `INSTREAM`; it does not give clamd a user-controlled filesystem path.

`clamd` must run in a private worker boundary. A raw clamd TCP socket must never be publicly exposed because the upstream protocol is not an authenticated/encrypted public API.

GuardAI and `clamd.conf` must align `StreamMaxLength` with GuardAI's upload bound. Scanner failures, timeouts, malformed responses, unavailable signatures or size-limit errors are **not** a `clean` result.

Official references reviewed:

- https://docs.clamav.net/manual/Usage/ClamdProtocol.html
- https://docs.clamav.net/manual/Usage/Scanning.html

### 4. Parser: isolated no-network worker/container

PDF/TXT parsing must execute outside the API process in an ephemeral sandbox with:

- network disabled,
- no inbound listener exposed to customers,
- CPU/memory/time limits,
- ephemeral filesystem,
- bounded output,
- only the quarantined object made available for the task.

A plain Node child process alone is **not** considered sufficient evidence of network isolation. Node's process APIs can enforce timeout/identity controls, but the no-network guarantee must come from the worker/container runtime.

The parser may return extracted text to the in-memory ingestion worker. Before the repository boundary GuardAI discards the text and retains only:

- parser ID/version,
- extracted text length,
- extracted text SHA-256,
- optional page count.

Future Asset detectors that genuinely require document text must get a separately reviewed data-minimization/storage design instead of reusing raw parser output implicitly.

### 5. Promotion and crash safety

Promotion is an idempotent **copy** from quarantine to the private clean namespace.

Order:

```text
verify bytes
→ malware clean
→ parse in sandbox
→ copy to deterministic clean key
→ stop/verify worker lease
→ DB transaction sets upload clean + creates Asset Target
→ delete quarantine source
```

If the worker crashes after copy but before DB commit, the quarantine source still exists and the same deterministic clean copy can be retried safely. Quarantine deletion only occurs after a committed terminal state.

### 6. Asset Target truth

A GuardAI Asset Target is created only when the upload row is `clean` and the database can verify:

- same Organization,
- exact upload UUID,
- exact content SHA-256,
- detected media type,
- pipeline version,
- parser provenance.

`infected`, `rejected`, `failed`, `expired` or merely `uploaded` files never become verified Asset Targets.

## Rejected alternatives

### Reuse the prototype Multer + `pdf-parse` API route

Rejected. It writes untrusted files to API-local storage and parses hostile input in the API process.

### Supabase signed upload URL for the current 15-minute MVP session

Not selected for this ingestion boundary because the documented signed-upload token lifetime is currently two hours. This can be revisited if provider behavior changes or GuardAI's threat model/session policy changes.

### Treat browser MIME/extension or S3 metadata as content truth

Rejected. GuardAI independently streams the stored bytes, computes SHA-256 and performs content sniffing before malware/parser stages.

### Delete/move quarantine during promotion

Rejected. It weakens retry/crash safety between storage mutation and PostgreSQL commit.

## Activation gates

`asset` remains absent from `ENABLED_PERSISTENT_SCAN_MODULES` until all of the following execute successfully:

1. backend clean install + lockfile verification,
2. pinned AWS SDK/provider adapter,
3. private staging S3 configuration + least-privilege policy review,
4. clamd staging service with current signatures and bounded INSTREAM,
5. isolated parser runtime with verified no-network/resource controls,
6. generated/applied GuardAI migrations for Asset tables/invariants,
7. executed clean/infected/malformed/oversize/parser-bomb/retry/lease-loss tests,
8. cross-tenant object/DB isolation proof,
9. cleanup/lifecycle proof,
10. observability without signed URL, raw file or extracted-text leakage.
