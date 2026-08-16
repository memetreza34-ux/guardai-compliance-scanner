# GuardAI Environment Reference

> Living server/frontend configuration reference. Secrets are server-only unless explicitly marked public.

## Frontend public variables

These values are bundled into browser code and are therefore public:

```text
VITE_API_BASE_URL
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
```

Never place database passwords, Supabase secret/service-role keys, Stripe secrets, GitHub App private keys, webhook secrets or Gemini API keys in `VITE_*`.

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

## Security Worker

```text
WORKER_LEASE_SECONDS=60
WORKER_POLL_MS=2000
```

The separate Security Worker process executes the real persistent `security` module.

## Controlled prototype / AI

```text
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
ALLOW_PROTOTYPE_SCAN_ENDPOINTS=false
ALLOW_UNAUTHENTICATED_AI_SCANS=false
```

Both access flags remain false in shared/public/production environments.

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
- Gemini key,
- CORS/public URL,
- storage and future mail provider.

No staging secret is promoted to production by copying a `.env` file.
