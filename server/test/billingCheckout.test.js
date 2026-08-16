const test = require('node:test');
const assert = require('node:assert/strict');
const {
  checkoutExpiryEpochSeconds,
  normalizeCheckoutIdempotencyKey,
  stripeIdempotencyKey,
} = require('../domain/billingCheckout');


test('billing Idempotency-Key is required, bounded and whitespace-free', () => {
  assert.equal(normalizeCheckoutIdempotencyKey('billing-request-123'), 'billing-request-123');
  assert.throws(
    () => normalizeCheckoutIdempotencyKey(undefined),
    (error) => error.code === 'BILLING_IDEMPOTENCY_KEY_REQUIRED',
  );
  assert.throws(
    () => normalizeCheckoutIdempotencyKey('short'),
    (error) => error.code === 'INVALID_BILLING_IDEMPOTENCY_KEY',
  );
  assert.throws(
    () => normalizeCheckoutIdempotencyKey('billing request 123'),
    (error) => error.code === 'INVALID_BILLING_IDEMPOTENCY_KEY',
  );
});

test('Stripe idempotency key is deterministic per organization, plan, request and operation', () => {
  const input = {
    organizationId: 'org-a',
    plan: 'pro',
    requestKey: 'billing-request-123',
    operation: 'checkout',
  };
  const first = stripeIdempotencyKey(input);
  const second = stripeIdempotencyKey(input);
  assert.equal(first, second);
  assert.match(first, /^guardai:checkout:[a-f0-9]{64}$/);
  assert.notEqual(
    first,
    stripeIdempotencyKey({ ...input, operation: 'customer' }),
  );
  assert.notEqual(
    first,
    stripeIdempotencyKey({ ...input, requestKey: 'billing-request-456' }),
  );
});

test('Checkout expiration is fixed to 30 minutes from creation time', () => {
  const nowMs = Date.UTC(2026, 7, 16, 18, 0, 0);
  assert.equal(
    checkoutExpiryEpochSeconds(nowMs),
    Math.floor(nowMs / 1000) + 1800,
  );
});
