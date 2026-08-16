const { HttpError } = require('../lib/httpError');

const BILLING_PROVIDERS = new Set(['disabled', 'stripe']);
const PLAN_CODE_PATTERN = /^[a-z0-9][a-z0-9._-]{1,79}$/;
const STRIPE_PRICE_PATTERN = /^price_[A-Za-z0-9]+$/;

function normalizeBillingProvider(value) {
  const provider = String(value || 'disabled').trim().toLowerCase();
  if (!BILLING_PROVIDERS.has(provider)) {
    throw new TypeError('BILLING_PROVIDER must be disabled or stripe.');
  }
  return provider;
}

function parseStripePlanPriceMap(rawValue) {
  if (!rawValue) return Object.freeze({});

  let parsed;
  try {
    parsed = JSON.parse(rawValue);
  } catch {
    throw new TypeError('STRIPE_PLAN_PRICE_MAP_JSON must be valid JSON.');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new TypeError('STRIPE_PLAN_PRICE_MAP_JSON must be a JSON object.');
  }

  const normalized = {};
  const seenPrices = new Set();
  for (const [plan, priceId] of Object.entries(parsed)) {
    if (!PLAN_CODE_PATTERN.test(plan) || plan === 'free') {
      throw new TypeError(`Stripe billing plan code is invalid: ${plan}`);
    }
    if (typeof priceId !== 'string' || !STRIPE_PRICE_PATTERN.test(priceId)) {
      throw new TypeError(`Stripe Price ID is invalid for plan: ${plan}`);
    }
    if (seenPrices.has(priceId)) {
      throw new TypeError(`Stripe Price ID is mapped to more than one GuardAI plan: ${priceId}`);
    }
    seenPrices.add(priceId);
    normalized[plan] = priceId;
  }
  return Object.freeze(normalized);
}

function resolveStripePriceId(priceMap, plan) {
  if (typeof plan !== 'string' || !PLAN_CODE_PATTERN.test(plan) || plan === 'free') {
    throw new HttpError(400, 'Requested billing plan is invalid.', 'INVALID_BILLING_PLAN');
  }
  const priceId = priceMap?.[plan];
  if (!priceId) {
    throw new HttpError(422, 'Requested billing plan is not configured.', 'BILLING_PLAN_NOT_CONFIGURED');
  }
  return priceId;
}

function resolvePlanForStripePriceId(priceMap, priceId) {
  if (typeof priceId !== 'string' || !STRIPE_PRICE_PATTERN.test(priceId)) {
    throw new HttpError(502, 'Stripe subscription contains an invalid Price ID.', 'BILLING_PROVIDER_RESPONSE_INVALID');
  }
  const match = Object.entries(priceMap || {}).find(([, configuredPriceId]) => configuredPriceId === priceId);
  if (!match) {
    throw new HttpError(
      409,
      'Stripe subscription Price is not mapped to a GuardAI plan.',
      'BILLING_PRICE_NOT_MAPPED',
    );
  }
  return match[0];
}

module.exports = {
  BILLING_PROVIDERS,
  normalizeBillingProvider,
  parseStripePlanPriceMap,
  resolvePlanForStripePriceId,
  resolveStripePriceId,
};
