# ADR 0003 — Stripe for GuardAI subscription billing

- Status: Accepted
- Date: 2026-08-16

## Problem

GuardAI needs real subscription billing without allowing the browser to grant itself plans, entitlements, quotas or arbitrary payment-provider price identifiers. Subscription state is asynchronous and must remain correct across checkout completion, renewals, failed payments, cancellation and duplicate/out-of-order webhook delivery.

## Decision

Use Stripe Checkout + Stripe Billing as the first GuardAI payment provider.

GuardAI keeps its own server-side subscription/entitlement read model in PostgreSQL. Stripe is the payment-system source for external payment/subscription events; GuardAI's database is the authorization source consumed by the application after verified webhook reconciliation.

The integration uses the official `stripe` Node SDK. The selected repository baseline is `stripe@22.1.1`; a clean install must regenerate and verify the backend lockfile before this dependency is considered validated.

## Security and integrity rules

1. The browser submits an internal GuardAI plan code only. It never submits a Stripe Price ID that is trusted by the server.
2. Internal plan code → Stripe Price ID mapping is server-side configuration.
3. Checkout Session creation requires an authenticated GuardAI user with `owner` or `admin` role for the Organization.
4. Stripe Checkout is created in subscription mode.
5. `client_reference_id` and Stripe metadata carry only identifiers required to reconcile the Organization/plan; they are not an authorization mechanism by themselves.
6. Entitlements are never granted from the Checkout return URL.
7. Subscription state is changed only after verified Stripe webhook processing or an explicit trusted server reconciliation flow.
8. Webhook signature verification uses the exact raw request body and configured Stripe webhook signing secret.
9. Webhook events are durably deduplicated by Stripe event ID before side effects are committed.
10. Event processing is idempotent and tolerant of asynchronous/out-of-order delivery.
11. Unknown products/prices/plans fail closed and never produce paid entitlements.
12. Failed/past-due/cancelled subscription states remove paid capabilities according to the GuardAI plan-state policy; historical Evidence/Reports remain immutable.
13. Stripe secret keys and webhook secrets are server-only and are never exposed through `VITE_*` variables.
14. Sandbox/test and live Stripe credentials are separate by environment.

## Checkout design

Authenticated backend flow:

```text
Browser chooses GuardAI plan code
→ GuardAI authorizes Organization admin+
→ server resolves configured Stripe Price ID
→ server creates/reuses Stripe Customer
→ server creates Stripe Checkout Session in subscription mode
→ browser redirects to Stripe-hosted Checkout
→ Stripe returns browser to GuardAI
→ browser shows pending/current server subscription state
→ verified webhooks reconcile authoritative paid state
```

The return page must never claim that payment succeeded merely because the user reached the success URL.

## Webhook design

Initial relevant events:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`

The exact supported event set may evolve with the pinned Stripe API/SDK version. Event handlers must work from stable provider IDs and current object state rather than event ordering assumptions.

## Data model direction

GuardAI keeps:

- Organization subscription row,
- Stripe customer ID,
- Stripe subscription ID,
- internal GuardAI plan code,
- normalized subscription status,
- current period end when available,
- webhook event inbox/deduplication table,
- event processing status/error metadata,
- plan-entitlement configuration independent of Stripe product copy.

No card/payment-method details are stored by GuardAI.

## Pricing

This ADR does **not** choose prices, discounts, trial duration or commercial package limits. Those are Phase 37 product decisions and must be mapped to actual GuardAI costs/value before live launch.

Until real Stripe Price IDs and commercial plans are configured, paid checkout remains fail-closed/unavailable.

## Consequences

### Benefits

- hosted payment collection reduces GuardAI's PCI/payment-data surface,
- subscription lifecycle is event-driven,
- payment-provider data remains separate from product authorization logic,
- entitlements/usage limits remain testable without Stripe network calls.

### Costs / risks

- webhook ordering and retries require durable idempotency,
- Stripe configuration becomes environment-specific production infrastructure,
- a later provider migration requires an adapter/reconciliation path.

## Alternatives considered

- Hand-built card/payment collection: rejected due to unnecessary security/compliance scope.
- Browser-controlled plan/price selection: rejected as authorization/payment manipulation risk.
- Treating Checkout redirect as payment truth: rejected because subscription state is asynchronous.
- Building provider-independent billing forever before choosing a provider: rejected because GuardAI needs a concrete integration path; provider-specific code will still stay behind a narrow adapter/service boundary.
