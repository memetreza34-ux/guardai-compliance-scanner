const test = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeBillingProvider,
  parseStripePlanPriceMap,
  resolvePlanForStripePriceId,
  resolveStripePriceId,
} = require('../domain/billingConfig');


test('billing provider defaults disabled and accepts stripe', () => {
  assert.equal(normalizeBillingProvider(undefined), 'disabled');
  assert.equal(normalizeBillingProvider('STRIPE'), 'stripe');
  assert.throws(() => normalizeBillingProvider('other'));
});


test('plan map is server-controlled and rejects free/duplicate Prices', () => {
  const map = parseStripePlanPriceMap('{"pro":"price_Pro123","team":"price_Team456"}');
  assert.equal(resolveStripePriceId(map, 'pro'), 'price_Pro123');
  assert.equal(resolvePlanForStripePriceId(map, 'price_Team456'), 'team');
  assert.throws(() => parseStripePlanPriceMap('{"free":"price_Free123"}'));
  assert.throws(() => parseStripePlanPriceMap('{"pro":"price_Same123","team":"price_Same123"}'));
});

test('unknown plan and unknown Stripe Price fail closed', () => {
  const map = parseStripePlanPriceMap('{"pro":"price_Pro123"}');
  assert.throws(
    () => resolveStripePriceId(map, 'enterprise'),
    (error) => error.code === 'BILLING_PLAN_NOT_CONFIGURED',
  );
  assert.throws(
    () => resolvePlanForStripePriceId(map, 'price_Unknown123'),
    (error) => error.code === 'BILLING_PRICE_NOT_MAPPED',
  );
});
