const { resolvePlanForStripePriceId } = require('./billingConfig');
const { HttpError } = require('../lib/httpError');

const STRIPE_SUBSCRIPTION_STATUSES = new Set([
  'incomplete',
  'incomplete_expired',
  'trialing',
  'active',
  'past_due',
  'canceled',
  'unpaid',
  'paused',
]);

function objectId(value, prefix, field) {
  const id = typeof value === 'string' ? value : value?.id;
  if (typeof id !== 'string' || !id.startsWith(`${prefix}_`) || id.length > 255) {
    throw new HttpError(502, `Stripe subscription contains an invalid ${field}.`, 'BILLING_PROVIDER_RESPONSE_INVALID');
  }
  return id;
}

function unixSecondsToIso(value) {
  if (value === null || value === undefined) return null;
  if (!Number.isInteger(value) || value <= 0) {
    throw new HttpError(502, 'Stripe subscription period is invalid.', 'BILLING_PROVIDER_RESPONSE_INVALID');
  }
  return new Date(value * 1000).toISOString();
}

function extractSingleStripePriceId(subscription) {
  const items = subscription?.items?.data;
  if (!Array.isArray(items) || items.length !== 1) {
    throw new HttpError(
      409,
      'GuardAI requires exactly one configured recurring Price per subscription.',
      'BILLING_SUBSCRIPTION_PRICE_AMBIGUOUS',
    );
  }
  return objectId(items[0]?.price, 'price', 'Price ID');
}

function normalizeStripeSubscription(subscription, priceMap) {
  if (!subscription || typeof subscription !== 'object') {
    throw new HttpError(502, 'Stripe subscription response is invalid.', 'BILLING_PROVIDER_RESPONSE_INVALID');
  }
  const id = objectId(subscription.id, 'sub', 'Subscription ID');
  const customerId = objectId(subscription.customer, 'cus', 'Customer ID');
  if (!STRIPE_SUBSCRIPTION_STATUSES.has(subscription.status)) {
    throw new HttpError(502, 'Stripe subscription status is unsupported.', 'BILLING_PROVIDER_RESPONSE_INVALID');
  }
  const priceId = extractSingleStripePriceId(subscription);
  const plan = resolvePlanForStripePriceId(priceMap, priceId);

  return {
    provider: 'stripe',
    providerCustomerId: customerId,
    providerSubscriptionId: id,
    providerPriceId: priceId,
    plan,
    status: subscription.status,
    cancelAtPeriodEnd: subscription.cancel_at_period_end === true,
    periodEnd: unixSecondsToIso(subscription.current_period_end),
  };
}

module.exports = {
  extractSingleStripePriceId,
  normalizeStripeSubscription,
  objectId,
  STRIPE_SUBSCRIPTION_STATUSES,
  unixSecondsToIso,
};
