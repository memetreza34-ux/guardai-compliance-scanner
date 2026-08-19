# GuardAI Environment Reference

> Living server/frontend configuration reference. Secrets are server-only unless explicitly marked public.

## Frontend public variables

These values are bundled into browser code and are therefore public:

```text
VITE_API_BASE_URL
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
```

Never place database passwords, Supabase secret/service-role keys, Stripe secrets, GitHub App private keys, webhook secrets, storage credentials or Gemini API keys in `VITE_*`.

## Core API

```text
PORT=3001
SCANNER_VERSION=0.1.0
CORS_ORIGIN=http://localhost:5173
PUBLIC_APP_URL=http://localhost:5173
```

Production uses HTTPS origins only.

## Dedicated GuardAI Auth / database

```text
SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
DATABASE_URL=
DATABASE_POOL_MAX=10
```

These point only to the dedicated GuardAI environment. The existing connected multi-application Supabase project is not a GuardAI runtime target.

## Security / general Worker runtime

```text
WORKER_LEASE_SECONDS=60
WORKER_POLL_MS=2000
```

The separate Security Worker process executes the real persistent `security` module.

## Asset ingestion — currently fail-closed

```text
ASSET_PIPELINE_ENABLED=false
GUARDAI_ASSET_MAX_BYTES=10485760
GUARDAI_ASSET_UPLOAD_TTL_SECONDS=900
GUARDAI_ASSET_MAX_EXTRACTED_TEXT_CHARS=100000
GUARDAI_ASSET_PARSER_TIMEOUT_SECONDS=30
GUARDAI_ASSET_WORKER_LEASE_SECONDS=120
GUARDAI_CLAMD_SOCKET=/run/guardai/clamd.sock
GUARDAI_CLAMD_TIMEOUT_MS=30000
GUARDAI_ASSET_PARSER_SOCKET=/run/guardai/asset-parser.sock
GUARDAI_ASSET_PARSER_TIMEOUT_MS=30000
```

Rules:

- `ASSET_PIPELINE_ENABLED` remains `false` in production until ADR 0008's S3 adapter, reproducible backend lockfile and staging IAM/lifecycle/isolation proof are complete.
- the Asset API and Asset Worker both fail closed when the feature flag is disabled.
- clamd is Unix-socket-only in GuardAI source; do not expose an unauthenticated clamd TCP port publicly.
- the parser process uses its own Unix socket and must be deployed with no network, an ephemeral filesystem and resource limits before its safety attestation may be considered true.
- the parser and malware scanner receive byte streams, not S3 credentials or object URLs.
- quarantine upload URLs are short-lived transfer data and must never enter logs, analytics or persistent customer-visible DTOs.
- AWS/S3 bucket/credential variables are deliberately absent until the reviewed S3 adapter is added with a real backend lockfile.

Source process commands:

```text
npm run worker:asset
npm run worker:asset:once
npm run parser:asset:sandbox
```

Their presence is not proof the production Asset pipeline is enabled or validated.

## Controlled prototype / AI

```text
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
ALLOW_PROTOTYPE_SCAN_ENDPOINTS=false
ALLOW_UNAUTHENTICATED_AI_SCANS=false
```

Both access flags remain false in shared/public/production environments. Persistent Privacy/Accessibility are evidence-first Browser modules, not Gemini fallbacks.

## Stripe Billing

```text
BILLING_PROVIDER=disabled
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PLAN_PRICE_MAP_JSON={}
```

Rules:

- `BILLING_PROVIDER` is `disabled` or `stripe`.
- secret key and webhook secret are server-only.
- the plan map is the sole GuardAI plan-code → Stripe Price-ID mapping.
- no real Price ID is committed to repository examples.
- browser code receives plan codes, never authoritative Price IDs.
- Stripe test/live event mode must match the configured secret-key environment.

## Public contact / Lead Capture

```text
LEAD_CAPTURE_ENABLED=false
LEAD_PRIVACY_NOTICE_VERSION=
LEAD_RETENTION_DAYS=0
LEAD_MARKETING_OPT_IN_ENABLED=false
LEAD_MARKETING_CONSENT_VERSION=
LEAD_MARKETING_CONFIRM_TTL_HOURS=24
```

Rules:

- Lead Capture remains disabled until an approved Privacy Notice version and retention period are configured.
- the public Privacy link resolves to `/privacy` under `PUBLIC_APP_URL`; do not enable capture before that real page exists.
- marketing opt-in remains unavailable in the current source path even if an environment flag is present; true Double-Opt-In delivery must exist first.
- no raw IP address/User-Agent advertising profile is part of the Lead schema.

## GitHub App integration

```text
GITHUB_APP_ID=
GITHUB_APP_SLUG=
GITHUB_APP_PRIVATE_KEY_BASE64=
GITHUB_APP_WEBHOOK_SECRET=
```

Rules:

- private key and webhook secret are server-only.
- encode the GitHub App private PEM as base64 for the environment value; GuardAI decodes it in process memory.
- installation access tokens are never environment variables and are never persisted.
- use separate GitHub Apps/credentials for staging and production.
- webhook delivery uses raw request bytes for HMAC verification.

## Monitor Scheduler

The initial scheduler source uses conservative internal defaults:

```text
poll interval: 5000 ms
lease: 60 s
```

The Monitor itself stores `schedule_minutes` in PostgreSQL. Current bounds are 60–10080 minutes and only the real `security` module is accepted.

## Environment separation

At minimum maintain separate local/staging/production values for:

- Auth project/config,
- PostgreSQL,
- Stripe mode/keys/webhook endpoint/Prices,
- GitHub App/private key/webhook endpoint,
- Asset storage/clamd/parser runtime,
- Gemini key,
- CORS/public URL,
- future mail provider.

No staging secret is promoted to production by copying a `.env` file.
