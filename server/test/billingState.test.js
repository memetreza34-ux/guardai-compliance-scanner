const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeStripeSubscription } = require('../domain/billingState');

const priceMap = Object.freeze({ pro: 'price_Pro123' });

function stripeSubscription(overrides = {}) {
  return {
    id: 'sub_Test123',
    customer: 'cus_Test123',
    status: 'active',
    cancel_at_period_end: false,
    current_period_end: 1800000000,
    items: { data: [{ price: { id: 'price_Pro123' } }] },
    ...overrides,
  };
}

test('Stripe subscription maps to internal plan by configured Price only', () => {
  const result = normalizeStripeSubscription(stripeSubscription(), priceMap);
  assert.equal(result.plan, 'pro');
  assert.equal(result.providerCustomerId, 'cus_Test123');
  assert.equal(result.providerSubscriptionId, 'sub_Test123');
  assert.equal(result.providerPriceId, 'price_Pro123');
  assert.equal(result.status, 'active');
});

test('unmapped Price and multi-Price subscriptions fail closed', () => {
  assert.throws(
    () => normalizeStripeSubscription(
      stripeSubscription({ items: { data: [{ price: { id: 'price_Unknown123' } }] } }),
      priceMap,
    ),
    (error) => error.code === 'BILLING_PRICE_NOT_MAPPED',
  );
  assert.throws(
    () => normalizeStripeSubscription(
      stripeSubscription({ items: { data: [{ price: { id: 'price_Pro123' } }, { price: { id: 'price_Other123' } }] } }),
      priceMap,
    ),
    (error) => error.code === 'BILLING_SUBSCRIPTION_PRICE_AMBIGUOUS',
  );
});

test('unsupported provider status is rejected', () => {
  assert.throws(
    () => normalizeStripeSubscription(stripeSubscription({ status: 'mystery' }), priceMap),
    (error) => error.code === 'BILLING_PROVIDER_RESPONSE_INVALID',
  );
});
